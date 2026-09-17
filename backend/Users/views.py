"""
User authentication views — Signup, Login, Profile, Update, FetchAll.
Uses DRF APIView with Swagger documentation.
"""
import hashlib
import re
import logging
import base64
from datetime import date
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import User
from .middleware import require_token

logger = logging.getLogger('Users')


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

class signupAPI(APIView):

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

class loginAPI(APIView):

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


# ─── Get User By ID (Protected) ─────────────────────────────────────────────

class getByIdApi(APIView):

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

            # Calculate age from date_of_birth
            age = None
            if user.date_of_birth:
                today = date.today()
                dob = user.date_of_birth
                age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

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
                'age': age,
                'gender': user.gender,
                'skin_tone': user.skin_tone,
                'skin_type': user.skin_type,
                'skin_disease': user.skin_disease,
                'onboarding_completed': user.onboarding_completed,
                'created_at': user.created_at.isoformat(),
                'updated_at': user.updated_at.isoformat()
            }
            return Response(response_data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'success': False, 'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


# ─── Update User (Protected) ────────────────────────────────────────────────

class updateAPI(APIView):

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

        updatable_fields = {'username', 'email', 'first_name', 'last_name', 'password', 'profile'}
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

        # Save updates
        try:
            user.username = username
            user.email = email
            user.first_name = first_name
            user.last_name = last_name
            user.password = password
            user.profile = profile
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
            'created_at': user.created_at.isoformat(),
            'updated_at': user.updated_at.isoformat()
        }

        return Response(response_data, status=status.HTTP_200_OK)


# ─── Fetch All Users (Protected) ────────────────────────────────────────────

class fetchAllUsersAPI(APIView):

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


# ─── Onboarding API (Protected) ─────────────────────────────────────────────

class onboardingAPI(APIView):

    @swagger_auto_schema(
        tags=["Onboarding"],
        operation_summary="Complete user onboarding",
        operation_description="Save onboarding data (gender, DOB, skin info or image)",
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
            required=['gender', 'date_of_birth'],
            properties={
                'gender': openapi.Schema(type=openapi.TYPE_STRING, example="male"),
                'date_of_birth': openapi.Schema(type=openapi.TYPE_STRING, example="2000-01-15"),
                'skin_tone': openapi.Schema(type=openapi.TYPE_STRING, example="fair"),
                'skin_type': openapi.Schema(type=openapi.TYPE_STRING, example="oily"),
                'skin_disease': openapi.Schema(type=openapi.TYPE_STRING, example="comedonal_acne,eczema"),
                'skin_image': openapi.Schema(type=openapi.TYPE_STRING, description="Base64 encoded skin image"),
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

        gender = request.data.get('gender', '')
        date_of_birth = request.data.get('date_of_birth')
        skin_tone = request.data.get('skin_tone', '')
        skin_type = request.data.get('skin_type', '')
        skin_disease = request.data.get('skin_disease', '')
        skin_image = request.data.get('skin_image')

        # Validate required fields
        if not gender:
            response_data['message'] = 'Gender is required'
            return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

        if not date_of_birth:
            response_data['message'] = 'Date of birth is required'
            return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

        valid_genders = ['male', 'female', 'prefer_not_to_say']
        if gender not in valid_genders:
            response_data['message'] = f'Invalid gender. Choose from: {valid_genders}'
            return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

        # Must have either image or manual skin info
        if not skin_image and (not skin_tone or not skin_type):
            response_data['message'] = 'Provide either a skin image or manual skin info (tone + type)'
            return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

        # If image uploaded, run ML analysis to get skin info
        if skin_image:
            try:
                # Decode base64 image
                b64_data = skin_image
                if ',' in b64_data:
                    b64_data = b64_data.split(',')[1]
                image_bytes = base64.b64decode(b64_data)

                from pipeline_engine import get_pipeline
                pipeline = get_pipeline()
                result = pipeline.analyze_all(image_bytes, 'onboarding_upload.jpg')

                if result.get('status') == 'success':
                    skin_profile = result.get('skin_profile', {})
                    skin_type = skin_profile.get('type', '')
                    skin_tone = skin_profile.get('tone', '')
                    disease = skin_profile.get('disease', 'none')
                    skin_disease = disease if disease != 'none' else ''
                    logger.info(f"ML analysis for {user.username}: type={skin_type}, tone={skin_tone}, disease={skin_disease}")
                else:
                    response_data['message'] = result.get('message', 'Image analysis failed')
                    return Response(response_data, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.error(f"Image analysis error: {e}")
                response_data['message'] = f'Image analysis failed: {str(e)}'
                return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

        # Save onboarding data
        user.gender = gender
        user.date_of_birth = date_of_birth
        user.skin_tone = skin_tone
        user.skin_type = skin_type
        user.skin_disease = skin_disease
        user.skin_image = skin_image
        user.onboarding_completed = True
        user.save()

        logger.info(f"Onboarding completed for: {user.username}")

        response_data['success'] = True
        response_data['message'] = 'Onboarding completed successfully'
        response_data['data'] = {
            'id': user.id,
            'onboarding_completed': True,
            'skin_type': skin_type,
            'skin_tone': skin_tone,
            'skin_disease': skin_disease,
        }

        return Response(response_data, status=status.HTTP_200_OK)
