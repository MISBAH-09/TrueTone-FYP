from django.contrib.auth.hashers import check_password, make_password
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import User
from .views_helpers import normalize_recovery_answer, NEUTRAL_RECOVERY_MESSAGE


@override_settings(CACHES={
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'users-password-recovery-tests',
    },
}, PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class PasswordRecoveryTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create(
            username='skincare_user',
            email='skin@example.com',
            password=make_password('OriginalPass1!'),
            token='active-token',
            recovery_question='first_pet',
            recovery_answer_hash=make_password(
                normalize_recovery_answer('  Milo  ')
            ),
        )

    def test_recovery_question_requires_matching_username_and_email(self):
        response = self.client.post(
            '/users/password-recovery/question/',
            {'username': self.user.username, 'email': 'SKIN@example.com'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['data']['question'], 'first_pet')

        response = self.client.post(
            '/users/password-recovery/question/',
            {'username': self.user.username, 'email': 'other@example.com'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data['data']['question'])

    def test_correct_answer_resets_password_and_revokes_existing_token(self):
        response = self.client.post(
            '/users/password-recovery/reset/',
            {
                'username': self.user.username,
                'email': self.user.email,
                'recovery_question': 'first_pet',
                'recovery_answer': 'MILO',
                'password': 'NewSecurePass2!',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)

        self.user.refresh_from_db()
        self.assertTrue(check_password('NewSecurePass2!', self.user.password))
        self.assertIsNone(self.user.token)
        self.assertEqual(self.user.password_reset_failed_attempts, 0)

    def test_incorrect_answer_increments_failed_attempts(self):
        response = self.client.post(
            '/users/password-recovery/reset/',
            {
                'username': self.user.username,
                'email': self.user.email,
                'recovery_question': 'first_pet',
                'recovery_answer': 'wrong answer',
                'password': 'NewSecurePass2!',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertEqual(self.user.password_reset_failed_attempts, 1)
        self.assertTrue(check_password('OriginalPass1!', self.user.password))

    def test_repeated_incorrect_answers_lock_recovery(self):
        payload = {
            'username': self.user.username,
            'email': self.user.email,
            'recovery_question': 'first_pet',
            'recovery_answer': 'wrong answer',
            'password': 'NewSecurePass2!',
        }
        for _ in range(5):
            response = self.client.post(
                '/users/password-recovery/reset/',
                payload,
                format='json',
            )
            self.assertEqual(response.status_code, 400)

        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.password_reset_locked_until)
        self.assertEqual(self.user.password_reset_failed_attempts, 0)

        cache.clear()
        payload['recovery_answer'] = 'Milo'
        response = self.client.post(
            '/users/password-recovery/reset/',
            payload,
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertTrue(check_password('OriginalPass1!', self.user.password))

    def test_malformed_recovery_question_is_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION=self.user.token)
        response = self.client.post(
            '/users/password-recovery/setup/',
            {
                'current_password': 'OriginalPass1!',
                'recovery_question': ['first_pet'],
                'recovery_answer': 'Milo',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)

    def test_signup_requires_and_hashes_recovery_answer(self):
        response = self.client.post(
            '/users/signup/',
            {
                'username': 'new_skincare_user',
                'email': 'new@example.com',
                'password': 'NewSecurePass2!',
                'recovery_question': 'childhood_nickname',
                'recovery_answer': '  Sunny  ',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(username='new_skincare_user')
        self.assertEqual(user.recovery_question, 'childhood_nickname')
        self.assertNotEqual(user.recovery_answer_hash, 'sunny')
        self.assertTrue(check_password('sunny', user.recovery_answer_hash))

    def test_signed_in_user_can_configure_recovery_after_reauthentication(self):
        self.user.recovery_question = ''
        self.user.recovery_answer_hash = ''
        self.user.save(update_fields=['recovery_question', 'recovery_answer_hash'])
        self.client.credentials(HTTP_AUTHORIZATION=self.user.token)

        response = self.client.post(
            '/users/password-recovery/setup/',
            {
                'current_password': 'OriginalPass1!',
                'recovery_question': 'first_school',
                'recovery_answer': '  North School ',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.recovery_question, 'first_school')
        self.assertTrue(check_password('north school', self.user.recovery_answer_hash))


@override_settings(CACHES={
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'users-auth-profile-tests',
    },
}, PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class SignupLoginProfileTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.legacy = User.objects.create(
            username='legacy_user',
            email='legacy@example.com',
            password=make_password('LegacyPass1!'),
            token='legacy-token',
            first_name='',
            last_name='',
            recovery_question=None,
            recovery_answer_hash=None,
        )

    def test_signup_missing_question_returns_400_field_error(self):
        response = self.client.post(
            '/users/signup/',
            {
                'username': 'freshuser01',
                'email': 'fresh01@example.com',
                'password': 'NewSecurePass2!',
                'recovery_answer': 'milo',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('errors', response.data)
        self.assertIn('recovery_question', response.data['errors'])
        self.assertNotIn('null value', str(response.data).lower())
        self.assertNotIn('password', str(response.data).lower())

    def test_signup_duplicate_email_friendly_400(self):
        self.client.post(
            '/users/signup/',
            {
                'username': 'freshuser02',
                'email': 'dup@example.com',
                'password': 'NewSecurePass2!',
                'recovery_question': 'first_pet',
                'recovery_answer': 'milo',
            },
            format='json',
        )
        response = self.client.post(
            '/users/signup/',
            {
                'username': 'freshuser03',
                'email': 'dup@example.com',
                'password': 'NewSecurePass2!',
                'recovery_question': 'first_pet',
                'recovery_answer': 'milo',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        body = str(response.data).lower()
        self.assertIn('already', body)
        self.assertNotIn('integrity', body)
        self.assertNotIn('duplicate key', body)

    def test_legacy_user_login_without_recovery_question(self):
        response = self.client.post(
            '/users/login/',
            {'username': 'legacy_user', 'password': 'LegacyPass1!'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        self.assertFalse(response.data['data']['has_recovery_question'])

    def test_profile_patch_first_last_name(self):
        self.client.credentials(HTTP_AUTHORIZATION=self.legacy.token)
        response = self.client.patch(
            '/users/update/',
            {'first_name': 'Ada', 'last_name': 'Lovelace'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['data']['first_name'], 'Ada')
        self.assertEqual(response.data['data']['last_name'], 'Lovelace')
        self.assertNotIn('recovery_answer', response.data['data'])
        self.assertNotIn('recovery_answer_hash', response.data['data'])
        self.legacy.refresh_from_db()
        self.assertEqual(self.legacy.first_name, 'Ada')

    def test_legacy_user_can_set_recovery_question(self):
        self.client.credentials(HTTP_AUTHORIZATION=self.legacy.token)
        response = self.client.post(
            '/users/password-recovery/setup/',
            {
                'current_password': 'LegacyPass1!',
                'recovery_question': 'first_pet',
                'recovery_answer': '  Spot  ',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.legacy.refresh_from_db()
        self.assertEqual(self.legacy.recovery_question, 'first_pet')
        self.assertTrue(check_password('spot', self.legacy.recovery_answer_hash))
        profile = self.client.get('/users/profile/')
        self.assertTrue(profile.data['data']['has_recovery_question'])
        self.assertEqual(profile.data['data']['recovery_question'], 'first_pet')
        self.assertNotIn('recovery_answer_hash', profile.data['data'])
        self.assertNotIn('recovery_answer', profile.data['data'])

    def test_change_recovery_rejects_wrong_password(self):
        self.legacy.recovery_question = 'first_pet'
        self.legacy.recovery_answer_hash = make_password('spot')
        self.legacy.save(update_fields=['recovery_question', 'recovery_answer_hash'])
        self.client.credentials(HTTP_AUTHORIZATION=self.legacy.token)
        response = self.client.post(
            '/users/password-recovery/setup/',
            {
                'current_password': 'WrongPass1!',
                'recovery_question': 'first_school',
                'recovery_answer': 'North',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.legacy.refresh_from_db()
        self.assertEqual(self.legacy.recovery_question, 'first_pet')

    def test_recovery_for_user_without_question_is_neutral(self):
        response = self.client.post(
            '/users/password-recovery/question/',
            {'username': 'legacy_user', 'email': 'legacy@example.com'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data['data']['question'])
        self.assertEqual(response.data['message'], NEUTRAL_RECOVERY_MESSAGE)

    def test_exception_handler_hides_database_errors(self):
        from Users.exception_handler import custom_exception_handler, GENERIC_500
        from django.db import IntegrityError

        response = custom_exception_handler(
            IntegrityError('null value in column "recovery_question" of relation "users"'),
            {'request': None, 'view': None},
        )
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data['detail'], GENERIC_500)
        self.assertNotIn('recovery_question', str(response.data))
        self.assertNotIn('null value', str(response.data))
