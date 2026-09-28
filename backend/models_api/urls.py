"""TrueTone API URL Configuration"""
from django.urls import path
from . import views

urlpatterns = [
    # Frontend page
    path('', views.index, name='index'),
    
    path('api/analyze_all', views.AnalyzeAllAPI.as_view(), name='analyze_all'),
    path('api/health', views.HealthCheckAPI.as_view(), name='health'),
    path('api/models', views.ModelInfoAPI.as_view(), name='models'),

    # Skin type + tone combined (no disease)
    path('api/analyze_skin', views.AnalyzeSkinAPI.as_view(), name='analyze_skin'),

    # Single-model endpoints
    path('api/analyze_skin_type', views.AnalyzeSkinTypeAPI.as_view(), name='analyze_skin_type'),
    path('api/analyze_skin_tone', views.AnalyzeSkinToneAPI.as_view(), name='analyze_skin_tone'),
    path('api/analyze_skin_disease', views.AnalyzeSkinDiseaseAPI.as_view(), name='analyze_skin_disease'),
]
