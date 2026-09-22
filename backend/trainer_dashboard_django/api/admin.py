from django.contrib import admin
from django.utils.html import mark_safe
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
    list_display = ('id', 'trainer_name', 'date', 'mark_in_time', 'mark_out_time', 'work_duration_diff', 'selfie_preview', 'day_status')
    search_fields = ('trainer_name', 'date', 'working_duration')
    readonly_fields = ('photo_in_preview', 'photo_out_preview')
    fields = (
        'trainer',
        'trainer_name',
        'date',
        'mark_in_time',
        'mark_out_time',
        'working_duration',
        'day_status',
        'location_name',
        'latitude',
        'longitude',
        'photo_in_preview',
        'photo_out_preview',
        'photo_in',
        'photo_out',
    )

    @admin.display(description='SELFIE')
    def selfie_preview(self, obj):
        img_src = obj.photo_in or obj.photo_out
        if img_src:
            return mark_safe(f'<img src="{img_src}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 8px; border: 1px solid #ccc;" />')
        return "—"

    @admin.display(description='PHOTO IN PREVIEW')
    def photo_in_preview(self, obj):
        if obj.photo_in:
            return mark_safe(f'<img src="{obj.photo_in}" style="max-width: 350px; max-height: 350px; border-radius: 12px; border: 2px solid #10b981; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />')
        return "No Photo In"

    @admin.display(description='PHOTO OUT PREVIEW')
    def photo_out_preview(self, obj):
        if obj.photo_out:
            return mark_safe(f'<img src="{obj.photo_out}" style="max-width: 350px; max-height: 350px; border-radius: 12px; border: 2px solid #ef4444; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />')
        return "No Photo Out"

    @admin.display(description='WORK DURATION (DIFF)')
    def work_duration_diff(self, obj):
        if obj.working_duration and obj.working_duration != '0' and obj.working_duration != '0h 0m':
            return obj.working_duration
        if obj.mark_in_time and obj.mark_out_time:
            try:
                def parse_mins(t_str):
                    if not t_str: return None
                    s = str(t_str).strip()
                    if ':' in s:
                        parts = s.split(':')
                        return int(parts[0]) * 60 + int(parts[1])
                    return None
                in_m = parse_mins(obj.mark_in_time)
                out_m = parse_mins(obj.mark_out_time)
                if in_m is not None and out_m is not None:
                    diff = out_m - in_m
                    if diff < 0: diff += 24 * 60
                    return f"{diff // 60}h {diff % 60}m"
            except Exception:
                pass
        elif obj.mark_in_time:
            return "Active Shift"
        return "—"


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

