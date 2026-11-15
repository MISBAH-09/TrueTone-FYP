"""
Face Crop Module
================
Derives crop box from actual MediaPipe FACEMESH_FACE_OVAL landmarks with
natural padding (Section 6.1 of UX Overhaul Plan). Preserves natural pixels
without artificial fill or masking.
"""

from pathlib import Path
import numpy as np
from PIL import Image

MODELS_DIR = Path(__file__).resolve().parent
FACE_LANDMARKER_PATH = str(MODELS_DIR / "face_landmarker.task")

OVAL_INDICES = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365,
    379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93,
    20, 234, 127, 162, 21, 54, 103, 67, 109
]

_landmarker = None
_mediapipe_import_error = None


def _import_mediapipe():
    """Lazy import so a missing mediapipe install does not crash the API at import time."""
    global _mediapipe_import_error
    try:
        import mediapipe as mp
        return mp
    except Exception as e:
        _mediapipe_import_error = e
        return None


def get_landmarker():
    global _landmarker
    if _landmarker is None and Path(FACE_LANDMARKER_PATH).exists():
        mp = _import_mediapipe()
        if mp is None:
            print(f"[face_crop] Warning: mediapipe unavailable: {_mediapipe_import_error}")
            return None
        try:
            options = mp.tasks.vision.FaceLandmarkerOptions(
                base_options=mp.tasks.BaseOptions(model_asset_path=FACE_LANDMARKER_PATH),
                running_mode=mp.tasks.vision.RunningMode.IMAGE
            )
            _landmarker = mp.tasks.vision.FaceLandmarker.create_from_options(options)
        except Exception as e:
            print(f"[face_crop] Warning: could not initialize FaceLandmarker: {e}")
            _landmarker = None
    return _landmarker


def detect_face_landmarks(img_np):
    """Detect landmarks using MediaPipe FaceLandmarker. Returns list of landmarks or None."""
    landmarker = get_landmarker()
    if landmarker is None:
        return None, 0

    mp = _import_mediapipe()
    if mp is None:
        return None, 0

    try:
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_np)
        detection = landmarker.detect(mp_image)
        if detection.face_landmarks and len(detection.face_landmarks) > 0:
            return detection.face_landmarks[0], len(detection.face_landmarks)
    except Exception as e:
        print(f"[face_crop] Landmark detection error: {e}")
    return None, 0


def crop_face_natural(pil_img, pad_x_ratio=0.20, pad_y_ratio=0.15):
    """
    Derives crop box from min/max of FACEMESH_FACE_OVAL landmark coordinates.
    Maintains original image aspect ratio inside crop, unaltered natural pixels.
    Returns:
        (cropped_pil_img, crop_box_tuple, landmarks_or_None, face_found_bool, num_faces)
    """
    img_np = np.array(pil_img.convert("RGB"))
    h, w = img_np.shape[:2]

    landmarks, num_faces = detect_face_landmarks(img_np)
    if not landmarks:
        return pil_img, (0, 0, w, h), None, False, 0

    xs = [landmarks[idx].x * w for idx in OVAL_INDICES]
    ys = [landmarks[idx].y * h for idx in OVAL_INDICES]

    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)

    # Generous padding to avoid 'too zoomed' look
    pad_x = (x_max - x_min) * pad_x_ratio
    pad_y = (y_max - y_min) * pad_y_ratio

    x1 = max(0, int(x_min - pad_x))
    y1 = max(0, int(y_min - pad_y))
    x2 = min(w, int(x_max + pad_x))
    y2 = min(h, int(y_max + pad_y))

    crop_box = (x1, y1, x2, y2)
    return pil_img.crop(crop_box), crop_box, landmarks, True, num_faces
