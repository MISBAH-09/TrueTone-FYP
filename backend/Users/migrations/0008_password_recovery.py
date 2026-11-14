from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Users', '0007_user_gender'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='recovery_question',
            field=models.CharField(blank=True, default='', max_length=32),
        ),
        migrations.AddField(
            model_name='user',
            name='recovery_answer_hash',
            field=models.CharField(blank=True, default='', max_length=256),
        ),
        migrations.AddField(
            model_name='user',
            name='password_reset_failed_attempts',
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='user',
            name='password_reset_locked_until',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
