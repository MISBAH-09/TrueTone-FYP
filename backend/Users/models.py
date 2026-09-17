"""
User model for TrueTone authentication.
Uses Django's built-in password hashers for security.
"""
from django.db import models


class User(models.Model):
    """Custom user model with token-based authentication."""

    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('prefer_not_to_say', 'Prefer not to say'),
    ]

    SKIN_TONE_CHOICES = [
        ('fair', 'Fair'),
        ('medium', 'Medium'),
        ('dark', 'Dark'),
    ]

    SKIN_TYPE_CHOICES = [
        ('oily', 'Oily'),
        ('combination', 'Combination'),
        ('dry', 'Dry'),
    ]

    # ─── Auth fields ─────────────────────────────────────────
    username = models.CharField(max_length=150, unique=True, db_index=True)
    email = models.EmailField(max_length=254, unique=True, db_index=True)
    password = models.CharField(max_length=256)
    first_name = models.CharField(max_length=100, blank=True, default='')
    last_name = models.CharField(max_length=100, blank=True, default='')
    profile = models.TextField(blank=True, null=True)
    token = models.CharField(max_length=256, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    # ─── Onboarding fields ───────────────────────────────────
    onboarding_completed = models.BooleanField(default=False)
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, blank=True, default='')
    date_of_birth = models.DateField(blank=True, null=True)
    skin_tone = models.CharField(max_length=20, choices=SKIN_TONE_CHOICES, blank=True, default='')
    skin_type = models.CharField(max_length=20, choices=SKIN_TYPE_CHOICES, blank=True, default='')
    skin_disease = models.CharField(max_length=255, blank=True, default='')
    skin_image = models.TextField(blank=True, null=True)

    # ─── Timestamps ──────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
        ordering = ['-created_at']

    def __str__(self):
        return self.username
