"""
Zone Templates Module
=====================
Defines anatomical template zones (T-zone, Cheeks, Whole Face) based on
MediaPipe FaceMesh landmarks, and renders score-driven tinted overlays with
feathered soft blending and legend data (Section 9 of UX Overhaul Plan).
"""

import base64
import cv2
import numpy as np
from PIL import Image
from inference.face_crop import detect_face_landmarks, OVAL_INDICES

# MediaPipe canonical landmark indices for anatomical zones
FOREHEAD_INDICES = [10, 109, 67, 108, 151, 337, 297, 338, 9, 8, 107, 336]
NOSE_INDICES = [168, 6, 197, 195, 5, 4, 1, 2, 98, 327, 278, 48, 196, 419]
RIGHT_INNER_CHEEK = [116, 117, 118, 101, 126, 217, 198, 131, 120, 203]
LEFT_INNER_CHEEK = [345, 346, 347, 330, 355, 437, 420, 360, 349, 423]

RIGHT_CHEEK_INDICES = [116, 123, 147, 213, 192, 214, 210, 205, 50, 101, 118, 117]
LEFT_CHEEK_INDICES = [345, 352, 376, 433, 416, 434, 430, 425, 280, 330, 347, 346]


def _get_polygon(landmarks, indices, w, h):
    pts = [[int(landmarks[idx].x * w), int(landmarks[idx].y * h)] for idx in indices]
    return cv2.convexHull(np.array(pts, dtype=np.int32))


def interpolate_color(color_stops, score):
    """
    Interpolate an RGB color along a list of (threshold, (R, G, B)) stops.
    score: float between 0.0 and 1.0.
    """
    score = max(0.0, min(1.0, float(score)))
    for i in range(len(color_stops) - 1):
        s0, c0 = color_stops[i]
        s1, c1 = color_stops[i + 1]
        if s0 <= score <= s1:
            t = (score - s0) / (s1 - s0) if s1 > s0 else 0
            r = int(c0[0] + t * (c1[0] - c0[0]))
            g = int(c0[1] + t * (c1[1] - c0[1]))
            b = int(c0[2] + t * (c1[2] - c0[2]))
            return (r, g, b)
    return color_stops[-1][1]


# Color stops defined in RGB
OILINESS_PALETTE = [
    (0.0, (254, 240, 138)),  # Light amber / yellow
    (0.5, (249, 115, 22)),   # Vibrant orange
    (1.0, (234, 88, 12)),    # Deep orange-red
]

DRYNESS_PALETTE = [
    (0.0, (186, 230, 253)),  # Soft sky blue
    (0.5, (56, 189, 248)),   # Vivid cyan
    (1.0, (37, 99, 235)),    # Deep cobalt blue
]

NORMAL_PALETTE = [
    (0.0, (167, 243, 208)),  # Soft mint
    (0.5, (52, 211, 153)),   # Vibrant emerald
    (1.0, (5, 150, 105)),    # Deep forest green
]

TONE_PALETTE = [
    (0.0, (253, 230, 138)),  # Fair warm peach/cream
    (0.5, (217, 119, 6)),    # Medium golden honey
    (1.0, (120, 53, 15)),    # Deep bronze/terracotta
]


def render_template_zone_overlay(pil_or_np_img, zone_type, score, landmarks=None, pred_class=None):
    """
    Renders an anatomical template zone tinted by model score with soft feathering.
    
    zone_type: 'tzone' | 'cheeks' | 'whole_face' | 'skin_tone'
    score: float 0.0 - 1.0 (model confidence / class probability)
    landmarks: list of MediaPipe landmarks (optional; detected if None)
    pred_class: predicted class string (e.g. 'fair', 'medium', 'dark', 'oily', 'dry')
    
    Returns:
        (overlay_base64_str, legend_dict)
    """
    if isinstance(pil_or_np_img, Image.Image):
        img_np = np.array(pil_or_np_img.convert("RGB"))
    else:
        img_np = pil_or_np_img.copy()
        if img_np.dtype != np.uint8:
            img_np = (img_np * 255).astype(np.uint8)

    h, w = img_np.shape[:2]

    if landmarks is None:
        lm_res = detect_face_landmarks(img_np)
        landmarks = lm_res[0] if isinstance(lm_res, tuple) else lm_res

    mask = np.zeros((h, w), dtype=np.float32)

    # Determine palette and legend based on zone_type
    if zone_type == "tzone":
        color_rgb = interpolate_color(OILINESS_PALETTE, score)
        legend = {
            "title": "Oiliness / Shine",
            "min_label": "Slightly oily",
            "max_label": "Very oily",
            "score": round(score, 3),
            "marker_pos_pct": round(max(15.0, min(85.0, float(score) * 100)), 1),
            "color_hex": f"#{color_rgb[0]:02x}{color_rgb[1]:02x}{color_rgb[2]:02x}",
            "palette": ["#fef08a", "#f97316", "#ea580c"],
        }
        if landmarks:
            forehead = _get_polygon(landmarks, FOREHEAD_INDICES, w, h)
            nose = _get_polygon(landmarks, NOSE_INDICES, w, h)
            r_inner = _get_polygon(landmarks, RIGHT_INNER_CHEEK, w, h)
            l_inner = _get_polygon(landmarks, LEFT_INNER_CHEEK, w, h)
            cv2.fillPoly(mask, [forehead, nose, r_inner, l_inner], 1.0)
        else:
            # Fallback ellipse on forehead/nose
            cv2.ellipse(mask, (w // 2, int(h * 0.35)), (int(w * 0.25), int(h * 0.12)), 0, 0, 360, 1.0, -1)
            cv2.ellipse(mask, (w // 2, int(h * 0.52)), (int(w * 0.08), int(h * 0.16)), 0, 0, 360, 1.0, -1)

    elif zone_type == "cheeks":
        color_rgb = interpolate_color(DRYNESS_PALETTE, score)
        legend = {
            "title": "Moisture / Dryness",
            "min_label": "Slightly dry",
            "max_label": "Very dry",
            "score": round(score, 3),
            "marker_pos_pct": round(max(15.0, min(85.0, float(score) * 100)), 1),
            "color_hex": f"#{color_rgb[0]:02x}{color_rgb[1]:02x}{color_rgb[2]:02x}",
            "palette": ["#bae6fd", "#38bdf8", "#2563eb"],
        }
        if landmarks:
            r_cheek = _get_polygon(landmarks, RIGHT_CHEEK_INDICES, w, h)
            l_cheek = _get_polygon(landmarks, LEFT_CHEEK_INDICES, w, h)
            cv2.fillPoly(mask, [r_cheek, l_cheek], 1.0)
        else:
            cv2.ellipse(mask, (int(w * 0.35), int(h * 0.55)), (int(w * 0.12), int(h * 0.10)), 0, 0, 360, 1.0, -1)
            cv2.ellipse(mask, (int(w * 0.65), int(h * 0.55)), (int(w * 0.12), int(h * 0.10)), 0, 0, 360, 1.0, -1)

    elif zone_type == "normal":
        color_rgb = interpolate_color(NORMAL_PALETTE, score)
        legend = {
            "title": "Balanced Skin",
            "min_label": "Normal balance",
            "max_label": "Optimal",
            "score": round(score, 3),
            "marker_pos_pct": round(max(15.0, min(85.0, float(score) * 100)), 1),
            "color_hex": f"#{color_rgb[0]:02x}{color_rgb[1]:02x}{color_rgb[2]:02x}",
            "palette": ["#a7f3d0", "#34d399", "#059669"],
        }
        if landmarks:
            oval = _get_polygon(landmarks, OVAL_INDICES, w, h)
            cv2.fillPoly(mask, [oval], 0.75)
        else:
            cv2.ellipse(mask, (w // 2, h // 2), (int(w * 0.35), int(h * 0.42)), 0, 0, 360, 0.75, -1)

    else:  # skin_tone / whole_face
        norm_class = str(pred_class or "").lower()
        if "fair" in norm_class:
            marker_pos_pct = round(16.0 + (1.0 - float(score)) * 8.0, 1) # 16% - 24% (near Fair at top)
            color_rgb = (253, 230, 138)
        elif "dark" in norm_class:
            marker_pos_pct = round(84.0 - (1.0 - float(score)) * 8.0, 1) # 76% - 84% (near Dark at bottom)
            color_rgb = (120, 53, 15)
        else:  # medium or default
            marker_pos_pct = 50.0
            color_rgb = (217, 119, 6)

        legend = {
            "title": "Skin Tone Undertone",
            "min_label": "Fair",
            "max_label": "Dark",
            "score": round(score, 3),
            "marker_pos_pct": marker_pos_pct,
            "color_hex": f"#{color_rgb[0]:02x}{color_rgb[1]:02x}{color_rgb[2]:02x}",
            "palette": ["#fde68a", "#d97706", "#78350f"],
        }
        if landmarks:
            oval = _get_polygon(landmarks, OVAL_INDICES, w, h)
            cv2.fillPoly(mask, [oval], 0.7)
        else:
            cv2.ellipse(mask, (w // 2, h // 2), (int(w * 0.35), int(h * 0.42)), 0, 0, 360, 0.7, -1)

    # Soft Gaussian blur for organic edge feathering
    kernel_size = max(15, (min(w, h) // 16) | 1)  # Ensure odd
    mask = cv2.GaussianBlur(mask, (kernel_size, kernel_size), 0)

    # Convert RGB color to BGR for OpenCV blending
    color_bgr = np.array([color_rgb[2], color_rgb[1], color_rgb[0]], dtype=np.float32)
    img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR).astype(np.float32)

    # Alpha blending: 45% tint strength inside active zone
    alpha = (mask[..., None] * 0.45)
    blended = (1.0 - alpha) * img_bgr + alpha * color_bgr
    blended = np.clip(blended, 0, 255).astype(np.uint8)

    # Encode to PNG base64
    _, buffer = cv2.imencode(".png", blended)
    overlay_base64 = base64.b64encode(buffer).decode("utf-8")

    return overlay_base64, legend
