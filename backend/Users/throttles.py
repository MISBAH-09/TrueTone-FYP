"""
IP-based throttles for password recovery endpoints.
"""
from rest_framework.throttling import SimpleRateThrottle


class PasswordRecoveryThrottle(SimpleRateThrottle):
    scope = 'password_recovery'

    def get_cache_key(self, request, view):
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request),
        }


class PasswordRecoverySetupThrottle(SimpleRateThrottle):
    scope = 'password_recovery_setup'

    def get_cache_key(self, request, view):
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request),
        }
