"""Users app URL configuration."""
from django.urls import path
from .views import signupAPI, loginAPI, getByIdApi, updateAPI, fetchAllUsersAPI, onboardingAPI

app_name = 'Users'

urlpatterns = [
    path('signup/', signupAPI.as_view(), name='signup'),
    path('login/', loginAPI.as_view(), name='login'),
    path('profile/', getByIdApi.as_view(), name='profile'),
    path('update/', updateAPI.as_view(), name='update'),
    path('all/', fetchAllUsersAPI.as_view(), name='all-users'),
    path('onboarding/', onboardingAPI.as_view(), name='onboarding'),
]
