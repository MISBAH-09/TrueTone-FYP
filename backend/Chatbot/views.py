import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from Users.middleware import require_token
from groq_client import groq_chat
from recommendation_engine import get_engine, UserProfile
from .models import ChatSession, ChatMessage

logger = logging.getLogger("Chatbot")

GREETING = (
    "Hi! I'm TrueTone AI. Ask me about your skincare routine, ingredients, "
    "or product safety, and I'll answer based on your specific profile and recommendations!"
)

class ChatbotAskAPI(APIView):

    @swagger_auto_schema(
        tags=["Chatbot"],
        operation_summary="Ask AI a question grounded in user's profile and recommendations",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'message': openapi.Schema(type=openapi.TYPE_STRING, description="User's question"),
                'history': openapi.Schema(
                    type=openapi.TYPE_ARRAY, 
                    items=openapi.Schema(type=openapi.TYPE_OBJECT),
                    description="Chat history"
                )
            },
            required=['message']
        )
    )
    @require_token
    def post(self, request):
        user = getattr(request, 'auth_user', None)
        if not user:
            return Response({'success': False, 'message': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
            
        message = request.data.get('message')
        session_id = request.data.get('session_id')
        
        if not message:
            return Response({'success': False, 'message': 'Message is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Build user profile for context
        profile = UserProfile(
            skin_type=user.skin_type,
            skin_conditions=user.skin_disease_list(),
            skin_tone=user.skin_tone,
            age_bracket=user.age_bracket,
            allergies=user.allergies_list(),
            is_pregnant_or_breastfeeding=user.is_pregnant_or_breastfeeding,
            current_product_ids=user.current_products_list(),
        )
        
        # Generate recommendations to provide as context
        engine = get_engine()
        try:
            rec_result = engine.recommend(profile)
            recommendations_text = ""
            for category, products in rec_result["recommendations"].items():
                if products:
                    recommendations_text += f"\n{category.title()} Recommendations:\n"
                    for p in products[:3]: # Only send top 3 per category to save context
                        recommendations_text += f"- {p.name} ({p.brand_name}) - Match Score: {p.score}. Reasons: {', '.join(p.reasons[:2])}\n"
        except Exception as e:
            logger.error(f"Error fetching recommendations for chatbot context: {e}")
            recommendations_text = "Recommendations currently unavailable."
            
        # Build system prompt
        system_prompt = f"""
You are the TrueTone AI Chatbot, an expert skincare assistant. 
Your goal is to answer the user's skincare questions based strictly on their personalized TrueTone profile and recommended products.

USER PROFILE:
- Skin Type: {user.skin_type}
- Skin Tone: {user.skin_tone}
- Skin Conditions: {', '.join(profile.skin_conditions) if profile.skin_conditions else 'None'}
- Age Bracket: {user.age_bracket}
- Allergies: {', '.join(profile.allergies) if profile.allergies else 'None'}
- Pregnant/Breastfeeding: {'Yes' if user.is_pregnant_or_breastfeeding else 'No'}

TOP PRODUCT RECOMMENDATIONS FOR THIS USER:
{recommendations_text}

GUIDELINES:
1. Always prioritize the user's specific skin type, conditions, and allergies in your advice.
2. If the user asks for product recommendations, suggest products from the list above first.
3. If they ask about a product not on the list, evaluate it against their allergies and pregnancy status.
4. Keep answers concise, helpful, and friendly. Do not use overly technical jargon without explaining it.
5. If the user asks a non-skincare related question, politely decline and steer the conversation back to skincare.
6. Do not use emojis in your responses. Use markdown formatting instead.
"""

        created_session = None
        try:
            if session_id:
                session = ChatSession.objects.get(id=session_id, user=user)
            else:
                title = message.strip().replace("\n", " ")[:80] or "New chat"
                session = ChatSession.objects.create(user=user, title=title)
                created_session = session

            messages = [{"role": "system", "content": system_prompt}]
            for msg in session.messages.order_by('created_at'):
                if not msg.text:
                    continue
                role = 'user' if msg.role == 'user' else 'assistant'
                messages.append({"role": role, "content": msg.text})
            messages.append({"role": "user", "content": message.strip()})

            reply = groq_chat(messages).strip()

            ChatMessage.objects.create(session=session, role='user', text=message.strip())
            ChatMessage.objects.create(session=session, role='assistant', text=reply)
            session.save()

            return Response({
                'success': True,
                'message': 'Message processed successfully',
                'data': {
                    'reply': reply,
                    'session_id': session.id,
                    'title': session.title,
                }
            }, status=status.HTTP_200_OK)
            
        except ChatSession.DoesNotExist:
            return Response({'success': False, 'message': 'Chat not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            if created_session is not None and not created_session.messages.exists():
                created_session.delete()
            logger.error(f"Chatbot API error: {e}")
            return Response({'success': False, 'message': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ChatSessionListAPI(APIView):

    @require_token
    def get(self, request):
        sessions = ChatSession.objects.filter(user=request.auth_user)
        data = [{
            'id': s.id,
            'title': s.title,
            'updated_at': s.updated_at.isoformat(),
        } for s in sessions]
        return Response({'success': True, 'message': '', 'data': data}, status=status.HTTP_200_OK)


class ChatSessionDetailAPI(APIView):

    @require_token
    def get(self, request, session_id):
        try:
            session = ChatSession.objects.get(id=session_id, user=request.auth_user)
        except ChatSession.DoesNotExist:
            return Response({'success': False, 'message': 'Chat not found.'}, status=status.HTTP_404_NOT_FOUND)
        messages = [{
            'id': m.id,
            'role': m.role,
            'text': m.text,
        } for m in session.messages.all()]
        return Response({
            'success': True,
            'message': '',
            'data': {
                'id': session.id,
                'title': session.title,
                'greeting': GREETING,
                'messages': messages,
            },
        }, status=status.HTTP_200_OK)
