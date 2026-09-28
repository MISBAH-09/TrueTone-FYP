import cv2
import numpy as np
import mediapipe as mp
import os
from pathlib import Path

# Paths to models
MODELS_DIR = Path(__file__).parent
FACE_LANDMARKER_PATH = str(MODELS_DIR / 'face_landmarker.task')
IMAGE_SEGMENTER_PATH = str(MODELS_DIR / 'selfie_multiclass_256x256.tflite')

# Mediapipe setups
BaseOptions = mp.tasks.BaseOptions

# Initialize landmarker
FaceLandmarker = mp.tasks.vision.FaceLandmarker
FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
landmarker_options = FaceLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=FACE_LANDMARKER_PATH),
    running_mode=mp.tasks.vision.RunningMode.IMAGE)
try:
    _landmarker = FaceLandmarker.create_from_options(landmarker_options)
except Exception as e:
    _landmarker = None
    print(f"Failed to load FaceLandmarker: {e}")

# Initialize segmenter
ImageSegmenter = mp.tasks.vision.ImageSegmenter
ImageSegmenterOptions = mp.tasks.vision.ImageSegmenterOptions
segmenter_options = ImageSegmenterOptions(
    base_options=BaseOptions(model_asset_path=IMAGE_SEGMENTER_PATH),
    running_mode=mp.tasks.vision.RunningMode.IMAGE,
    output_category_mask=True,
    output_confidence_masks=False)
try:
    _segmenter = ImageSegmenter.create_from_options(segmenter_options)
except Exception as e:
    _segmenter = None
    print(f"Failed to load ImageSegmenter: {e}")

# Indices for mask building
OVAL_INDICES = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
LEFT_EYE_INDICES = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
RIGHT_EYE_INDICES = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
LIPS_INDICES = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 185, 40, 39, 37, 0, 267, 269, 270, 409, 415, 310, 311, 312, 13, 82, 81, 42, 183, 78]
LEFT_EYEBROW_INDICES = [276, 283, 282, 295, 285, 300, 293, 334, 296, 336]
RIGHT_EYEBROW_INDICES = [46, 53, 52, 65, 55, 70, 63, 105, 66, 107]

def _build_polygon_mask(shape, landmarks, indices):
    """Builds a filled polygon mask of the given shape using specified landmark indices."""
    mask = np.zeros(shape[:2], dtype=np.uint8)
    if not landmarks:
        return mask
    points = np.array([
        [int(landmarks[idx].x * shape[1]), int(landmarks[idx].y * shape[0])]
        for idx in indices
    ], dtype=np.int32)
    # Use convex hull for eyes/lips to ensure solid shape, or just fillPoly
    if indices != OVAL_INDICES:
        points = cv2.convexHull(points)
    cv2.fillPoly(mask, [points], 255)
    return mask

def segment_and_fill(pil_img):
    """
    Takes a PIL Image.
    Returns (filled_pil_img, is_successful).
    """
    if _landmarker is None or _segmenter is None:
        return pil_img, False

    img_np = np.array(pil_img.convert("RGB"))
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_np)

    # 1. Get Face Landmarks
    detection_result = _landmarker.detect(mp_image)
    if not detection_result.face_landmarks:
        return pil_img, False
    
    landmarks = detection_result.face_landmarks[0]
    
    # 2. Get Face Oval and exclude masks
    oval_mask = _build_polygon_mask(img_np.shape, landmarks, OVAL_INDICES)
    left_eye_mask = _build_polygon_mask(img_np.shape, landmarks, LEFT_EYE_INDICES)
    right_eye_mask = _build_polygon_mask(img_np.shape, landmarks, RIGHT_EYE_INDICES)
    lips_mask = _build_polygon_mask(img_np.shape, landmarks, LIPS_INDICES)
    left_eyebrow_mask = _build_polygon_mask(img_np.shape, landmarks, LEFT_EYEBROW_INDICES)
    right_eyebrow_mask = _build_polygon_mask(img_np.shape, landmarks, RIGHT_EYEBROW_INDICES)

    # 3. Get Face Skin Mask from Segmenter
    segmentation_result = _segmenter.segment(mp_image)
    category_mask = segmentation_result.category_mask.numpy_view()
    
    # 3 is face-skin
    face_skin_mask = (category_mask == 3).astype(np.uint8) * 255
    # The segmenter outputs 256x256 typically, but the tasks API automatically scales category_mask to input size!
    
    # 4. Combine
    # Keep only what is in the oval AND is face_skin
    final_mask = cv2.bitwise_and(oval_mask, face_skin_mask)
    
    # Exclude eyes, eyebrows, lips
    exclude_mask = left_eye_mask | right_eye_mask | lips_mask | left_eyebrow_mask | right_eyebrow_mask
    final_mask = cv2.bitwise_and(final_mask, cv2.bitwise_not(exclude_mask))
    
    # Also we want to FILL the regions INSIDE the oval that are EXCLUDED.
    # We shouldn't fill the background. 
    # Regions to fill = oval_mask AND NOT final_mask
    to_fill_mask = cv2.bitwise_and(oval_mask, cv2.bitwise_not(final_mask))
    
    # 5. Fill excluded regions
    # Calculate median color of valid skin
    valid_skin_pixels = img_np[final_mask == 255]
    if len(valid_skin_pixels) == 0:
        return pil_img, False
        
    median_color = np.median(valid_skin_pixels, axis=0)
    
    # Create the output image
    filled_img = img_np.copy()
    
    # Fill the `to_fill_mask` area with the median color
    filled_img[to_fill_mask == 255] = median_color
    
    # Set background (outside oval) to black (or keep as is, but model should just see black)
    # The plan says "the oval shape stays complete and whole", "feed the model a clean skin-only oval".
    # So everything outside the oval should be black.
    filled_img[oval_mask == 0] = [0, 0, 0]
    
    # Crop to the bounding box of the oval mask to ensure the face fills the frame
    y_indices, x_indices = np.where(oval_mask == 255)
    if len(y_indices) > 0 and len(x_indices) > 0:
        y_min, y_max = y_indices.min(), y_indices.max()
        x_min, x_max = x_indices.min(), x_indices.max()
        
        # Add a tiny 2% padding
        h, w = y_max - y_min, x_max - x_min
        pad_y, pad_x = int(h * 0.02), int(w * 0.02)
        y_min = max(0, y_min - pad_y)
        y_max = min(img_np.shape[0], y_max + pad_y)
        x_min = max(0, x_min - pad_x)
        x_max = min(img_np.shape[1], x_max + pad_x)
        
        filled_img = filled_img[y_min:y_max, x_min:x_max]
        
    from PIL import Image
    return Image.fromarray(filled_img), True
