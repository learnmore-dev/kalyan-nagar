from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0009_passwordresetotp'),
    ]

    operations = [
        migrations.AddField(
            model_name='batch',
            name='counsellor_name',
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
        migrations.AddField(
            model_name='batch',
            name='counsellor',
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
        migrations.AddField(
            model_name='batch',
            name='notes',
            field=models.TextField(blank=True, null=True),
        ),
    ]
