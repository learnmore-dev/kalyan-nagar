import uuid
from django.db.models import Q
from rest_framework import serializers
from .models import (
    UserProfile,
    Course,
    Batch,
    Student,
    WorkSession,
    TrainerAttendance,
    Leave,
    TrainerLeaveBalance,
    LeaveAuditLog,
    TaskLog,
    LiveActivity,
    WhatsAppBroadcastLog,
    AttendanceGroupConfig,
    Holiday,
    WhatsAppGroup,
    SupportThread,
    SupportMessage,
)

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = '__all__'
        extra_kwargs = {'password': {'write_only': True, 'required': False}}


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = '__all__'


class BatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Batch
        fields = '__all__'

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'trainer_id' in data and not data.get('trainer'):
            data['trainer'] = data['trainer_id']

        # Extract counsellor from CRM payload variations
        counsellor_val = (
            data.get('counsellor_name') or
            data.get('counsellor') or
            data.get('counselor_name') or
            data.get('counselor') or
            data.get('assign_counsellor') or
            data.get('assigned_counsellor') or
            data.get('Assign Counsellor') or
            data.get('counsellorName') or
            data.get('counsellor_id') or
            data.get('counselor_id') or
            data.get('lead_owner') or
            data.get('assigned_to') or
            data.get('staff') or
            data.get('created_by')
        )

        if isinstance(counsellor_val, dict):
            c_name = counsellor_val.get('name') or counsellor_val.get('username') or counsellor_val.get('first_name') or ''
            if counsellor_val.get('first_name') and counsellor_val.get('last_name'):
                c_name = f"{counsellor_val.get('first_name')} {counsellor_val.get('last_name')}".strip()
            counsellor_val = c_name
        elif isinstance(counsellor_val, (int, float)) or (isinstance(counsellor_val, str) and counsellor_val.isdigit()):
            u_obj = UserProfile.objects.filter(Q(id=str(counsellor_val)) | Q(username=str(counsellor_val))).first()
            if u_obj:
                counsellor_val = u_obj.name or u_obj.username

        # Also check if notes contain Assign Counsellor: ...
        notes_val = data.get('notes')
        if not counsellor_val and notes_val and isinstance(notes_val, str):
            for line in notes_val.splitlines():
                if ':' in line:
                    k, v = line.split(':', 1)
                    if k.strip().lower() in ['assign counsellor', 'counsellor', 'counselor', 'assigned counsellor', 'counsellor name', 'counselor name']:
                        counsellor_val = v.strip()
                        break

        if counsellor_val:
            final_name = str(counsellor_val).strip()
            if final_name:
                data['counsellor_name'] = final_name
                data['counsellor'] = final_name

        data.pop('students', None)
        return super().to_internal_value(data)

    def create(self, validated_data):
        trainer = validated_data.get('trainer')
        if trainer and not validated_data.get('trainer_name'):
            validated_data['trainer_name'] = trainer.name
        return super().create(validated_data)

    def update(self, instance, validated_data):
        trainer = validated_data.get('trainer')
        if trainer and not validated_data.get('trainer_name'):
            validated_data['trainer_name'] = trainer.name
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['trainer_id'] = instance.trainer_id or (instance.trainer.id if instance.trainer else '')
        total_logged = sum(s.hours_taken for s in instance.work_sessions.all())
        data['used_hours'] = total_logged
        data['remaining_hours'] = max(0.0, float(instance.total_hours) - total_logged)
        data['delay_hours'] = max(0.0, total_logged - float(instance.total_hours))
        data['status_label'] = 'completed' if instance.is_completed else ('delay' if total_logged > float(instance.total_hours) else 'ontime')
        return data


class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = '__all__'

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'batch_id' in data and not data.get('batch'):
            data['batch'] = data['batch_id']
        return super().to_internal_value(data)

    def create(self, validated_data):
        batch = validated_data.get('batch')
        if batch and not validated_data.get('batch_name'):
            validated_data['batch_name'] = batch.name
        return super().create(validated_data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['batch_id'] = instance.batch_id or (instance.batch.id if instance.batch else '')
        return data


class WorkSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkSession
        fields = '__all__'

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'trainer_id' in data and not data.get('trainer'):
            data['trainer'] = data['trainer_id']
        if 'batch_id' in data and not data.get('batch'):
            data['batch'] = data['batch_id']
        return super().to_internal_value(data)

    def create(self, validated_data):
        trainer = validated_data.get('trainer')
        if trainer and not validated_data.get('trainer_name'):
            validated_data['trainer_name'] = trainer.name
        batch = validated_data.get('batch')
        if batch and not validated_data.get('batch_name'):
            validated_data['batch_name'] = batch.name
        return super().create(validated_data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['trainer_id'] = instance.trainer_id or (instance.trainer.id if instance.trainer else '')
        data['batch_id'] = instance.batch_id or (instance.batch.id if instance.batch else '')
        return data


class TrainerAttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainerAttendance
        fields = '__all__'

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'trainer_id' in data and not data.get('trainer'):
            data['trainer'] = data['trainer_id']
        return super().to_internal_value(data)

    def create(self, validated_data):
        trainer = validated_data.get('trainer')
        if trainer and not validated_data.get('trainer_name'):
            validated_data['trainer_name'] = trainer.name
        return super().create(validated_data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['trainer_id'] = instance.trainer_id or (instance.trainer.id if instance.trainer else '')
        return data


class LeaveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Leave
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'trainer_id' in data and not data.get('trainer'):
            data['trainer'] = data['trainer_id']
        return super().to_internal_value(data)

    def create(self, validated_data):
        if not validated_data.get('id'):
            validated_data['id'] = str(uuid.uuid4())
        trainer = validated_data.get('trainer')
        if trainer and not validated_data.get('trainer_name'):
            validated_data['trainer_name'] = trainer.name
        return super().create(validated_data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['trainer_id'] = instance.trainer_id or (instance.trainer.id if instance.trainer else '')
        return data


class TrainerLeaveBalanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainerLeaveBalance
        fields = '__all__'

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'trainer_id' in data and not data.get('trainer'):
            data['trainer'] = data['trainer_id']
        return super().to_internal_value(data)


class LeaveAuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveAuditLog
        fields = '__all__'

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'trainer_id' in data and not data.get('trainer'):
            data['trainer'] = data['trainer_id']
        return super().to_internal_value(data)


class TaskLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskLog
        fields = '__all__'

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'trainer_id' in data and not data.get('trainer'):
            data['trainer'] = data['trainer_id']
        return super().to_internal_value(data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(instance.id)
        data['trainer_id'] = instance.trainer_id or (instance.trainer.id if instance.trainer else '')
        return data


class LiveActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = LiveActivity
        fields = '__all__'

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'trainer_id' in data and not data.get('trainer'):
            data['trainer'] = data['trainer_id']
        return super().to_internal_value(data)


class WhatsAppBroadcastLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppBroadcastLog
        fields = '__all__'

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'trainer_id' in data and not data.get('trainer'):
            data['trainer'] = data['trainer_id']
        return super().to_internal_value(data)


class AttendanceGroupConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceGroupConfig
        fields = '__all__'


class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = '__all__'


class WhatsAppGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppGroup
        fields = '__all__'


class SupportMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportMessage
        fields = '__all__'

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['thread_id'] = instance.thread_id or (instance.thread.id if instance.thread else '')
        data['sender_id'] = instance.sender_id or (instance.sender.id if instance.sender else '')
        return data


class SupportThreadSerializer(serializers.ModelSerializer):
    messages_count = serializers.SerializerMethodField()

    class Meta:
        model = SupportThread
        fields = '__all__'

    def get_messages_count(self, obj):
        return obj.messages.count()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['user_id'] = instance.user_id or (instance.user.id if instance.user else '')
        data['recipient_id'] = instance.recipient_id or (instance.recipient.id if instance.recipient else '')
        return data



