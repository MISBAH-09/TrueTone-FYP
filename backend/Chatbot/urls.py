from django.urls import path
from .views import ChatbotAskAPI

app_name = 'Chatbot'

urlpatterns = [
    path('ask/', ChatbotAskAPI.as_view(), name='ask'),
]
