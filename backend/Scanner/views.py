import base64
import json
import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from Users.middleware import require_token
from groq_client import groq_chat
from recommendation_engine import get_engine, UserProfile
from .models import ProductScan

logger = logging.getLogger("Scanner")


def _profile_for(user):
    return UserProfile(
        skin_type=user.skin_type,
        skin_conditions=user.skin_disease_list(),
        skin_tone=user.skin_tone,
        age_bracket=user.age_bracket,
        allergies=user.allergies_list(),
        is_pregnant_or_breastfeeding=user.is_pregnant_or_breastfeeding,
        current_product_ids=user.current_products_list(),
    )


def _scan_payload(scan, request):
    return {
        'id': scan.id,
        'ingredients': scan.ingredients,
        'score': scan.score,
        'is_safe': scan.is_safe,
        'reasons': scan.reasons,
        'warnings': scan.warnings,
        'flags': scan.flags,
        'matched_ingredients': scan.matched_ingredients,
        'image': request.build_absolute_uri(scan.image.url) if scan.image else None,
        'created_at': scan.created_at.isoformat(),
    }

class ScanProductAPI(APIView):

    @swagger_auto_schema(
        tags=["Product Scanner"],
        operation_summary="Extract ingredients from a product image and score them",
        consumes=['multipart/form-data'],
        manual_parameters=[
            openapi.Parameter(
                'Authorization',
                openapi.IN_HEADER,
                description="Authentication token",
                type=openapi.TYPE_STRING,
                required=True
            ),
            openapi.Parameter(
                name='image',
                in_=openapi.IN_FORM,
                type=openapi.TYPE_FILE,
                required=True,
                description='Product label image'
            )
        ]
    )
    @require_token
    def post(self, request):
        user = getattr(request, 'auth_user', None)
        if not user:
            return Response({'success': False, 'message': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
            
        if 'image' not in request.FILES:
            return Response({'success': False, 'message': 'No image provided.'}, status=status.HTTP_400_BAD_REQUEST)
            
        image_file = request.FILES['image']
        
        try:
            raw = image_file.read()
            mime = image_file.content_type or "image/jpeg"
            if mime not in ("image/jpeg", "image/png", "image/gif", "image/webp"):
                mime = "image/jpeg"
            data_url = f"data:{mime};base64,{base64.b64encode(raw).decode()}"
            
            prompt = """
            Read the ingredients listed on this product label.
            Return ONLY a valid JSON array of ingredient name strings.
            Do not include any markdown formatting, backticks, or other text.
            Example: ["Aqua", "Glycerin", "Niacinamide"]
            """
            response_text = groq_chat(
                [{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                }],
                temperature=0,
                max_tokens=700,
            ).strip()
            
            # Clean up markdown if the model wrapped the JSON
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
                
            response_text = response_text.strip()
            start = response_text.find("[")
            end = response_text.rfind("]")
            if start != -1 and end != -1:
                response_text = response_text[start:end + 1]
            
            ingredients = json.loads(response_text)
            
            if not isinstance(ingredients, list):
                raise ValueError("Response is not a JSON list")
                
            # Strip the "ING: " prefix from the ingredients
            cleaned_ingredients = []
            for ing in ingredients:
                ing = str(ing).strip()
                if ing.upper().startswith("ING:"):
                    ing = ing[4:].strip()
                cleaned_ingredients.append(ing)
            
            ingredients = cleaned_ingredients

            engine = get_engine()
            scored = engine.score_scanned_ingredients(ingredients, _profile_for(user))

            image_file.seek(0)
            scan = ProductScan.objects.create(
                user=user,
                ingredients=ingredients,
                score=scored["score"],
                is_safe=scored["is_safe"],
                reasons=scored["reasons"],
                warnings=scored["warnings"],
                flags=scored["flags"],
                matched_ingredients=scored["matched_ingredients"],
                image=image_file,
            )

            data = _scan_payload(scan, request)
            data["unmatched_ingredients"] = scored["unmatched_ingredients"]
            return Response({
                'success': True,
                'message': 'Ingredients extracted and scored',
                'data': data,
            }, status=status.HTTP_200_OK)
            
        except json.JSONDecodeError:
            logger.error(f"Failed to parse ingredient list as JSON: {response_text}")
            return Response({'success': False, 'message': 'Failed to extract ingredients clearly from the image.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.error(f"Scanner API error: {e}")
            return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ScanHistoryAPI(APIView):

    @require_token
    def get(self, request):
        user = request.auth_user
        scans = ProductScan.objects.filter(user=user)
        return Response({
            'success': True,
            'message': '',
            'data': [_scan_payload(scan, request) for scan in scans],
        }, status=status.HTTP_200_OK)
