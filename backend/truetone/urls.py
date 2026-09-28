"""TrueTone URL Configuration"""
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', include('models_api.urls')),
    path('users/', include('Users.urls')),
    path('recommendations/', include('Recommendations.urls')),
    path('scanner/', include('Scanner.urls')),
    path('chatbot/', include('Chatbot.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
