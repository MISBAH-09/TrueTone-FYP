from django.urls import path
from .views import ScanProductAPI, ScanHistoryAPI

app_name = 'Scanner'

urlpatterns = [
    path('scan/', ScanProductAPI.as_view(), name='scan'),
    path('history/', ScanHistoryAPI.as_view(), name='history'),
]
