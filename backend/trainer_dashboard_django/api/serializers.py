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



