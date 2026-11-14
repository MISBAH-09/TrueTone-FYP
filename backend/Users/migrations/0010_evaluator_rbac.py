# Generated manually for evaluator RBAC + seeded EVALTRUETONE access code

from django.contrib.auth.hashers import make_password
from django.db import migrations, models


def seed_evaluator_code(apps, schema_editor):
    EvaluatorAccessCode = apps.get_model('Users', 'EvaluatorAccessCode')
    EvaluatorAccessCode.objects.update_or_create(
        label='default',
        defaults={
            'code_hash': make_password('EVALTRUETONE'),
            'is_active': True,
        },
    )


def unseed_evaluator_code(apps, schema_editor):
    EvaluatorAccessCode = apps.get_model('Users', 'EvaluatorAccessCode')
    EvaluatorAccessCode.objects.filter(label='default').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('Users', '0009_alter_skinscanhistory_source'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[('end_user', 'End User'), ('evaluator', 'Evaluator')],
                default='end_user',
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name='EvaluatorAccessCode',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('label', models.CharField(default='default', max_length=64, unique=True)),
                ('code_hash', models.CharField(max_length=256)),
                ('is_active', models.BooleanField(default=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'evaluator_access_codes',
            },
        ),
        migrations.RunPython(seed_evaluator_code, unseed_evaluator_code),
    ]
