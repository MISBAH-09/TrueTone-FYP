# Generated manually for nullable recovery fields (do not edit 0008).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Users', '0010_evaluator_rbac'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='recovery_question',
            field=models.CharField(blank=True, max_length=32, null=True),
        ),
        migrations.AlterField(
            model_name='user',
            name='recovery_answer_hash',
            field=models.CharField(blank=True, max_length=256, null=True),
        ),
    ]
