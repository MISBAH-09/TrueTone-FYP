from django.urls import path
from .views import ChatbotAskAPI, ChatSessionListAPI, ChatSessionDetailAPI

app_name = 'Chatbot'

urlpatterns = [
    path('ask/', ChatbotAskAPI.as_view(), name='ask'),
    path('sessions/', ChatSessionListAPI.as_view(), name='sessions'),
    path('sessions/<int:session_id>/', ChatSessionDetailAPI.as_view(), name='session_detail'),
]
