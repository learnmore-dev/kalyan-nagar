import uuid
from django.db import models
from django.utils import timezone

class UserProfile(models.Model):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('trainer', 'Trainer'),
    )

    id = models.CharField(max_length=100, primary_key=True, default=uuid.uuid4)
    username = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=150)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='trainer')
    password = models.CharField(max_length=128, blank=True, null=True)
    avatar = models.TextField(blank=True, null=True)
    designation = models.CharField(max_length=150, blank=True, null=True)
    hourly_rate = models.FloatField(default=0.0)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.name} ({self.role})"


class Course(models.Model):
    id = models.CharField(max_length=100, primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    total_hours = models.FloatField(default=40.0)
    modules = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.name


class Batch(models.Model):
    BATCH_TYPE_CHOICES = (
        ('training', 'Training'),
        ('other', 'Other'),
    )
    STATUS_CHOICES = (
        ('ontime', 'On Time'),
        ('delay', 'Delay'),
        ('completed', 'Completed'),
    )

    id = models.CharField(max_length=100, primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=200)
    course_id = models.CharField(max_length=100, blank=True, null=True)
    course_name = models.CharField(max_length=200, blank=True, null=True)
    trainer = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='batches')
    trainer_name = models.CharField(max_length=150, blank=True, null=True)
    start_date = models.CharField(max_length=50, blank=True, null=True)
    total_hours = models.FloatField(default=40.0)
    total_students = models.IntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(blank=True, null=True)
    batch_type = models.CharField(max_length=20, choices=BATCH_TYPE_CHOICES, default='training')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    whatsapp_group_name = models.CharField(max_length=200, blank=True, null=True)
    whatsapp_group_id = models.CharField(max_length=100, blank=True, null=True)
    whatsapp_group_link = models.TextField(blank=True, null=True)
    auto_whatsapp_group = models.BooleanField(default=True)
    timing = models.CharField(max_length=100, blank=True, null=True)
    classroom = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.name


class Student(models.Model):
    id = models.CharField(max_length=100, primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name='students')
    batch_name = models.CharField(max_length=200, blank=True, null=True)
    enrollment_date = models.CharField(max_length=50, default=timezone.now)

    def __str__(self):
        return f"{self.name} ({self.batch_name})"


class WorkSession(models.Model):
    id = models.CharField(max_length=100, primary_key=True, default=uuid.uuid4)
    trainer = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='work_sessions')
    trainer_name = models.CharField(max_length=150, blank=True, null=True)
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, related_name='work_sessions')
    batch_name = models.CharField(max_length=200, blank=True, null=True)
    course_id = models.CharField(max_length=100, blank=True, null=True)
    course_name = models.CharField(max_length=200, blank=True, null=True)
    selected_topics = models.JSONField(default=list, blank=True)
    session_date = models.CharField(max_length=50, default=timezone.now)
    hours_taken = models.FloatField(default=1.0)
    description = models.TextField(blank=True, null=True)
    total_students_present = models.IntegerField(default=0)
    total_students_absent = models.IntegerField(default=0)
    total_students_leave = models.IntegerField(default=0)
    students_attendance = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.batch_name} - {self.session_date}"


class TrainerAttendance(models.Model):
    DAY_STATUS_CHOICES = (
        ('present', 'Present'),
        ('half_day', 'Half Day'),
        ('leave', 'Leave'),
        ('pending', 'Pending'),
        ('absent', 'Absent'),
        ('weekoff', 'Week Off'),
        ('holiday', 'Holiday'),
    )

    id = models.CharField(max_length=100, primary_key=True, default=uuid.uuid4)
    trainer = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='attendances')
    trainer_name = models.CharField(max_length=150, blank=True, null=True)
    date = models.CharField(max_length=50)
    mark_in_time = models.CharField(max_length=50, blank=True, null=True)
    mark_out_time = models.CharField(max_length=50, blank=True, null=True)
    working_duration = models.CharField(max_length=50, blank=True, null=True)
    photo_in = models.TextField(blank=True, null=True)
    photo_out = models.TextField(blank=True, null=True)
    latitude = models.CharField(max_length=50, blank=True, null=True)
    longitude = models.CharField(max_length=50, blank=True, null=True)
    location_name = models.CharField(max_length=200, blank=True, null=True)
    day_status = models.CharField(max_length=20, choices=DAY_STATUS_CHOICES, default='present')
    total_work_minutes = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if self.mark_in_time and self.mark_out_time:
            try:
                def parse_mins(t_str):
                    if not t_str: return None
                    s = str(t_str).strip()
                    if ':' in s:
                        parts = s.split(':')
                        return int(parts[0]) * 60 + int(parts[1])
                    return None

                in_m = parse_mins(self.mark_in_time)
                out_m = parse_mins(self.mark_out_time)
                if in_m is not None and out_m is not None:
                    diff = out_m - in_m
                    if diff < 0:
                        diff += 24 * 60
                    self.total_work_minutes = diff
                    h = diff // 60
                    m = diff % 60
                    self.working_duration = f"{h}h {m}m"
            except Exception:
                pass
        elif self.mark_in_time and not self.mark_out_time:
            if not self.working_duration:
                self.working_duration = "Active Shift"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.trainer_name} - {self.date} ({self.day_status})"


class Leave(models.Model):
    LEAVE_TYPE_CHOICES = (
        ('sick', 'Sick Leave'),
        ('casual', 'Casual Leave'),
        ('emergency', 'Emergency Leave'),
        ('weekoff', 'Week Off'),
        ('optional_holiday', 'Optional Holiday'),
    )
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )

    id = models.CharField(max_length=100, primary_key=True, default=uuid.uuid4)
    trainer = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='leaves')
    trainer_name = models.CharField(max_length=150, blank=True, null=True)
    leave_type = models.CharField(max_length=30, choices=LEAVE_TYPE_CHOICES, default='casual')
    start_date = models.CharField(max_length=50)
    end_date = models.CharField(max_length=50)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    admin_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.trainer_name} - {self.leave_type} ({self.status})"


class TrainerLeaveBalance(models.Model):
    trainer = models.OneToOneField(UserProfile, on_delete=models.CASCADE, primary_key=True, related_name='leave_balance')
    trainer_name = models.CharField(max_length=150)
    casual_sick_quota = models.IntegerField(default=12)
    casual_sick_used = models.IntegerField(default=0)
    optional_holiday_quota = models.IntegerField(default=5)
    optional_holiday_used = models.IntegerField(default=0)
    mandatory_holiday_count = models.IntegerField(default=5)

    def __str__(self):
        return f"{self.trainer_name} Leave Balance"


class LeaveAuditLog(models.Model):
    id = models.CharField(max_length=100, primary_key=True, default=uuid.uuid4)
    trainer = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='leave_audit_logs')
    trainer_name = models.CharField(max_length=150)
    admin_name = models.CharField(max_length=150)
    leave_type = models.CharField(max_length=50)
    old_balance = models.IntegerField(default=0)
    new_balance = models.IntegerField(default=0)
    adjustment = models.IntegerField(default=0)
    reason = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.trainer_name} audit by {self.admin_name}"


class TaskLog(models.Model):
    CATEGORY_CHOICES = (
        ('doubt_solving', 'Doubt Solving'),
        ('paper_checking', 'Paper Checking'),
        ('calling', 'Calling'),
        ('curriculum_planning', 'Curriculum Planning'),
        ('lab_assistance', 'Lab Assistance'),
        ('other', 'Other'),
    )

    id = models.CharField(max_length=100, primary_key=True, default=uuid.uuid4)
    trainer = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='task_logs')
    trainer_name = models.CharField(max_length=150, blank=True, null=True)
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='other')
    start_time = models.DateTimeField(default=timezone.now)
    end_time = models.DateTimeField(blank=True, null=True)
    duration_minutes = models.IntegerField(default=0)
    notes = models.TextField(blank=True, null=True)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if self.is_completed and self.start_time and self.end_time:
            try:
                diff = (self.end_time - self.start_time).total_seconds()
                calc_mins = max(1, int(round(diff / 60.0)))
                if not self.duration_minutes or self.duration_minutes == 0:
                    self.duration_minutes = calc_mins
            except Exception:
                pass
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.trainer_name} - {self.title}"


class LiveActivity(models.Model):
    trainer = models.OneToOneField(UserProfile, on_delete=models.CASCADE, primary_key=True, related_name='live_activity')
    trainer_name = models.CharField(max_length=150)
    status = models.CharField(max_length=30, default='idle')
    current_task_title = models.CharField(max_length=200, blank=True, null=True)
    current_batch_id = models.CharField(max_length=100, blank=True, null=True)
    current_batch_name = models.CharField(max_length=200, blank=True, null=True)
    status_started_at = models.DateTimeField(default=timezone.now)
    last_heartbeat_at = models.DateTimeField(default=timezone.now)
    idle_minutes_current = models.IntegerField(default=0)
    total_idle_today_minutes = models.IntegerField(default=0)
    total_teaching_today_minutes = models.IntegerField(default=0)
    total_task_today_minutes = models.IntegerField(default=0)
    is_logged_in = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.trainer_name} - {self.status}"


class WhatsAppBroadcastLog(models.Model):
    STATUS_CHOICES = (
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
    )

    id = models.CharField(max_length=100, primary_key=True, default=uuid.uuid4)
    batch_id = models.CharField(max_length=100)
    batch_name = models.CharField(max_length=200)
    trainer_name = models.CharField(max_length=150)
    group_name = models.CharField(max_length=200)
    message_preview = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='delivered')
    sent_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.group_name} - {self.sent_at}"


class AttendanceGroupConfig(models.Model):
    id = models.IntegerField(primary_key=True, default=1)
    group_id = models.CharField(max_length=100, default='120363231853245188@g.us')
    group_name = models.CharField(max_length=200, default='LEARNMORE-Login-Logout')

    def __str__(self):
        return f"{self.group_name} ({self.group_id})"


class Holiday(models.Model):
    id = models.CharField(max_length=100, primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=200)
    date = models.CharField(max_length=50)
    type = models.CharField(max_length=30, default='mandatory') # mandatory or optional
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.name} ({self.date})"


class WhatsAppGroup(models.Model):
    id = models.CharField(max_length=150, primary_key=True)
    name = models.CharField(max_length=255)
    size = models.IntegerField(default=0)
    owner = models.CharField(max_length=150, blank=True, null=True)
    creation = models.CharField(max_length=50, blank=True, null=True)
    invite_link = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    last_synced_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.name} ({self.id})"

