from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserProfileViewSet,
    CourseViewSet,
    BatchViewSet,
    StudentViewSet,
    WorkSessionViewSet,
    TrainerAttendanceViewSet,
    LeaveViewSet,
    TaskLogViewSet,
    LiveActivityViewSet,
    HolidayViewSet,
    WhatsAppGroupViewSet,
    whatsapp_bot_gateway,
    reports_summary_view,
    monitoring_summary_view,
    trainer_timeline_view,
    topics_coverage_view,
    cron_12pm_cutoff_view,
)

router = DefaultRouter()
router.register(r'users', UserProfileViewSet, basename='user')
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'batches', BatchViewSet, basename='batch')
router.register(r'students', StudentViewSet, basename='student')
router.register(r'sessions', WorkSessionViewSet, basename='session')
router.register(r'attendance', TrainerAttendanceViewSet, basename='attendance')
router.register(r'leaves', LeaveViewSet, basename='leave')
router.register(r'tasks', TaskLogViewSet, basename='task')
router.register(r'live-activity', LiveActivityViewSet, basename='live-activity')
router.register(r'holidays', HolidayViewSet, basename='holiday')
router.register(r'whatsapp-groups', WhatsAppGroupViewSet, basename='whatsapp-group')

urlpatterns = [
    path('auth/login/', UserProfileViewSet.as_view({'post': 'login'}), name='auth-login'),
    path('auth/login', UserProfileViewSet.as_view({'post': 'login'}), name='auth-login-noslash'),
    path('whatsapp/bot', whatsapp_bot_gateway, name='whatsapp-bot-gateway'),
    path('whatsapp/bot/', whatsapp_bot_gateway, name='whatsapp-bot-gateway-slash'),
    path('reports', reports_summary_view, name='reports-summary'),
    path('reports/', reports_summary_view, name='reports-summary-slash'),
    path('monitoring', monitoring_summary_view, name='monitoring-summary'),
    path('monitoring/', monitoring_summary_view, name='monitoring-summary-slash'),
    path('monitoring/snapshot', monitoring_summary_view, name='monitoring-snapshot'),
    path('monitoring/snapshot/', monitoring_summary_view, name='monitoring-snapshot-slash'),
    path('topics/coverage', topics_coverage_view, name='topics-coverage'),
    path('topics/coverage/', topics_coverage_view, name='topics-coverage-slash'),
    path('cron/12pm-cutoff', cron_12pm_cutoff_view, name='cron-12pm-cutoff'),
    path('cron/12pm-cutoff/', cron_12pm_cutoff_view, name='cron-12pm-cutoff-slash'),
    path('trainer-timeline/', trainer_timeline_view, name='trainer-timeline'),
    path('trainer-timeline', trainer_timeline_view, name='trainer-timeline-noslash'),
    path('', include(router.urls)),
]

