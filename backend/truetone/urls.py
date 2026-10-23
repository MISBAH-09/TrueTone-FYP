"""TrueTone URL Configuration"""
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView

def frontend_page(path):
    """Send a browser visit on the API port to the React page."""
    return RedirectView.as_view(url=f"{settings.FRONTEND_URL}{path}", permanent=False)

urlpatterns = [
    path('', include('models_api.urls')),
    path('users/', include('Users.urls')),
    path('recommendations', frontend_page('/recommendations')),
    path('recommendations/', frontend_page('/recommendations')),
    path('recommendations/', include('Recommendations.urls')),
    path('scanner/', include('Scanner.urls')),
    path('chatbot/', include('Chatbot.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
