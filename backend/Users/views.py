"""
User authentication views — Signup, Login, Profile, Update, FetchAll.
Uses DRF APIView with Swagger documentation.
"""
import hashlib
import re
import logging
import base64
import unicodedata
from datetime import date, timedelta
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import User, SkinScanHistory
from .middleware import require_token

logger = logging.getLogger('Users')

RECOVERY_QUESTIONS = {
    'first_school': "What was your first school's name?",
    'childhood_nickname': 'What was your childhood nickname?',
    'first_pet': 'What was the name of your first pet?',
}
RESET_ATTEMPT_LIMIT = 5
RESET_LOCKOUT_DURATION = timedelta(minutes=15)
RESET_RATE_LIMIT_WINDOW = 900


def normalize_recovery_answer(answer):
    if not isinstance(answer, str) or len(answer) > 120:
        return ''
    normalized = unicodedata.normalize('NFKC', answer).strip().casefold()
    return re.sub(r'\s+', ' ', normalized)


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


# ─── Validation Helpers ──────────────────────────────────────────────────────

class Validations:
    def isValidUsername(self, username):
        if not username[0].isalpha():
            return (False, "Username must start with a letter not with '" + username[0] + "'")
        if not re.fullmatch(r'[A-Za-z0-9._]+', username):
            return (False, "Username can only contain letters, numbers, '.' and '_'")
        if "@" in username:
            return (False, "Username cannot contain '@'")
        return (True, "Valid username")

    def isValidName(self, name):
        if not name[0].isalpha():
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


# ─── Signup API ──────────────────────────────────────────────────────────────

class SignupAPI(APIView):

    @swagger_auto_schema(
        tags=["Authentication"],
        operation_summary="User Signup",
        operation_description="Register a new user with username, email and password",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['username', 'email', 'password'],
            properties={
                'username': openapi.Schema(type=openapi.TYPE_STRING, example="misbah123"),
                'email': openapi.Schema(type=openapi.TYPE_STRING, example="misbah@gmail.com"),
                'first_name': openapi.Schema(type=openapi.TYPE_STRING, example="Misbah"),
                'last_name': openapi.Schema(type=openapi.TYPE_STRING, example="Sehar"),
                'password': openapi.Schema(type=openapi.TYPE_STRING, example="Password@123"),
                'profile': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description="Base64 encoded image"
                ),
            },
        ),
        responses={
            201: "User registered successfully",
            400: "Validation error",
        }
    )
    def post(self, request):
        response_data = {
            'success': False,
            'message': '',
            'data': None
        }
        http_status = status.HTTP_400_BAD_REQUEST

        try:
            username = request.data.get('username')
            email = request.data.get('email')
            first_name = request.data.get('first_name', '')
            last_name = request.data.get('last_name', '')
            password = request.data.get('password')
            recovery_question = request.data.get('recovery_question')
            recovery_answer_value = request.data.get('recovery_answer')
            recovery_answer = normalize_recovery_answer(recovery_answer_value)
            profile = request.data.get('profile')

            errors = []

            # Username validation
            if not username:
                errors.append('username is required')
            else:
                valid_username, message = Validations().isValidUsername(username)
                if not valid_username:
                    errors.append(message)

            # Password validation
            if not password:
                errors.append('password is required')
            else:
                valid_password, message = Validations().isValidPassword(password)
                if not valid_password:
                    errors.append(message)

            # Email validation
            if not email:
                errors.append('email is required')
            else:
                try:
                    validate_email(email)
                except ValidationError:
                    errors.append('Invalid email format')

            if not isinstance(recovery_question, str) or recovery_question not in RECOVERY_QUESTIONS:
                errors.append('Choose a valid password recovery question')
            if len(recovery_answer) < 3 or len(recovery_answer) > 120:
                errors.append('Recovery answer must be between 3 and 120 characters')

            if errors:
                response_data['message'] = ', '.join(errors)
                return Response(response_data, status=http_status)

            # First name and last name validation
            if first_name:
                valid_firstname, message = Validations().isValidName(first_name)
                if not valid_firstname:
                    response_data['message'] = 'Invalid first name: ' + message
                    return Response(response_data, status=http_status)
            if last_name:
                valid_lastname, message = Validations().isValidName(last_name)
                if not valid_lastname:
                    response_data['message'] = 'Invalid last name: ' + message
                    return Response(response_data, status=http_status)

            try:
                user = User.objects.create(
                    username=username,
                    email=email,
                    recovery_question=recovery_question,
                    recovery_answer_hash=make_password(recovery_answer),
                    first_name=first_name,
                    last_name=last_name,
                    password=make_password(password),
                    profile=profile
                )
                logger.info(f"New user registered: {username} ({email})")
            except IntegrityError as e:
                if '1062' in str(e):
                    if 'username' in str(e):
                        response_data['message'] = 'Username already exists'
                    elif 'email' in str(e):
                        response_data['message'] = 'Email already exists'
                    else:
                        response_data['message'] = 'Duplicate entry detected'
                    return Response(response_data, status=http_status)
                else:
                    response_data['message'] = str(e)
                    return Response(response_data, status=http_status)

            response_data['success'] = True
            response_data['message'] = 'User registered successfully'
            response_data['data'] = {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'created_at': user.created_at.isoformat(),
                'updated_at': user.updated_at.isoformat()
            }
            http_status = status.HTTP_201_CREATED

        except Exception as e:
            response_data['message'] = str(e)
            http_status = status.HTTP_400_BAD_REQUEST

        return Response(response_data, status=http_status)


# ─── Login API ───────────────────────────────────────────────────────────────

class LoginAPI(APIView):

    @swagger_auto_schema(
        tags=["Authentication"],
        operation_summary="User Login",
        operation_description="Login using username or email and password",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['password'],
            properties={
                'username': openapi.Schema(type=openapi.TYPE_STRING, example="misbah123"),
                'email': openapi.Schema(type=openapi.TYPE_STRING, example="misbah@gmail.com"),
                'password': openapi.Schema(type=openapi.TYPE_STRING, example="Password@123"),
            },
        ),
        responses={
            200: "Login successful",
            400: "Invalid credentials",
        }
    )
    def post(self, request):
        response_data = {
            'success': False,
            'message': '',
            'data': None
        }
        http_status = status.HTTP_400_BAD_REQUEST

        try:
            username = request.data.get('username')
            email = request.data.get('email')
            password = request.data.get('password')

            if not password or (not username and not email):
                response_data['message'] = 'Provide username or email and password'
                return Response(response_data, status=http_status)

            user = None
            if username:
                user = User.objects.filter(username=username).first()
            elif email:
                user = User.objects.filter(email=email).first()

            if not user:
                response_data['message'] = 'Invalid username or email'
                return Response(response_data, status=http_status)

            if not check_password(password, user.password):
                response_data['message'] = 'Invalid password'
                return Response(response_data, status=http_status)

            # Generate token and store in DB
            raw_string = f"{user.id}{user.username}"
            token = hashlib.sha256(raw_string.encode()).hexdigest()

            if token:
                result = self.add_token_intodb(user.id, token)
                if result:
                    logger.info(f"User logged in: {user.username}")
                    response_data['success'] = True
                    response_data['message'] = 'Login successful'
                    response_data['data'] = {
                        'id': user.id,
                        'token': token,
                        'onboarding_completed': user.onboarding_completed,
                    }
                    http_status = status.HTTP_200_OK
                else:
                    response_data['message'] = 'Failed to update token in database'
                    return Response(response_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                response_data['message'] = 'Token generation failed'
                http_status = status.HTTP_500_INTERNAL_SERVER_ERROR

        except Exception as e:
            response_data['message'] = str(e)
            http_status = status.HTTP_400_BAD_REQUEST

        return Response(response_data, status=http_status)

    def add_token_intodb(self, id, token):
        user = User.objects.filter(id=id).first()
        if user:
            user.token = token
            user.save()
            return True
        return False


# ─── Password Recovery ──────────────────────────────────────────────────────

class PasswordRecoveryQuestionAPI(APIView):
    def post(self, request):
        if is_reset_rate_limited(request, 'question', limit=10):
            return Response(
                {'success': False, 'message': 'Too many recovery attempts. Please try again later.', 'data': None},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        username = request.data.get('username')
        email = request.data.get('email')
        question = None
        if (
            isinstance(username, str)
            and isinstance(email, str)
            and username.strip()
            and email.strip()
        ):
            user = User.objects.filter(
                username=username.strip(),
                email__iexact=email.strip(),
            ).only('recovery_question', 'recovery_answer_hash').first()
            if (
                user
                and user.recovery_question in RECOVERY_QUESTIONS
                and user.recovery_answer_hash
            ):
                question = user.recovery_question

        return Response({
            'success': True,
            'message': 'If the details match an account with recovery set up, its question is shown.',
            'data': {'question': question},
        }, status=status.HTTP_200_OK)


class PasswordResetAPI(APIView):
    def post(self, request):
        if is_reset_rate_limited(request, 'reset'):
            return Response(
                {'success': False, 'message': 'Too many recovery attempts. Please try again later.', 'data': None},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        username = request.data.get('username')
        email = request.data.get('email')
        question = request.data.get('recovery_question')
        answer_value = request.data.get('recovery_answer')
        answer = normalize_recovery_answer(answer_value)
        new_password = request.data.get('password')

        if not isinstance(username, str) or not isinstance(email, str):
            return Response(
                {'success': False, 'message': 'Unable to verify recovery details.', 'data': None},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not isinstance(new_password, str):
            return Response(
                {'success': False, 'message': 'A new password is required.', 'data': None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        valid_password, password_message = Validations().isValidPassword(new_password)
        if not valid_password:
            return Response(
                {'success': False, 'message': password_message, 'data': None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invalid_details = Response(
            {'success': False, 'message': 'Unable to verify recovery details.', 'data': None},
            status=status.HTTP_400_BAD_REQUEST,
        )
        with transaction.atomic():
            user = User.objects.select_for_update().filter(
                username=username.strip(),
                email__iexact=email.strip(),
            ).first()
            if (
                not user
                or user.recovery_question not in RECOVERY_QUESTIONS
                or not user.recovery_answer_hash
            ):
                return invalid_details

            now = timezone.now()
            if user.password_reset_locked_until and user.password_reset_locked_until > now:
                return invalid_details

            answer_matches = (
                question == user.recovery_question
                and bool(answer)
                and check_password(answer, user.recovery_answer_hash)
            )
            if not answer_matches:
                user.password_reset_failed_attempts += 1
                update_fields = ['password_reset_failed_attempts']
                if user.password_reset_failed_attempts >= RESET_ATTEMPT_LIMIT:
                    user.password_reset_failed_attempts = 0
                    user.password_reset_locked_until = now + RESET_LOCKOUT_DURATION
                    update_fields.extend([
                        'password_reset_failed_attempts',
                        'password_reset_locked_until',
                    ])
                user.save(update_fields=update_fields)
                return invalid_details

            user.password = make_password(new_password)
            user.token = None
            user.password_reset_failed_attempts = 0
            user.password_reset_locked_until = None
            user.save(update_fields=[
                'password',
                'token',
                'password_reset_failed_attempts',
                'password_reset_locked_until',
                'updated_at',
            ])

        return Response(
            {'success': True, 'message': 'Password updated. Please sign in with your new password.', 'data': None},
            status=status.HTTP_200_OK,
        )


class PasswordRecoverySetupAPI(APIView):
    @require_token
    def post(self, request):
        user = request.auth_user
        current_password = request.data.get('current_password')
        question = request.data.get('recovery_question')
        answer_value = request.data.get('recovery_answer')
        answer = normalize_recovery_answer(answer_value)

        if not isinstance(current_password, str) or not check_password(current_password, user.password):
            return Response(
                {'success': False, 'message': 'Current password is incorrect.', 'data': None},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not isinstance(question, str) or question not in RECOVERY_QUESTIONS:
            return Response(
                {'success': False, 'message': 'Choose a valid password recovery question.', 'data': None},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(answer) < 3 or len(answer) > 120:
            return Response(
                {'success': False, 'message': 'Recovery answer must be between 3 and 120 characters.', 'data': None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.recovery_question = question
        user.recovery_answer_hash = make_password(answer)
        user.password_reset_failed_attempts = 0
        user.password_reset_locked_until = None
        user.save(update_fields=[
            'recovery_question',
            'recovery_answer_hash',
            'password_reset_failed_attempts',
            'password_reset_locked_until',
            'updated_at',
        ])
        return Response(
            {'success': True, 'message': 'Password recovery question updated.', 'data': {'recovery_question': question}},
            status=status.HTTP_200_OK,
        )


# ─── Get User By ID (Protected) ─────────────────────────────────────────────

class GetByIdAPI(APIView):

    @swagger_auto_schema(
        tags=["User"],
        operation_summary="Get logged-in user",
        operation_description="Fetch details of authenticated user",
        manual_parameters=[
            openapi.Parameter(
                'Authorization',
                openapi.IN_HEADER,
                description="Token for authentication",
                type=openapi.TYPE_STRING,
                required=True
            )
        ],
        responses={200: "User fetched successfully", 401: "Unauthorized"}
    )
    @require_token
    def get(self, request, id=None):
        response_data = {
            'success': True,
            'message': '',
            'data': None
        }

        try:
            user = request.auth_user

            response_data['success'] = True
            response_data['message'] = 'User fetched successfully'
            response_data['data'] = {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'profile': user.profile,
                'token': user.token,
                'recovery_question': user.recovery_question,
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
                'updated_at': user.updated_at.isoformat() if user.updated_at else None
            }
            return Response(response_data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


# ─── Update User (Protected) ────────────────────────────────────────────────

class UpdateAPI(APIView):

    @swagger_auto_schema(
        tags=["User"],
        operation_summary="Update user profile",
        operation_description="Update authenticated user's details. All fields are optional.",
        manual_parameters=[
            openapi.Parameter(
                'Authorization',
                openapi.IN_HEADER,
                description="Authentication token",
                type=openapi.TYPE_STRING,
                required=True
            )
        ],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'username': openapi.Schema(type=openapi.TYPE_STRING, example="misbah_updated"),
                'email': openapi.Schema(type=openapi.TYPE_STRING, example="misbah@gmail.com"),
                'first_name': openapi.Schema(type=openapi.TYPE_STRING, example="Misbah"),
                'last_name': openapi.Schema(type=openapi.TYPE_STRING, example="Sehar"),
                'password': openapi.Schema(type=openapi.TYPE_STRING, example="NewPass@123"),
                'profile': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description="Base64 encoded profile image"
                ),
            },
        ),
        responses={
            200: "User updated successfully",
            400: "Validation error",
            401: "Unauthorized"
        }
    )
    @require_token
    def put(self, request):
        response_data = {
            'success': False,
            'message': '',
            'data': None
        }
        user = getattr(request, 'auth_user', None)
        if not user:
            return Response(
                {'success': False, 'message': 'Unauthorized'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        updatable_fields = {
            'username', 'email', 'first_name', 'last_name', 'password', 'profile',
            'skin_type', 'skin_tone', 'skin_disease', 'age_bracket', 'gender', 'allergies', 
            'is_pregnant_or_breastfeeding', 'current_products'
        }
        if not request.data or not any(field in request.data for field in updatable_fields):
            return Response(
                {'success': False, 'message': 'No data provided to update', 'data': None},
                status=status.HTTP_400_BAD_REQUEST
            )

        username = request.data.get('username', user.username)
        email = request.data.get('email', user.email)
        first_name = request.data.get('first_name', user.first_name)
        last_name = request.data.get('last_name', user.last_name)
        password = request.data.get('password', None)
        profile = request.data.get('profile', user.profile)
        
        skin_type = request.data.get('skin_type', user.skin_type)
        skin_tone = request.data.get('skin_tone', user.skin_tone)
        skin_disease = request.data.get('skin_disease', user.skin_disease)
        age_bracket = request.data.get('age_bracket', user.age_bracket)
        gender = request.data.get('gender', user.gender)
        allergies = request.data.get('allergies', user.allergies)
        
        is_pregnant = request.data.get('is_pregnant_or_breastfeeding', user.is_pregnant_or_breastfeeding)
        if 'is_pregnant_or_breastfeeding' in request.data:
            is_pregnant = str(is_pregnant).lower() in ('true', '1', 't', 'yes', 'y')
            
        current_products = request.data.get('current_products', user.current_products)

        # Username validation
        if 'username' in request.data:
            valid_username, message = Validations().isValidUsername(username)
            if not valid_username:
                response_data['message'] = message
                return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

        # Email validation
        if 'email' in request.data:
            try:
                validate_email(email)
            except ValidationError:
                response_data['message'] = 'Invalid email format'
                return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

        # First name validation
        if 'first_name' in request.data and first_name:
            valid_firstname, message = Validations().isValidName(first_name)
            if not valid_firstname:
                response_data['message'] = 'Invalid first name: ' + message
                return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

        # Last name validation
        if 'last_name' in request.data and last_name:
            valid_lastname, message = Validations().isValidName(last_name)
            if not valid_lastname:
                response_data['message'] = 'Invalid last name: ' + message
                return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

        # Password validation & hashing
        if password:
            valid_password, message = Validations().isValidPassword(password)
            if not valid_password:
                response_data['message'] = message
                return Response(response_data, status=status.HTTP_400_BAD_REQUEST)
            password = make_password(password)
        else:
            password = user.password

        # Check if skin profile changed
        skin_changed = (
            user.skin_type != skin_type or
            user.skin_tone != skin_tone or
            user.skin_disease != skin_disease
        )

        # Save updates
        try:
            user.username = username
            user.email = email
            user.first_name = first_name
            user.last_name = last_name
            user.password = password
            user.profile = profile
            user.skin_type = skin_type
            user.skin_tone = skin_tone
            user.skin_disease = skin_disease
            user.age_bracket = age_bracket
            user.gender = gender
            user.allergies = allergies
            user.is_pregnant_or_breastfeeding = is_pregnant
            user.current_products = current_products
            user.updated_at = timezone.now()
            user.save()

        except IntegrityError as e:
            if '1062' in str(e):
                if 'username' in str(e):
                    response_data['message'] = 'Username already exists'
                elif 'email' in str(e):
                    response_data['message'] = 'Email already exists'
                else:
                    response_data['message'] = 'Duplicate entry detected'
                return Response(response_data, status=status.HTTP_400_BAD_REQUEST)
            else:
                response_data['message'] = str(e)
                return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

        response_data['success'] = True
        response_data['message'] = 'User updated successfully'
        response_data['data'] = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'profile': user.profile,
            'skin_type': user.skin_type,
            'skin_tone': user.skin_tone,
            'skin_disease': user.skin_disease,
            'age_bracket': user.age_bracket,
            'gender': user.gender,
            'allergies': user.allergies,
            'is_pregnant_or_breastfeeding': user.is_pregnant_or_breastfeeding,
            'current_products': user.current_products,
            'created_at': user.created_at.isoformat(),
            'updated_at': user.updated_at.isoformat()
        }

        return Response(response_data, status=status.HTTP_200_OK)


# ─── Fetch All Users (Protected) ────────────────────────────────────────────

class FetchAllUsersAPI(APIView):

    @swagger_auto_schema(
        tags=["User"],
        operation_summary="Fetch all users",
        operation_description="Get list of all users except the logged-in user",
        manual_parameters=[
            openapi.Parameter(
                'Authorization',
                openapi.IN_HEADER,
                description="Authentication token",
                type=openapi.TYPE_STRING,
                required=True
            )
        ],
        responses={
            200: "Users fetched successfully",
            401: "Unauthorized"
        }
    )
    @require_token
    def get(self, request, id=None):
        response_data = {
            'success': True,
            'message': '',
            'data': None,
        }

        try:
            user = request.auth_user
            users = User.objects.exclude(id=user.id).values(
                'id', 'username', 'first_name', 'last_name', 'profile', 'email'
            )

            response_data['success'] = True
            response_data['message'] = 'All users'
            response_data['data'] = list(users)

            return Response(response_data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


def _slim_prediction(pred):
    """Keep only the fields the onboarding results UI needs (no heatmaps)."""
    if not isinstance(pred, dict):
        return {}
    slim = {
        'label': pred.get('label', ''),
        'confidence': pred.get('confidence'),
        'is_confident': pred.get('is_confident'),
        'distribution': pred.get('distribution') or {},
    }
    if 'disease_detected' in pred:
        slim['disease_detected'] = pred.get('disease_detected')
    if 'is_healthy' in pred:
        slim['is_healthy'] = pred.get('is_healthy')
    return slim


def _create_onboarding_scan(user, predictions, image_bytes=None):
    """First Skin Tracking row from an image-based onboarding."""
    from django.core.files.base import ContentFile
    import time

    skin_type_pred = predictions.get('skin_type') or {}
    skin_tone_pred = predictions.get('skin_tone') or {}
    disease_pred = predictions.get('skin_disease') or {}

    if disease_pred.get('disease_detected'):
        disease_label = disease_pred.get('label', '') or ''
    else:
        disease_label = ''

    scan = SkinScanHistory.objects.create(
        user=user,
        skin_type=skin_type_pred.get('label', '') or '',
        skin_type_confidence=skin_type_pred.get('confidence'),
        skin_tone=skin_tone_pred.get('label', '') or '',
        skin_tone_confidence=skin_tone_pred.get('confidence'),
        skin_disease=disease_label,
        skin_disease_confidence=disease_pred.get('confidence'),
        disease_detected=bool(disease_pred.get('disease_detected')),
        source='onboarding',
    )

    if image_bytes:
        try:
            scan.image_original.save(
                f'onboarding_{user.id}_{int(time.time())}.jpg',
                ContentFile(image_bytes),
                save=True,
            )
        except Exception as e:
            logger.error(f"Could not save onboarding scan image for {user.username}: {e}")

    return scan


# ─── Onboarding API (Protected) ─────────────────────────────────────────────

class OnboardingAPI(APIView):

    @swagger_auto_schema(
        tags=["Onboarding"],
        operation_summary="Complete user onboarding",
        operation_description="Save onboarding data (age bracket, skin info or image, allergies, pregnancy status)",
        manual_parameters=[
            openapi.Parameter(
                'Authorization',
                openapi.IN_HEADER,
                description="Authentication token",
                type=openapi.TYPE_STRING,
                required=True
            )
        ],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['age_bracket'],
            properties={
                'age_bracket': openapi.Schema(type=openapi.TYPE_STRING, example="18-24"),
                'skin_tone': openapi.Schema(type=openapi.TYPE_STRING, example="fair"),
                'skin_type': openapi.Schema(type=openapi.TYPE_STRING, example="oily"),
                'skin_disease': openapi.Schema(type=openapi.TYPE_STRING, example="common_acne,eczema"),
                'skin_image': openapi.Schema(type=openapi.TYPE_STRING, description="Base64 encoded skin image"),
                'skip_face_check': openapi.Schema(
                    type=openapi.TYPE_BOOLEAN,
                    example=False,
                    description="When true, continue analysis on skin close-ups with no detectable face",
                ),
                'allergies': openapi.Schema(type=openapi.TYPE_STRING, example="fragrance,parfum"),
                'is_pregnant_or_breastfeeding': openapi.Schema(type=openapi.TYPE_BOOLEAN, example=False),
                'current_products': openapi.Schema(type=openapi.TYPE_STRING, example="80001,80009"),
            },
        ),
        responses={
            200: "Onboarding completed successfully",
            400: "Validation error",
            401: "Unauthorized"
        }
    )
    @require_token
    def post(self, request):
        response_data = {
            'success': False,
            'message': '',
            'data': None
        }

        user = request.auth_user

        age_bracket = request.data.get('age_bracket', '')
        skin_tone = request.data.get('skin_tone', '')
        skin_type = request.data.get('skin_type', '')
        skin_disease = request.data.get('skin_disease', '')
        skin_image = request.data.get('skin_image')
        skip_face_raw = request.data.get('skip_face_check', False)
        skip_face_check = (
            skip_face_raw is True
            or str(skip_face_raw).lower() in ('1', 'true', 'yes')
        )
        allergies = request.data.get('allergies', '')
        gender = request.data.get('gender', '')
        is_pregnant_or_breastfeeding = request.data.get('is_pregnant_or_breastfeeding', False)
        current_products = request.data.get('current_products', '')

        # Validate required fields
        if not age_bracket:
            response_data['message'] = 'Age bracket is required'
            return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

        valid_age_brackets = ['teen', '18-24', '25-34', '35+']
        if age_bracket not in valid_age_brackets:
            response_data['message'] = f'Invalid age bracket. Choose from: {valid_age_brackets}'
            return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

        # Must have either image or manual skin info
        if not skin_image and (not skin_tone or not skin_type):
            response_data['message'] = 'Provide either a skin image or manual skin info (tone + type)'
            return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

        # If image uploaded, run ML analysis to get skin info
        analysis_predictions = None
        image_bytes = None
        if skin_image:
            try:
                b64_data = skin_image
                if ',' in b64_data:
                    b64_data = b64_data.split(',')[1]
                image_bytes = base64.b64decode(b64_data)

                from pipeline_engine import get_pipeline
                pipeline = get_pipeline()
                result = pipeline.analyze_all(
                    image_bytes,
                    'onboarding_upload.jpg',
                    skip_face_check=skip_face_check,
                )

                if result.get('status') == 'success':
                    analysis_predictions = result.get('predictions', {}) or {}
                    skin_type = (analysis_predictions.get('skin_type') or {}).get('label', '') or ''
                    skin_tone = (analysis_predictions.get('skin_tone') or {}).get('label', '') or ''
                    disease_entry = analysis_predictions.get('skin_disease') or {}
                    skin_disease = (
                        disease_entry.get('label', '')
                        if disease_entry.get('disease_detected') else ''
                    )
                    logger.info(
                        f"ML analysis for {user.username}: "
                        f"type={skin_type}, tone={skin_tone}, disease={skin_disease}"
                    )
                else:
                    response_data['message'] = result.get('message', 'Image analysis failed')
                    response_data['data'] = {
                        'error_code': result.get('error_code'),
                        'message': result.get('message', 'Image analysis failed'),
                    }
                    return Response(response_data, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.error(f"Image analysis error: {e}")
                response_data['message'] = f'Image analysis failed: {str(e)}'
                return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

        # Save onboarding data
        user.age_bracket = age_bracket
        user.gender = gender
        user.skin_tone = skin_tone
        user.skin_type = skin_type
        user.skin_disease = skin_disease
        user.skin_image = skin_image
        user.allergies = allergies
        user.is_pregnant_or_breastfeeding = bool(is_pregnant_or_breastfeeding) if gender != 'male' else False
        user.current_products = current_products
        user.onboarding_completed = True
        user.save()

        # Image path: also write the first Skin Tracking record (manual path does not)
        slim_predictions = None
        if analysis_predictions:
            try:
                _create_onboarding_scan(user, analysis_predictions, image_bytes=image_bytes)
            except Exception as e:
                logger.error(f"Onboarding SkinScanHistory create failed for {user.username}: {e}")
            slim_predictions = {
                'skin_type': _slim_prediction(analysis_predictions.get('skin_type')),
                'skin_tone': _slim_prediction(analysis_predictions.get('skin_tone')),
                'skin_disease': _slim_prediction(analysis_predictions.get('skin_disease')),
            }

        logger.info(f"Onboarding completed for: {user.username}")

        response_data['success'] = True
        response_data['message'] = 'Onboarding completed successfully'
        response_data['data'] = {
            'id': user.id,
            'onboarding_completed': True,
            'age_bracket': age_bracket,
            'gender': user.gender,
            'skin_type': skin_type,
            'skin_tone': skin_tone,
            'skin_disease': skin_disease,
            'allergies': allergies,
            'is_pregnant_or_breastfeeding': user.is_pregnant_or_breastfeeding,
            'input_method': 'image' if skin_image else 'manual',
            'predictions': slim_predictions,
        }

        return Response(response_data, status=status.HTTP_200_OK)


class ConfirmSkinScanAPI(APIView):

    @swagger_auto_schema(
        tags=["Skin Analysis"],
        operation_summary="Confirm and save a fresh skin scan to the user's profile",
        operation_description=(
            "Call this after the user confirms the scanned photo is theirs. "
            "A full scan updates skin type, tone, and condition. A disease-only "
            "check updates the condition and adds a Skin Tracking entry, and "
            "leaves skin type and tone as they already are."
        ),
        manual_parameters=[
            openapi.Parameter('Authorization', openapi.IN_HEADER, type=openapi.TYPE_STRING, required=True)
        ],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['predictions'],
            properties={
                'predictions': openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    description="The exact 'predictions' object returned by /api/analyze_all",
                ),
            },
        ),
        responses={200: "Profile updated and logged to history", 400: "Validation error", 401: "Unauthorized"}
    )
    @require_token
    def post(self, request):
        import json
        import base64
        import time
        from django.core.files.base import ContentFile

        response_data = {'success': False, 'message': '', 'data': None}
        user = request.auth_user

        predictions_raw = request.data.get('predictions')
        if isinstance(predictions_raw, str):
            try:
                predictions = json.loads(predictions_raw)
            except json.JSONDecodeError:
                predictions = None
        else:
            predictions = predictions_raw

        if not predictions or not isinstance(predictions, dict):
            response_data['message'] = "Missing 'predictions' object from a prior analyze_all call"
            return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

        skin_type_pred = predictions.get('skin_type', {})
        skin_tone_pred = predictions.get('skin_tone', {})
        disease_pred = predictions.get('skin_disease', {})

        disease_only = (
            isinstance(disease_pred, dict)
            and 'skin_disease' in predictions
            and not skin_type_pred.get('label')
            and not skin_tone_pred.get('label')
        )
        full_scan = bool(skin_type_pred.get('label') and skin_tone_pred.get('label'))

        if not disease_only and not full_scan:
            response_data['message'] = (
                "predictions must include a disease result, or both skin type and skin tone"
            )
            return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

        if disease_only:
            new_skin_type = user.skin_type
            new_skin_tone = user.skin_tone
            source = 'disease_scan'
        else:
            new_skin_type = skin_type_pred.get('label', '')
            new_skin_tone = skin_tone_pred.get('label', '')
            source = 'full_scan'

        if disease_pred.get('disease_detected'):
            new_disease = disease_pred.get('label', '')
        elif disease_pred.get('is_confident') is False:
            new_disease = user.skin_disease
        else:
            new_disease = ''

        # keep a record of what changed, for the response (and for the user's peace of mind)
        changes = {}
        if not disease_only and user.skin_type and user.skin_type != new_skin_type:
            changes['skin_type'] = {'from': user.skin_type, 'to': new_skin_type}
        if not disease_only and user.skin_tone and user.skin_tone != new_skin_tone:
            changes['skin_tone'] = {'from': user.skin_tone, 'to': new_skin_tone}
        if user.skin_disease != new_disease:
            changes['skin_disease'] = {'from': user.skin_disease, 'to': new_disease}

        # 1. Update the live profile (what Recommendations and the dashboard read)
        if not disease_only:
            user.skin_type = new_skin_type
            user.skin_tone = new_skin_tone
        user.skin_disease = new_disease
        user.save()

        # Process Images
        original_image = request.FILES.get('original_image')
        processed_image_base64 = request.data.get('processed_image')
        
        processed_image_file = None
        if processed_image_base64:
            try:
                if ';base64,' in processed_image_base64:
                    format, imgstr = processed_image_base64.split(';base64,')
                    ext = format.split('/')[-1]
                else:
                    imgstr = processed_image_base64
                    ext = 'jpg'
                processed_image_file = ContentFile(base64.b64decode(imgstr), name=f'processed_{user.id}_{int(time.time())}.{ext}')
            except Exception as e:
                logger.error(f"Error decoding base64 image: {e}")

        # 2. Log to history
        scan_record = SkinScanHistory.objects.create(
            user=user,
            skin_type=new_skin_type,
            skin_type_confidence=skin_type_pred.get('confidence'),
            skin_tone=new_skin_tone,
            skin_tone_confidence=skin_tone_pred.get('confidence'),
            skin_disease=new_disease,
            skin_disease_confidence=disease_pred.get('confidence'),
            disease_detected=bool(disease_pred.get('disease_detected')),
            source=source,
        )

        if original_image:
            scan_record.image_original = original_image
        if processed_image_file:
            scan_record.image_processed = processed_image_file
        
        if original_image or processed_image_file:
            scan_record.save()

        logger.info(f"Skin scan confirmed + saved for {user.username}: {changes}")

        response_data['success'] = True
        response_data['message'] = 'Profile updated from new scan'
        response_data['data'] = {
            'skin_type': new_skin_type,
            'skin_tone': new_skin_tone,
            'skin_disease': new_disease,
            'changes': changes,
        }
        return Response(response_data, status=status.HTTP_200_OK)


class SkinScanHistoryAPI(APIView):

    @swagger_auto_schema(
        tags=["Skin Analysis"],
        operation_summary="List this user's confirmed skin scan history",
        manual_parameters=[
            openapi.Parameter('Authorization', openapi.IN_HEADER, type=openapi.TYPE_STRING, required=True)
        ],
        responses={200: "List of past scans, newest first"}
    )
    @require_token
    def get(self, request):
        user = request.auth_user
        scans = SkinScanHistory.objects.filter(user=user).order_by('-scanned_at')

        data = [{
            'id': s.id,
            'skin_type': s.skin_type,
            'skin_type_confidence': s.skin_type_confidence,
            'skin_tone': s.skin_tone,
            'skin_tone_confidence': s.skin_tone_confidence,
            'skin_disease': s.skin_disease,
            'skin_disease_confidence': s.skin_disease_confidence,
            'disease_detected': s.disease_detected,
            'source': s.source,
            'image_original': request.build_absolute_uri(s.image_original.url) if s.image_original else None,
            'image_processed': request.build_absolute_uri(s.image_processed.url) if s.image_processed else None,
            'scanned_at': s.scanned_at.isoformat(),
        } for s in scans]

        return Response({'success': True, 'message': '', 'data': data}, status=status.HTTP_200_OK)
