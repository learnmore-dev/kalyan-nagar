import os
import json
from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import (
    UserProfile,
    Course,
    Batch,
    Student,
    WorkSession,
    TrainerAttendance,
    Leave,
    TaskLog,
    LiveActivity,
    Holiday,
    AttendanceGroupConfig,
)

class Command(BaseCommand):
    help = 'Seed initial data into Django database'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting database seeding...'))

        # Ensure AttendanceGroupConfig
        AttendanceGroupConfig.objects.get_or_create(
            id=1,
            defaults={
                'group_id': '120363231853245188@g.us',
                'group_name': 'LEARNMORE-Login-Logout',
            }
        )

        # 1. Users
        users_data = [
            {
                'id': 'usr_admin',
                'username': 'admin',
                'name': 'Institute Director (Admin)',
                'email': 'admin@institute.edu',
                'role': 'admin',
                'password': 'admin',
                'phone': '+91 98765 43210',
                'designation': 'Director / Management',
                'avatar': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            },
            {
                'id': 'usr_trainer_1',
                'username': 'rahul.sharma',
                'name': 'Rahul Sharma',
                'email': 'rahul.sharma@institute.edu',
                'role': 'trainer',
                'password': 'trainer',
                'phone': '+91 98220 11223',
                'designation': 'Senior Full-Stack Trainer',
                'hourly_rate': 600,
                'avatar': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
            },
            {
                'id': 'usr_trainer_2',
                'username': 'priya.patel',
                'name': 'Priya Patel',
                'email': 'priya.patel@institute.edu',
                'role': 'trainer',
                'password': 'trainer',
                'phone': '+91 98980 33445',
                'designation': 'Python & Data Science Trainer',
                'hourly_rate': 550,
                'avatar': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
            },
            {
                'id': 'usr_trainer_3',
                'username': 'amit.verma',
                'name': 'Amit Verma',
                'email': 'amit.verma@institute.edu',
                'role': 'trainer',
                'password': 'trainer',
                'phone': '+91 97123 55667',
                'designation': 'UI/UX & Frontend Trainer',
                'hourly_rate': 500,
                'avatar': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
            },
        ]

        for u in users_data:
            user_obj = UserProfile.objects.filter(username=u['username']).first() or UserProfile.objects.filter(id=u['id']).first()
            if user_obj:
                for key, val in u.items():
                    if key != 'id':
                        setattr(user_obj, key, val)
                user_obj.save()
            else:
                UserProfile.objects.create(**u)
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(users_data)} users."))

        # 2. Courses
        courses_data = [
            {
                'id': 'course_mern',
                'name': 'MERN Stack Developer Syllabus',
                'code': 'MERN-101',
                'description': 'Full Stack Web Development with MongoDB, Express, React, and Node.js',
                'total_hours': 60,
                'modules': [
                    {'title': 'Module 1: HTML, CSS, JavaScript Fundamentals', 'hours': 15},
                    {'title': 'Module 2: React.js & Redux Toolkit', 'hours': 20},
                    {'title': 'Module 3: Node.js, Express & MongoDB', 'hours': 25},
                ]
            },
            {
                'id': 'course_sql',
                'name': 'SQL Course Syllabus',
                'code': 'SQL-101',
                'description': 'Database Design, Complex Queries, Indexes, and Optimization',
                'total_hours': 40,
                'modules': [
                    {'title': 'Module 1: Relational Data Modeling & DDL', 'hours': 10},
                    {'title': 'Module 2: DML, Joins & Aggregations', 'hours': 15},
                    {'title': 'Module 3: Stored Procedures & Triggers', 'hours': 15},
                ]
            },
            {
                'id': 'course_datascience',
                'name': 'Data Science & Machine Learning Syllabus',
                'code': 'DS-101',
                'description': 'Python, Pandas, Scikit-Learn, and Deep Learning Basics',
                'total_hours': 80,
                'modules': [
                    {'title': 'Module 1: Python for Data Science', 'hours': 20},
                    {'title': 'Module 2: Machine Learning Algorithms', 'hours': 40},
                    {'title': 'Module 3: Model Deployment & API', 'hours': 20},
                ]
            }
        ]

        for c in courses_data:
            Course.objects.update_or_create(
                id=c['id'],
                defaults=c
            )
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(courses_data)} courses."))

        # 3. Batches
        batches_data = [
            {
                'id': 'btc_1',
                'name': 'MERN Stack - Morning Batch A',
                'course_id': 'course_mern',
                'course_name': 'MERN Stack Developer Syllabus',
                'trainer_id': 'usr_trainer_1',
                'trainer_name': 'Rahul Sharma',
                'start_date': '2026-08-01',
                'total_hours': 60,
                'total_students': 18,
                'batch_type': 'training',
                'is_active': True,
            },
            {
                'id': 'btc_sql',
                'name': 'SQL & Database Engineering - Morning Batch',
                'course_id': 'course_sql',
                'course_name': 'SQL Course Syllabus',
                'trainer_id': 'usr_trainer_1',
                'trainer_name': 'Rahul Sharma',
                'start_date': '2026-08-15',
                'total_hours': 40,
                'total_students': 15,
                'batch_type': 'training',
                'is_active': True,
            },
            {
                'id': 'btc_3',
                'name': 'Python Data Science & ML - Morning Batch',
                'course_id': 'course_datascience',
                'course_name': 'Data Science & Machine Learning Syllabus',
                'trainer_id': 'usr_trainer_2',
                'trainer_name': 'Priya Patel',
                'start_date': '2026-08-02',
                'total_hours': 80,
                'total_students': 22,
                'batch_type': 'training',
                'is_active': True,
            }
        ]

        for b in batches_data:
            Batch.objects.update_or_create(
                id=b['id'],
                defaults=b
            )
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(batches_data)} batches."))

        # 4. Holidays
        holidays_data = [
            {'id': 'hol_1', 'name': 'Republic Day', 'date': '2026-01-26', 'type': 'mandatory', 'description': 'National Holiday'},
            {'id': 'hol_2', 'name': 'Independence Day', 'date': '2026-08-15', 'type': 'mandatory', 'description': 'National Holiday'},
            {'id': 'hol_3', 'name': 'Gandhi Jayanti', 'date': '2026-10-02', 'type': 'mandatory', 'description': 'National Holiday'},
            {'id': 'hol_4', 'name': 'Diwali', 'date': '2026-11-08', 'type': 'mandatory', 'description': 'Festival Holiday'},
            {'id': 'hol_5', 'name': 'Raksha Bandhan', 'date': '2026-08-28', 'type': 'optional', 'description': 'Optional Holiday'},
        ]

        for h in holidays_data:
            Holiday.objects.update_or_create(
                id=h['id'],
                defaults=h
            )
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(holidays_data)} holidays."))

        # 5. Attendance for Today
        today_str = timezone.now().strftime('%Y-%m-%d')
        attendance_data = [
            {
                'id': f"att_{today_str}_1",
                'trainer_id': 'usr_trainer_1',
                'trainer_name': 'Rahul Sharma',
                'date': today_str,
                'mark_in_time': '08:05:00',
                'day_status': 'present',
                'location_name': 'Main Campus - Room 102',
            },
            {
                'id': f"att_{today_str}_2",
                'trainer_id': 'usr_trainer_2',
                'trainer_name': 'Priya Patel',
                'date': today_str,
                'mark_in_time': '08:45:00',
                'day_status': 'late',
                'location_name': 'Lab 3',
            },
            {
                'id': f"att_{today_str}_3",
                'trainer_id': 'usr_trainer_3',
                'trainer_name': 'Amit Verma',
                'date': today_str,
                'mark_in_time': '08:10:00',
                'day_status': 'present',
                'location_name': 'Design Studio Lab',
            }
        ]
        for att in attendance_data:
            TrainerAttendance.objects.update_or_create(
                id=att['id'],
                defaults=att
            )

        # 6. Work Sessions for Today
        sessions_data = [
            {
                'id': f"ws_{today_str}_1",
                'trainer_id': 'usr_trainer_1',
                'trainer_name': 'Rahul Sharma',
                'batch_id': 'btc_1',
                'batch_name': 'MERN Stack - Morning Batch A',
                'course_id': 'course_mern',
                'course_name': 'MERN Stack Developer Syllabus',
                'selected_topics': ['React.js & Hooks', 'Redux Toolkit Store'],
                'session_date': today_str,
                'hours_taken': 2.0,
                'total_students_present': 16,
                'total_students_absent': 2,
            },
            {
                'id': f"ws_{today_str}_2",
                'trainer_id': 'usr_trainer_2',
                'trainer_name': 'Priya Patel',
                'batch_id': 'btc_3',
                'batch_name': 'Python Data Science & ML - Morning Batch',
                'course_id': 'course_datascience',
                'course_name': 'Data Science & Machine Learning Syllabus',
                'selected_topics': ['Pandas DataFrames', 'Data Cleaning'],
                'session_date': today_str,
                'hours_taken': 2.0,
                'total_students_present': 20,
                'total_students_absent': 2,
            }
        ]
        for ws in sessions_data:
            WorkSession.objects.update_or_create(
                id=ws['id'],
                defaults=ws
            )

        # 7. Task Logs for Today
        tasks_data = [
            {
                'id': f"task_{today_str}_1",
                'trainer_id': 'usr_trainer_1',
                'trainer_name': 'Rahul Sharma',
                'title': 'Doubt solving session for React Redux project',
                'category': 'doubt_solving',
                'duration_minutes': 45,
                'is_completed': True,
            },
            {
                'id': f"task_{today_str}_2",
                'trainer_id': 'usr_trainer_3',
                'trainer_name': 'Amit Verma',
                'title': 'Paper checking for UI/UX midterm test',
                'category': 'paper_checking',
                'duration_minutes': 60,
                'is_completed': True,
            }
        ]
        for tsk in tasks_data:
            TaskLog.objects.update_or_create(
                id=tsk['id'],
                defaults=tsk
            )

        # 8. Pending Leaves
        Leave.objects.update_or_create(
            id='lv_req_1',
            defaults={
                'trainer_id': 'usr_trainer_3',
                'trainer_name': 'Amit Verma',
                'leave_type': 'casual',
                'start_date': today_str,
                'end_date': today_str,
                'reason': 'Personal work at bank',
                'status': 'pending',
            }
        )

        # 9. Live Activities
        trainers = UserProfile.objects.filter(role='trainer')
        for t in trainers:
            LiveActivity.objects.update_or_create(
                trainer=t,
                defaults={
                    'trainer_name': t.name,
                    'status': 'in_class' if t.username == 'rahul.sharma' else 'on_task' if t.username == 'priya.patel' else 'idle',
                    'current_task_title': 'Teaching MERN Stack' if t.username == 'rahul.sharma' else 'Working on Python Lab' if t.username == 'priya.patel' else 'Free',
                    'current_batch_name': 'MERN Stack - Morning Batch A' if t.username == 'rahul.sharma' else '',
                    'is_logged_in': True,
                }
            )

        self.stdout.write(self.style.SUCCESS('Database seeding completed successfully!'))

