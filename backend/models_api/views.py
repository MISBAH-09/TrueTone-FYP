"""
TrueTone API Views
==================
Django views that expose the skin analysis pipeline as REST API endpoints.

Endpoints:
    GET  /              — Frontend upload page
    POST /api/analyze_all   — Upload image → get predictions
    GET  /api/health    — Server health check
    GET  /api/models    — Model information
"""

import json
import logging
import traceback

from django.http import JsonResponse, HttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

logger = logging.getLogger("models_api.views")


# ═══════════════════════════════════════════════════════════════
#  GET / — Frontend Page
# ═══════════════════════════════════════════════════════════════
def index(request):
    """Serve the frontend upload page."""
    return render(request, 'index.html')

# ═══════════════════════════════════════════════════════════════
#  POST /api/analyze_all — Image Analysis
# ═══════════════════════════════════════════════════════════════
@csrf_exempt
@require_http_methods(["POST"])
def analyze_all(request):
    """
    Accept an uploaded image and return skin analysis predictions.

    Request:
        POST /api/analyze_all
        Content-Type: multipart/form-data
        Body: image=<file>

    Response (200): JSON with predictions, confidence, warnings
    Response (400): JSON with error details
    Response (503): JSON if models not loaded
    """
    try:
        # ── Step 1: Check if file was uploaded ────────────────────────
        if 'image' not in request.FILES:
            return JsonResponse({
                "status": "error",
                "error_code": "NO_FILE",
                "message": "No image file uploaded. Send a file with key 'image'.",
            }, status=400)

        uploaded_file = request.FILES['image']

        # ── Step 2: Basic server-side checks ──────────────────────────
        if uploaded_file.size == 0:
            return JsonResponse({
                "status": "error",
                "error_code": "EMPTY_FILE",
                "message": "Uploaded file is empty.",
            }, status=400)

        if uploaded_file.size > 10 * 1024 * 1024:
            return JsonResponse({
                "status": "error",
                "error_code": "FILE_TOO_LARGE",
                "message": f"File is {uploaded_file.size / 1e6:.1f} MB. Maximum is 10 MB.",
            }, status=400)

        # ── Step 3: Read bytes and get filename ───────────────────────
        image_bytes = uploaded_file.read()
        filename = uploaded_file.name or "upload.jpg"

        # ── Step 4: Get pipeline and run analysis ─────────────────────
        try:
            from pipeline_engine import get_pipeline
            pipeline = get_pipeline()
        except Exception as e:
            logger.error(f"Pipeline initialization failed: {e}")
            return JsonResponse({
                "status": "error",
                "error_code": "SERVICE_UNAVAILABLE",
                "message": "ML models are not loaded. Please try again later.",
                "detail": str(e),
            }, status=503)

        result = pipeline.analyze_all(image_bytes, filename)

        # ── Step 5: Return response with appropriate status code ──────
        if result.get("status") == "error":
            return JsonResponse(result, status=400)
        elif result.get("status") == "partial_error":
            return JsonResponse(result, status=207)
        else:
            return JsonResponse(result, status=200)

    except Exception as e:
        logger.error(f"Unhandled error in analyze_all: {traceback.format_exc()}")
        return JsonResponse({
            "status": "error",
            "error_code": "INTERNAL_ERROR",
            "message": "An unexpected error occurred. Please try again.",
        }, status=500)



# ═══════════════════════════════════════════════════════════════
#  GET /api/health — Health Check
# ═══════════════════════════════════════════════════════════════
@require_http_methods(["GET"])
def health_check(request):
    """Return server and model status."""
    try:
        from pipeline_engine import get_pipeline
        pipeline = get_pipeline()
        health = pipeline.health_check()
        status_code = 200 if health["status"] == "healthy" else 503
        return JsonResponse(health, status=status_code)
    except Exception as e:
        return JsonResponse({
            "status": "unhealthy",
            "error": str(e),
            "models_loaded": {
                "skin_type": False,
                "skin_tone": False,
                "skin_disease": False,
            },
        }, status=503)


# ═══════════════════════════════════════════════════════════════
#  GET /api/models — Model Information
# ═══════════════════════════════════════════════════════════════
@require_http_methods(["GET"])
def model_info(request):
    """Return information about loaded models."""
    try:
        from pipeline_engine import Config
        return JsonResponse({
            "status": "success",
            "models": {
                "skin_type": {
                    "classes": Config.SKIN_TYPE_CLASSES,
                    "num_classes": len(Config.SKIN_TYPE_CLASSES),
                    "checkpoint": Config.SKIN_TYPE_MODEL.split("/")[-1],
                    "confidence_threshold": Config.CONFIDENCE_THRESH,
                },
                "skin_tone": {
                    "classes": Config.SKIN_TONE_CLASSES,
                    "num_classes": len(Config.SKIN_TONE_CLASSES),
                    "checkpoint": Config.SKIN_TONE_MODEL.split("/")[-1],
                    "confidence_threshold": Config.CONFIDENCE_THRESH,
                },
                "skin_disease": {
                    "classes": Config.SKIN_DISEASE_CLASSES,
                    "num_classes": len(Config.SKIN_DISEASE_CLASSES),
                    "checkpoint": Config.SKIN_DISEASE_MODEL.split("/")[-1],
                    "confidence_threshold": Config.DISEASE_THRESH,
                },
            },
            "device": Config.DEVICE,
            "image_size": Config.IMAGE_SIZE,
            "max_upload_mb": Config.MAX_IMAGE_BYTES // (1024 * 1024),
            "allowed_formats": sorted(Config.ALLOWED_EXTENSIONS),
        })
    except Exception as e:
        return JsonResponse({
            "status": "error",
            "message": str(e),
        }, status=500)

# ═══════════════════════════════════════════════════════════════
#  SHARED UPLOAD HELPER
#  All focused endpoints funnel through here so file-validation
#  logic lives in exactly one place.
# ═══════════════════════════════════════════════════════════════
def _handle_upload(request, pipeline_method_name):
    """
    Extract and validate the uploaded image, then dispatch to the
    named pipeline method.  Returns a Django JsonResponse.

    Args:
        request              – Django HttpRequest (must be POST with FILES)
        pipeline_method_name – string, e.g. "analyze_all", "analyze_skin_type"
    """
    if "image" not in request.FILES:
        return JsonResponse({
            "status": "error",
            "error_code": "NO_FILE",
            "message": "No image file uploaded. Send a file with key 'image'.",
        }, status=400)

    uploaded_file = request.FILES["image"]

    if uploaded_file.size == 0:
        return JsonResponse({
            "status": "error",
            "error_code": "EMPTY_FILE",
            "message": "Uploaded file is empty.",
        }, status=400)

    if uploaded_file.size > 10 * 1024 * 1024:
        return JsonResponse({
            "status": "error",
            "error_code": "FILE_TOO_LARGE",
            "message": f"File is {uploaded_file.size / 1e6:.1f} MB. Maximum is 10 MB.",
        }, status=400)

    image_bytes = uploaded_file.read()
    filename = uploaded_file.name or "upload.jpg"

    try:
        from pipeline_engine import get_pipeline
        pipeline = get_pipeline()
    except Exception as e:
        logger.error(f"Pipeline initialization failed: {e}")
        return JsonResponse({
            "status": "error",
            "error_code": "SERVICE_UNAVAILABLE",
            "message": "ML models are not loaded. Please try again later.",
            "detail": str(e),
        }, status=503)

    try:
        method = getattr(pipeline, pipeline_method_name)
        result = method(image_bytes, filename)
    except Exception as e:
        logger.error(f"Unhandled error in {pipeline_method_name}: {e}", exc_info=True)
        return JsonResponse({
            "status": "error",
            "error_code": "INTERNAL_ERROR",
            "message": "An unexpected error occurred. Please try again.",
        }, status=500)

    if result.get("status") == "error":
        return JsonResponse(result, status=400)
    elif result.get("status") == "partial_error":
        return JsonResponse(result, status=207)
    return JsonResponse(result, status=200)

# ═══════════════════════════════════════════════════════════════
#  POST /api/analyze_skin
#  Skin type + Skin tone (no disease model).
# ═══════════════════════════════════════════════════════════════
@csrf_exempt
@require_http_methods(["POST"])
def analyze_skin(request):
    """
    Run skin_type + skin_tone models in parallel.
    Use when disease analysis is not needed (faster, lighter).

    Request:
        POST /api/analyze_skin
        Content-Type: multipart/form-data
        Body: image=<file>

    Response (200): predictions for skin_type and skin_tone
    """
    try:
        return _handle_upload(request, "analyze_skin")
    except Exception as e:
        logger.error(f"Unhandled error in analyze_skin: {e}", exc_info=True)
        return JsonResponse({
            "status": "error",
            "error_code": "INTERNAL_ERROR",
            "message": "An unexpected error occurred. Please try again.",
        }, status=500)

# ═══════════════════════════════════════════════════════════════
#  POST /api/analyze_skin_type
#  Skin type only (combination / dry / normal / oily).
# ═══════════════════════════════════════════════════════════════
@csrf_exempt
@require_http_methods(["POST"])
def analyze_skin_type(request):
    """
    Run only the skin-type model.

    Request:
        POST /api/analyze_skin_type
        Content-Type: multipart/form-data
        Body: image=<file>

    Response (200): skin_type label, confidence, distribution
    """
    try:
        # logger.info("analyze_skin_type called")
        result = _handle_upload(request, "analyze_skin_type")
        # logger.info(result)
        return result
    except Exception as e:
        logger.error(f"Unhandled error in analyze_skin_type: {e}", exc_info=True)
        return JsonResponse({
            "status": "error",
            "error_code": "INTERNAL_ERROR",
            "message": "An unexpected error occurred. Please try again.",
        }, status=500)

# ═══════════════════════════════════════════════════════════════
#  POST /api/analyze_skin_tone
#  Skin tone only (dark / fair / medium).
# ═══════════════════════════════════════════════════════════════
@csrf_exempt
@require_http_methods(["POST"])
def analyze_skin_tone(request):
    """
    Run only the skin-tone model.

    Request:
        POST /api/analyze_skin_tone
        Content-Type: multipart/form-data
        Body: image=<file>

    Response (200): skin_tone label, confidence, distribution
    """
    try:
        result = _handle_upload(request, "analyze_skin_tone")
        print(result)
        return result
    except Exception as e:
        logger.error(f"Unhandled error in analyze_skin_tone: {e}", exc_info=True)
        return JsonResponse({
            "status": "error",
            "error_code": "INTERNAL_ERROR",
            "message": "An unexpected error occurred. Please try again.",
        }, status=500)

# ═══════════════════════════════════════════════════════════════
#  POST /api/analyze_skin_disease
#  Skin disease only (acne variants / eczema / psoriasis / etc.)
# ═══════════════════════════════════════════════════════════════
@csrf_exempt
@require_http_methods(["POST"])
def analyze_skin_disease(request):
    """
    Run only the skin-disease model.

    Request:
        POST /api/analyze_skin_disease
        Content-Type: multipart/form-data
        Body: image=<file>

    Response (200): skin_disease label, confidence, disease_detected flag,
                    distribution
    """
    try:
        return _handle_upload(request, "analyze_skin_disease")
    except Exception as e:
        logger.error(f"Unhandled error in analyze_skin_disease: {e}", exc_info=True)
        return JsonResponse({
            "status": "error",
            "error_code": "INTERNAL_ERROR",
            "message": "An unexpected error occurred. Please try again.",
        }, status=500)