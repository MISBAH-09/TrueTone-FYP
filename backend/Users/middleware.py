"""
Token-based authentication middleware for TrueTone.
Stores tokens in the database and validates via header lookup.
"""
import hashlib
from django.http import JsonResponse
from functools import wraps


def require_token(view_func):
    """
    Decorator that enforces token authentication on a view.
    Reads the 'Authorization' header, looks up the token in the DB,
    and attaches `request.auth_user` if valid.
    """
    @wraps(view_func)
    def wrapper(self_or_request, *args, **kwargs):
        # Handle both APIView (self, request) and function views (request)
        if hasattr(self_or_request, 'META'):
            request = self_or_request
        else:
            request = args[0] if args else self_or_request

        from Users.models import User

        token = request.META.get('HTTP_AUTHORIZATION', '').strip()

        if not token:
            return JsonResponse(
                {'success': False, 'message': 'Authentication required. Provide a token in Authorization header.'},
                status=401,
            )

        user = User.objects.filter(token=token).first()

        if not user:
            return JsonResponse(
                {'success': False, 'message': 'Invalid or expired token. Please login again.'},
                status=401,
            )

        if not user.is_active:
            return JsonResponse(
                {'success': False, 'message': 'Account is deactivated.'},
                status=403,
            )

        request.auth_user = user
        return view_func(self_or_request, *args, **kwargs)

    return wrapper
