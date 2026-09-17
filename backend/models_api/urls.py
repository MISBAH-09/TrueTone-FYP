"""TrueTone API URL Configuration"""
from django.urls import path
from . import views

urlpatterns = [
    # Frontend page
    path('', views.index, name='index'),
    
    path('api/analyze_all', views.analyze_all, name='analyze_all'),
    path('api/health', views.health_check, name='health'),
    path('api/models', views.model_info, name='models'),

    # Skin type + tone combined (no disease)
    path('api/analyze_skin', views.analyze_skin, name='analyze_skin'),

    # Single-model endpoints
    path('api/analyze_skin_type', views.analyze_skin_type, name='analyze_skin_type'),
    path('api/analyze_skin_tone', views.analyze_skin_tone, name='analyze_skin_tone'),
    path('api/analyze_skin_disease', views.analyze_skin_disease, name='analyze_skin_disease'),
]
