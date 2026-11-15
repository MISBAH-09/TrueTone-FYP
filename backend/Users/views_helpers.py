"""
Shared helpers for Users auth/recovery (kept out of views.py to avoid import cycles).
"""
import hashlib
import re
import unicodedata
from datetime import timedelta

from django.core.cache import cache

RECOVERY_QUESTIONS = {
    'first_school': "What was your first school's name?",
    'childhood_nickname': 'What was your childhood nickname?',
    'first_pet': 'What was the name of your first pet?',
}
RESET_ATTEMPT_LIMIT = 5
RESET_LOCKOUT_DURATION = timedelta(minutes=15)
RESET_RATE_LIMIT_WINDOW = 900

NEUTRAL_RECOVERY_MESSAGE = "We couldn't verify this account. Please contact support."


def normalize_recovery_answer(answer):
    if not isinstance(answer, str) or len(answer) > 120:
        return ''
    normalized = unicodedata.normalize('NFKC', answer).strip().casefold()
    return re.sub(r'\s+', ' ', normalized)


def user_has_recovery_question(user):
    return bool(
        user
        and user.recovery_question
        and user.recovery_question in RECOVERY_QUESTIONS
        and user.recovery_answer_hash
    )


def is_reset_rate_limited(request, action, limit=RESET_ATTEMPT_LIMIT):
    remote_address = request.META.get('REMOTE_ADDR', 'unknown')
    address_hash = hashlib.sha256(remote_address.encode('utf-8')).hexdigest()
    key = f'password-recovery:{action}:{address_hash}'
    if cache.add(key, 1, timeout=RESET_RATE_LIMIT_WINDOW):
        attempts = 1
    else:
        try:
            attempts = cache.incr(key)
        except ValueError:
            cache.set(key, 1, timeout=RESET_RATE_LIMIT_WINDOW)
            attempts = 1
    return attempts > limit


class Validations:
    def isValidUsername(self, username):
        if not username or not username[0].isalpha():
            return (False, "Username must start with a letter" + (f" not with '{username[0]}'" if username else ""))
        if not re.fullmatch(r'[A-Za-z0-9._]+', username):
            return (False, "Username can only contain letters, numbers, '.' and '_'")
        if "@" in username:
            return (False, "Username cannot contain '@'")
        return (True, "Valid username")

    def isValidName(self, name):
        if not name or not name[0].isalpha():
            return (False, "Name must start with a letter")
        if not re.fullmatch(r"[A-Za-z' -]+", name):
            return (False, "Name can only contain letters, spaces, hyphens (-), and apostrophes (')")
        return (True, "Valid name")

    def isValidPassword(self, password):
        if len(password) < 8:
            return (False, "Password must be at least 8 characters long")
        if not re.search(r'[A-Z]', password):
            return (False, "Password must contain at least one uppercase letter")
        if not re.search(r'[a-z]', password):
            return (False, "Password must contain at least one lowercase letter")
        if not re.search(r'[0-9]', password):
            return (False, "Password must contain at least one digit")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            return (False, "Password must contain at least one special character")
        return (True, "Valid password")


def public_user_payload(user, include_token=False):
    """Safe user dict for API responses — never includes password or recovery answer/hash."""
    data = {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': user.role or 'end_user',
        'first_name': user.first_name or '',
        'last_name': user.last_name or '',
        'profile': user.profile,
        'recovery_question': user.recovery_question or '',
        'has_recovery_question': user_has_recovery_question(user),
        'age_bracket': user.age_bracket,
        'gender': user.gender,
        'skin_tone': user.skin_tone,
        'skin_type': user.skin_type,
        'skin_disease': user.skin_disease,
        'allergies': user.allergies,
        'is_pregnant_or_breastfeeding': user.is_pregnant_or_breastfeeding,
        'current_products': user.current_products,
        'onboarding_completed': user.onboarding_completed,
        'created_at': user.created_at.isoformat() if user.created_at else None,
        'updated_at': user.updated_at.isoformat() if user.updated_at else None,
    }
    if include_token:
        data['token'] = user.token
    return data
