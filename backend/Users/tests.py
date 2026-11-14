from django.contrib.auth.hashers import check_password, make_password
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import User
from .views import normalize_recovery_answer


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
