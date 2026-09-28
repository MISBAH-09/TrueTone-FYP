import cv2
import numpy as np
import torch
import base64
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
from pytorch_grad_cam.utils.image import show_cam_on_image

def find_last_conv_layer(model):
    """Return the last nn.Conv2d module in the model."""
    last_conv = None
    for module in model.modules():
        if isinstance(module, torch.nn.Conv2d):
            last_conv = module
    if last_conv is None:
        raise ValueError("No Conv2d layer found — check model structure")
    return last_conv

def render_dynamic_region_overlay(rgb_display_image, grayscale_cam, task_type="skin_disease", label=None):
    """
    Renders dynamic, data-driven diagnostic overlay based on ACTUAL GradCAM activation:
    - Finds the actual region(s) of the face where the model detected the class
    - Draws an organic boundary contour around the affected region
    - Places diagnostic pinpoint dots targeting focal points
    - Completely data-driven: no hardcoded butterfly or mock positions
    """
    output_image = (rgb_display_image * 255).astype(np.uint8)
    h, w = output_image.shape[:2]
    overlay_bgr = cv2.cvtColor(output_image, cv2.COLOR_RGB2BGR)

    if grayscale_cam is None:
        _, buffer_marker = cv2.imencode('.png', overlay_bgr)
        return base64.b64encode(buffer_marker).decode('utf-8')

    # Resize CAM to display image dimensions
    if grayscale_cam.shape[:2] != (h, w):
        cam_resized = cv2.resize(grayscale_cam, (w, h))
    else:
        cam_resized = grayscale_cam.copy()

    # Normalize CAM to 0.0 - 1.0
    c_min = float(np.min(cam_resized))
    c_max = float(np.max(cam_resized))
    if c_max > c_min:
        cam_norm = (cam_resized - c_min) / (c_max - c_min)
    else:
        cam_norm = cam_resized

    # Note: grayscale_cam is already masked by face_mask in generate_heatmap
    cam_norm = cam_resized

    # Adaptive threshold to isolate the actual hot disease zone(s)
    # Target top 18-20% activation area (or threshold >= 0.40)
    thresh_val = max(0.38, float(np.percentile(cam_norm, 80)))
    hot_mask = (cam_norm >= thresh_val).astype(np.uint8) * 255

    # Morphological closing to join contiguous lesion/inflammation regions
    k_size = max(9, int(w * 0.035) | 1)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k_size, k_size))
    hot_mask_closed = cv2.morphologyEx(hot_mask, cv2.MORPH_CLOSE, kernel)

    # Gaussian blur to create smooth, natural lesion contours
    blur = cv2.GaussianBlur(hot_mask_closed, (k_size, k_size), 0)
    _, smooth_mask = cv2.threshold(blur, 110, 255, cv2.THRESH_BINARY)

    # Find actual contours of the detected disease regions
    contours, _ = cv2.findContours(smooth_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_TC89_KCOS)

    # Filter out tiny noise contours, keep primary disease clusters (up to top 3)
    min_area = (w * h) * 0.004
    valid_contours = [c for c in contours if cv2.contourArea(c) > min_area]
    valid_contours = sorted(valid_contours, key=cv2.contourArea, reverse=True)[:3]

    if valid_contours:
        # Determine colors based on task and label
        if task_type == "skin_disease":
            border_color = (94, 63, 244) # Rose/Violet
            dot_color_1 = (68, 68, 239)  # Red
            dot_color_2 = (21, 204, 250) # Gold
        elif task_type == "skin_type":
            lbl = str(label or "").lower()
            if lbl in ["oily", "combination"]:
                border_color = (0, 165, 255) # Orange BGR
                dot_color_1 = (0, 165, 255)
                dot_color_2 = (0, 215, 255) # Gold
            elif lbl == "dry":
                border_color = (255, 191, 0) # Deep Sky Blue BGR
                dot_color_1 = (255, 191, 0)
                dot_color_2 = (255, 255, 0) # Cyan
            else:
                border_color = (105, 150, 5) # Green
                dot_color_1 = (105, 150, 5)
                dot_color_2 = (153, 211, 52)
        else: # skin_tone
            border_color = (255, 255, 255) # White
            dot_color_1 = (255, 255, 255)
            dot_color_2 = (200, 200, 200)

        if task_type == "skin_disease":
            cv2.drawContours(overlay_bgr, valid_contours, -1, border_color, 1, lineType=cv2.LINE_AA)

            # Create combined mask of the disease regions for pinpoint dots
            disease_mask = np.zeros((h, w), dtype=np.uint8)
            cv2.drawContours(disease_mask, valid_contours, -1, 255, -1)

            y_coords, x_coords = np.where(disease_mask > 0)
            if len(x_coords) > 10:
                weights = cam_norm[y_coords, x_coords]
                weights = np.maximum(weights, 0.02)
                probs = weights / weights.sum()

                np.random.seed(42)
                num_dots = min(45, len(x_coords))
                sampled = np.random.choice(len(x_coords), size=num_dots, replace=False, p=probs)
                dot_radius = max(1, int(round(min(w, h) * 0.0025)))
                for i, idx in enumerate(sampled):
                    px, py = int(x_coords[idx]), int(y_coords[idx])
                    dot_color = dot_color_1 if (i % 2 == 0) else dot_color_2
                    cv2.circle(overlay_bgr, (px, py), dot_radius, dot_color, -1, lineType=cv2.LINE_AA)
        else:
            # For Skin Type and Skin Tone, use a semi-transparent filled mask
            mask_layer = overlay_bgr.copy()
            cv2.drawContours(mask_layer, valid_contours, -1, border_color, -1, lineType=cv2.LINE_AA)
            alpha = 0.45
            cv2.addWeighted(mask_layer, alpha, overlay_bgr, 1 - alpha, 0, overlay_bgr)
    _, buffer_marker = cv2.imencode('.png', overlay_bgr)
    return base64.b64encode(buffer_marker).decode('utf-8')


def generate_heatmap(model, input_tensor, rgb_display_image, target_class_idx, task_type="skin_disease", label=None):
    """
    model: PyTorch model
    input_tensor: Normalized tensor, shape (1, 3, H, W)
    rgb_display_image: Numpy array, shape (H, W, 3), values 0-1, RGB
    target_class_idx: Integer
    """
    target_layers = [find_last_conv_layer(model)]
    
    with GradCAM(model=model, target_layers=target_layers) as cam:
        targets = [ClassifierOutputTarget(target_class_idx)]
        grayscale_cam = cam(input_tensor=input_tensor, targets=targets)[0]
        
    h, w = rgb_display_image.shape[:2]
    face_mask_uint8 = np.zeros((h, w), dtype=np.uint8)
    try:
        from inference.face_crop import detect_face_landmarks, OVAL_INDICES
        img_uint8 = (rgb_display_image * 255).astype(np.uint8)
        landmarks, num_faces = detect_face_landmarks(img_uint8)
        if landmarks:
            xs = [landmarks[idx].x * w for idx in OVAL_INDICES]
            ys = [landmarks[idx].y * h for idx in OVAL_INDICES]
            polygon_points = np.array([[[int(xs[i]), int(ys[i])] for i in range(len(xs))]], dtype=np.int32)
            cv2.fillPoly(face_mask_uint8, polygon_points, 1)
        else:
            face_mask_uint8.fill(1)
    except Exception as e:
        print(f"[gradcam] Face mask error in heatmap: {e}")
        face_mask_uint8.fill(1)

    # Strictly mask out grayscale_cam before ANY visualizations
    grayscale_cam = grayscale_cam * face_mask_uint8.astype(np.float32)
    
    # 1. Full Heatmap
    visualization = show_cam_on_image(rgb_display_image, grayscale_cam, use_rgb=True, image_weight=0.55)
    vis_bgr = cv2.cvtColor(visualization, cv2.COLOR_RGB2BGR)
    
    # Mask out background from heatmap visual so it remains the original image (or transparent)
    # Wait, the user wants the heatmap to just NOT show on the background. 
    # But if we mask vis_bgr (which contains the original image + heatmap), we lose the background entirely!
    # Instead, we just blend the heatmap ONLY on the face mask!
    
    # Generate heatmap ONLY on face
    heatmap_only = show_cam_on_image(np.zeros_like(rgb_display_image), grayscale_cam, use_rgb=True, image_weight=1.0)
    heatmap_only_bgr = cv2.cvtColor(heatmap_only, cv2.COLOR_RGB2BGR)
    
    # vis_bgr has the heatmap overlaid on the original image everywhere
    # We want original image where mask==0, and vis_bgr where mask==1
    orig_bgr = (rgb_display_image * 255).astype(np.uint8)
    orig_bgr = cv2.cvtColor(orig_bgr, cv2.COLOR_RGB2BGR)
    
    vis_bgr_masked = np.where(face_mask_uint8[:, :, None] == 1, vis_bgr, orig_bgr)
    
    _, buffer_heatmap = cv2.imencode('.png', vis_bgr_masked)
    heatmap_base64 = base64.b64encode(buffer_heatmap).decode('utf-8')
    
    # 2. Dynamic Region Marker based on actual GradCAM activation
    marker_base64 = render_dynamic_region_overlay(rgb_display_image, grayscale_cam, task_type, label)
    
    return marker_base64, heatmap_base64
