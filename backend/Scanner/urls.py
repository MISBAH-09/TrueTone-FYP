from django.urls import path
from .views import ScanProductAPI

app_name = 'Scanner'

urlpatterns = [
    path('scan/', ScanProductAPI.as_view(), name='scan'),
]
