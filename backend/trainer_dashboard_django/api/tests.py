from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from types import SimpleNamespace
from unittest.mock import patch
from rest_framework.test import APIRequestFactory, force_authenticate

from .models import Batch, TrainerAttendance, UserProfile
from .views import BatchViewSet, TrainerAttendanceViewSet, export_attendance_view


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


class TrainerAttendanceWhatsAppTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.auth_user = User.objects.create_user(username='attendance-test')
        self.trainer = UserProfile.objects.create(username='attendance-trainer', name='Attendance Trainer')

    @patch('api.views.requests.post')
    def test_check_in_does_not_send_whatsapp_message(self, post_request):
        request = self.factory.post('/api/attendance/check-in/', {
            'trainer_id': self.trainer.id,
        }, format='json')
        force_authenticate(request, user=self.auth_user)

        response = TrainerAttendanceViewSet.as_view({'post': 'check_in'})(request)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(TrainerAttendance.objects.filter(trainer=self.trainer).exists())
        post_request.assert_not_called()

    @patch('api.views.requests.post')
    def test_check_out_does_not_send_whatsapp_message(self, post_request):
        today = timezone.localtime(timezone.now()).strftime('%Y-%m-%d')
        attendance = TrainerAttendance.objects.create(
            trainer=self.trainer,
            trainer_name=self.trainer.name,
            date=today,
            mark_in_time='09:00:00',
        )
        request = self.factory.post('/api/attendance/check-out/', {
            'trainer_id': self.trainer.id,
        }, format='json')
        force_authenticate(request, user=self.auth_user)

        response = TrainerAttendanceViewSet.as_view({'post': 'check_out'})(request)

        self.assertEqual(response.status_code, 200)
        attendance.refresh_from_db()
        self.assertTrue(attendance.mark_out_time)
        post_request.assert_not_called()


class TrainerAttendanceListFilterTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.auth_user = User.objects.create_user(username='attendance-list-test')
        self.trainer = UserProfile.objects.create(username='list-trainer', name='List Trainer')
        self.other = UserProfile.objects.create(username='other-trainer', name='Other Trainer')
        for day in range(1, 12):
            TrainerAttendance.objects.create(
                trainer=self.trainer,
                trainer_name=self.trainer.name,
                date=f'2026-10-{day:02d}',
                mark_in_time='09:00:00',
                mark_out_time='18:00:00',
                day_status='present',
            )
        TrainerAttendance.objects.create(
            trainer=self.trainer,
            trainer_name=self.trainer.name,
            date='2026-11-01',
            mark_in_time='09:00:00',
            mark_out_time='18:00:00',
            day_status='present',
        )
        for i in range(90):
            TrainerAttendance.objects.create(
                trainer=self.other,
                trainer_name=self.other.name,
                date=f'2026-11-{(i % 10) + 1:02d}',
                mark_in_time='09:00:00',
                mark_out_time='18:00:00',
                day_status='present',
            )

    def test_month_filter_returns_full_october_even_when_newer_records_exist(self):
        request = self.factory.get('/api/attendance/', {'month': '2026-10'})
        force_authenticate(request, user=self.auth_user)

        response = TrainerAttendanceViewSet.as_view({'get': 'list'})(request)

        self.assertEqual(response.status_code, 200)
        dates = {row['date'] for row in response.data['attendances']}
        self.assertEqual(len(dates), 11)
        self.assertTrue(all(d.startswith('2026-10') for d in dates))
        self.assertNotIn('2026-11-01', dates)

    def test_unfiltered_list_still_caps_at_ninety(self):
        request = self.factory.get('/api/attendance/')
        force_authenticate(request, user=self.auth_user)

        response = TrainerAttendanceViewSet.as_view({'get': 'list'})(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['attendances']), 90)


class ExportAttendanceTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.auth_user = User.objects.create_user(username='export-test')
        self.trainer = UserProfile.objects.create(
            username='export-trainer',
            name='Export Trainer',
            role='trainer',
        )
        TrainerAttendance.objects.create(
            trainer=self.trainer,
            trainer_name=self.trainer.name,
            date='2026-10-05',
            mark_in_time='09:00:00',
            mark_out_time='18:30:00',
            day_status='present',
            total_work_minutes=570,
        )

    def test_export_returns_csv_attachment_for_selected_month(self):
        request = self.factory.get('/api/export-attendance/', {
            'month': '10',
            'year': '2026',
            'trainer': self.trainer.id,
        })
        force_authenticate(request, user=self.auth_user)

        response = export_attendance_view(request)

        self.assertEqual(response.status_code, 200)
        self.assertIn('text/csv', response['Content-Type'])
        self.assertIn('attendance-October-2026.csv', response['Content-Disposition'])
        body = response.content.decode('utf-8-sig')
        self.assertIn('Export Trainer', body)
        self.assertIn('2026-10-05', body)
        self.assertIn('PRESENT', body)