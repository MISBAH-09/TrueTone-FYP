"""
DRF serializers for Users auth/profile endpoints.
"""
from rest_framework import serializers
from django.contrib.auth.hashers import make_password, check_password
from django.core.validators import validate_email
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import User
from .views_helpers import (
    RECOVERY_QUESTIONS,
    Validations,
    normalize_recovery_answer,
    user_has_recovery_question,
)


class SignupSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, max_length=128)
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=100, default='')
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=100, default='')
    profile = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    recovery_question = serializers.CharField(
        required=True,
        allow_blank=False,
        allow_null=False,
        error_messages={
            'required': 'Please choose a security question.',
            'blank': 'Please choose a security question.',
            'null': 'Please choose a security question.',
        },
    )
    recovery_answer = serializers.CharField(
        required=True,
        allow_blank=False,
        allow_null=False,
        write_only=True,
        error_messages={
            'required': 'Please enter an answer.',
            'blank': 'Please enter an answer.',
            'null': 'Please enter an answer.',
        },
    )

    def validate_username(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Username is required.')
        ok, message = Validations().isValidUsername(value)
        if not ok:
            raise serializers.ValidationError(message)
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value

    def validate_email(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Email is required.')
        try:
            validate_email(value)
        except DjangoValidationError:
            raise serializers.ValidationError('Invalid email format.')
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('This email is already registered.')
        return value

    def validate_password(self, value):
        if not value:
            raise serializers.ValidationError('Password is required.')
        ok, message = Validations().isValidPassword(value)
        if not ok:
            raise serializers.ValidationError(message)
        return value

    def validate_first_name(self, value):
        value = (value or '').strip()
        if value:
            ok, message = Validations().isValidName(value)
            if not ok:
                raise serializers.ValidationError(message)
        return value

    def validate_last_name(self, value):
        value = (value or '').strip()
        if value:
            ok, message = Validations().isValidName(value)
            if not ok:
                raise serializers.ValidationError(message)
        return value

    def validate_recovery_question(self, value):
        if not isinstance(value, str) or not value.strip():
            raise serializers.ValidationError('Please choose a security question.')
        value = value.strip()
        if value not in RECOVERY_QUESTIONS:
            raise serializers.ValidationError('Please choose a security question.')
        return value

    def validate_recovery_answer(self, value):
        if not isinstance(value, str) or not value.strip():
            raise serializers.ValidationError('Please enter an answer.')
        normalized = normalize_recovery_answer(value)
        if len(normalized) < 3 or len(normalized) > 120:
            raise serializers.ValidationError('Answer must be between 3 and 120 characters.')
        return normalized

    def create(self, validated_data):
        answer = validated_data.pop('recovery_answer')
        password = validated_data.pop('password')
        profile = validated_data.pop('profile', None)
        user = User(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data.get('first_name') or '',
            last_name=validated_data.get('last_name') or '',
            recovery_question=validated_data['recovery_question'],
            recovery_answer_hash=make_password(answer),
            password=make_password(password),
            profile=profile,
        )
        user.save()
        return user


class ProfileUpdateSerializer(serializers.Serializer):
    username = serializers.CharField(required=False, max_length=150)
    email = serializers.EmailField(required=False, max_length=254)
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=100)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=100)
    password = serializers.CharField(required=False, write_only=True, max_length=128)
    profile = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    skin_type = serializers.CharField(required=False, allow_blank=True, max_length=20)
    skin_tone = serializers.CharField(required=False, allow_blank=True, max_length=20)
    skin_disease = serializers.CharField(required=False, allow_blank=True, max_length=255)
    age_bracket = serializers.CharField(required=False, allow_blank=True, max_length=10)
    gender = serializers.CharField(required=False, allow_blank=True, max_length=20)
    allergies = serializers.CharField(required=False, allow_blank=True)
    is_pregnant_or_breastfeeding = serializers.BooleanField(required=False)
    current_products = serializers.CharField(required=False, allow_blank=True)

    def validate_username(self, value):
        value = (value or '').strip()
        ok, message = Validations().isValidUsername(value)
        if not ok:
            raise serializers.ValidationError(message)
        user = self.context['user']
        if User.objects.filter(username__iexact=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value

    def validate_email(self, value):
        value = (value or '').strip()
        try:
            validate_email(value)
        except DjangoValidationError:
            raise serializers.ValidationError('Invalid email format.')
        user = self.context['user']
        if User.objects.filter(email__iexact=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError('This email is already registered.')
        return value

    def validate_first_name(self, value):
        value = (value or '').strip()
        if value:
            ok, message = Validations().isValidName(value)
            if not ok:
                raise serializers.ValidationError(message)
        return value

    def validate_last_name(self, value):
        value = (value or '').strip()
        if value:
            ok, message = Validations().isValidName(value)
            if not ok:
                raise serializers.ValidationError(message)
        return value

    def validate_password(self, value):
        if value:
            ok, message = Validations().isValidPassword(value)
            if not ok:
                raise serializers.ValidationError(message)
        return value

    def update(self, user, validated_data):
        if 'password' in validated_data:
            user.password = make_password(validated_data.pop('password'))
        for field, value in validated_data.items():
            setattr(user, field, value)
        user.save()
        return user


class RecoverySetupSerializer(serializers.Serializer):
    recovery_question = serializers.CharField()
    recovery_answer = serializers.CharField(write_only=True)
    current_password = serializers.CharField(required=False, allow_blank=True, write_only=True)

    def validate_recovery_question(self, value):
        if not isinstance(value, str) or not value.strip() or value.strip() not in RECOVERY_QUESTIONS:
            raise serializers.ValidationError('Please choose a security question.')
        return value.strip()

    def validate_recovery_answer(self, value):
        if not isinstance(value, str) or not value.strip():
            raise serializers.ValidationError('Please enter an answer.')
        normalized = normalize_recovery_answer(value)
        if len(normalized) < 3 or len(normalized) > 120:
            raise serializers.ValidationError('Answer must be between 3 and 120 characters.')
        return normalized

    def validate(self, attrs):
        user = self.context['user']
        current_password = attrs.get('current_password')
        changing_existing = user_has_recovery_question(user)
        # Required when changing an existing question (stolen-session protection).
        # Also required when setting for the first time so a stolen token alone is not enough.
        if not isinstance(current_password, str) or not current_password:
            raise serializers.ValidationError({
                'current_password': ['Current password is required.'],
            })
        if not check_password(current_password, user.password):
            raise serializers.ValidationError({
                'current_password': [
                    'Current password is incorrect.' if changing_existing
                    else 'Current password is incorrect.'
                ],
            })
        return attrs

    def save(self, **kwargs):
        user = self.context['user']
        user.recovery_question = self.validated_data['recovery_question']
        user.recovery_answer_hash = make_password(self.validated_data['recovery_answer'])
        user.password_reset_failed_attempts = 0
        user.password_reset_locked_until = None
        user.save(update_fields=[
            'recovery_question',
            'recovery_answer_hash',
            'password_reset_failed_attempts',
            'password_reset_locked_until',
            'updated_at',
        ])
        return user
