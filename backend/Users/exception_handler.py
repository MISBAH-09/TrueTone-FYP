"""
Custom DRF exception handler — never leak SQL, table/column names, or request/user data.
"""
import logging
import traceback

from django.db import IntegrityError, DataError, OperationalError, DatabaseError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.exceptions import ValidationError, Throttled

logger = logging.getLogger('Users')

GENERIC_500 = 'Something went wrong on our side. Please try again in a moment.'


def _normalize_validation_detail(detail):
    """Convert DRF ValidationError detail into {field: [messages]}."""
    if isinstance(detail, dict):
        errors = {}
        for key, value in detail.items():
            if isinstance(value, (list, tuple)):
                errors[str(key)] = [str(v) for v in value]
            elif isinstance(value, dict):
                errors[str(key)] = [str(v) for v in value.values()]
            else:
                errors[str(key)] = [str(value)]
        return errors
    if isinstance(detail, (list, tuple)):
        return {'non_field_errors': [str(v) for v in detail]}
    return {'non_field_errors': [str(detail)]}


def _friendly_integrity_message(exc):
    text = str(exc).lower()
    if 'email' in text and ('unique' in text or 'duplicate' in text or 'already exists' in text):
        return 'This email is already registered.', 'email'
    if 'username' in text and ('unique' in text or 'duplicate' in text or 'already exists' in text):
        return 'This username is already taken.', 'username'
    return None, None


def custom_exception_handler(exc, context):
    # Normal DRF exceptions (validation, auth, throttle, etc.)
    response = drf_exception_handler(exc, context)

    if response is not None:
        if isinstance(exc, ValidationError):
            errors = _normalize_validation_detail(exc.detail)
            # Pick a short top-level message from the first field error
            first_messages = next(iter(errors.values()), ['Invalid input.'])
            message = first_messages[0] if first_messages else 'Invalid input.'
            response.data = {
                'success': False,
                'message': message,
                'errors': errors,
                'detail': message,
                'data': None,
            }
            return response

        if isinstance(exc, Throttled):
            message = 'Too many attempts. Please try again later.'
            response.data = {
                'success': False,
                'message': message,
                'detail': message,
                'data': None,
            }
            return response

        # Other APIException subclasses
        detail = response.data.get('detail', response.data) if isinstance(response.data, dict) else response.data
        message = str(detail) if not isinstance(detail, (list, dict)) else GENERIC_500
        if isinstance(detail, dict):
            message = str(next(iter(detail.values()), GENERIC_500))
        response.data = {
            'success': False,
            'message': message,
            'detail': message,
            'data': None,
        }
        return response

    # Database / unexpected errors — log server-side only, return generic body
    if isinstance(exc, IntegrityError):
        friendly, field = _friendly_integrity_message(exc)
        if friendly:
            logger.warning('IntegrityError mapped to 400: %s', field)
            body = {
                'success': False,
                'message': friendly,
                'detail': friendly,
                'errors': {field: [friendly]} if field else None,
                'data': None,
            }
            return Response(body, status=status.HTTP_400_BAD_REQUEST)

        logger.error('Database IntegrityError (details withheld from client)')
        logger.debug('IntegrityError traceback:\n%s', traceback.format_exc())
        return Response(
            {'success': False, 'message': GENERIC_500, 'detail': GENERIC_500, 'data': None},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if isinstance(exc, (DataError, OperationalError, DatabaseError)):
        logger.error('Database error:\n%s', traceback.format_exc())
        return Response(
            {'success': False, 'message': GENERIC_500, 'detail': GENERIC_500, 'data': None},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    logger.error('Unhandled exception:\n%s', traceback.format_exc())
    return Response(
        {'success': False, 'message': GENERIC_500, 'detail': GENERIC_500, 'data': None},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
