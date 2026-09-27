from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0007_batch_demo_link_batch_demo_status_batch_enquiry_id_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='batch',
            name='branch',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]