"""Recommendations app URL configuration."""
from django.urls import path
from . import views

app_name = 'Recommendations'

urlpatterns = [
    path('get/', views.get_recommendations, name='get_recommendations'),
    path('alternatives/', views.get_alternatives, name='get_alternatives'),
]
