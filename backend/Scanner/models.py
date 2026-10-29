from django.db import models


class ProductScan(models.Model):
    """One saved ingredient scan for a user, including the recommendation score."""

    user = models.ForeignKey('Users.User', on_delete=models.CASCADE, related_name='product_scans')
    ingredients = models.JSONField(default=list)
    score = models.FloatField(default=0)
    is_safe = models.BooleanField(default=True)
    reasons = models.JSONField(default=list)
    warnings = models.JSONField(default=list)
    flags = models.JSONField(default=list)
    matched_ingredients = models.JSONField(default=list)
    image = models.ImageField(upload_to='product_scans/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'product_scans'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} scan @ {self.created_at:%Y-%m-%d}"
