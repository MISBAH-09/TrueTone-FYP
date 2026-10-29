import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('Users', '0007_user_gender'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProductScan',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ingredients', models.JSONField(default=list)),
                ('score', models.FloatField(default=0)),
                ('is_safe', models.BooleanField(default=True)),
                ('reasons', models.JSONField(default=list)),
                ('warnings', models.JSONField(default=list)),
                ('flags', models.JSONField(default=list)),
                ('matched_ingredients', models.JSONField(default=list)),
                ('image', models.ImageField(blank=True, null=True, upload_to='product_scans/')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='product_scans', to='Users.user')),
            ],
            options={
                'db_table': 'product_scans',
                'ordering': ['-created_at'],
            },
        ),
    ]
