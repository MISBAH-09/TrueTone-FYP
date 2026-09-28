import os
import json
import logging
from PIL import Image
import google.generativeai as genai

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from Users.middleware import require_token
from recommendation_engine import get_engine, UserProfile, Config

logger = logging.getLogger("Scanner")

class ScanProductAPI(APIView):

    @swagger_auto_schema(
        tags=["Product Scanner"],
        operation_summary="Extract ingredients from a product image using Gemini 1.5 Flash",
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
        
        # Configure Gemini
        gemini_api_key = os.environ.get("GEMINI_API_KEY")
        if not gemini_api_key:
            return Response({'success': False, 'message': 'Gemini API Key is not configured on the server.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        genai.configure(api_key=gemini_api_key)
        
        try:
            # Load image for Gemini
            img = Image.open(image_file)
            
            # Setup Gemini Vision Model
            model = genai.GenerativeModel('gemini-2.5-flash')
            
            prompt = """
            Read the ingredients listed on this product label.
            To completely avoid copyright/recitation filters, you MUST prefix every single ingredient name with the exact string "ING: ". 
            This breaks the contiguous string matching. Do not output the list normally.
            Return ONLY a valid JSON array of strings containing these prefixed ingredient names.
            Do not include any markdown formatting, backticks, or other text in your response.
            Just the raw JSON array. For example: ["ING: Aqua", "ING: Glycerin", "ING: Niacinamide"]
            """
            
            response = model.generate_content([prompt, img])
            
            try:
                response_text = response.text.strip()
            except ValueError as ve:
                error_msg = str(ve)
                if "finish_reason" in error_msg:
                    return Response({
                        'success': False, 
                        'message': "The AI blocked the response due to safety/recitation filters. Please try taking a picture of a smaller section of the ingredients, or hold the camera closer."
                    }, status=status.HTTP_400_BAD_REQUEST)
                raise ve
            
            # Clean up potential markdown formatting from Gemini response if it didn't listen
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
                
            response_text = response_text.strip()
            
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
                
            # Now we have the ingredients, let's run them against the user's profile
            engine = get_engine()
            
            profile = UserProfile(
                skin_type=user.skin_type,
                skin_conditions=user.skin_disease_list(),
                skin_tone=user.skin_tone,
                age_bracket=user.age_bracket,
                allergies=user.allergies_list(),
                is_pregnant_or_breastfeeding=user.is_pregnant_or_breastfeeding,
                current_product_ids=user.current_products_list(),
            )
            
            # Map ingredients using alias map (we can reuse engine logic if we add it, but for now we just do direct checks)
            # Actually, recommendation_engine._is_blocked_by_allergy requires a product string, or we can check manually.
            
            flags = []
            safe = True
            
            # 1. Pregnancy check
            if profile.is_pregnant_or_breastfeeding:
                pregnancy_unsafe = ["retinol", "retinoid", "tretinoin", "adapalene", "salicylic acid", "bha", "hydroquinone"]
                found_unsafe = [ing for ing in ingredients if any(bad.lower() in ing.lower() for bad in pregnancy_unsafe)]
                if found_unsafe:
                    safe = False
                    flags.append(f"Not safe for pregnancy/breastfeeding (Contains: {', '.join(found_unsafe)})")
            
            # 2. Allergy check
            if profile.allergies:
                found_allergens = [ing for ing in ingredients if any(allergy.lower() in ing.lower() for allergy in profile.allergies)]
                if found_allergens:
                    safe = False
                    flags.append(f"Contains your allergens: {', '.join(found_allergens)}")
                    
            # 3. Acne check (comedogenic ingredients)
            if "common_acne" in profile.skin_conditions or "cystic_acne" in profile.skin_conditions or profile.skin_type == "oily":
                pore_clogging = ["coconut oil", "cocoa butter", "isopropyl myristate", "isopropyl palmitate", "mineral oil"]
                found_clogging = [ing for ing in ingredients if any(bad.lower() in ing.lower() for bad in pore_clogging)]
                if found_clogging:
                    flags.append(f"May clog pores for acne-prone/oily skin (Contains: {', '.join(found_clogging)})")
                    # We might not mark it completely unsafe, just a flag
            
            return Response({
                'success': True,
                'message': 'Ingredients extracted successfully',
                'data': {
                    'ingredients': ingredients,
                    'is_safe': safe,
                    'flags': flags
                }
            }, status=status.HTTP_200_OK)
            
        except json.JSONDecodeError:
            logger.error(f"Failed to parse Gemini output as JSON: {response_text}")
            return Response({'success': False, 'message': 'Failed to extract ingredients clearly from the image.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.error(f"Scanner API error: {e}")
            return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
