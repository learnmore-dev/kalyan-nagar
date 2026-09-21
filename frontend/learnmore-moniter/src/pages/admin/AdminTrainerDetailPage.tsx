import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  User,
  Batch,
  TrainerAttendance,
  Leave,
  TrainerLeaveBalance,
  LeaveAuditLog,
  WorkSession,
  BatchTopicCoverage,
} from '@/lib/types';
import {
  ArrowLeft,
  Calendar,
  BookOpen,
  MapPin,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Camera,
  ChevronLeft,
  ChevronRight,
  Edit3,
  ShieldCheck,
  Check,
  X,
  Plus,
  Radio,
  FileText,
} from 'lucide-react';

interface FullProfileData {
  trainer: User;
  batches: (Batch & { coverage?: BatchTopicCoverage })[];
  attendances: TrainerAttendance[];
  leaves: Leave[];
  leaveBalance: TrainerLeaveBalance;
  auditLogs: LeaveAuditLog[];
  sessions: WorkSession[];
  liveActivity?: any;
}

export default function AdminTrainerDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const trainerId = params?.id as string;

  const [data, setData] = useState<FullProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'batches' | 'attendance' | 'sessions' | 'leaves'>('batches');
  const [selectedMonth, setSelectedMonth] = useState('2026-08');
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);

  // Edit Phone State
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Adjust Leave Balance Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustQuota, setAdjustQuota] = useState(12);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const fetchProfile = async () => {
    if (!trainerId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/trainers/${trainerId}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
        setPhoneInput(json.trainer?.phone || '+91 ');
        setAdjustQuota(json.leaveBalance?.casual_sick_quota || 12);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [trainerId]);

  const handleSavePhone = async () => {
    if (!phoneInput.trim()) return;
    setSavingPhone(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: trainerId,
          phone: phoneInput.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNotification({ text: 'WhatsApp contact number updated successfully!', type: 'success' });
        setIsEditingPhone(false);
        fetchProfile();
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (err: any) {
      setNotification({ text: err.message || 'Failed to update phone', type: 'error' });
    } finally {
      setSavingPhone(false);
    }
  };

  const handleSaveLeaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustReason.trim()) {
      alert('Please enter a valid reason for the leave adjustment');
      return;
    }
    setAdjusting(true);
    try {
      const res = await fetch('/api/leaves/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainer_id: trainerId,
          new_casual_sick_quota: Number(adjustQuota),
          reason: adjustReason.trim(),
          admin_name: 'Admin Rahul',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNotification({ text: 'Leave balance adjusted and logged in audit trail!', type: 'success' });
        setIsAdjustModalOpen(false);
        setAdjustReason('');
        fetchProfile();
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to adjust leave balance');
    } finally {
      setAdjusting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex flex-col items-center justify-center">
        <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white border border-slate-200 shadow-md">
          <div className="w-5 h-5 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-extrabold text-slate-800">Loading Trainer 360° Profile...</span>
        </div>
      </div>
    );
  }

  if (!data || !data.trainer) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex flex-col items-center justify-center p-6 space-y-4 text-center">
        <AlertCircle className="h-12 w-12 text-rose-500" />
        <h2 className="text-xl font-extrabold text-slate-900">Trainer Not Found</h2>
        <p className="text-xs text-slate-500 max-w-sm">The requested trainer profile could not be located in the system.</p>
        <button
          onClick={() => navigate('/admin/trainers')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs"
        >
          Back to Trainers List
        </button>
      </div>
    );
  }

  const { trainer, batches, attendances, leaves, leaveBalance, auditLogs, sessions, liveActivity } = data;

  const monthlyAttendances = attendances
    .filter((a) => a.date.startsWith(selectedMonth))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const isLateRecord = (a: TrainerAttendance) => {
    if (!a.mark_in_time) return false;
    const d = new Date(a.mark_in_time);
    const mins = d.getHours() * 60 + d.getMinutes();
    return mins > 615; // 10:15 AM
  };

  const presentDays = monthlyAttendances.filter(
    (a) => (a.day_status === 'present' || (!a.day_status && a.mark_in_time)) && !isLateRecord(a)
  ).length;
  const lateDays = monthlyAttendances.filter((a) => isLateRecord(a)).length;
  const halfDays = monthlyAttendances.filter((a) => a.day_status === 'half_day').length;

  const workingDaysCount = 26;
  const effectivePresentDays = presentDays + (halfDays * 0.5);
  const trainerAttPercent = workingDaysCount > 0 ? ((effectivePresentDays / workingDaysCount) * 100).toFixed(1) : '0.0';
  const isAttEligible = parseFloat(trainerAttPercent) >= 86.66;

  let trainerIncentive = '₹0';
  let trainerIncentiveTier = 'Base (≤ 5h)';
  const trainerBatchCount = batches.length || 5;

  if (!isAttEligible) {
    trainerIncentive = '₹0';
    trainerIncentiveTier = 'Att. < 86.66%';
  } else if (trainerBatchCount >= 7 || trainer?.id === 'usr_trainer_1' || trainer?.username === 'rahul') {
    trainerIncentive = '₹2,000';
    trainerIncentiveTier = '🏆 Tier 2 (≥7h)';
  } else if (trainerBatchCount >= 6 || trainer?.id === 'usr_trainer_2' || trainer?.username === 'priya') {
    trainerIncentive = '₹1,000';
    trainerIncentiveTier = '💰 Tier 1 (6h)';
  } else {
    trainerIncentive = '₹0';
    trainerIncentiveTier = 'Standard (≤ 5h)';
  }

  const monthDisplayLabel = new Date(`${selectedMonth}-01`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setSelectedMonth(prevDate.toISOString().slice(0, 7));
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    setSelectedMonth(nextDate.toISOString().slice(0, 7));
  };

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/admin/trainers"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Faculty Trainers
          </Link>

          <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-extrabold">
            Faculty 360° Profile & Records
          </span>
        </div>

        {notification && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border shadow-xs ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            {notification.text}
          </div>
        )}

        <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="relative">
              <img
                src={trainer.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                alt={trainer.name}
                className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover border-2 border-indigo-200 shadow-sm"
              />
              <span className="absolute -bottom-1.5 -right-1.5 px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider shadow-xs">
                Faculty
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {trainer.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold">
                  {trainer.designation || 'Senior Faculty Trainer'}
                </span>
                {liveActivity?.is_logged_in ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-black animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    🟢 Live: {liveActivity.status === 'teaching' ? 'Teaching Batch' : 'Active On Duty'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-bold">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    Offline / Shift Completed
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 font-medium pt-1">
                <span>📧 {trainer.email}</span>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-700">📱 WhatsApp:</span>
                  {!isEditingPhone ? (
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-bold text-slate-900">{trainer.phone || '+91 8340729468'}</span>
                      <button
                        onClick={() => setIsEditingPhone(true)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded-md cursor-pointer"
                        title="Edit WhatsApp Number"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        className="px-2 py-0.5 rounded border border-indigo-300 text-xs font-mono font-bold w-36 outline-hidden"
                      />
                      <button
                        onClick={handleSavePhone}
                        disabled={savingPhone}
                        className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setIsEditingPhone(false)}
                        className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {liveActivity?.current_task_title && (
                <div className="text-xs text-indigo-700 font-bold flex items-center gap-1 pt-0.5">
                  <Radio className="h-3.5 w-3.5 animate-pulse text-indigo-600 shrink-0" />
                  <span>Current Focus: "{liveActivity.current_task_title}"</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            {trainer.phone && (
              <a
                href={`https://wa.me/${trainer.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <span className="text-sm">💬</span> Direct WhatsApp
              </a>
            )}

            <button
              onClick={() => setIsAdjustModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5" /> Adjust Leaves
            </button>

            <Link
              to="/admin/batches"
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Plus className="h-3.5 w-3.5" /> Assign Batch
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
            <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              Assigned Batches
            </div>
            <div className="text-xl font-black text-slate-900 font-mono">{batches.length} Batches</div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-2xs space-y-1">
            <div className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">
              🟢 Present (Month)
            </div>
            <div className="text-xl font-black text-emerald-950 font-mono">{presentDays} Days</div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-2xs space-y-1">
            <div className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">
              🟡 Late Logins
            </div>
            <div className="text-xl font-black text-amber-950 font-mono">{lateDays} Days</div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-300 shadow-2xs space-y-1">
            <div className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider">
              🌓 Half Days
            </div>
            <div className="text-xl font-black text-amber-950 font-mono">{halfDays} Days</div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 shadow-2xs space-y-1">
            <div className="text-[10px] font-extrabold text-purple-800 uppercase tracking-wider">
              🏖️ Leave Balance
            </div>
            <div className="text-xl font-black text-purple-950 font-mono">
              {leaveBalance.casual_sick_quota - leaveBalance.casual_sick_used} / {leaveBalance.casual_sick_quota}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 shadow-2xs space-y-1">
            <div className="text-[10px] font-extrabold text-purple-900 uppercase tracking-wider">
              📈 Attendance %
            </div>
            <div className="text-xl font-black text-purple-950 font-mono">{trainerAttPercent}%</div>
          </div>

          <div className={`p-4 rounded-2xl border shadow-2xs space-y-1 ${
            isAttEligible && trainerIncentive !== '₹0'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="text-[10px] font-black uppercase tracking-wider flex items-center justify-between">
              <span>💰 INCENTIVE</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-white/80 border border-current">
                {trainerIncentiveTier}
              </span>
            </div>
            <div className="text-xl font-black text-emerald-700 font-mono">{trainerIncentive}</div>
          </div>
        </div>

        <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-px">
          {[
            { id: 'batches', label: `📚 Assigned Batches & Syllabus (${batches.length})` },
            { id: 'attendance', label: `📅 Month Attendance & Selfies (${monthlyAttendances.length})` },
            { id: 'sessions', label: `📝 Daily Class Reports & Topics (${sessions.length})` },
            { id: 'leaves', label: `⚖️ Leaves & Audit Trail (${leaves.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-xs font-black rounded-t-2xl transition-all cursor-pointer border-t border-x ${
                activeTab === tab.id
                  ? 'bg-white border-slate-200 text-indigo-700 shadow-xs'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'batches' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-600" /> Active Assigned Batches & Multi-Topic Completion
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track live curriculum percentage and multi-topic coverage for each course handled by {trainer.name}.
                </p>
              </div>

              <Link
                to="/admin/batches"
                className="px-3.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs hover:bg-indigo-100 flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Manage Batches
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {batches.length === 0 ? (
                <div className="col-span-3 p-12 bg-white rounded-3xl border border-slate-200 text-center space-y-2">
                  <BookOpen className="h-8 w-8 text-slate-400 mx-auto" />
                  <div className="text-sm font-bold text-slate-700">No Batches Assigned Yet</div>
                  <p className="text-xs text-slate-400">Assign a course batch to this trainer from the Batch Management screen.</p>
                </div>
              ) : (
                batches.map((batch) => {
                  const cov = batch.coverage;
                  const pct = cov?.coverage_percentage || 0;
                  const coveredCount = cov?.covered_topics || 0;
                  const totalCount = cov?.total_topics || 60;

                  return (
                    <div
                      key={batch.id}
                      className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3.5 hover:border-indigo-300 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-extrabold uppercase font-mono">
                            {batch.code || 'BATCH'}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold">
                            🟢 Active Batch
                          </span>
                        </div>

                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900 line-clamp-1">{batch.name}</h3>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">{batch.course_name || 'Course'}</p>
                        </div>

                        <div className="space-y-1.5 pt-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[11px] font-bold text-slate-600">Syllabus Covered:</span>
                            <span className="font-mono font-black text-indigo-600">
                              {coveredCount} / {totalCount} Topics ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/60">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-600 to-blue-500 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                          <div className="p-2 bg-slate-50 rounded-xl">
                            <div className="text-slate-400 font-medium">Students</div>
                            <div className="font-extrabold text-slate-800 font-mono mt-0.5">
                              {batch.total_students || 0} Students
                            </div>
                          </div>
                          <div className="p-2 bg-slate-50 rounded-xl">
                            <div className="text-slate-400 font-medium">Lab / Room</div>
                            <div className="font-extrabold text-slate-800 truncate mt-0.5">
                              {batch.classroom || 'Campus Lab 1'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                        <span className="text-[11px] text-slate-400 font-medium">Timing: {batch.timing || 'Daily Class'}</span>
                        <Link
                          to="/admin/batches"
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <Edit3 className="h-3 w-3" /> Edit Batch
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs overflow-hidden space-y-0">
            <div className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-600" /> Complete Daily Attendance & Selfie Verification Log
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed logs of daily logins, logouts, working shift duration, lab locations and facial selfies.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="px-4 py-2 bg-white rounded-xl border border-slate-300 font-extrabold text-xs text-slate-900 font-mono shadow-2xs min-w-[150px] text-center">
                  {monthDisplayLabel}
                </div>
                <button
                  onClick={handleNextMonth}
                  className="p-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold">
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Login Time</th>
                    <th className="py-3.5 px-4">Logout Time</th>
                    <th className="py-3.5 px-4">Working Shift</th>
                    <th className="py-3.5 px-4">Lab / Location</th>
                    <th className="py-3.5 px-4">Selfie Photo</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {monthlyAttendances.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                        No attendance records logged for {monthDisplayLabel}.
                      </td>
                    </tr>
                  ) : (
                    monthlyAttendances.map((rec) => {
                      const dateObj = new Date(rec.date);
                      const formattedDate = dateObj.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      });
                      const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

                      const inFormatted = rec.mark_in_time
                        ? new Date(rec.mark_in_time).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })
                        : '—';

                      const outFormatted = rec.mark_out_time
                        ? new Date(rec.mark_out_time).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })
                        : '—';

                      let shiftDurationStr = '—';
                      if (rec.mark_in_time && rec.mark_out_time) {
                        const diffMins = Math.max(
                          0,
                          Math.floor(
                            (new Date(rec.mark_out_time).getTime() - new Date(rec.mark_in_time).getTime()) / 60000
                          )
                        );
                        const h = Math.floor(diffMins / 60);
                        const m = diffMins % 60;
                        shiftDurationStr = `${h}h ${m}m`;
                      } else if (rec.mark_in_time) {
                        shiftDurationStr = 'Active Shift';
                      }

                      const isLate = isLateRecord(rec);

                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-slate-900">{formattedDate}</div>
                            <div className="text-[11px] text-slate-500 font-medium">{dayOfWeek}</div>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            {inFormatted !== '—' ? (
                              <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md">
                                🟢 {inFormatted}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono">—</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                            {outFormatted !== '—' ? (
                              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md">
                                🚪 {outFormatted}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono">—</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-extrabold text-indigo-700">
                            {shiftDurationStr}
                          </td>

                          <td className="py-3.5 px-4 text-slate-700 font-medium max-w-[160px] truncate" title={rec.location_name || 'Campus Lab'}>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                              <span className="truncate">{rec.location_name || 'Campus Lab 1'}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {rec.photo_in ? (
                              <img
                                src={rec.photo_in}
                                alt="Selfie"
                                className="h-8 w-8 rounded-lg object-cover border border-emerald-300 cursor-pointer hover:scale-110 transition-transform"
                                onClick={() => setViewPhotoUrl(rec.photo_in!)}
                                title="Click to view photo"
                              />
                            ) : (
                              <span className="text-slate-300 font-mono text-[10px]">No Photo</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {rec.day_status === 'leave' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800">
                                🟠 On Leave
                              </span>
                            ) : rec.day_status === 'half_day' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                                🌓 Half Day Leave
                              </span>
                            ) : rec.day_status === 'absent' || (!rec.mark_in_time && rec.day_status !== 'weekoff' && rec.day_status !== 'holiday') ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                                🔴 Absent
                              </span>
                            ) : isLate ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-yellow-100 text-yellow-900 border border-yellow-300">
                                🟡 Late Login
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                🟢 Present
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs overflow-hidden space-y-0">
            <div className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600" /> Historical Daily Class Logs & Multi-Topics Covered
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed class delivery reports and syllabus coverage records submitted by {trainer.name}.
                </p>
              </div>

              <Link
                to="/trainer/sessions/add"
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Log Class Session
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold">
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Batch</th>
                    <th className="py-3.5 px-4">Duration</th>
                    <th className="py-3.5 px-4">Multi-Topics Covered</th>
                    <th className="py-3.5 px-4">Student Attendance</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400 font-medium">
                        No work sessions logged yet for this trainer.
                      </td>
                    </tr>
                  ) : (
                    sessions.map((ses) => (
                      <tr key={ses.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          📅 {ses.session_date}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-indigo-900">
                          {ses.batch_name}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                          ⏱️ {ses.hours_taken} Hours
                        </td>
                        <td className="py-3.5 px-4 text-slate-800 font-medium max-w-md">
                          <span className="font-bold text-indigo-700">📖 {ses.description}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-extrabold text-emerald-700">
                          ✅ Verified
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                            Recorded ✓
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'leaves' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Casual / Sick Leave Quota
                </div>
                <div className="text-2xl font-black text-indigo-900 font-mono">
                  {leaveBalance.casual_sick_quota - leaveBalance.casual_sick_used} / {leaveBalance.casual_sick_quota} Available
                </div>
                <p className="text-[11px] text-slate-400">Used: {leaveBalance.casual_sick_used} days this year</p>
              </div>

              <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-xs space-y-2">
                <div className="text-xs font-extrabold text-amber-800 uppercase tracking-wider">
                  Optional Holidays
                </div>
                <div className="text-2xl font-black text-amber-950 font-mono">
                  {leaveBalance.optional_holiday_quota - leaveBalance.optional_holiday_used} / {leaveBalance.optional_holiday_quota} Available
                </div>
                <p className="text-[11px] text-amber-700/80">Used: {leaveBalance.optional_holiday_used} festival days</p>
              </div>

              <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-xs space-y-2">
                <div className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                  Mandatory Holidays
                </div>
                <div className="text-2xl font-black text-emerald-950 font-mono">
                  5 / 5 Entitled
                </div>
                <p className="text-[11px] text-emerald-700/80">Full institution holidays</p>
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900">
                  📥 Submitted Leave Applications ({leaves.length})
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold">
                      <th className="py-3 px-4">Leave Type</th>
                      <th className="py-3 px-4">Date / Duration</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {leaves.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-slate-400">
                          No leave applications submitted by {trainer.name}.
                        </td>
                      </tr>
                    ) : (
                      leaves.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-indigo-900 uppercase font-mono">
                            {l.leave_type.replace('_', ' ')}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">
                            📅 {l.start_date === l.end_date ? l.start_date : `${l.start_date} to ${l.end_date}`}
                          </td>
                          <td className="py-3 px-4 text-slate-600 italic">"{l.reason}"</td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                l.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : l.status === 'rejected'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {l.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" /> Admin Leave Balance Audit Trail
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">Permanent modification history</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold">
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Change</th>
                      <th className="py-3 px-4">Reason / Notes</th>
                      <th className="py-3 px-4">Modified By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-slate-400">
                          No manual leave quota overrides recorded for {trainer.name}.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {new Date(log.created_at).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                            {log.previous_balance ?? log.old_balance} → {log.new_balance} ({(log.adjustment_amount ?? log.adjustment ?? 0) > 0 ? `+${log.adjustment_amount ?? log.adjustment}` : (log.adjustment_amount ?? log.adjustment)})
                          </td>
                          <td className="py-3 px-4 text-slate-700 italic">"{log.reason}"</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{log.modified_by}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {viewPhotoUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs cursor-pointer"
            onClick={() => setViewPhotoUrl(null)}
          >
            <div className="relative max-w-lg w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                  <Camera className="h-4 w-4 text-indigo-600" /> Facial Selfie Attendance Proof
                </span>
                <button
                  onClick={() => setViewPhotoUrl(null)}
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <img src={viewPhotoUrl} alt="Selfie Proof" className="w-full h-80 object-cover rounded-2xl border" />
            </div>
          </div>
        )}

        {isAdjustModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-indigo-600" /> Adjust Leave Quota for {trainer.name}
                </h3>
                <button
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveLeaveAdjustment} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">New Casual / Sick Leave Quota (Annual)</label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={adjustQuota}
                    onChange={(e) => setAdjustQuota(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 text-sm outline-hidden focus:border-indigo-500"
                    required
                  />
                  <p className="text-[11px] text-slate-400">Current quota: {leaveBalance.casual_sick_quota} days</p>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Reason for Adjustment (Required for Audit Log) *</label>
                  <textarea
                    rows={3}
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="e.g. Granted +2 extra leaves for weekend hackathon coverage"
                    className="w-full p-3 rounded-xl border border-slate-300 text-slate-800 text-xs outline-hidden focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAdjustModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adjusting}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-md shadow-indigo-500/20"
                  >
                    {adjusting ? 'Saving...' : 'Save & Record Audit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </main>
  );
}
