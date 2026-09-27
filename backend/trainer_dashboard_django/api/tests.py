from django.contrib.auth.models import User
from django.test import TestCase
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