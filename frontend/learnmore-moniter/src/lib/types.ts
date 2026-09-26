export type UserRole = 'admin' | 'trainer';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  password?: string;
  avatar?: string;
  designation?: string;
  hourly_rate?: number;
  created_at: string;
}

export type BatchType = 'training' | 'demo' | 'other';
export type BatchStatus = 'ontime' | 'delay' | 'completed';

export interface Batch {
  id: string;
  name: string;
  course_id?: string;
  course_name?: string;
  trainer_id: string;
  trainer_name?: string;
  start_date: string;
  total_hours: number;
  total_students: number;
  is_completed: boolean;
  completed_at?: string | null;
  batch_type: BatchType;
  is_active: boolean;
  created_at: string;
  used_hours?: number;
  remaining_hours?: number;
  delay_hours?: number;
  status_label?: BatchStatus;
  whatsapp_group_name?: string;
  whatsapp_group_id?: string;
  whatsapp_group_link?: string;
  auto_whatsapp_group?: boolean;
  timing?: string;
  classroom?: string;
  completed_hours?: number;
  code?: string;
  status?: string;
}

export interface WhatsAppBroadcastLog {
  id: string;
  batch_id: string;
  batch_name: string;
  trainer_name: string;
  group_name: string;
  message_preview: string;
  status: 'delivered' | 'failed';
  sent_at: string;
}

export type StudentStatus = 'present' | 'absent' | 'leave';

export interface StudentAttendanceRecord {
  student_id: string;
  student_name: string;
  phone?: string;
  status: StudentStatus;
  leave_reason?: string;
}

export interface Student {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  batch_id: string;
  batch_name?: string;
  enrollment_date?: string;
}

export interface WorkSession {
  id: string;
  trainer_id: string;
  trainer_name?: string;
  batch_id: string;
  batch_name?: string;
  course_id?: string;
  course_name?: string;
  module_name?: string;
  selected_topics?: string[];
  session_date: string;
  hours_taken: number;
  description: string;
  students_attendance?: StudentAttendanceRecord[];
  total_students_present?: number;
  total_students_absent?: number;
  total_students_leave?: number;
  created_at: string;
}

export type DayStatus = 'present' | 'half_day' | 'leave' | 'pending' | 'absent' | 'weekoff' | 'holiday';

export interface TrainerAttendance {
  id: string;
  trainer_id: string;
  trainer_name?: string;
  date: string;
  mark_in_time?: string | null;
  mark_out_time?: string | null;
  working_duration?: string | null; // e.g. "06:30:00"
  photo_in?: string | null; // Base64 or URL
  photo_out?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  location_name?: string | null;
  day_status: DayStatus;
  created_at: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  selfie_in_url?: string | null;
  total_work_minutes?: number | null;
  latitude_in?: string | null;
  longitude_in?: string | null;
  device_info?: string | null;
}

export type LeaveType = 'sick' | 'casual' | 'emergency' | 'weekoff' | 'optional_holiday';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface Leave {
  id: string;
  trainer_id: string;
  trainer_name?: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
  status: LeaveStatus;
  admin_notes?: string;
  created_at: string;
}

export type TeacherActivityStatus = 'in_class' | 'working_task' | 'break' | 'idle';

export interface LiveActivity {
  trainer_id: string;
  trainer_name: string;
  status: TeacherActivityStatus;
  current_task_title?: string;
  current_batch_id?: string;
  current_batch_name?: string;
  status_started_at: string; // ISO string
  last_heartbeat_at: string; // ISO string
  idle_minutes_current: number;
  total_idle_today_minutes: number;
  total_teaching_today_minutes: number;
  total_task_today_minutes: number;
  is_logged_in: boolean;
  idle_reason?: string;
}

export type TaskCategory = 'doubt_solving' | 'paper_checking' | 'calling' | 'curriculum_planning' | 'lab_assistance' | 'other';

export interface TaskLog {
  id: string;
  trainer_id: string;
  trainer_name?: string;
  batch_name?: string;
  title: string;
  category: TaskCategory;
  start_time: string;
  end_time?: string | null;
  duration_minutes: number;
  notes?: string;
  is_completed: false | true;
  created_at: string;
}

export interface Holiday {
  date: string;
  name: string;
  type: 'mandatory' | 'optional';
}

export interface IncentiveReport {
  trainer_id: string;
  trainer_name: string;
  month: number;
  year: number;
  total_working_days: number;
  present_days: number;
  attendance_percent: number;
  is_attendance_eligible: boolean;
  batch_count: number;
  extra_batches: number;
  batch_bonus: number;
  total_incentive: number;
  total_class_hours: number;
  total_other_hours: number;
  total_idle_minutes: number;
}

export type TrainerLiveLoginStatus = 'logged_in' | 'late' | 'half_day' | 'not_logged_in' | 'on_leave' | 'weekoff' | 'holiday';

export interface TrainerLeaveBalance {
  trainer_id: string;
  trainer_name: string;
  casual_sick_quota: number; // default 12
  casual_sick_used: number;
  optional_holiday_quota: number; // default 5
  optional_holiday_used: number;
  mandatory_holiday_count: number; // default 5
}

export interface LeaveAuditLog {
  id: string;
  trainer_id: string;
  trainer_name: string;
  admin_name: string;
  leave_type: string;
  old_balance: number;
  new_balance: number;
  adjustment: number;
  reason: string;
  created_at: string;
  previous_balance?: number;
  adjustment_amount?: number;
  modified_by?: string;
}

export interface HolidayConfig {
  mandatory_holidays: Holiday[];
  optional_holidays: Holiday[];
  week_off_pattern: 'sunday' | 'sat_sun' | 'alternate_sat_sun';
}

export interface TopicCoverageProgress {
  course_id: string;
  course_name: string;
  batch_id: string;
  batch_name: string;
  trainer_id?: string;
  trainer_name?: string;
  total_topics: number;
  covered_topics: number;
  coverage_percentage: number;
  covered_topics_list: Array<{ topic: string; session_date: string; trainer_name: string }>;
}

export interface TrainerMonitoringRow {
  trainer_id: string;
  trainer_name: string;
  phone?: string;
  avatar?: string;
  login_time: string | null;
  logout_time: string | null;
  attendance_status: 'Present' | 'Late' | 'Not Logged In' | 'On Leave' | 'Week Off' | 'Holiday' | 'Absent';
  today_topic: string;
  leave_balance_display: string; // e.g. "10/12"
  status_badge: TrainerLiveLoginStatus;
  device_ip?: string;
}

export type BatchTopicCoverage = TopicCoverageProgress;

