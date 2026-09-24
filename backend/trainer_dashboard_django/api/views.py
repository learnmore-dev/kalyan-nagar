import uuid
import requests
import time
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
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
from .serializers import (
    UserProfileSerializer,
    CourseSerializer,
    BatchSerializer,
    StudentSerializer,
    WorkSessionSerializer,
    TrainerAttendanceSerializer,
    LeaveSerializer,
    TrainerLeaveBalanceSerializer,
    LeaveAuditLogSerializer,
    TaskLogSerializer,
    LiveActivitySerializer,
    WhatsAppBroadcastLogSerializer,
    AttendanceGroupConfigSerializer,
    HolidaySerializer,
    WhatsAppGroupSerializer,
    SupportThreadSerializer,
    SupportMessageSerializer,
)


BAILEYS_URL = 'http://127.0.0.1:5002'


ATTENDANCE_GROUP_ID = '120363231853245188@g.us'


def send_attendance_whatsapp(message):
    """
    Send trainer attendance notification through the local Baileys gateway.
    Uses selected attendance group from AttendanceGroupConfig if available.
    """
    try:
        cfg = AttendanceGroupConfig.objects.first()
        target = cfg.group_id if (cfg and cfg.group_id) else ATTENDANCE_GROUP_ID
        response = requests.post(
            f"{BAILEYS_URL}/send-message",
            json={
                'target': target,
                'text': message,
            },
            timeout=10,
        )

        if response.ok:
            result = response.json()
            if result.get('success'):
                try:
                    print(f"[ATTENDANCE WHATSAPP] Sent to {target} successfully.")
                except Exception:
                    pass
                return True

            try:
                print(f"[ATTENDANCE WHATSAPP] Baileys returned failure: {result}")
            except Exception:
                pass
        else:
            try:
                print(f"[ATTENDANCE WHATSAPP] HTTP {response.status_code}: {response.text[:500]}")
            except Exception:
                pass

    except Exception as e:
        try:
            print(f"[ATTENDANCE WHATSAPP] Error: {e}")
        except Exception:
            pass

    return False


@method_decorator(csrf_exempt, name='dispatch')
class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all().order_by('-created_at')
    serializer_class = UserProfileSerializer

    def get_queryset(self):
        qs = UserProfile.objects.all().order_by('-created_at')
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'users': serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            errors = serializer.errors
            err_msg = next(iter(errors.values()))[0] if errors else 'Invalid user data'
            return Response({'success': False, 'error': str(err_msg)}, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response({'success': True, 'user': serializer.data, 'message': 'User created successfully.'}, status=status.HTTP_201_CREATED, headers=headers)

    def destroy(self, request, *args, **kwargs):
        trainer_id = kwargs.get('pk') or request.query_params.get('id')
        user = UserProfile.objects.filter(id=trainer_id).first() if trainer_id else None
        if not user and 'pk' in kwargs:
            try:
                user = self.get_object()
            except Exception:
                user = None
        if user:
            name = user.name
            user.delete()
            return Response({'success': True, 'message': f'Trainer "{name}" deleted successfully.'})
        return Response({'success': False, 'error': 'Trainer not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'], url_path='login')
    def login(self, request):
        return auth_login_view(request)


@api_view(['POST'])
@csrf_exempt
def auth_login_view(request):
    username = str(request.data.get('username') or request.data.get('email') or '').strip()
    password = str(request.data.get('password') or '').strip()

    if not username:
        return Response({'success': False, 'error': 'Username is required'}, status=status.HTTP_400_BAD_REQUEST)

    from django.contrib.auth import authenticate
    from django.contrib.auth.models import User

    # 1. Try Django auth_user standard authentication
    django_user = authenticate(username=username, password=password)
    if not django_user:
        u_obj = User.objects.filter(Q(username__iexact=username) | Q(email__iexact=username)).first()
        if u_obj and u_obj.check_password(password):
            django_user = u_obj

    if django_user:
        role = 'admin' if (django_user.is_staff or django_user.is_superuser) else 'trainer'
        profile = UserProfile.objects.filter(username=django_user.username).first()
        if not profile:
            profile = UserProfile.objects.create(
                id=f"usr_{django_user.username}",
                username=django_user.username,
                name=django_user.get_full_name() or django_user.username,
                email=django_user.email or f"{django_user.username}@institute.edu",
                role=role,
                password=password,
                designation='Director / Management' if role == 'admin' else 'Faculty Trainer'
            )
        else:
            profile.role = role
            if password:
                profile.password = password
            profile.save()

        serializer = UserProfileSerializer(profile)
        return Response({'success': True, 'user': serializer.data, 'message': 'Login successful'})

    # 2. Try UserProfile database lookup
    user = UserProfile.objects.filter(
        Q(username__iexact=username) | Q(email__iexact=username) | Q(name__iexact=username)
    ).first()

    if user:
        is_valid_pw = False
        if not user.password:
            is_valid_pw = True
        elif user.password.strip() == password:
            is_valid_pw = True
        elif password and (password == user.password.strip() or (not user.password and password in ['trainer', 'admin'])):
            is_valid_pw = True

        if is_valid_pw:
            # Keep Django auth_user in sync so Django Admin works too
            auth_u, _ = User.objects.get_or_create(username=user.username, defaults={
                'email': user.email or '',
                'first_name': user.name,
                'is_staff': (user.role == 'admin'),
                'is_superuser': (user.role == 'admin'),
            })
            if password:
                auth_u.set_password(password)
                auth_u.save()

            serializer = UserProfileSerializer(user)
            return Response({'success': True, 'user': serializer.data, 'message': 'Login successful'})

    return Response({'success': False, 'error': 'Invalid username or password'}, status=status.HTTP_401_UNAUTHORIZED)


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all().order_by('name')
    serializer_class = CourseSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'courses': serializer.data})


class BatchViewSet(viewsets.ModelViewSet):
    queryset = Batch.objects.all().order_by('-created_at')
    serializer_class = BatchSerializer

    def list(self, request, *args, **kwargs):
        trainer_id = request.query_params.get('trainer_id')
        queryset = self.get_queryset()
        if trainer_id:
            queryset = queryset.filter(trainer_id=trainer_id)
        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'batches': serializer.data})

    def create(self, request, *args, **kwargs):
        students_raw = request.data.get('students', [])
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        
        self.perform_create(serializer)
        batch = serializer.instance

        # Save student records linked to this batch
        saved_students = []
        if isinstance(students_raw, list):
            for st in students_raw:
                if isinstance(st, dict):
                    s_name = st.get('name', '').strip()
                    s_phone = st.get('phone', '').strip()
                    s_email = st.get('email', '').strip()
                else:
                    s_name = str(st).strip()
                    s_phone = ''
                    s_email = ''

                if s_name:
                    stud = Student.objects.create(
                        batch=batch,
                        batch_name=batch.name,
                        name=s_name,
                        phone=s_phone,
                        email=s_email
                    )
                    saved_students.append({'id': str(stud.id), 'name': stud.name, 'phone': stud.phone})

        # Trigger WhatsApp Group creation via Baileys API
        whatsapp_info = None
        auto_whatsapp = request.data.get('auto_whatsapp_group', True)
        if auto_whatsapp:
            participants = []
            if batch.trainer and batch.trainer.phone:
                participants.append(batch.trainer.phone)
            for st in saved_students:
                if st.get('phone'):
                    participants.append(st['phone'])
            for st in (students_raw if isinstance(students_raw, list) else []):
                if isinstance(st, dict) and st.get('phone'):
                    ph = st['phone'].strip()
                    if ph and ph not in participants:
                        participants.append(ph)

            group_name = batch.whatsapp_group_name or batch.name
            try:
                import requests
                for b_url in ['http://127.0.0.1:5002', 'http://localhost:5002']:
                    try:
                        r = requests.post(
                            f"{b_url}/create-group",
                            json={'name': group_name, 'participants': participants},
                            timeout=5
                        )
                        if r.ok:
                            resp = r.json()
                            if resp.get('success'):
                                g_id = resp.get('groupId')
                                invite_link = resp.get('inviteLink', '')
                                batch.whatsapp_group_id = g_id
                                batch.whatsapp_group_link = invite_link
                                batch.save()
                                whatsapp_info = {'groupId': g_id, 'inviteLink': invite_link, 'name': group_name}
                                break
                    except Exception as req_err:
                        print("Failed to reach Baileys server at", b_url, req_err)
            except Exception as e:
                print("WhatsApp Group creation exception:", e)

        serializer_out = self.get_serializer(batch)
        return Response({
            'success': True,
            'batch': serializer_out.data,
            'whatsapp': whatsapp_info,
            'students_count': len(saved_students),
            'message': f'Batch "{batch.name}" created successfully'
        }, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        """PATCH /api/batches/{id}/ — update batch fields"""
        batch = self.get_object()
        serializer = self.get_serializer(batch, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({'success': True, 'batch': serializer.data})

    def update(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """DELETE /api/batches/{id}/"""
        pk = kwargs.get('pk')
        import urllib.parse
        clean_pk = urllib.parse.unquote(str(pk))
        
        batch = Batch.objects.filter(id=clean_pk).first() or Batch.objects.filter(name=clean_pk).first()
        if not batch and pk:
            batch = Batch.objects.filter(id=pk).first() or Batch.objects.filter(name=pk).first()

        if not batch:
            return Response({'success': False, 'error': f'Batch "{clean_pk}" not found.'}, status=status.HTTP_404_NOT_FOUND)

        batch_name = batch.name
        try:
            WorkSession.objects.filter(batch=batch).delete()
            Student.objects.filter(batch=batch).delete()
            if batch.whatsapp_group_id:
                WhatsAppGroup.objects.filter(id=batch.whatsapp_group_id).delete()
            batch.delete()
            return Response({'success': True, 'message': f'Batch "{batch_name}" deleted successfully.'})
        except Exception as e:
            return Response({'success': False, 'error': f'Failed to delete batch: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], url_path='sessions')
    def sessions(self, request, pk=None):
        """GET /api/batches/{id}/sessions/ — all work sessions for this batch with topic coverage"""
        batch = self.get_object()
        sessions = WorkSession.objects.filter(batch_id=pk).order_by('-session_date', '-created_at')
        
        session_data = []
        total_hours = 0
        for s in sessions:
            total_hours += s.hours_taken or 0
            session_data.append({
                'id': s.id,
                'date': s.session_date or str(s.created_at)[:10],
                'trainer_name': s.trainer_name or '',
                'topic': s.topic_covered or '',
                'hours': s.hours_taken or 0,
                'notes': s.notes or '',
                'created_at': str(s.created_at),
            })

        planned_hours = batch.total_hours or 1
        status = 'on_time' if total_hours <= planned_hours else 'delayed'
        if not batch.is_active:
            status = 'completed'

        return Response({
            'success': True,
            'batch': {
                'id': str(batch.id),
                'name': batch.name,
                'trainer_name': batch.trainer_name,
                'total_hours': planned_hours,
                'used_hours': total_hours,
                'total_students': batch.total_students,
                'start_date': batch.start_date,
                'is_active': batch.is_active,
                'status': status,
            },
            'sessions': session_data,
            'total_sessions': len(session_data),
            'total_hours_logged': total_hours,
        })

    def perform_create(self, serializer):
        instance = serializer.save()
        if instance.whatsapp_group_name or instance.whatsapp_group_id:
            WhatsAppGroup.objects.update_or_create(
                id=instance.whatsapp_group_id or f"batch_{instance.id}",
                defaults={
                    'name': instance.whatsapp_group_name or instance.name,
                    'size': instance.total_students or 0,
                    'invite_link': instance.whatsapp_group_link or '',
                }
            )

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.whatsapp_group_name or instance.whatsapp_group_id:
            WhatsAppGroup.objects.update_or_create(
                id=instance.whatsapp_group_id or f"batch_{instance.id}",
                defaults={
                    'name': instance.whatsapp_group_name or instance.name,
                    'size': instance.total_students or 0,
                    'invite_link': instance.whatsapp_group_link or '',
                }
            )


class WhatsAppGroupViewSet(viewsets.ModelViewSet):
    queryset = WhatsAppGroup.objects.all().order_by('name')
    serializer_class = WhatsAppGroupSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'groups': serializer.data})



class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all().order_by('name')
    serializer_class = StudentSerializer

    def list(self, request, *args, **kwargs):
        batch_id = request.query_params.get('batch_id')
        queryset = self.get_queryset()
        if batch_id:
            queryset = queryset.filter(batch_id=batch_id)
        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'students': serializer.data})


class WorkSessionViewSet(viewsets.ModelViewSet):
    queryset = WorkSession.objects.all().order_by('-created_at')
    serializer_class = WorkSessionSerializer

    def list(self, request, *args, **kwargs):
        trainer_id = request.query_params.get('trainer_id')
        batch_id = request.query_params.get('batch_id')
        queryset = self.get_queryset()
        if trainer_id:
            queryset = queryset.filter(trainer_id=trainer_id)
        if batch_id:
            queryset = queryset.filter(batch_id=batch_id)
        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'sessions': serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session_obj = serializer.save()

        # Update used hours in batch dynamically
        batch = session_obj.batch
        if batch:
            total_logged = sum(s.hours_taken for s in batch.work_sessions.all())
            if total_logged >= batch.total_hours:
                batch.is_completed = True
                batch.completed_at = timezone.now()
            batch.save()

        return Response({'success': True, 'session': serializer.data}, status=status.HTTP_201_CREATED)


class TrainerAttendanceViewSet(viewsets.ModelViewSet):
    queryset = TrainerAttendance.objects.all().order_by('-created_at')
    serializer_class = TrainerAttendanceSerializer

    def list(self, request, *args, **kwargs):
        trainer_id = request.query_params.get('trainer_id')
        date       = request.query_params.get('date')
        queryset   = self.get_queryset()
        if trainer_id:
            from django.db.models import Q
            queryset = queryset.filter(Q(trainer_id=trainer_id) | Q(trainer__username=trainer_id))
        if date:
            queryset = queryset.filter(date=date)
        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'attendances': serializer.data})

    def create(self, request, *args, **kwargs):
        action = request.data.get('action') or request.data.get('type')
        if action in ['mark_out', 'out', 'check_out']:
            return self.check_out(request)
        return self.check_in(request)

    @action(detail=False, methods=['post'], url_path='check-in')
    def check_in(self, request):
        trainer_id = request.data.get('trainer_id') or request.data.get('trainer')
        if not trainer_id:
            return Response({'success': False, 'error': 'trainer_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        trainer = UserProfile.objects.filter(id=trainer_id).first() or UserProfile.objects.filter(username=trainer_id).first()
        if not trainer:
            return Response({'success': False, 'error': 'Trainer not found'}, status=status.HTTP_404_NOT_FOUND)

        today_str = timezone.localtime(timezone.now()).strftime('%Y-%m-%d')
        now_time = timezone.localtime(timezone.now()).strftime('%H:%M:%S')
        photo_val = request.data.get('photo') or request.data.get('selfie_url') or ''

        attendance, created = TrainerAttendance.objects.get_or_create(
            trainer=trainer,
            date=today_str,
            defaults={
                'trainer_name': trainer.name,
                'mark_in_time': now_time,
                'photo_in': photo_val,
                'location_name': request.data.get('location_name', 'Campus'),
                'latitude': str(request.data.get('latitude', '') or ''),
                'longitude': str(request.data.get('longitude', '') or ''),
                'day_status': 'pending',
            }
        )
        if not created:
            if not attendance.mark_in_time:
                attendance.mark_in_time = now_time
            if photo_val and not attendance.photo_in:
                attendance.photo_in = photo_val
            if request.data.get('location_name'):
                attendance.location_name = request.data.get('location_name')
            attendance.save()

        now_dt = timezone.localtime(timezone.now())
        formatted_date = now_dt.strftime('%d %b %Y')
        formatted_in_time = now_dt.strftime('%I:%M %p')
        loc_name = request.data.get('location_name', 'Live GPS Location')

        serializer = self.get_serializer(attendance)

        desig_str = f" ({trainer.designation})" if trainer.designation else " (Faculty Trainer)"
        phone_str = trainer.phone or '+91 9876543210'

        # Send clean plain text Check-In alert (no emojis or symbols)
        send_attendance_whatsapp(
            f"Trainer Name: {trainer.name}{desig_str}\n"
            f"WhatsApp: {phone_str}\n"
            f"Login Time: {formatted_in_time}\n"
            f"Date: {formatted_date}\n"
            f"Location: {attendance.location_name or loc_name}"
        )

        return Response({'success': True, 'attendance': serializer.data, 'message': 'Check-In recorded successfully'})

    @action(detail=False, methods=['post'], url_path='check-out')
    def check_out(self, request):
        from datetime import datetime
        trainer_id = request.data.get('trainer_id') or request.data.get('trainer')
        if not trainer_id:
            return Response({'success': False, 'error': 'trainer_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        trainer = UserProfile.objects.filter(id=trainer_id).first() or UserProfile.objects.filter(username=trainer_id).first()
        now_dt = timezone.localtime(timezone.now())
        today_str = now_dt.strftime('%Y-%m-%d')
        now_time = now_dt.strftime('%H:%M:%S')
        formatted_date = now_dt.strftime('%d %b %Y')
        formatted_out_time = now_dt.strftime('%I:%M %p')
        photo_val = request.data.get('photo') or request.data.get('selfie_url') or ''

        attendance = TrainerAttendance.objects.filter(trainer_id=trainer_id, date=today_str).first()
        if not attendance:
            attendance = TrainerAttendance.objects.filter(trainer__username=trainer_id, date=today_str).first()

        if attendance:
            attendance.mark_out_time = now_time
            if photo_val:
                attendance.photo_out = photo_val

            formatted_in_time = ''
            if attendance.mark_in_time:
                try:
                    t1 = datetime.strptime(str(attendance.mark_in_time)[:8], '%H:%M:%S')
                    formatted_in_time = t1.strftime('%I:%M %p')
                    t2 = datetime.strptime(str(now_time)[:8], '%H:%M:%S')
                    diff_sec = (t2 - t1).total_seconds()
                    if diff_sec > 0:
                        mins = int(diff_sec // 60)
                        attendance.total_work_minutes = mins
                        if mins < 300: # < 5 hours
                            attendance.day_status = 'leave'
                        elif mins < 540: # 5 - 9 hours
                            attendance.day_status = 'half_day'
                        else: # >= 9 hours
                            attendance.day_status = 'present'
                    else:
                        attendance.day_status = 'present'
                except Exception:
                    attendance.day_status = 'present'
            else:
                attendance.day_status = 'present'

            attendance.save()

            trainer_obj = trainer or attendance.trainer
            t_name = trainer_obj.name if trainer_obj else attendance.trainer_name
            t_desig = f" ({trainer_obj.designation})" if (trainer_obj and trainer_obj.designation) else " (Faculty Trainer)"
            t_phone = trainer_obj.phone if (trainer_obj and trainer_obj.phone) else '+91 9876543210'

            # Send clean plain text Check-Out alert (no emojis or symbols)
            send_attendance_whatsapp(
                f"Trainer Name: {t_name}{t_desig}\n"
                f"WhatsApp: {t_phone}\n"
                f"Login Time: {formatted_in_time or attendance.mark_in_time}\n"
                f"Logout Time: {formatted_out_time}\n"
                f"Date: {formatted_date}\n"
                f"Working Hours: {attendance.working_duration or '0h 0m'}\n"
                f"Location: {attendance.location_name or 'Campus'}"
            )

            serializer = self.get_serializer(attendance)
            return Response({'success': True, 'attendance': serializer.data, 'message': 'Check-Out recorded successfully'})
        
        return Response({'success': False, 'error': 'No active Check-In found for today'}, status=status.HTTP_400_BAD_REQUEST)


class LeaveViewSet(viewsets.ModelViewSet):
    queryset = Leave.objects.all().order_by('-created_at')
    serializer_class = LeaveSerializer

    def create(self, request, *args, **kwargs):
        try:
            data = request.data.copy()
            trainer_id = data.get('trainer_id') or data.get('trainer')

            trainer = None
            if trainer_id:
                trainer = (
                    UserProfile.objects.filter(id=trainer_id).first()
                    or UserProfile.objects.filter(email=trainer_id).first()
                    or UserProfile.objects.filter(username=trainer_id).first()
                )

            if not trainer:
                trainer = UserProfile.objects.filter(role='trainer').first() or UserProfile.objects.first()

            if trainer:
                data['trainer'] = str(trainer.id)
                if not data.get('trainer_name'):
                    data['trainer_name'] = trainer.name

            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            leave = serializer.save()

            # If created directly as approved (e.g. Admin direct deduction), update balance
            if leave.trainer_id and leave.status == 'approved':
                try:
                    balance, _ = TrainerLeaveBalance.objects.get_or_create(
                        trainer_id=leave.trainer_id,
                        defaults={
                            'trainer_name': leave.trainer_name or (trainer.name if trainer else 'Trainer'),
                            'casual_sick_quota': 12,
                            'casual_sick_used': 0,
                            'optional_holiday_quota': 5,
                            'optional_holiday_used': 0
                        }
                    )
                    if leave.leave_type == 'optional_holiday':
                        balance.optional_holiday_used = max(0, balance.optional_holiday_used + 1)
                    else:
                        balance.casual_sick_used = max(0, balance.casual_sick_used + 1)
                    balance.save()
                except Exception:
                    pass

            return Response({'success': True, 'leave': serializer.data, 'message': 'Leave processed successfully!'}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'success': False, 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def list(self, request, *args, **kwargs):
        trainer_id = request.query_params.get('trainer_id')
        date       = request.query_params.get('date')
        queryset   = self.get_queryset()
        if trainer_id:
            queryset = queryset.filter(trainer_id=trainer_id)
        if date:
            queryset = queryset.filter(start_date__lte=date, end_date__gte=date)
        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'leaves': serializer.data})

    def partial_update(self, request, *args, **kwargs):
        """Handle PATCH /api/leaves/{id}/ — approve or reject a leave"""
        leave_id = kwargs.get('pk') or request.data.get('id')
        new_status = request.data.get('status')

        if not new_status or new_status not in ['approved', 'rejected', 'pending']:
            return Response({'success': False, 'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

        leave = Leave.objects.filter(id=leave_id).first()
        if not leave:
            return Response({'success': False, 'error': 'Leave not found'}, status=status.HTTP_404_NOT_FOUND)

        leave.status = new_status
        leave.save()

        # Update leave balance if approved
        if leave.trainer_id and new_status == 'approved':
            try:
                balance, _ = TrainerLeaveBalance.objects.get_or_create(
                    trainer_id=leave.trainer_id,
                    defaults={
                        'trainer_name': leave.trainer_name or 'Trainer',
                        'casual_sick_quota': 12,
                        'casual_sick_used': 0,
                        'optional_holiday_quota': 5,
                        'optional_holiday_used': 0
                    }
                )
                balance.casual_sick_used = max(0, balance.casual_sick_used + 1)
                balance.save()
            except Exception:
                pass  # Don't fail the approval just because balance update failed

        serializer = self.get_serializer(leave)
        return Response({'success': True, 'leave': serializer.data, 'message': f'Leave {new_status} successfully.'})

    def update(self, request, *args, **kwargs):
        """Handle PUT as well"""
        return self.partial_update(request, *args, **kwargs)

    @action(detail=False, methods=['get', 'post'], url_path='adjust')
    def adjust(self, request):
        """GET: return all trainer leave balances. POST: adjust a trainer's quota."""
        if request.method == 'GET':
            balances = TrainerLeaveBalance.objects.select_related().all()
            serializer = TrainerLeaveBalanceSerializer(balances, many=True)
            return Response({'success': True, 'balances': serializer.data})

        # POST — adjust quota
        trainer_id  = request.data.get('trainer_id')
        leave_type  = request.data.get('leave_type', 'casual_sick')
        new_quota   = request.data.get('new_quota')
        reason      = request.data.get('reason', '')

        if not trainer_id or new_quota is None:
            return Response({'success': False, 'error': 'trainer_id and new_quota are required'}, status=status.HTTP_400_BAD_REQUEST)

        trainer_obj = UserProfile.objects.filter(id=trainer_id).first()
        trainer_name = trainer_obj.name if trainer_obj else 'Trainer'

        balance, _ = TrainerLeaveBalance.objects.get_or_create(
            trainer_id=trainer_id,
            defaults={
                'trainer_name': trainer_name,
                'casual_sick_quota': 12,
                'casual_sick_used': 0,
                'optional_holiday_quota': 5,
                'optional_holiday_used': 0
            }
        )
        balance.casual_sick_quota = int(new_quota)
        balance.save()

        LeaveAuditLog.objects.create(
            leave=None,
            action='quota_adjusted',
            performed_by='Admin',
            notes=f'Quota adjusted to {new_quota}. Reason: {reason}'
        ) if False else None  # skip if leave is required

        serializer = TrainerLeaveBalanceSerializer(balance)
        return Response({'success': True, 'balance': serializer.data, 'message': 'Quota updated successfully.'})


class TaskLogViewSet(viewsets.ModelViewSet):
    queryset = TaskLog.objects.all().order_by('-created_at')
    serializer_class = TaskLogSerializer

    def list(self, request, *args, **kwargs):
        trainer_id = request.query_params.get('trainer_id')
        queryset = self.get_queryset()
        if trainer_id:
            queryset = queryset.filter(trainer_id=trainer_id)
        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'tasks': serializer.data})

    def create(self, request, *args, **kwargs):
        action = request.data.get('action', 'start')
        if action == 'start':
            trainer_id = request.data.get('trainer_id')
            title = request.data.get('title', 'Task Activity')
            category = request.data.get('category', 'doubt_solving')
            notes = request.data.get('notes', '')
            trainer = UserProfile.objects.filter(id=trainer_id).first() if trainer_id else None
            if not trainer:
                trainer = UserProfile.objects.filter(role='trainer').first() or UserProfile.objects.first()
            task = TaskLog.objects.create(
                trainer=trainer,
                trainer_name=trainer.name if trainer else 'Trainer',
                title=title,
                category=category,
                notes=notes,
                is_completed=False,
            )
            return Response({'success': True, 'task': TaskLogSerializer(task).data})

        elif action == 'complete':
            task_id = request.data.get('taskId')
            duration_minutes = request.data.get('duration_minutes', 1)
            task = None
            if task_id:
                clean_id = str(task_id).replace('task_', '')
                if clean_id.isdigit():
                    task = TaskLog.objects.filter(id=int(clean_id)).first()
            if not task:
                task = TaskLog.objects.filter(is_completed=False).order_by('-created_at').first()
            if task:
                task.is_completed = True
                task.end_time = timezone.now()
                task.duration_minutes = duration_minutes
                task.save()
                return Response({'success': True, 'task': TaskLogSerializer(task).data})
            return Response({'success': True, 'message': 'Completed'})

        return super().create(request, *args, **kwargs)


class LiveActivityViewSet(viewsets.ModelViewSet):
    queryset = LiveActivity.objects.all()
    serializer_class = LiveActivitySerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'activities': serializer.data})


_GROUPS_CACHE = []
_LAST_GROUPS_FETCH = 0

@api_view(['GET', 'POST'])
def whatsapp_bot_gateway(request):
    """
    Django Proxy View to the Node.js Baileys WhatsApp Gateway (http://127.0.0.1:5002)
    """
    global _GROUPS_CACHE, _LAST_GROUPS_FETCH
    att_config, _ = AttendanceGroupConfig.objects.get_or_create(id=1)

    if request.method == 'GET':
        live_baileys = None
        try:
            r = requests.get(f"{BAILEYS_URL}/status", timeout=3.0)
            if r.ok:
                live_baileys = r.json()
        except Exception:
            pass

        is_connected = live_baileys.get('bot', {}).get('isConnected', False) if (live_baileys and 'bot' in live_baileys) else False
        now = time.time()

        # Fetch groups live from Baileys if connected and cache is empty or stale (>15s)
        if is_connected and (not _GROUPS_CACHE or (now - _LAST_GROUPS_FETCH > 15)):
            try:
                gr = requests.get(f"{BAILEYS_URL}/groups", timeout=4.0)
                if gr.ok:
                    _GROUPS_CACHE = gr.json().get('groups', [])
                    _LAST_GROUPS_FETCH = now
            except Exception:
                pass

        # Build available_groups starting with live WhatsApp groups & contacts
        available_groups = list(_GROUPS_CACHE) if _GROUPS_CACHE else []
        existing_ids = {g['id'] for g in available_groups if isinstance(g, dict) and 'id' in g}

        # Merge groups from SQLite database
        for g in WhatsAppGroup.objects.all().order_by('name'):
            if g.id and g.id not in existing_ids:
                available_groups.append({'id': g.id, 'name': g.name, 'size': g.size})
                existing_ids.add(g.id)

        if att_config.group_id and att_config.group_id not in existing_ids:
            available_groups.insert(0, {
                'id': att_config.group_id,
                'name': att_config.group_name or 'Active Attendance Group',
                'size': 1,
            })
            existing_ids.add(att_config.group_id)

        for b in Batch.objects.exclude(whatsapp_group_id=''):
            if b.whatsapp_group_id and b.whatsapp_group_id not in existing_ids:
                available_groups.append({
                    'id': b.whatsapp_group_id,
                    'name': b.whatsapp_group_name or f"{b.name} Group",
                    'size': b.total_students or 0,
                })
                existing_ids.add(b.whatsapp_group_id)

        logs = WhatsAppBroadcastLogSerializer(WhatsAppBroadcastLog.objects.all().order_by('-sent_at')[:50], many=True).data

        phone_number = live_baileys.get('bot', {}).get('phoneNumber', None) if live_baileys else None
        qr_url = live_baileys.get('bot', {}).get('qrDataUrl') if live_baileys else None

        bot_data = {
            'isConnected': is_connected,
            'phoneNumber': phone_number,
            'botName': 'Learnmore Technologies WhatsApp Gateway',
            'lastSyncAt': timezone.now().isoformat(),
            'qrDataUrl': qr_url,
            'attendanceGroup': {'id': att_config.group_id, 'name': att_config.group_name},
            'availableGroups': available_groups,
            'totalGroupsCreated': Batch.objects.exclude(whatsapp_group_id='').count(),
            'totalMessagesDelivered': WhatsAppBroadcastLog.objects.filter(status='delivered').count(),
        }

        return Response({'success': True, 'bot': bot_data, 'logs': logs})

    elif request.method == 'POST':
        action = request.data.get('action')

        if action == 'set_attendance_group':
            group_id = request.data.get('groupId')
            group_name = request.data.get('groupName')
            if group_id and group_name:
                att_config.group_id = group_id
                att_config.group_name = group_name
                att_config.save()
                return Response({'success': True, 'attendanceGroup': {'id': group_id, 'name': group_name}, 'message': 'Attendance group updated!'})

        if action in ['refresh_groups', 'get_groups']:
            try:
                r = requests.get(f"{BAILEYS_URL}/groups?force=true", timeout=8)
                if r.ok:
                    fetched = r.json().get('groups', [])
                    _GROUPS_CACHE = fetched
                    _LAST_GROUPS_FETCH = time.time()
                    for g in fetched:
                        gid = g.get('id')
                        gname = g.get('name') or g.get('subject') or 'WhatsApp Group'
                        if gid:
                            WhatsAppGroup.objects.update_or_create(
                                id=gid,
                                defaults={'name': gname, 'size': g.get('size', 0)}
                            )
                available_groups = list(_GROUPS_CACHE) if _GROUPS_CACHE else []
                existing_ids = {g['id'] for g in available_groups if isinstance(g, dict) and 'id' in g}
                for g in WhatsAppGroup.objects.all().order_by('name'):
                    if g.id and g.id not in existing_ids:
                        available_groups.append({'id': g.id, 'name': g.name, 'size': g.size})
                        existing_ids.add(g.id)
                return Response({'success': True, 'groups': available_groups})
            except Exception as e:
                return Response({'success': False, 'error': str(e)})

        if action == 'refresh_qr':
            try:
                r = requests.get(f"{BAILEYS_URL}/reset-auth", timeout=5)
                return Response(r.json() if r.ok else {'success': True, 'message': 'Reset requested'})
            except Exception as e:
                return Response({'success': False, 'error': str(e)})

        if action == 'connect':
            try:
                r = requests.get(f"{BAILEYS_URL}/status", timeout=3)
                if r.ok:
                    data = r.json()
                    return Response({'success': True, 'message': 'WhatsApp Bot is running', 'bot': data.get('bot', {})})
            except requests.exceptions.ConnectionError:
                return Response({'success': False, 'error': 'WhatsApp Bot (Baileys) is not running. Run: npm run bot'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            except Exception as e:
                return Response({'success': False, 'error': str(e)})
            return Response({'success': True, 'message': 'WhatsApp Bot session active'})

        if action == 'disconnect':
            try:
                r = requests.get(f"{BAILEYS_URL}/reset-auth", timeout=5)
                return Response({'success': True, 'message': 'WhatsApp Bot Disconnected successfully.'})
            except Exception as e:
                return Response({'success': True, 'message': 'WhatsApp Bot Disconnected.'})

        if action == 'pair_code':
            phone = request.data.get('phone')
            try:
                r = requests.post(f"{BAILEYS_URL}/pair-code", json={'phone': phone}, timeout=10)
                if r.ok:
                    return Response(r.json())
                err_msg = 'Failed to request pairing code'
                try:
                    err_msg = r.json().get('error', err_msg)
                except Exception:
                    pass
                return Response({'success': False, 'error': err_msg})
            except (requests.exceptions.ConnectionError, requests.exceptions.Timeout):
                return Response({
                    'success': False,
                    'error': 'WhatsApp Gateway Bot (port 5002) was offline. Started bot server, please try again.'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            except Exception as e:
                return Response({'success': False, 'error': str(e)})

        if action == 'send_test':
            target = request.data.get('target', att_config.group_id)
            msg = request.data.get('message', '🤖 Test automated message from Learnmore Technologies Django Backend!')
            
            send_success = False
            send_error = ''
            
            if not target:
                return Response({'success': False, 'error': 'No WhatsApp group selected. Please select a group first.'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                r = requests.post(
                    f"{BAILEYS_URL}/send-message",
                    json={'target': target, 'text': msg},
                    timeout=10
                )
                if r.ok:
                    result = r.json()
                    if result.get('success'):
                        send_success = True
                    else:
                        send_error = result.get('error', 'Baileys returned failure')
                else:
                    send_error = f'Baileys HTTP {r.status_code}'
            except requests.exceptions.ConnectionError:
                send_error = 'WhatsApp Bot (Baileys) is not running. Please start it with: npm run bot'
            except requests.exceptions.Timeout:
                send_error = 'Message send timed out. WhatsApp may be reconnecting.'
            except Exception as e:
                send_error = str(e)

            if not send_success:
                return Response({'success': False, 'error': send_error}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            log_obj = WhatsAppBroadcastLog.objects.create(
                batch_id='test',
                batch_name='Test Broadcast',
                trainer_name='Admin Test',
                group_name='Learnmore Technologies Demo Group',
                message_preview=msg,
                status='delivered',
            )
            return Response({'success': True, 'message': 'Test message sent successfully!', 'log': WhatsAppBroadcastLogSerializer(log_obj).data})

        # ─── send_message: proxy text/document/image to Baileys ───────────────
        if action == 'send_message':
            target  = request.data.get('target') or ''
            text    = request.data.get('text') or ''
            document = request.data.get('document') or None   # base64
            file_name = request.data.get('fileName') or 'document'
            mime_type = request.data.get('mimeType') or 'application/octet-stream'
            image   = request.data.get('image') or None       # base64

            if not target:
                return Response({'success': False, 'error': 'target is required'}, status=status.HTTP_400_BAD_REQUEST)

            payload = {'target': target, 'text': text}
            if document:
                payload['document'] = document
                payload['fileName'] = file_name
                payload['mimeType'] = mime_type
            if image:
                payload['image'] = image

            try:
                r = requests.post(
                    f"{BAILEYS_URL}/send-message",
                    json=payload,
                    timeout=60,   # large base64 documents need more time
                )
                if r.ok:
                    result = r.json()
                    if result.get('success'):
                        return Response({'success': True})
                    return Response({'success': False, 'error': result.get('error', 'Baileys returned failure')}, status=status.HTTP_502_BAD_GATEWAY)
                return Response({'success': False, 'error': f'Baileys HTTP {r.status_code}'}, status=status.HTTP_502_BAD_GATEWAY)
            except requests.exceptions.ConnectionError:
                return Response({'success': False, 'error': 'WhatsApp Bot (Baileys) is not running on this server.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            except requests.exceptions.Timeout:
                return Response({'success': False, 'error': 'Message send timed out.'}, status=status.HTTP_504_GATEWAY_TIMEOUT)
            except Exception as e:
                return Response({'success': False, 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # ─── get_groups: proxy /groups from Baileys ───────────────────────────
        if action == 'get_groups':
            try:
                force = request.data.get('force', False)
                r = requests.get(f"{BAILEYS_URL}/groups{'?force=true' if force else ''}", timeout=8)
                if r.ok:
                    return Response(r.json())
                return Response({'success': False, 'groups': []})
            except Exception as e:
                return Response({'success': False, 'groups': [], 'error': str(e)})

        # ─── create_group: proxy /create-group from Baileys ──────────────────
        if action == 'create_group':
            name = request.data.get('name') or ''
            participants = request.data.get('participants') or []
            try:
                r = requests.post(f"{BAILEYS_URL}/create-group", json={'name': name, 'participants': participants}, timeout=20)
                if r.ok:
                    return Response(r.json())
                return Response({'success': False, 'error': f'Baileys HTTP {r.status_code}'})
            except requests.exceptions.ConnectionError:
                return Response({'success': False, 'error': 'WhatsApp Bot is not running on server.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            except Exception as e:
                return Response({'success': False, 'error': str(e)})

        return Response({'success': False, 'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)


class HolidayViewSet(viewsets.ModelViewSet):
    queryset = Holiday.objects.all().order_by('date')
    serializer_class = HolidaySerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'holidays': serializer.data})


@api_view(['GET'])
def reports_summary_view(request):
    """
    Get consolidated reports and incentive calculations for all trainers or a specific trainer
    """
    trainer_id = request.query_params.get('trainer_id')
    month = request.query_params.get('month') # e.g. 2026-08

    trainers = UserProfile.objects.filter(role='trainer')
    if trainer_id:
        trainers = trainers.filter(id=trainer_id)

    reports = []
    for t in trainers:
        sessions = WorkSession.objects.filter(trainer_id=t.id)
        if month:
            sessions = sessions.filter(session_date__startswith=month)
        
        total_hours = sum(s.hours_taken for s in sessions)
        total_sessions = sessions.count()

        tasks = TaskLog.objects.filter(trainer_id=t.id)
        if month:
            tasks = tasks.filter(created_at__startswith=month)
        total_tasks = tasks.count()

        hourly_rate = t.hourly_rate or 500
        calculated_payout = total_hours * hourly_rate

        reports.append({
            'trainer_id': t.id,
            'trainer_name': t.name,
            'email': t.email,
            'designation': t.designation,
            'total_hours': total_hours,
            'total_sessions': total_sessions,
            'total_tasks': total_tasks,
            'hourly_rate': hourly_rate,
            'calculated_payout': calculated_payout,
            'status': 'verified',
        })

    return Response({'success': True, 'reports': reports})


@api_view(['GET'])
def monitoring_summary_view(request):
    """
    Get live monitoring data for all trainers from the database
    """
    date_param = request.query_params.get('date')
    today_str = date_param if date_param else timezone.localtime(timezone.now()).strftime('%Y-%m-%d')
    
    trainers = UserProfile.objects.filter(role='trainer').order_by('name')
    monitoring_rows = []

    for t in trainers:
        live = LiveActivity.objects.filter(trainer_id=t.id).first()
        att = TrainerAttendance.objects.filter(trainer_id=t.id, date=today_str).first()
        active_batches = Batch.objects.filter(trainer_id=t.id, is_completed=False).count()
        leave_bal = TrainerLeaveBalance.objects.filter(trainer_id=t.id).first()

        # Determine attendance status
        if att:
            raw_status = att.day_status
            if raw_status == 'present':
                att_status = 'Late' if att.mark_in_time and 'T10:' in att.mark_in_time and int((att.mark_in_time.split('T10:')[1][:2] or '0')) > 15 else 'Present'
            elif raw_status == 'half_day':
                att_status = 'Half Day'
            elif raw_status == 'leave':
                att_status = 'On Leave'
            elif raw_status == 'weekoff':
                att_status = 'Week Off'
            elif raw_status == 'holiday':
                att_status = 'Holiday'
            elif raw_status == 'absent':
                att_status = 'Absent'
            else:
                att_status = 'Present'
        else:
            att_status = 'Not Logged In'

        # Status badge for live UI
        if att and att.mark_in_time and not att.mark_out_time:
            status_badge = 'late' if att_status == 'Late' else 'logged_in'
        elif att and att.mark_out_time:
            status_badge = 'not_logged_in'
        elif att_status == 'On Leave':
            status_badge = 'on_leave'
        elif att_status in ['Week Off', 'Holiday']:
            status_badge = 'weekoff'
        else:
            status_badge = 'not_logged_in'

        # Leave display string
        leave_display = f"{leave_bal.casual_sick_quota - leave_bal.casual_sick_used}/{leave_bal.casual_sick_quota}" if leave_bal else "12/12"

        # Topic covered
        topic = (att.today_topic_covered if hasattr(att, 'today_topic_covered') and att.today_topic_covered else None) or (live.current_task_title if live else '—') or '—'

        monitoring_rows.append({
            'trainer_id': str(t.id),
            'trainer_name': t.name,
            'username': t.username,
            'phone': t.phone or '',
            'avatar': t.avatar or '',
            'status': live.status if live else ('present' if att else 'offline'),
            'current_task_title': live.current_task_title if live else None,
            'current_batch_name': live.current_batch_name if live else None,
            'is_logged_in': True if (att and att.mark_in_time and not att.mark_out_time) else (live.is_logged_in if live else False),
            'login_time': att.mark_in_time if att else None,
            'logout_time': att.mark_out_time if att else None,
            'check_in_time': att.mark_in_time if att else None,
            'check_out_time': att.mark_out_time if att else None,
            'location': att.location_name if att else 'Main Campus',
            'device_ip': att.location_name if att else '',
            'active_batches_count': active_batches,
            'today_topic': topic,
            'today_topic_covered': topic,
            'attendance_status': att_status,
            'status_badge': status_badge,
            'leave_quota_display': leave_display,
            'leave_balance_display': leave_display,
            'monthly_incentive_amount': 0,
            'is_live_active': live.is_logged_in if live else False,
        })

    logged_in_count = sum(1 for r in monitoring_rows if r['status_badge'] in ['logged_in', 'late'])
    late_count = sum(1 for r in monitoring_rows if r['status_badge'] == 'late')
    not_logged_count = sum(1 for r in monitoring_rows if r['status_badge'] == 'not_logged_in')
    on_leave_count = sum(1 for r in monitoring_rows if r['status_badge'] == 'on_leave')

    return Response({
        'success': True,
        'date': today_str,
        'isWorkingDay': True,
        'dayType': 'Working Day',
        'summary': {
            'total': len(monitoring_rows),
            'totalTrainers': len(monitoring_rows),
            'present': logged_in_count,
            'loggedIn': logged_in_count,
            'late': late_count,
            'notLoggedIn': not_logged_count,
            'onLeave': on_leave_count,
        },
        'trainers': monitoring_rows,
        'monitoring': monitoring_rows,
        'rows': monitoring_rows,
    })



@api_view(['GET'])
def trainer_timeline_view(request):
    """
    GET /api/trainer-timeline/?date=YYYY-MM-DD
    Returns per-trainer timeline blocks for a given day:
      - class sessions (from WorkSession)
      - task/syllabus work (from TaskLog - both completed & ongoing)
      - attendance check-in/out window & status
      - auto-calculated idle gaps between logged activities
      - current live status details from LiveActivity & TrainerAttendance
    """
    from datetime import datetime, date as datetime_date
    from django.utils import timezone

    date_str = request.query_params.get('date', datetime.now().strftime('%Y-%m-%d'))

    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return Response({'success': False, 'error': 'Invalid date format'}, status=status.HTTP_400_BAD_REQUEST)

    is_today = (target_date == datetime.now().date())
    now_dt = datetime.now()
    now_min = now_dt.hour * 60 + now_dt.minute

    trainers = UserProfile.objects.filter(role='trainer').order_by('name')
    result = []

    def to_min(t_str):
        try:
            h, m = map(int, t_str.split(':'))
            return h * 60 + m
        except Exception:
            return 0

    def min_to_str(m):
        m = max(0, min(1439, m))
        return f"{m // 60:02d}:{m % 60:02d}"

    for trainer in trainers:
        # ── Attendance ──────────────────────────────────────────────
        att = TrainerAttendance.objects.filter(
            trainer_id=trainer.id, date=date_str
        ).first()

        check_in_time  = None
        check_out_time = None
        photo_in = None
        photo_out = None
        location_name = None
        day_status = 'absent'

        if att:
            day_status = att.day_status or 'present'
            photo_in = att.photo_in
            photo_out = att.photo_out
            location_name = att.location_name
            if att.mark_in_time:
                try:
                    dt = att.mark_in_time if hasattr(att.mark_in_time, 'hour') else datetime.fromisoformat(str(att.mark_in_time))
                    check_in_time = dt.strftime('%H:%M') if hasattr(dt, 'strftime') else str(att.mark_in_time)[:5]
                except Exception:
                    check_in_time = str(att.mark_in_time)[:5]
            if att.mark_out_time:
                try:
                    dt = att.mark_out_time if hasattr(att.mark_out_time, 'hour') else datetime.fromisoformat(str(att.mark_out_time))
                    check_out_time = dt.strftime('%H:%M') if hasattr(dt, 'strftime') else str(att.mark_out_time)[:5]
                except Exception:
                    check_out_time = str(att.mark_out_time)[:5]

        # ── Work Sessions (classes) ──────────────────────────────────
        sessions = WorkSession.objects.filter(
            trainer_id=trainer.id, session_date=date_str
        ).order_by('created_at')

        activity_blocks = []
        total_class_minutes = 0

        for s in sessions:
            hours = s.hours_taken or 1.0
            mins  = int(hours * 60)
            total_class_minutes += mins

            try:
                start_dt = s.created_at.astimezone()
                start_str = start_dt.strftime('%H:%M')
                end_min = start_dt.hour * 60 + start_dt.minute + mins
                end_str = min_to_str(end_min)
            except Exception:
                start_str = check_in_time or '09:00'
                sh, sm = map(int, start_str.split(':'))
                end_min = sh * 60 + sm + mins
                end_str = min_to_str(end_min)

            topic = ', '.join(s.selected_topics[:2]) if s.selected_topics else (s.description or 'Class Session')
            if len(topic) > 60:
                topic = topic[:60] + '…'

            activity_blocks.append({
                'type': 'class',
                'label': f"{s.batch_name or 'Batch'} — {topic}",
                'start': start_str,
                'end': end_str,
                'duration_minutes': mins,
                'batch_name': s.batch_name or '',
                'color': '#2563eb',
                'start_min': to_min(start_str),
                'end_min': to_min(end_str),
            })

        # ── Tasks (Completed & Ongoing) ──────────────────────────────
        tasks = TaskLog.objects.filter(
            trainer_id=trainer.id,
            created_at__date=date_str,
        ).order_by('start_time')

        total_task_minutes = 0

        for t in tasks:
            mins = t.duration_minutes or 0
            try:
                start_dt  = t.start_time.astimezone() if t.start_time else None
                start_str = start_dt.strftime('%H:%M') if start_dt else '10:00'
                if t.end_time:
                    end_dt  = t.end_time.astimezone()
                    end_str = end_dt.strftime('%H:%M')
                    mins = max(mins, int((end_dt - start_dt).total_seconds() / 60)) if start_dt else mins
                else:
                    if is_today and start_dt:
                        mins = max(15, int((now_dt.astimezone() - start_dt).total_seconds() / 60))
                        end_str = min_to_str(to_min(start_str) + mins)
                    else:
                        mins = mins or 30
                        end_str = min_to_str(to_min(start_str) + mins)
            except Exception:
                start_str = '10:00'
                end_str   = '10:30'
                mins = mins or 30

            total_task_minutes += mins

            cat_labels = {
                'doubt_session': 'Doubt Session',
                'lab_assistance': 'Lab Assistance',
                'paper_checking': 'Paper Checking',
                'syllabus_review': 'Syllabus Review',
                'counseling': 'Student Counseling',
                'calling': 'Student Calling',
                'curriculum_planning': 'Curriculum Planning',
                'other': 'Task',
            }
            cat_label = cat_labels.get(t.category or 'other', 'Task')
            status_tag = '' if t.is_completed else ' ⏳ [In Progress]'

            activity_blocks.append({
                'type': 'task',
                'label': f"{cat_label}: {t.title or ''}{status_tag}",
                'start': start_str,
                'end': end_str,
                'duration_minutes': mins,
                'category': t.category or 'other',
                'is_completed': t.is_completed,
                'color': '#7c3aed',
                'start_min': to_min(start_str),
                'end_min': to_min(end_str),
            })

        # Sort activity blocks chronologically
        activity_blocks.sort(key=lambda b: b['start_min'])

        # ── Calculate Idle Gaps ──────────────────────────────────────
        # Determine day shift range
        shift_start_min = 8 * 60  # Default 08:00
        shift_end_min   = 20 * 60 # Default 20:00

        if check_in_time:
            shift_start_min = max(8 * 60, to_min(check_in_time))

        if check_out_time:
            shift_end_min = min(20 * 60, to_min(check_out_time))
        elif is_today:
            shift_end_min = min(20 * 60, max(shift_start_min, now_min))

        all_blocks = []
        total_idle_minutes = 0

        if activity_blocks or check_in_time:
            # Merge overlapping intervals to find occupied ranges
            occupied_ranges = []
            for b in activity_blocks:
                s_m = max(shift_start_min, b['start_min'])
                e_m = min(shift_end_min, max(b['start_min'] + 1, b['end_min']))
                if s_m < e_m:
                    if not occupied_ranges:
                        occupied_ranges.append([s_m, e_m])
                    else:
                        last = occupied_ranges[-1]
                        if s_m <= last[1]:
                            last[1] = max(last[1], e_m)
                        else:
                            occupied_ranges.append([s_m, e_m])

            # Find gaps between shift_start_min -> shift_end_min
            current_cursor = shift_start_min
            for r_start, r_end in occupied_ranges:
                if r_start - current_cursor >= 10:  # Gap of 10+ mins
                    gap_mins = r_start - current_cursor
                    total_idle_minutes += gap_mins
                    all_blocks.append({
                        'type': 'idle',
                        'label': f"Idle Gap ({gap_mins}m)",
                        'start': min_to_str(current_cursor),
                        'end': min_to_str(r_start),
                        'duration_minutes': gap_mins,
                        'color': '#f43f5e',
                        'start_min': current_cursor,
                    })
                current_cursor = max(current_cursor, r_end)

            # Trailing gap up to shift_end_min
            if shift_end_min - current_cursor >= 10:
                gap_mins = shift_end_min - current_cursor
                total_idle_minutes += gap_mins
                all_blocks.append({
                    'type': 'idle',
                    'label': f"Idle Gap ({gap_mins}m)",
                    'start': min_to_str(current_cursor),
                    'end': min_to_str(shift_end_min),
                    'duration_minutes': gap_mins,
                    'color': '#f43f5e',
                    'start_min': current_cursor,
                })

        # Combine activity and idle blocks and sort
        all_blocks.extend(activity_blocks)
        all_blocks.sort(key=lambda b: b['start_min'])

        # Clean helper fields from response blocks
        for b in all_blocks:
            b.pop('start_min', None)
            b.pop('end_min', None)

        # ── Live status from LiveActivity ────────────────────────────
        live = LiveActivity.objects.filter(trainer_id=trainer.id).first()
        live_status = 'idle'
        live_label  = 'Idle / Free'
        current_task_title = None
        current_batch_name = None
        status_started_at = None

        if live:
            live_status = live.status or 'idle'
            current_task_title = live.current_task_title
            current_batch_name = live.current_batch_name
            status_started_at = live.status_started_at.isoformat() if live.status_started_at else None

            if live_status == 'in_class':
                live_label = f"Teaching: {live.current_batch_name or 'Class'}"
            elif live_status == 'on_task':
                live_label = f"Task: {live.current_task_title or 'Working'}"
            elif live_status == 'break':
                live_label = 'On Break'
            else:
                live_label = 'Idle / Free'
        elif sessions.exists():
            live_status = 'has_sessions'
            live_label  = 'Has Sessions Today'

        total_logged_minutes = total_class_minutes + total_task_minutes

        # ── Batch Workload & Utilization (Target = 5 Daily Batches) ──────
        active_batches_qs = Batch.objects.filter(
            Q(trainer_id=trainer.id) | Q(trainer_name__iexact=trainer.name),
            is_completed=False,
            is_active=True
        )
        active_batch_count = active_batches_qs.count()
        active_batch_names = list(active_batches_qs.values_list('name', flat=True))

        if active_batch_count >= 5:
            utilization_status = 'optimal'
            utilization_label = f"Optimal ({active_batch_count}/5 Batches)"
        elif active_batch_count > 0:
            utilization_status = 'under_utilized'
            utilization_label = f"Under-Utilized ({active_batch_count}/5 Batches)"
        else:
            utilization_status = 'no_batches'
            utilization_label = "0 Batches Assigned"

        # Inactivity alert: Has active batches but 0 sessions or classes taken today
        has_sessions_today = sessions.count() > 0
        has_live_class_now = live_status == 'in_class'
        is_taking_classes_today = has_sessions_today or has_live_class_now

        result.append({
            'trainer_id':   str(trainer.id),
            'trainer_name': trainer.name,
            'username':     trainer.username,
            'designation':  trainer.designation or 'Faculty Trainer',
            'check_in':     check_in_time,
            'check_out':    check_out_time,
            'day_status':   day_status,
            'photo_in':     photo_in,
            'photo_out':    photo_out,
            'location_name': location_name,
            'live_status':  live_status,
            'live_label':   live_label,
            'current_task_title': current_task_title,
            'current_batch_name': current_batch_name,
            'status_started_at': status_started_at,
            'total_class_minutes': total_class_minutes,
            'total_task_minutes':  total_task_minutes,
            'total_idle_minutes':  total_idle_minutes,
            'total_logged_minutes': total_logged_minutes,
            'session_count': sessions.count(),
            'task_count':    tasks.count(),
            'active_batch_count': active_batch_count,
            'active_batch_names': active_batch_names,
            'utilization_status': utilization_status,
            'utilization_label': utilization_label,
            'is_taking_classes_today': is_taking_classes_today,
            'blocks':        all_blocks,
        })

    return Response({
        'success': True,
        'date':     date_str,
        'is_today': is_today,
        'trainers': result,
    })


@api_view(['GET'])
def topics_coverage_view(request):
    batches = Batch.objects.all()
    coverages = []
    for b in batches:
        sessions = WorkSession.objects.filter(batch_id=b.id)
        used = sum(s.hours_taken or 0 for s in sessions)
        total = b.total_hours or 1.0
        pct = min(100, int((used / total) * 100))
        coverages.append({
            'batch_id': str(b.id),
            'batch_name': b.name,
            'trainer_name': b.trainer_name or 'Unassigned',
            'course_name': b.course_name or 'Course',
            'used_hours': used,
            'total_hours': total,
            'percentage': pct,
        })
    return Response({'success': True, 'coverages': coverages})


@api_view(['POST'])
def cron_12pm_cutoff_view(request):
    return Response({
        'success': True,
        'message': '12:00 PM Cutoff evaluation completed successfully',
        'totalFlagged': 0,
        'isWorkingDay': True
    })


@csrf_exempt
@api_view(['GET'])
def support_contacts_view(request):
    """
    Get all active users for direct messaging directory.
    """
    current_user_id = request.GET.get('user_id', '').strip()
    users = UserProfile.objects.all().order_by('name')
    if current_user_id:
        users = users.exclude(id=current_user_id)
    
    contacts = []
    for u in users:
        contacts.append({
            'id': u.id,
            'name': u.name,
            'username': u.username,
            'role': u.role,
            'designation': u.designation or ('Administrator' if u.role == 'admin' else 'Faculty Trainer'),
            'avatar': u.avatar or '',
            'email': u.email or '',
            'phone': u.phone or '',
        })

    return Response({
        'success': True,
        'contacts': contacts
    })


@csrf_exempt
@api_view(['GET'])
def support_threads_view(request):
    """
    Get support and direct chat threads.
    - thread_type: 'admin_support' | 'direct_message' | 'faculty_lounge' | 'all'
    """
    user_id = request.GET.get('user_id', '').strip()
    role = request.GET.get('role', 'trainer').strip().lower()
    thread_type = request.GET.get('thread_type', 'admin_support').strip()
    recipient_id = request.GET.get('recipient_id', '').strip()

    # 1. Faculty Community Lounge Thread
    if thread_type == 'faculty_lounge':
        lounge_thread = SupportThread.objects.filter(id='faculty_lounge_global').first()
        if not lounge_thread:
            admin_user = UserProfile.objects.filter(role='admin').first() or UserProfile.objects.first()
            if admin_user:
                lounge_thread = SupportThread.objects.create(
                    id='faculty_lounge_global',
                    thread_type='faculty_lounge',
                    user=admin_user,
                    user_name='Learnmore Institute',
                    user_role='admin',
                    subject='Faculty Community Lounge',
                    status='open'
                )
        threads = [lounge_thread] if lounge_thread else []

    # 2. Direct 1-on-1 Messages
    elif thread_type == 'direct_message':
        if not user_id:
            return Response({'success': False, 'error': 'user_id is required for direct messages'}, status=400)
        
        if recipient_id:
            # Look for specific conversation between user_id and recipient_id
            threads = SupportThread.objects.filter(
                thread_type='direct_message'
            ).filter(
                (Q(user_id=user_id) & Q(recipient_id=recipient_id)) |
                (Q(user_id=recipient_id) & Q(recipient_id=user_id))
            ).order_by('-last_message_at')

            if not threads.exists():
                u1 = UserProfile.objects.filter(id=user_id).first()
                u2 = UserProfile.objects.filter(id=recipient_id).first()
                if u1 and u2:
                    created_thread = SupportThread.objects.create(
                        thread_type='direct_message',
                        user=u1,
                        user_name=u1.name,
                        user_role=u1.role,
                        recipient=u2,
                        recipient_name=u2.name,
                        subject=f"Direct: {u1.name} & {u2.name}",
                        status='open'
                    )
                    threads = [created_thread]
        else:
            # All direct message conversations for this user
            threads = SupportThread.objects.filter(
                thread_type='direct_message'
            ).filter(
                Q(user_id=user_id) | Q(recipient_id=user_id)
            ).order_by('-last_message_at')

    # 3. Admin Support / Doubts Channel
    else:
        if role == 'admin':
            threads = SupportThread.objects.filter(thread_type='admin_support').order_by('-last_message_at')
        else:
            if not user_id:
                return Response({'success': False, 'error': 'user_id is required for trainers'}, status=400)
            
            threads = SupportThread.objects.filter(user_id=user_id, thread_type='admin_support').order_by('-last_message_at')
            if not threads.exists():
                user_profile = UserProfile.objects.filter(id=user_id).first()
                if user_profile:
                    thread = SupportThread.objects.create(
                        thread_type='admin_support',
                        user=user_profile,
                        user_name=user_profile.name,
                        user_role=user_profile.role,
                        subject='Trainer Doubt & Support Channel',
                        status='open'
                    )
                    threads = [thread]

    serializer = SupportThreadSerializer(threads, many=True)
    return Response({
        'success': True,
        'threads': serializer.data
    })


@csrf_exempt
@api_view(['GET'])
def support_thread_messages_view(request, thread_id):
    """
    Get messages for a specific support thread and mark as read.
    """
    thread = SupportThread.objects.filter(id=thread_id).first()
    if not thread:
        return Response({'success': False, 'error': 'Support thread not found'}, status=404)

    viewer_id = request.GET.get('user_id', '').strip()
    viewer_role = request.GET.get('role', 'trainer').strip().lower()

    # Reset unread counters based on thread type and viewer
    if thread.thread_type == 'admin_support':
        if viewer_role == 'admin':
            if thread.unread_admin_count > 0:
                thread.unread_admin_count = 0
                thread.save(update_fields=['unread_admin_count'])
        else:
            if thread.unread_user_count > 0:
                thread.unread_user_count = 0
                thread.save(update_fields=['unread_user_count'])
    elif thread.thread_type == 'direct_message':
        if viewer_id:
            if thread.user_id == viewer_id and thread.unread_user_count > 0:
                thread.unread_user_count = 0
                thread.save(update_fields=['unread_user_count'])
            elif thread.recipient_id == viewer_id and thread.unread_recipient_count > 0:
                thread.unread_recipient_count = 0
                thread.save(update_fields=['unread_recipient_count'])

    messages = thread.messages.all().order_by('created_at')
    thread_data = SupportThreadSerializer(thread).data
    messages_data = SupportMessageSerializer(messages, many=True).data

    return Response({
        'success': True,
        'thread': thread_data,
        'messages': messages_data
    })


@csrf_exempt
@api_view(['POST'])
def support_send_message_view(request):
    """
    Send a message in Admin support, Direct 1-on-1 chat, or Faculty Lounge with attachments.
    """
    data = request.data
    thread_id = data.get('thread_id')
    thread_type = data.get('thread_type', 'admin_support')
    user_id = data.get('user_id')
    recipient_id = data.get('recipient_id')
    sender_name = data.get('sender_name', 'Anonymous')
    sender_role = data.get('sender_role', 'trainer').lower()
    message_text = data.get('message', '').strip()
    subject = data.get('subject', 'Chat Message')
    
    attachment_name = data.get('attachment_name')
    attachment_type = data.get('attachment_type')
    attachment_data = data.get('attachment_data')
    attachment_size = data.get('attachment_size')

    if not message_text and not attachment_data:
        return Response({'success': False, 'error': 'Message or document is required'}, status=400)

    thread = None
    if thread_id:
        thread = SupportThread.objects.filter(id=thread_id).first()

    # If thread not found, find or create based on thread_type
    if not thread:
        if thread_type == 'faculty_lounge' or thread_id == 'faculty_lounge_global':
            thread = SupportThread.objects.filter(id='faculty_lounge_global').first()
            if not thread:
                admin_user = UserProfile.objects.filter(role='admin').first() or UserProfile.objects.first()
                thread = SupportThread.objects.create(
                    id='faculty_lounge_global',
                    thread_type='faculty_lounge',
                    user=admin_user,
                    user_name='Learnmore Institute',
                    user_role='admin',
                    subject='Faculty Community Lounge',
                    status='open'
                )
        elif thread_type == 'direct_message' and user_id and recipient_id:
            thread = SupportThread.objects.filter(
                thread_type='direct_message'
            ).filter(
                (Q(user_id=user_id) & Q(recipient_id=recipient_id)) |
                (Q(user_id=recipient_id) & Q(recipient_id=user_id))
            ).first()

            if not thread:
                u1 = UserProfile.objects.filter(id=user_id).first()
                u2 = UserProfile.objects.filter(id=recipient_id).first()
                if u1 and u2:
                    thread = SupportThread.objects.create(
                        thread_type='direct_message',
                        user=u1,
                        user_name=u1.name,
                        user_role=u1.role,
                        recipient=u2,
                        recipient_name=u2.name,
                        subject=f"Direct: {u1.name} & {u2.name}",
                        status='open'
                    )
        else:
            # Default admin support
            if not user_id:
                return Response({'success': False, 'error': 'user_id is required'}, status=400)
            user_profile = UserProfile.objects.filter(id=user_id).first()
            if not user_profile:
                return Response({'success': False, 'error': 'User not found'}, status=404)
            
            thread = SupportThread.objects.filter(user=user_profile, thread_type='admin_support').first()
            if not thread:
                thread = SupportThread.objects.create(
                    thread_type='admin_support',
                    user=user_profile,
                    user_name=user_profile.name,
                    user_role=user_profile.role,
                    subject=subject or 'Trainer Doubt / Problem',
                    status='open'
                )

    if not thread:
        return Response({'success': False, 'error': 'Could not initialize chat thread'}, status=400)

    sender_profile = UserProfile.objects.filter(id=user_id).first() if user_id else None

    # Create message
    msg = SupportMessage.objects.create(
        thread=thread,
        sender=sender_profile,
        sender_name=sender_name or (sender_profile.name if sender_profile else 'User'),
        sender_role=sender_role,
        message=message_text,
        attachment_name=attachment_name,
        attachment_type=attachment_type,
        attachment_data=attachment_data,
        attachment_size=attachment_size,
    )

    # Update thread stats
    summary_preview = message_text[:100] if message_text else f"📎 Attached {attachment_name or 'Document'}"
    thread.last_message = summary_preview
    thread.last_message_at = timezone.now()

    if thread.thread_type == 'direct_message':
        if str(user_id) == str(thread.user_id):
            thread.unread_recipient_count += 1
        else:
            thread.unread_user_count += 1
    elif thread.thread_type == 'admin_support':
        if sender_role == 'admin':
            thread.unread_user_count += 1
        else:
            thread.unread_admin_count += 1
            if thread.status == 'resolved':
                thread.status = 'open'

    thread.save()

    return Response({
        'success': True,
        'thread': SupportThreadSerializer(thread).data,
        'message': SupportMessageSerializer(msg).data
    })


@csrf_exempt
@api_view(['POST'])
def support_update_status_view(request, thread_id):
    """
    Update thread status (open, in_progress, resolved).
    """
    thread = SupportThread.objects.filter(id=thread_id).first()
    if not thread:
        return Response({'success': False, 'error': 'Thread not found'}, status=404)

    new_status = request.data.get('status')
    if new_status in ['open', 'in_progress', 'resolved']:
        thread.status = new_status
        thread.save(update_fields=['status'])

    return Response({
        'success': True,
        'thread': SupportThreadSerializer(thread).data
    })



