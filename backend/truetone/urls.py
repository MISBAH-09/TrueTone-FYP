"""TrueTone URL Configuration"""
from django.urls import path, include

urlpatterns = [
    path('', include('models_api.urls')),
    path('users/', include('Users.urls')),
]
