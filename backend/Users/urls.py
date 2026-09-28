"""Users app URL configuration."""
from django.urls import path
from .views import SignupAPI, LoginAPI, GetByIdAPI, UpdateAPI, FetchAllUsersAPI, OnboardingAPI, ConfirmSkinScanAPI, SkinScanHistoryAPI

app_name = 'Users'

urlpatterns = [
    path('signup/', SignupAPI.as_view(), name='signup'),
    path('login/', LoginAPI.as_view(), name='login'),
    path('profile/', GetByIdAPI.as_view(), name='profile'),
    path('update/', UpdateAPI.as_view(), name='update'),
    path('all/', FetchAllUsersAPI.as_view(), name='all-users'),
    path('onboarding/', OnboardingAPI.as_view(), name='onboarding'),
    path('skin-scan/confirm/', ConfirmSkinScanAPI.as_view(), name='confirm_skin_scan'),
    path('skin-scan/history/', SkinScanHistoryAPI.as_view(), name='skin_scan_history'),
]
