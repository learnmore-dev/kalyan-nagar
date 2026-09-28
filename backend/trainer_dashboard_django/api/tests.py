from django.contrib.auth.models import User
from django.test import TestCase
from types import SimpleNamespace
from unittest.mock import patch
from rest_framework.test import APIRequestFactory, force_authenticate

from .models import Batch, UserProfile
from .views import BatchViewSet


class BatchListFilterTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.auth_user = User.objects.create_user(username='batch-filter-test')
        self.trainer = UserProfile.objects.create(username='trainer-one', name='Trainer One')
        other_trainer = UserProfile.objects.create(username='trainer-two', name='Trainer Two')
        self.demo_batch = Batch.objects.create(name='Trainer One Demo', trainer=self.trainer, batch_type='demo')
        Batch.objects.create(name='Trainer Two Demo', trainer=other_trainer, batch_type='demo')
        Batch.objects.create(name='Trainer One Class', trainer=self.trainer, batch_type='training')

    def test_list_filters_legacy_trainer_parameter_and_batch_type(self):
        request = self.factory.get('/api/batches/', {
            'trainer': self.trainer.id,
            'batch_type': 'demo',
        })
        force_authenticate(request, user=self.auth_user)

        response = BatchViewSet.as_view({'get': 'list'})(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual([batch['id'] for batch in response.data['batches']], [str(self.demo_batch.id)])

    def test_list_filters_trainer_id_parameter(self):
        request = self.factory.get('/api/batches/', {'trainer_id': self.trainer.id})
        force_authenticate(request, user=self.auth_user)

        response = BatchViewSet.as_view({'get': 'list'})(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {batch['id'] for batch in response.data['batches']},
            {str(self.demo_batch.id), str(Batch.objects.get(name='Trainer One Class').id)},
        )


class BatchCreateWhatsAppTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.auth_user = User.objects.create_user(username='batch-create-test')
        self.trainer = UserProfile.objects.create(username='demo-trainer', name='Demo Trainer')

    @patch('requests.post')
    def test_demo_batch_never_creates_whatsapp_group(self, post_request):
        request = self.factory.post('/api/batches/', {
            'name': 'DEMO-Test-Student',
            'batch_type': 'demo',
            'trainer': self.trainer.id,
            'auto_whatsapp_group': True,
            'student_name': 'Test Student',
        }, format='json')
        force_authenticate(request, user=self.auth_user)

        response = BatchViewSet.as_view({'post': 'create'})(request)

        self.assertEqual(response.status_code, 201)
        post_request.assert_not_called()

    @patch('requests.post')
    def test_regular_batch_still_creates_whatsapp_group(self, post_request):
        self.trainer.phone = '+911234567890'
        self.trainer.save(update_fields=['phone'])
        post_request.return_value = SimpleNamespace(
            ok=True,
            json=lambda: {'success': True, 'groupId': 'regular-group', 'inviteLink': 'https://chat.whatsapp.com/invite/test'},
        )
        request = self.factory.post('/api/batches/', {
            'name': 'Python Batch',
            'batch_type': 'training',
            'trainer': self.trainer.id,
        }, format='json')
        force_authenticate(request, user=self.auth_user)

        response = BatchViewSet.as_view({'post': 'create'})(request)

        self.assertEqual(response.status_code, 201)
        post_request.assert_called_once()
        self.assertEqual(response.data['whatsapp']['groupId'], 'regular-group')