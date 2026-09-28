"""
TrueTone – Parallel Inference Engine
=====================================
Production-grade pipeline engine for skin analysis.
Loads 3 EfficientNet models and runs parallel inference via ThreadPoolExecutor.

Framework-agnostic — works with Django, FastAPI, or CLI.

Usage (Django):
    from pipeline_engine import get_pipeline
    pipeline = get_pipeline()
    result = pipeline.analyze_all(image_bytes, "face.jpg")

Usage (CLI):
    from pipeline_engine import get_pipeline
    pipeline = get_pipeline()
    result = pipeline.analyze_file("test_images/000045.jpg")
"""

import io
import os
import sys
import time
import uuid
import base64
import logging
import threading
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

import numpy as np
import torch
import torch.nn as nn
import torchvision.transforms as T
from torchvision import models
from PIL import Image, ImageFile, UnidentifiedImageError

try:
    import timm
    HAS_TIMM = True
except ImportError:
    HAS_TIMM = False

ImageFile.LOAD_TRUNCATED_IMAGES = True

logger = logging.getLogger("truetone.engine")


# ═══════════════════════════════════════════════════════════════
#  CONFIGURATION
# ═══════════════════════════════════════════════════════════════
class Config:
    BASE_DIR = Path(__file__).resolve().parent

    SKIN_TYPE_MODEL    = str(BASE_DIR / "models" / "skin_type" / "best_model.pth")
    SKIN_TONE_MODEL    = str(BASE_DIR / "models" / "skin_tone" / "best_model.pt")
    SKIN_DISEASE_MODEL = str(BASE_DIR / "models" / "skin_disease" / "best_model.pth")

    SKIN_TYPE_CLASSES    = ["combination", "dry", "normal", "oily"]
    SKIN_TONE_CLASSES    = ["fair", "medium", "dark"]
    SKIN_DISEASE_CLASSES = [
        "common_acne", "cystic_acne", "eczema",
        "psoriasis", "rosacea", "tinea",
    ]

    SKIN_TYPE_ARCH    = "efficientnet_b0"
    SKIN_TONE_ARCH    = "efficientnet_b0"
    SKIN_DISEASE_ARCH = "efficientnet_b0"

    IMAGE_SIZE        = 224
    CONFIDENCE_THRESH = 0.50
    DISEASE_THRESH    = 0.40
    DEVICE            = "cuda" if torch.cuda.is_available() else "cpu"
    MAX_WORKERS       = 3

    MAX_IMAGE_BYTES    = 10 * 1024 * 1024
    ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    MIN_DIMENSION      = 64


TRANSFORM = T.Compose([
    T.Resize(Config.IMAGE_SIZE + 32),
    T.CenterCrop(Config.IMAGE_SIZE),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


# ═══════════════════════════════════════════════════════════════
#  EXCEPTIONS
# ═══════════════════════════════════════════════════════════════
class ImageValidationError(Exception):
    def __init__(self, message, error_code="INVALID_IMAGE"):
        super().__init__(message)
        self.error_code = error_code


class ModelLoadError(Exception):
    pass


# ═══════════════════════════════════════════════════════════════
#  AUTO-DETECT MODEL ARCHITECTURE
# ═══════════════════════════════════════════════════════════════
def _detect_head_config(state_dict):
    clf_weights = {
        k: v for k, v in state_dict.items()
        if "classifier" in k and k.endswith(".weight")
    }
    if not clf_weights:
        raise ModelLoadError("No classifier weights in checkpoint.")

    clf_linear = {k: v for k, v in clf_weights.items() if len(v.shape) == 2}
    if not clf_linear:
        raise ModelLoadError("No Linear layers in classifier.")

    keys = sorted(clf_linear.keys())
    first, last = clf_linear[keys[0]], clf_linear[keys[-1]]
    in_features = first.shape[1]
    num_classes = last.shape[0]
    has_hidden = len(keys) > 1
    hidden_dim = first.shape[0] if has_hidden else None

    arch_map = {1280: "efficientnet_b0", 1408: "efficientnet_b2",
                1536: "efficientnet_b3", 1792: "efficientnet_b4"}

    return {
        "in_features": in_features, "hidden_dim": hidden_dim,
        "num_classes": num_classes, "has_hidden": has_hidden,
        "detected_arch": arch_map.get(in_features),
    }


def _detect_backend(state_dict):
    if any(k.startswith("backbone.") for k in list(state_dict.keys())[:10]):
        return "timm"
    return "torchvision"


def _detect_timm_arch(state_dict):
    clf_keys = sorted([
        k for k in state_dict
        if "classifier" in k and k.endswith(".weight") and len(state_dict[k].shape) == 2
    ])
    if clf_keys:
        in_f = state_dict[clf_keys[0]].shape[1]
        return {1280: "efficientnet_b0", 1408: "efficientnet_b2",
                1536: "efficientnet_b3"}.get(in_f, "efficientnet_b2")
    return "efficientnet_b2"


# ═══════════════════════════════════════════════════════════════
#  MODEL BUILDERS
# ═══════════════════════════════════════════════════════════════
def _build_timm_model(state_dict, num_classes):
    if not HAS_TIMM:
        raise ImportError("timm required. Install: pip install timm")

    arch = _detect_timm_arch(state_dict)
    clf_linear_keys = sorted([
        k for k in state_dict
        if "classifier" in k and k.endswith(".weight") and len(state_dict[k].shape) == 2
    ])
    backbone = timm.create_model(arch, pretrained=False, num_classes=0)

    clf_keys = sorted([k for k in state_dict if k.startswith("classifier.")])
    layer_indices = sorted(set(int(k.split(".")[1]) for k in clf_keys))

    layers = []
    for idx in layer_indices:
        wk = f"classifier.{idx}.weight"
        rmk = f"classifier.{idx}.running_mean"
        if wk not in state_dict:
            continue
        w = state_dict[wk]
        if rmk in state_dict:
            layers.append(nn.BatchNorm1d(w.shape[0]))
            if any(int(k.split(".")[1]) > idx for k in clf_linear_keys):
                layers.append(nn.Dropout(p=0.15))
        elif len(w.shape) == 2:
            layers.append(nn.Linear(w.shape[1], w.shape[0]))
            if any(int(k.split(".")[1]) > idx for k in clf_linear_keys):
                layers.append(nn.ReLU(inplace=True))

    class TimmModel(nn.Module):
        def __init__(self, bb, clf):
            super().__init__()
            self.backbone = bb
            self.classifier = clf
        def forward(self, x):
            return self.classifier(self.backbone(x))

    return TimmModel(backbone, nn.Sequential(*layers))


def _build_torchvision_model(arch, hidden_dim, num_classes, has_hidden):
    constructor = getattr(models, arch, None)
    if constructor is None:
        raise ModelLoadError(f"Unknown architecture: {arch}")

    net = constructor(weights=None)
    in_features = net.classifier[1].in_features
    if not has_hidden:
        net.classifier[1] = nn.Linear(in_features, num_classes)
    else:
        net.classifier = nn.Sequential(
            nn.Dropout(p=0.2, inplace=True),
            nn.Linear(in_features, hidden_dim),
            nn.SiLU(),
            nn.Dropout(p=0.2, inplace=True),
            nn.Linear(hidden_dim, num_classes),
        )
    return net


# ═══════════════════════════════════════════════════════════════
#  MODEL LOADER
# ═══════════════════════════════════════════════════════════════
def load_model(model_path, arch, num_classes_hint, device=Config.DEVICE):
    path = Path(model_path)
    if not path.exists():
        raise ModelLoadError(f"Model not found: {model_path}")

    logger.info(f"Loading {path.name} on {device}")
    checkpoint = torch.load(model_path, map_location=device, weights_only=False)

    if isinstance(checkpoint, dict):
        if "model_state_dict" in checkpoint:
            sd = checkpoint["model_state_dict"]
        elif "model_state" in checkpoint:
            sd = checkpoint["model_state"]
        elif "state_dict" in checkpoint:
            sd = checkpoint["state_dict"]
        elif any(k.endswith(".weight") for k in list(checkpoint.keys())[:5]):
            sd = checkpoint
        else:
            raise ModelLoadError(f"Unknown checkpoint format: {list(checkpoint.keys())[:10]}")

        backend = _detect_backend(sd)
        head = _detect_head_config(sd)

        if head["num_classes"] != num_classes_hint:
            logger.warning(
                f"Checkpoint classes={head['num_classes']} vs config={num_classes_hint}. "
                "Using checkpoint value."
            )

        if backend == "timm":
            net = _build_timm_model(sd, head["num_classes"])
        else:
            actual_arch = head.get("detected_arch") or arch
            net = _build_torchvision_model(
                actual_arch, head["hidden_dim"],
                head["num_classes"], head["has_hidden"],
            )

        try:
            net.load_state_dict(sd, strict=True)
        except RuntimeError as e:
            raise ModelLoadError(f"Weight loading failed: {e}")
    else:
        net = checkpoint

    net = net.to(device)
    net.eval()
    logger.info(f"  Loaded {path.name} ({sum(p.numel() for p in net.parameters()):,} params)")
    return net


# ═══════════════════════════════════════════════════════════════
#  IMAGE VALIDATION & PREPROCESSING
# ═══════════════════════════════════════════════════════════════


def validate_and_preprocess_bytes(image_bytes, filename="upload.jpg", skip_face_check=False):
    """Validate raw bytes and return (tensor, pil_image, image_info)."""
    ext = Path(filename).suffix.lower()
    if ext not in Config.ALLOWED_EXTENSIONS:
        raise ImageValidationError(
            f"Unsupported format '{ext}'. Allowed: {', '.join(sorted(Config.ALLOWED_EXTENSIONS))}",
            "UNSUPPORTED_FORMAT",
        )

    size = len(image_bytes)
    if size == 0:
        raise ImageValidationError("File is empty.", "EMPTY_FILE")
    if size > Config.MAX_IMAGE_BYTES:
        raise ImageValidationError(
            f"File too large ({size / 1e6:.1f} MB). Max: {Config.MAX_IMAGE_BYTES // (1024*1024)} MB",
            "FILE_TOO_LARGE",
        )

    try:
        pil_img = Image.open(io.BytesIO(image_bytes))
        pil_img.load()
    except UnidentifiedImageError:
        raise ImageValidationError("Cannot decode image. File may be corrupt.", "CORRUPT_IMAGE")
    except Exception as e:
        raise ImageValidationError(f"Failed to open image: {e}", "CORRUPT_IMAGE")

    pil_img = pil_img.convert("RGB")
    from inference.face_crop import crop_face_natural
    pil_img, crop_box, _landmarks, _found, num_faces = crop_face_natural(pil_img)

    if num_faces > 1 and not skip_face_check:
        raise ImageValidationError("Multiple faces detected! Please crop to a single face before uploading.", "MULTIPLE_FACES")
    elif num_faces == 0 and not skip_face_check:
        import cv2
        img_np = np.array(pil_img)
        hsv = cv2.cvtColor(img_np, cv2.COLOR_RGB2HSV)
        lower_skin1 = np.array([0, 20, 70], dtype=np.uint8)
        upper_skin1 = np.array([20, 255, 255], dtype=np.uint8)
        lower_skin2 = np.array([160, 20, 70], dtype=np.uint8)
        upper_skin2 = np.array([180, 255, 255], dtype=np.uint8)
        skin_mask = cv2.bitwise_or(cv2.inRange(hsv, lower_skin1, upper_skin1), cv2.inRange(hsv, lower_skin2, upper_skin2))
        skin_ratio = np.sum(skin_mask > 0) / (img_np.shape[0] * img_np.shape[1])
        
        if skin_ratio > 0.15:
            raise ImageValidationError("No face detected! Do you want to proceed with this skin image?", "NO_FACE_SKIN")
        else:
            raise ImageValidationError("Please add a facial image. No face or skin was detected in this photo.", "NO_FACE_NO_SKIN")

    w, h = pil_img.size
    if w < Config.MIN_DIMENSION or h < Config.MIN_DIMENSION:
        raise ImageValidationError(
            f"Image too small ({w}×{h}). Minimum: {Config.MIN_DIMENSION}×{Config.MIN_DIMENSION}",
            "TOO_SMALL",
        )

    tensor = TRANSFORM(pil_img).unsqueeze(0)
    
    display_transform = T.Compose([
        T.Resize(Config.IMAGE_SIZE + 32),
        T.CenterCrop(Config.IMAGE_SIZE),
    ])
    display_pil = display_transform(pil_img)
    display_img_np = np.array(display_pil, dtype=np.float32) / 255.0

    buf = io.BytesIO()
    display_pil.save(buf, format="JPEG", quality=92)
    display_image_base64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    
    info = {
        "filename": filename,
        "size_bytes": size,
        "width": w,
        "height": h,
        "display_img_np": display_img_np,
        "display_pil": display_pil,
        "display_image_base64": display_image_base64,
        "crop_box": crop_box,
    }
    return tensor, pil_img, info


def validate_and_preprocess_file(image_path):
    """Validate a file path and return (tensor, pil_image, image_info)."""
    path = Path(image_path)
    if not path.exists():
        raise ImageValidationError(f"File not found: {image_path}", "NOT_FOUND")
    if not path.is_file():
        raise ImageValidationError(f"Not a file: {image_path}", "NOT_A_FILE")

    with open(path, "rb") as f:
        image_bytes = f.read()
    return validate_and_preprocess_bytes(image_bytes, path.name)


# ═══════════════════════════════════════════════════════════════
#  THREAD-SAFE INFERENCE
# ═══════════════════════════════════════════════════════════════
def _infer_one(model, tensor, class_labels, device, confidence_threshold, display_img_np=None, display_pil=None, model_name=None):
    tensor = tensor.to(device)
    with torch.no_grad():
        logits = model(tensor)
        probs = torch.softmax(logits, dim=1)[0]
    n = probs.shape[0]

    if n != len(class_labels):
        class_labels = class_labels[:n]

    top_idx = probs.argmax().item()
    top_prob = probs[top_idx].item()
    is_confident = top_prob >= confidence_threshold
    
    heatmap_base64 = None
    marker_base64 = None
    zone_overlay_base64 = None
    legend = None

    if model_name == "skin_disease" and display_img_np is not None:
        try:
            from inference.gradcam import generate_heatmap
            disease_name = class_labels[top_idx] if top_idx < len(class_labels) else "condition"
            marker_base64, heatmap_base64 = generate_heatmap(model, tensor, display_img_np, top_idx, task_type="skin_disease", label=disease_name)
            legend = {
                "title": "Disease Risk Hotspot",
                "min_label": "Low Risk",
                "max_label": "High Risk",
                "score": round(top_prob, 3),
                "marker_pos_pct": round(max(10.0, min(90.0, top_prob * 100)), 1),
                "color_hex": "#ef4444",
                "palette": ["#fde047", "#f97316", "#dc2626"],
            }
        except Exception as e:
            logger.error(f"GradCAM failed: {e}")
    elif model_name == "skin_type" and display_img_np is not None:
        try:
            from inference.gradcam import generate_heatmap
            pred_class = class_labels[top_idx] if top_idx < len(class_labels) else "normal"
            marker_base64, heatmap_base64 = generate_heatmap(model, tensor, display_img_np, top_idx, task_type="skin_type", label=pred_class)
            
            if pred_class in ["oily", "combination"]:
                title = "Oiliness / Shine"
                min_l = "Slightly oily"
                max_l = "Very oily"
                pal = ["#fef08a", "#f97316", "#ea580c"]
            elif pred_class == "dry":
                title = "Moisture / Dryness"
                min_l = "Slightly dry"
                max_l = "Very dry"
                pal = ["#bae6fd", "#38bdf8", "#2563eb"]
            else:
                title = "Balanced Skin"
                min_l = "Normal balance"
                max_l = "Optimal"
                pal = ["#a7f3d0", "#34d399", "#059669"]

            legend = {
                "title": title,
                "min_label": min_l,
                "max_label": max_l,
                "score": round(top_prob, 3),
                "marker_pos_pct": round(max(15.0, min(85.0, float(top_prob) * 100)), 1),
                "color_hex": pal[-1],
                "palette": pal,
            }
            zone_overlay_base64 = marker_base64

        except Exception as e:
            logger.error(f"Overlay for skin_type failed: {e}")
    elif model_name == "skin_tone" and display_img_np is not None:
        try:
            from inference.gradcam import generate_heatmap
            pred_class = class_labels[top_idx] if top_idx < len(class_labels) else "fair"
            marker_base64, heatmap_base64 = generate_heatmap(model, tensor, display_img_np, top_idx, task_type="skin_tone", label=pred_class)
            
            norm_class = str(pred_class or "").lower()
            if "fair" in norm_class:
                marker_pos_pct = round(16.0 + (1.0 - float(top_prob)) * 8.0, 1)
            elif "dark" in norm_class:
                marker_pos_pct = round(84.0 - (1.0 - float(top_prob)) * 8.0, 1)
            else:
                marker_pos_pct = 50.0

            legend = {
                "title": "Skin Tone Undertone",
                "min_label": "Fair",
                "max_label": "Dark",
                "score": round(top_prob, 3),
                "marker_pos_pct": marker_pos_pct,
                "color_hex": "#d97706",
                "palette": ["#fde68a", "#d97706", "#78350f"],
            }
            zone_overlay_base64 = marker_base64

        except Exception as e:
            logger.error(f"Overlay for skin_tone failed: {e}")

    return {
        "predicted_class": class_labels[top_idx] if top_idx < len(class_labels) else f"class_{top_idx}",
        "confidence": round(top_prob, 4),
        "all_probs": {cls: round(probs[i].item(), 4) for i, cls in enumerate(class_labels)},
        "low_confidence": not is_confident,
        "is_confident": is_confident,
        "heatmap_base64": heatmap_base64,
        "marker_base64": marker_base64,
        "zone_overlay_base64": zone_overlay_base64,
        "legend": legend,
    }


# ═══════════════════════════════════════════════════════════════
#  RESULT AGGREGATION
# ═══════════════════════════════════════════════════════════════
def _aggregate(type_res, tone_res, disease_res, image_info, latencies, request_id):
    warnings = []
    if type_res["low_confidence"]:
        warnings.append(f"Skin type confidence low ({type_res['confidence']:.0%}).")
    if tone_res["low_confidence"]:
        warnings.append(f"Skin tone confidence low ({tone_res['confidence']:.0%}).")
    if disease_res["low_confidence"]:
        warnings.append(
            f"Disease confidence low ({disease_res['confidence']:.0%}). "
            "Consult a dermatologist."
        )

    disease_flag = (
        disease_res["predicted_class"] != "none"
        and not disease_res["low_confidence"]
    )

    clean_info = {
        "filename": image_info.get("filename"),
        "size_bytes": image_info.get("size_bytes"),
        "width": image_info.get("width"),
        "height": image_info.get("height"),
        "crop_box": image_info.get("crop_box"),
        "display_image_base64": image_info.get("display_image_base64"),
    }

    return {
        "status": "success",
        "request_id": request_id,
        "image_info": clean_info,
        "predictions": {
            "skin_type": {
                "label": type_res["predicted_class"],
                "confidence": type_res["confidence"],
                "is_confident": type_res["is_confident"],
                "heatmap_base64": type_res["heatmap_base64"],
                "marker_base64": type_res["marker_base64"],
                "zone_overlay_base64": type_res.get("zone_overlay_base64"),
                "legend": type_res.get("legend"),
                "distribution": type_res["all_probs"],
            },
            "skin_tone": {
                "label": tone_res["predicted_class"],
                "confidence": tone_res["confidence"],
                "is_confident": tone_res["is_confident"],
                "heatmap_base64": tone_res["heatmap_base64"],
                "marker_base64": tone_res["marker_base64"],
                "zone_overlay_base64": tone_res.get("zone_overlay_base64"),
                "legend": tone_res.get("legend"),
                "distribution": tone_res["all_probs"],
            },
            "skin_disease": {
                "label": disease_res["predicted_class"],
                "confidence": disease_res["confidence"],
                "is_confident": disease_res["is_confident"],
                "heatmap_base64": disease_res["heatmap_base64"],
                "marker_base64": disease_res["marker_base64"],
                "zone_overlay_base64": disease_res.get("zone_overlay_base64"),
                "legend": disease_res.get("legend"),
                "disease_detected": disease_flag,
                "distribution": disease_res["all_probs"],
            },
        },
        "skin_profile": {
            "type": type_res["predicted_class"],
            "tone": tone_res["predicted_class"],
            "disease": disease_res["predicted_class"],
            "disease_detected": disease_flag,
        },
        "warnings": warnings,
        "latency_ms": latencies,
    }


# ═══════════════════════════════════════════════════════════════
#  MAIN PIPELINE CLASS
# ═══════════════════════════════════════════════════════════════
class SkinAnalysisPipeline:
    """
    Parallel inference pipeline. Thread-safe. Singleton via get_pipeline().
    Models are loaded once at startup and reused across all requests.
    """

    def __init__(self):
        logger.info("=" * 60)
        logger.info("TrueTone Pipeline Engine — initializing")
        logger.info(f"  Device : {Config.DEVICE}")
        logger.info(f"  Workers: {Config.MAX_WORKERS}")
        logger.info("=" * 60)

        self._models_loaded = False
        self._start_time = time.time()
        self._load_error = None

        try:
            self._load_models()
            self._models_loaded = True
        except Exception as e:
            self._load_error = str(e)
            logger.error(f"Model loading failed: {e}")
            raise

        self._executor = ThreadPoolExecutor(
            max_workers=Config.MAX_WORKERS,
            thread_name_prefix="TrueTone",
        )

    def _load_models(self):
        tasks = [
            (Config.SKIN_TYPE_MODEL, Config.SKIN_TYPE_ARCH,
             len(Config.SKIN_TYPE_CLASSES), "skin_type"),
            (Config.SKIN_TONE_MODEL, Config.SKIN_TONE_ARCH,
             len(Config.SKIN_TONE_CLASSES), "skin_tone"),
            (Config.SKIN_DISEASE_MODEL, Config.SKIN_DISEASE_ARCH,
             len(Config.SKIN_DISEASE_CLASSES), "skin_disease"),
        ]

        t0 = time.perf_counter()
        loaded = {}
        with ThreadPoolExecutor(max_workers=3) as pool:
            futs = {
                pool.submit(load_model, p, a, n): name
                for p, a, n, name in tasks
            }
            for fut in as_completed(futs):
                name = futs[fut]
                loaded[name] = fut.result()

        self.model_type = loaded["skin_type"]
        self.model_tone = loaded["skin_tone"]
        self.model_disease = loaded["skin_disease"]
        ms = (time.perf_counter() - t0) * 1000
        logger.info(f"All 3 models loaded in {ms:.0f} ms")

    def analyze_all(self, image_bytes, filename="upload.jpg", skip_face_check=False):
        """Analyze image from raw bytes. Returns result dict."""
        request_id = uuid.uuid4().hex[:8]
        latencies = {}

        try:
            t = time.perf_counter()
            tensor, pil_img, info = validate_and_preprocess_bytes(image_bytes, filename, skip_face_check)
            latencies["preprocess_ms"] = round((time.perf_counter() - t) * 1000, 2)
        except ImageValidationError as e:
            return {
                "status": "error",
                "request_id": request_id,
                "error_code": e.error_code,
                "message": str(e),
            }

        return self._run_parallel(tensor, info, latencies, request_id)

    def analyze_file(self, image_path):
        """Analyze image from file path. Returns result dict."""
        request_id = uuid.uuid4().hex[:8]
        latencies = {}

        try:
            t = time.perf_counter()
            tensor, pil_img, info = validate_and_preprocess_file(image_path)
            latencies["preprocess_ms"] = round((time.perf_counter() - t) * 1000, 2)
        except ImageValidationError as e:
            return {
                "status": "error",
                "request_id": request_id,
                "error_code": e.error_code,
                "message": str(e),
            }

        return self._run_parallel(tensor, info, latencies, request_id)

    def _run_parallel(self, tensor, info, latencies, request_id):
        jobs = {
            "skin_type": (self.model_type, Config.SKIN_TYPE_CLASSES, Config.CONFIDENCE_THRESH),
            "skin_tone": (self.model_tone, Config.SKIN_TONE_CLASSES, Config.CONFIDENCE_THRESH),
            "skin_disease": (self.model_disease, Config.SKIN_DISEASE_CLASSES, Config.DISEASE_THRESH),
        }

        t_all = time.perf_counter()
        starts = {}
        futures = {}
        for name, (mdl, labels, thresh) in jobs.items():
            starts[name] = time.perf_counter()
            futures[name] = self._executor.submit(
                _infer_one, mdl, tensor, labels, Config.DEVICE, thresh,
                info.get("display_img_np"), info.get("display_pil"), name
            )

        results = {}
        errors = {}
        for name, fut in futures.items():
            try:
                results[name] = fut.result(timeout=30)
                latencies[f"{name}_ms"] = round(
                    (time.perf_counter() - starts[name]) * 1000, 2
                )
            except Exception as e:
                errors[name] = str(e)
                logger.error(f"{name} inference failed: {e}")

        latencies["parallel_wall_ms"] = round((time.perf_counter() - t_all) * 1000, 2)
        latencies["total_ms"] = round(
            latencies["preprocess_ms"] + latencies["parallel_wall_ms"], 2
        )

        if errors:
            return {
                "status": "partial_error",
                "request_id": request_id,
                "errors": errors,
                "results": {k: v for k, v in results.items()},
                "image_info": info,
                "latency_ms": latencies,
            }

        return _aggregate(
            results["skin_type"], results["skin_tone"],
            results["skin_disease"], info, latencies, request_id,
        )

    # ─────────────────────────────────────────────────────────────
    #  SELECTIVE INFERENCE HELPERS
    # ─────────────────────────────────────────────────────────────

    def _preprocess_request(self, image_bytes, filename, skip_face_check=False):
        """
        Shared image validation + preprocessing step.
        Returns (tensor, info, error_response_or_None, request_id, latencies).
        """
        request_id = uuid.uuid4().hex[:8]
        latencies = {}
        try:
            t = time.perf_counter()
            tensor, _pil, info = validate_and_preprocess_bytes(image_bytes, filename, skip_face_check)
            latencies["preprocess_ms"] = round((time.perf_counter() - t) * 1000, 2)
            return tensor, info, None, request_id, latencies
        except ImageValidationError as e:
            err = {
                "status": "error",
                "request_id": request_id,
                "error_code": e.error_code,
                "message": str(e),
            }
            return None, None, err, request_id, latencies

    def _run_selective(self, tensor, info, latencies, request_id, job_keys):
        """
        Run inference only for the model keys listed in *job_keys*.
        job_keys: subset of {"skin_type", "skin_tone", "skin_disease"}
        Returns a normalised result dict.
        """
        all_jobs = {
            "skin_type":    (self.model_type,    Config.SKIN_TYPE_CLASSES,    Config.CONFIDENCE_THRESH),
            "skin_tone":    (self.model_tone,     Config.SKIN_TONE_CLASSES,    Config.CONFIDENCE_THRESH),
            "skin_disease": (self.model_disease,  Config.SKIN_DISEASE_CLASSES, Config.DISEASE_THRESH),
        }

        t_all = time.perf_counter()
        starts, futures = {}, {}
        for key in job_keys:
            mdl, labels, thresh = all_jobs[key]
            starts[key] = time.perf_counter()
            futures[key] = self._executor.submit(
                _infer_one, mdl, tensor, labels, Config.DEVICE, thresh,
                info.get("display_img_np"), info.get("display_pil"), key
            )

        results, errors = {}, {}
        for key, fut in futures.items():
            try:
                results[key] = fut.result(timeout=30)
                latencies[f"{key}_ms"] = round((time.perf_counter() - starts[key]) * 1000, 2)
            except Exception as e:
                errors[key] = str(e)
                logger.error(f"{key} inference failed: {e}")

        latencies["inference_wall_ms"] = round((time.perf_counter() - t_all) * 1000, 2)
        latencies["total_ms"] = round(latencies["preprocess_ms"] + latencies["inference_wall_ms"], 2)

        clean_info = {
            "filename": info.get("filename"),
            "size_bytes": info.get("size_bytes"),
            "width": info.get("width"),
            "height": info.get("height"),
            "crop_box": info.get("crop_box"),
            "display_image_base64": info.get("display_image_base64"),
        }

        if errors:
            return {
                "status": "partial_error",
                "request_id": request_id,
                "errors": errors,
                "results": results,
                "image_info": clean_info,
                "latency_ms": latencies,
            }

        # Build a clean, self-describing response
        predictions = {}
        warnings = []
        for key in job_keys:
            r = results[key]
            entry = {
                "label": r["predicted_class"],
                "confidence": r["confidence"],
                "is_confident": r["is_confident"],
                "heatmap_base64": r["heatmap_base64"],
                "marker_base64": r["marker_base64"],
                "zone_overlay_base64": r.get("zone_overlay_base64"),
                "legend": r.get("legend"),
                "distribution": r["all_probs"],
            }
            if key == "skin_disease":
                entry["disease_detected"] = (
                    r["predicted_class"] != "none" and not r["low_confidence"]
                )
            predictions[key] = entry

            # Confidence warnings
            if r["low_confidence"]:
                label = key.replace("_", " ")
                if key == "skin_disease":
                    warnings.append(
                        f"Disease confidence low ({r['confidence']:.0%}). Consult a dermatologist."
                    )
                else:
                    warnings.append(f"{label.capitalize()} confidence low ({r['confidence']:.0%}).")

        return {
            "status": "success",
            "request_id": request_id,
            "image_info": clean_info,
            "predictions": predictions,
            "warnings": warnings,
            "latency_ms": latencies,
        }

    # ─────────────────────────────────────────────────────────────
    #  PUBLIC FOCUSED METHODS  (bytes-based, mirror of analyze())
    # ─────────────────────────────────────────────────────────────


    def analyze_skin(self, image_bytes, filename="upload.jpg", skip_face_check=False):
        """
        Run skin_type + skin_tone in parallel.
        Useful when disease analysis is not required.
        """
        tensor, info, err, req_id, lats = self._preprocess_request(image_bytes, filename, skip_face_check)
        if err:
            return err
        return self._run_selective(tensor, info, lats, req_id, ["skin_type", "skin_tone"])

    def analyze_skin_type(self, image_bytes, filename="upload.jpg", skip_face_check=False):
        """Run only the skin-type model (combination / dry / normal / oily)."""
        tensor, info, err, req_id, lats = self._preprocess_request(image_bytes, filename, skip_face_check)
        if err:
            return err
        return self._run_selective(tensor, info, lats, req_id, ["skin_type"])

    def analyze_skin_tone(self, image_bytes, filename="upload.jpg", skip_face_check=False):
        """Run only the skin-tone model (dark / fair / medium)."""
        tensor, info, err, req_id, lats = self._preprocess_request(image_bytes, filename, skip_face_check)
        if err:
            return err
        return self._run_selective(tensor, info, lats, req_id, ["skin_tone"])

    def analyze_skin_disease(self, image_bytes, filename="upload.jpg", skip_face_check=False):
        """
        Run only the skin-disease model.
        Returns disease_detected flag alongside the prediction.
        """
        tensor, info, err, req_id, lats = self._preprocess_request(image_bytes, filename, skip_face_check)
        if err:
            return err
        return self._run_selective(tensor, info, lats, req_id, ["skin_disease"])

    def health_check(self):
        return {
            "status": "healthy" if self._models_loaded else "unhealthy",
            "device": Config.DEVICE,
            "models_loaded": {
                "skin_type": hasattr(self, "model_type"),
                "skin_tone": hasattr(self, "model_tone"),
                "skin_disease": hasattr(self, "model_disease"),
            },
            "uptime_seconds": round(time.time() - self._start_time, 1),
            "load_error": self._load_error,
        }

    def shutdown(self):
        self._executor.shutdown(wait=True)
        logger.info("Pipeline thread pool shut down.")


# ═══════════════════════════════════════════════════════════════
#  SINGLETON
# ═══════════════════════════════════════════════════════════════
_pipeline_instance = None
_pipeline_lock = threading.Lock()


def get_pipeline():
    """Get or create the singleton pipeline instance. Thread-safe."""
    global _pipeline_instance
    if _pipeline_instance is None:
        with _pipeline_lock:
            if _pipeline_instance is None:
                _pipeline_instance = SkinAnalysisPipeline()
    return _pipeline_instance


# ═══════════════════════════════════════════════════════════════
#  CLI TEST
# ═══════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import json

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    image = sys.argv[1] if len(sys.argv) > 1 else "test_images/000045.jpg"
    print(f"\nAnalyzing: {image}")

    pipeline = get_pipeline()
    result = pipeline.analyze_file(image)

    print("\n" + "=" * 60)
    print(json.dumps(result, indent=2))
    pipeline.shutdown()
