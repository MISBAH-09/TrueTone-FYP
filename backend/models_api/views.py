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

from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger("models_api.views")


# ═══════════════════════════════════════════════════════════════
#  GET / — Frontend Page (Keep as function since it's just rendering HTML)
# ═══════════════════════════════════════════════════════════════
def index(request):
    """Serve the frontend upload page."""
    return render(request, 'index.html')


# ═══════════════════════════════════════════════════════════════
#  SHARED UPLOAD HELPER
# ═══════════════════════════════════════════════════════════════
def _handle_upload(request, pipeline_method_name):
    """
    Extract and validate the uploaded image, then dispatch to the
    named pipeline method.  Returns a tuple: (response_dict, status_code)
    """
    if "image" not in request.FILES:
        return {
            "success": False,
            "message": "No image file uploaded. Send a file with key 'image'.",
            "error_code": "NO_FILE",
            "data": None
        }, status.HTTP_400_BAD_REQUEST

    uploaded_file = request.FILES["image"]

    if uploaded_file.size == 0:
        return {
            "success": False,
            "message": "Uploaded file is empty.",
            "error_code": "EMPTY_FILE",
            "data": None
        }, status.HTTP_400_BAD_REQUEST

    if uploaded_file.size > 10 * 1024 * 1024:
        return {
            "success": False,
            "message": f"File is {uploaded_file.size / 1e6:.1f} MB. Maximum is 10 MB.",
            "error_code": "FILE_TOO_LARGE",
            "data": None
        }, status.HTTP_400_BAD_REQUEST

    image_bytes = uploaded_file.read()
    filename = uploaded_file.name or "upload.jpg"
    skip_face_check = str(request.POST.get("skip_face_check", "false")).lower() == "true"

    try:
        from pipeline_engine import get_pipeline
        pipeline = get_pipeline()
    except Exception as e:
        logger.error(f"Pipeline initialization failed: {e}")
        return {
            "success": False,
            "message": "ML models are not loaded. Please try again later.",
            "error_code": "SERVICE_UNAVAILABLE",
            "data": {"detail": str(e)}
        }, status.HTTP_503_SERVICE_UNAVAILABLE

    try:
        method = getattr(pipeline, pipeline_method_name)
        result = method(image_bytes, filename, skip_face_check=skip_face_check)
    except Exception as e:
        logger.error(f"Unhandled error in {pipeline_method_name}: {e}", exc_info=True)
        return {
            "success": False,
            "message": "An unexpected error occurred. Please try again.",
            "error_code": "INTERNAL_ERROR",
            "data": None
        }, status.HTTP_500_INTERNAL_SERVER_ERROR

    if result.get("status") == "error":
        return {
            "success": False,
            "message": "Analysis failed",
            "data": result
        }, status.HTTP_400_BAD_REQUEST
    elif result.get("status") == "partial_error":
        return {
            "success": True,
            "message": "Analysis completed with partial errors",
            "data": result
        }, status.HTTP_207_MULTI_STATUS
        
    return {
        "success": True,
        "message": "Analysis completed successfully",
        "data": result
    }, status.HTTP_200_OK


# ═══════════════════════════════════════════════════════════════
#  POST /api/analyze_all — Image Analysis
# ═══════════════════════════════════════════════════════════════
class AnalyzeAllAPI(APIView):
    def post(self, request):
        response_dict, status_code = _handle_upload(request, "analyze_all")
        return Response(response_dict, status=status_code)


# ═══════════════════════════════════════════════════════════════
#  GET /api/health — Health Check
# ═══════════════════════════════════════════════════════════════
class HealthCheckAPI(APIView):
    def get(self, request):
        try:
            from pipeline_engine import get_pipeline
            pipeline = get_pipeline()
            health = pipeline.health_check()
            status_code = status.HTTP_200_OK if health["status"] == "healthy" else status.HTTP_503_SERVICE_UNAVAILABLE
            return Response({
                "success": health["status"] == "healthy",
                "message": "Health check retrieved",
                "data": health
            }, status=status_code)
        except Exception as e:
            return Response({
                "success": False,
                "message": str(e),
                "data": {
                    "models_loaded": {
                        "skin_type": False,
                        "skin_tone": False,
                        "skin_disease": False,
                    }
                }
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)


# ═══════════════════════════════════════════════════════════════
#  GET /api/models — Model Information
# ═══════════════════════════════════════════════════════════════
class ModelInfoAPI(APIView):
    def get(self, request):
        try:
            from pipeline_engine import Config
            return Response({
                "success": True,
                "message": "Model info retrieved",
                "data": {
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
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                "success": False,
                "message": str(e),
                "data": None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ═══════════════════════════════════════════════════════════════
#  POST /api/analyze_skin
# ═══════════════════════════════════════════════════════════════
class AnalyzeSkinAPI(APIView):
    def post(self, request):
        response_dict, status_code = _handle_upload(request, "analyze_skin")
        return Response(response_dict, status=status_code)


# ═══════════════════════════════════════════════════════════════
#  POST /api/analyze_skin_type
# ═══════════════════════════════════════════════════════════════
class AnalyzeSkinTypeAPI(APIView):
    def post(self, request):
        response_dict, status_code = _handle_upload(request, "analyze_skin_type")
        return Response(response_dict, status=status_code)


# ═══════════════════════════════════════════════════════════════
#  POST /api/analyze_skin_tone
# ═══════════════════════════════════════════════════════════════
class AnalyzeSkinToneAPI(APIView):
    def post(self, request):
        response_dict, status_code = _handle_upload(request, "analyze_skin_tone")
        return Response(response_dict, status=status_code)


# ═══════════════════════════════════════════════════════════════
#  POST /api/analyze_skin_disease
# ═══════════════════════════════════════════════════════════════
class AnalyzeSkinDiseaseAPI(APIView):
    def post(self, request):
        response_dict, status_code = _handle_upload(request, "analyze_skin_disease")
        return Response(response_dict, status=status_code)