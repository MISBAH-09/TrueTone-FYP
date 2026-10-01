"""
User model for TrueTone authentication.
Uses Django's built-in password hashers for security.

Models:
- User: Core authentication and profile data
- SkinScanHistory: Tracks user's confirmed skin scan history over time
"""
from django.db import models


class User(models.Model):
    """Custom user model with token-based authentication."""

    AGE_BRACKET_CHOICES = [
        ('teen', 'Teen'),
        ('18-24', '18-24'),
        ('25-34', '25-34'),
        ('35+', '35+'),
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
        ('normal', 'Normal'),
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

    # ─── Onboarding fields (finalized 7-question set) ─────────
    onboarding_completed = models.BooleanField(default=False)

    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('prefer_not_to_say', 'Prefer not to say'),
    ]

    age_bracket = models.CharField(max_length=10, choices=AGE_BRACKET_CHOICES, blank=True, default='')
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, blank=True, default='')
    skin_tone = models.CharField(max_length=20, choices=SKIN_TONE_CHOICES, blank=True, default='')
    skin_type = models.CharField(max_length=20, choices=SKIN_TYPE_CHOICES, blank=True, default='')
    skin_disease = models.CharField(max_length=255, blank=True, default='')  # comma-separated,
    # matches pipeline_engine.py's SKIN_DISEASE_CLASSES exactly:
    # common_acne, cystic_acne, eczema, psoriasis, rosacea, tinea
    skin_image = models.TextField(blank=True, null=True)

    allergies = models.TextField(blank=True, default='')          # comma-separated ingredient names
    is_pregnant_or_breastfeeding = models.BooleanField(default=False)
    current_products = models.TextField(blank=True, default='')   # comma-separated product_ids, optional

    # ─── Timestamps ──────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
        ordering = ['-created_at']

    def __str__(self):
        return self.username

    # ─── Helpers for the recommendation engine ────────────────
    def allergies_list(self):
        return [a.strip() for a in self.allergies.split(',') if a.strip()]

    def skin_disease_list(self):
        return [d.strip() for d in self.skin_disease.split(',') if d.strip()]

    def current_products_list(self):
        return [p.strip() for p in self.current_products.split(',') if p.strip()]


class SkinScanHistory(models.Model):
    """
    One row per confirmed skin scan. Written ONLY when the user explicitly
    confirms an update (see the confirm-update flow in Users/views.py) -
    never written for a "quick check" that the user chose not to save.
    This is what powers the Skin Tracking page.
    """
    SOURCE_CHOICES = [
        ('onboarding', 'Onboarding'),
        ('full_scan', 'Full scan (all 3 models)'),
        ('manual', 'Manual entry'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='skin_scans')

    skin_type = models.CharField(max_length=20, blank=True, default='')
    skin_type_confidence = models.FloatField(null=True, blank=True)

    skin_tone = models.CharField(max_length=20, blank=True, default='')
    skin_tone_confidence = models.FloatField(null=True, blank=True)

    # comma-separated, matches pipeline_engine.py's SKIN_DISEASE_CLASSES
    skin_disease = models.CharField(max_length=255, blank=True, default='')
    skin_disease_confidence = models.FloatField(null=True, blank=True)
    disease_detected = models.BooleanField(default=False)

    image_original = models.ImageField(upload_to='scans/', blank=True, null=True)
    image_processed = models.ImageField(upload_to='scans/', blank=True, null=True)

    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='full_scan')
    scanned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'skin_scan_history'
        ordering = ['-scanned_at']

    def __str__(self):
        return f"{self.user.username} @ {self.scanned_at:%Y-%m-%d}"
