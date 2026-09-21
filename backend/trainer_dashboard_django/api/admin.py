from django.contrib import admin
from .models import (
    UserProfile,
    Batch,
    WorkSession,
    TrainerAttendance,
    Leave,
    TaskLog,
    LiveActivity,
    WhatsAppBroadcastLog,
    WhatsAppGroup,
    Course,
    Student,
    AttendanceGroupConfig,
    Holiday,
)

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'username', 'role', 'phone', 'designation')
    search_fields = ('name', 'username', 'phone')


@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'trainer_name', 'total_hours', 'is_completed', 'is_active', 'whatsapp_group_name')
    search_fields = ('name', 'trainer_name', 'whatsapp_group_name')


@admin.register(WorkSession)
class WorkSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'batch_name', 'trainer_name', 'session_date', 'hours_taken')
    search_fields = ('batch_name', 'trainer_name')


@admin.register(TrainerAttendance)
class TrainerAttendanceAdmin(admin.ModelAdmin):
    list_display = ('id', 'trainer_name', 'date', 'mark_in_time', 'mark_out_time', 'day_status')
    search_fields = ('trainer_name', 'date')


@admin.register(Leave)
class LeaveAdmin(admin.ModelAdmin):
    list_display = ('id', 'trainer_name', 'leave_type', 'start_date', 'end_date', 'status')
    search_fields = ('trainer_name', 'reason')


@admin.register(TaskLog)
class TaskLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'trainer_name', 'title', 'category', 'duration_minutes', 'is_completed')
    search_fields = ('title', 'trainer_name')


@admin.register(LiveActivity)
class LiveActivityAdmin(admin.ModelAdmin):
    list_display = ('trainer_name', 'status', 'current_task_title', 'last_heartbeat_at', 'is_logged_in')


@admin.register(WhatsAppBroadcastLog)
class WhatsAppBroadcastLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'group_name', 'trainer_name', 'status', 'sent_at')
    search_fields = ('group_name', 'message_preview')


@admin.register(WhatsAppGroup)
class WhatsAppGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'id', 'size', 'owner', 'last_synced_at')
    search_fields = ('name', 'id', 'owner')


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'total_hours')
    search_fields = ('name', 'code')


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('name', 'batch_name', 'phone', 'email')
    search_fields = ('name', 'phone', 'batch_name')


@admin.register(AttendanceGroupConfig)
class AttendanceGroupConfigAdmin(admin.ModelAdmin):
    list_display = ('id', 'group_name', 'group_id')


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ('name', 'date', 'type')
    search_fields = ('name', 'date')

