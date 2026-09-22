import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TeacherStatusCard from '@/components/TeacherStatusCard';
import { getStoredUser } from '@/lib/auth';
import { User, Batch, Leave, TrainerMonitoringRow, TopicCoverageProgress, WorkSession } from '@/lib/types';
import {
  Package,
  Users,
  Plus,
  Calendar,
  FileBarChart2,
  BookOpen,
  Activity,
  AlertTriangle,
  Radio,
  ArrowRight,
  Clock,
  CalendarDays,
  CheckCircle2,
  Edit3,
  X,
  ShoppingBag,
  Check,
  UserX,
  Coffee,
  ChevronRight,
  Save,
  Sliders,
  MessageSquare,
  TrendingUp,
  Camera,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [liveActivities, setLiveActivities] = useState<any[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [topicCoverages, setTopicCoverages] = useState<TopicCoverageProgress[]>([]);
  const [monitoringSnapshot, setMonitoringSnapshot] = useState<{
    date: string;
    isWorkingDay: boolean;
    dayType: string;
    holidayName?: string;
    summary: { total: number; present: number; late: number; notLoggedIn: number; onLeave: number; };
    trainers: TrainerMonitoringRow[];
  } | null>(null);
  const [cutoffResult, setCutoffResult] = useState<{
    message: string; totalFlagged: number; isWorkingDay: boolean;
  } | null>(null);
  const [evaluatingCutoff, setEvaluatingCutoff] = useState(false);
  const [loading, setLoading] = useState(true);

  // Edit modal state
  const [editingTrainer, setEditingTrainer] = useState<TrainerMonitoringRow | null>(null);
  const [editStatus, setEditStatus] = useState<'Present'|'Late'|'Not Logged In'|'On Leave'|'Half Day'|'Week Off'|'Holiday'|'Absent'>('Present');
  const [editLoginTime, setEditLoginTime] = useState('09:30');
  const [editTopic, setEditTopic] = useState('');
  const [editLocation, setEditLocation] = useState('Main Campus Lab 1');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMessage, setEditMessage] = useState<{ text: string; type: 'success'|'error' } | null>(null);

  const fetchData = async () => {
    try {
      const [actRes, batRes, leaveRes, sesRes, monRes, covRes] = await Promise.all([
        fetch('/api/live-activity'),
        fetch('/api/batches/'),
        fetch('/api/leaves'),
        fetch('/api/sessions'),
        fetch('/api/monitoring/snapshot'),
        fetch('/api/topics/coverage'),
      ]);
      const [actData, batData, leaveData, sesData, monData, covData] = await Promise.all([
        actRes.json().catch(() => ({})),
        batRes.json().catch(() => ({})),
        leaveRes.json().catch(() => ({})),
        sesRes.json().catch(() => ({})),
        monRes.json().catch(() => ({})),
        covRes.json().catch(() => ({})),
      ]);

      const actList = Array.isArray(actData) ? actData : (actData?.activities || []);
      setLiveActivities(actList);

      const batList = Array.isArray(batData) ? batData : (batData?.batches || []);
      setBatches(batList);

      const leaveList = Array.isArray(leaveData) ? leaveData : (leaveData?.leaves || []);
      setLeaves(leaveList);

      const sesList = Array.isArray(sesData) ? sesData : (sesData?.sessions || []);
      setSessions(sesList);

      if (monData && (monData.summary || monData.trainers)) {
        setMonitoringSnapshot(monData);
      }

      const covList = Array.isArray(covData) ? covData : (covData?.coverages || []);
      setTopicCoverages(covList);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  useEffect(() => {
    const u = getStoredUser();
    if (!u) { navigate('/login', { replace: true }); return; }
    if (u.role !== 'admin') { navigate('/trainer/dashboard', { replace: true }); return; }
    setUser(u);
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handleAssignTask = async (trainerId: string, taskTitle: string) => {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', trainer_id: trainerId, title: taskTitle, category: 'other' }),
    });
    fetchData();
  };

  const handleTrigger12pmCutoff = async () => {
    setEvaluatingCutoff(true);
    setCutoffResult(null);
    try {
      const res  = await fetch('/api/cron/12pm-cutoff', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setCutoffResult({ message: data.message, totalFlagged: data.totalFlagged, isWorkingDay: data.isWorkingDay });
        fetchData();
      }
    } catch { /* silent */ } finally { setEvaluatingCutoff(false); }
  };

  const handleOpenEditModal = (t: TrainerMonitoringRow) => {
    setEditingTrainer(t);
    setEditStatus((t.attendance_status as any) || 'Present');
    let timeStr = '09:30';
    if (t.login_time) {
      const d = new Date(t.login_time);
      timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }
    setEditLoginTime(timeStr);
    setEditTopic(t.today_topic === '—' ? '' : t.today_topic);
    setEditLocation(t.device_ip || 'Main Campus Lab 1');
    setEditMessage(null);
  };

  const handleSaveTrainerOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrainer) return;
    setSavingEdit(true);
    setEditMessage(null);
    const todayStr = monitoringSnapshot?.date || new Date().toISOString().split('T')[0];
    const markInIso = editStatus === 'Not Logged In' || editStatus === 'Absent'
      ? null : `${todayStr}T${editLoginTime}:00.000Z`;
    let dayStatusMap: 'present'|'half_day'|'leave'|'pending' = 'present';
    if (editStatus === 'Half Day')     dayStatusMap = 'half_day';
    else if (editStatus === 'On Leave') dayStatusMap = 'leave';
    else if (editStatus === 'Not Logged In' || editStatus === 'Absent') dayStatusMap = 'pending';
    try {
      const res  = await fetch('/api/monitoring/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainer_id: editingTrainer.trainer_id, date: todayStr,
          day_status: dayStatusMap, mark_in_time: markInIso,
          topic_covered: editTopic.trim(), location_name: editLocation.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditMessage({ text: 'Trainer record updated successfully.', type: 'success' });
        fetchData();
        setTimeout(() => setEditingTrainer(null), 900);
      } else {
        setEditMessage({ text: data.error || 'Update failed.', type: 'error' });
      }
    } catch (err: any) {
      setEditMessage({ text: err.message || 'Network error', type: 'error' });
    } finally { setSavingEdit(false); }
  };

  const activeBatchesCount  = batches.filter((b) => b.is_active && !b.is_completed).length;
  const totalBatchesCount   = batches.length;
  const pendingLeavesCount  = leaves.filter((l) => l.status === 'pending').length;
  const idleTrainers = liveActivities.filter(
    (t) => t.activity?.status === 'idle' &&
      (t.activity?.idle_minutes_current >= 1 || t.activity?.total_idle_today_minutes > 0)
  );
  const monSummary = monitoringSnapshot?.summary || { total:0, present:0, late:0, notLoggedIn:0, onLeave:0 };

  /* ── Attendance status → style map ─────────────── */
  const attStyle = (status: string) => {
    const map: Record<string, { bg: string; color: string; border: string }> = {
      'Present':       { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' },
      'Late':          { bg: '#fffbeb', color: '#92400e', border: '#fcd34d' },
      'On Leave':      { bg: '#f5f3ff', color: '#5b21b6', border: '#ddd6fe' },
      'Week Off':      { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
      'Holiday':       { bg: '#ecfeff', color: '#155e75', border: '#a5f3fc' },
      'Not Logged In': { bg: '#fff1f2', color: '#9f1239', border: '#fecdd3' },
      'Half Day':      { bg: '#fff7ed', color: '#9a3412', border: '#fed7aa' },
      'Absent':        { bg: '#fff1f2', color: '#9f1239', border: '#fecdd3' },
    };
    return map[status] || { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
  };

  const liveStyle = (badge: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      'logged_in':    { bg: '#059669', color: '#fff' },
      'late':         { bg: '#d97706', color: '#fff' },
      'not_logged_in':{ bg: '#dc2626', color: '#fff' },
      'on_leave':     { bg: '#7c3aed', color: '#fff' },
      'weekoff':      { bg: '#2563eb', color: '#fff' },
      'holiday':      { bg: '#0891b2', color: '#fff' },
    };
    return map[badge] || { bg: '#64748b', color: '#fff' };
  };

  const liveLabel = (badge: string) => {
    const map: Record<string, string> = {
      'logged_in': 'Logged In', 'late': 'Late',
      'not_logged_in': 'Not Logged In', 'on_leave': 'On Leave',
      'weekoff': 'Week Off', 'holiday': 'Holiday',
    };
    return map[badge] || badge;
  };

  /* ── KPI card config ────────────────────────────── */
  const kpiCards = [
    {
      label: 'Active Batches', href: '/admin/batches',
      value: `${activeBatchesCount} / ${totalBatchesCount}`,
      sub: 'Running now',
      accent: '#2563eb', bg: '#eff6ff',
      icon: <ShoppingBag className="h-4 w-4" style={{ color: '#2563eb' }} />,
    },
    {
      label: 'Logged In',
      value: `${(monSummary as any).loggedIn ?? monSummary.present} / ${(monSummary as any).totalTrainers ?? monSummary.total}`,
      sub: 'On-time check-in',
      accent: '#059669', bg: '#ecfdf5',
      icon: <Check className="h-4 w-4 stroke-[2.5]" style={{ color: '#059669' }} />,
    },
    {
      label: 'Late Login',
      value: String(monSummary.late),
      sub: 'After 08:15 AM',
      accent: '#d97706', bg: '#fffbeb',
      icon: <Clock className="h-4 w-4" style={{ color: '#d97706' }} />,
    },
    {
      label: 'Not Logged In',
      value: String(monSummary.notLoggedIn),
      sub: 'Past 12:30 PM',
      accent: '#dc2626', bg: '#fff1f2',
      icon: <UserX className="h-4 w-4" style={{ color: '#dc2626' }} />,
    },
    {
      label: 'Idle Faculty',
      value: String(idleTrainers.length),
      sub: 'Need attention',
      accent: '#2563eb', bg: '#eff6ff',
      icon: <Coffee className="h-4 w-4" style={{ color: '#2563eb' }} />,
    },
    {
      label: 'Pending Leaves', href: '/admin/leaves',
      value: String(pendingLeavesCount),
      sub: 'Awaiting approval',
      accent: '#7c3aed', bg: '#f5f3ff',
      icon: <CalendarDays className="h-4 w-4" style={{ color: '#7c3aed' }} />,
    },
  ];

  return (
    <main className="flex-1 w-full p-5 sm:p-7 lg:p-8 space-y-7 max-w-[1600px] mx-auto">

      {/* ── Page header ───────────────────────────────── */}
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Institute Director Dashboard
            </h1>
          </div>
          <p className="text-sm text-slate-500 max-w-2xl" style={{ fontWeight: 400 }}>
            Real-time faculty radar, attendance automation, batch delivery tracking and leave management.
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          {[
            { to: '/admin/batches',    label: 'New Batch',      icon: <Plus className="h-3.5 w-3.5" />,         style: { background: '#7c3aed', color: '#fff' } },
            { to: '/admin/trainers',   label: 'Add Trainer',    icon: <Users className="h-3.5 w-3.5" />,        style: { background: '#4f46e5', color: '#fff' } },
            { to: '/admin/attendance', label: 'Attendance',     icon: <Camera className="h-3.5 w-3.5" />,       style: { background: '#059669', color: '#fff' } },
            { to: '/admin/trainer-timeline', label: 'Timeline', icon: <Activity className="h-3.5 w-3.5" />, style: { background: '#2563eb', color: '#fff' } },
            { to: '/admin/reports',    label: 'Reports',        icon: <FileBarChart2 className="h-3.5 w-3.5" />, style: { background: '#d97706', color: '#fff' } },
            { to: '/admin/whatsapp',   label: 'WhatsApp Hub',   icon: <MessageSquare className="h-3.5 w-3.5" />, style: { background: '#16a34a', color: '#fff' } },
          ].map((btn) => (
            <Link
              key={btn.to}
              to={btn.to}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all interactive"
              style={{ ...btn.style, boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}
            >
              {btn.icon}
              {btn.label}
            </Link>
          ))}

          {/* Leaves with badge */}
          <Link
            to="/admin/leaves"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all interactive"
            style={{ background: '#6d28d9', color: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}
          >
            <CalendarDays className="h-3.5 w-3.5" /> Leaves
            {pendingLeavesCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black"
                    style={{ background: 'rgba(0,0,0,0.25)' }}>
                {pendingLeavesCount}
              </span>
            )}
          </Link>

          {/* 12 PM cutoff */}
          <button
            onClick={handleTrigger12pmCutoff}
            disabled={evaluatingCutoff}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all interactive cursor-pointer disabled:opacity-60"
            style={{ background: '#0f172a', color: '#93c5fd', border: '1px solid rgba(37,99,235,0.25)', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}
          >
            <Clock className="h-3.5 w-3.5" />
            {evaluatingCutoff ? 'Checking…' : 'Evaluate 12 PM Cutoff'}
          </button>
        </div>
      </div>

      {/* ── Cutoff result banner ─────────────────────── */}
      {cutoffResult && (
        <div className="flex items-center justify-between p-4 rounded-xl text-sm font-medium"
             style={cutoffResult.isWorkingDay && cutoffResult.totalFlagged > 0
               ? { background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239' }
               : { background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46' }}>
          <div className="flex items-center gap-2.5">
            {cutoffResult.isWorkingDay && cutoffResult.totalFlagged > 0
              ? <AlertTriangle className="h-4 w-4 shrink-0" />
              : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            <span className="text-xs">{cutoffResult.message}</span>
          </div>
          <button onClick={() => setCutoffResult(null)}
                  className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── KPI cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((card) => {
          const inner = (
            <div className="pro-card p-4 h-full flex flex-col justify-between gap-3 group"
                 style={{ borderLeft: `3px solid ${card.accent}` }}>
              <div className="flex items-start justify-between gap-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {card.label}
                </div>
                <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                     style={{ background: card.bg }}>
                  {card.icon}
                </div>
              </div>
              <div>
                <div className="text-2xl font-black font-mono tracking-tight"
                     style={{ color: card.accent }}>
                  {card.value}
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                  {card.sub}
                  {card.href && <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </div>
              </div>
            </div>
          );
          return card.href ? (
            <Link key={card.label} to={card.href} className="block h-full">{inner}</Link>
          ) : (
            <div key={card.label}>{inner}</div>
          );
        })}
      </div>

      {/* ── Live faculty radar ───────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="section-title">
              <Activity className="h-4 w-4 text-blue-600" />
              Live Faculty Radar
            </div>
            <div className="section-subtitle">Real-time activity monitoring across all trainers</div>
          </div>
          <Link to="/admin/live-monitor"
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
            Full Radar <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {liveActivities.length === 0 ? (
          <div className="pro-card p-8 text-center text-slate-400 text-sm">
            No active faculty sessions right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveActivities.map((trainer, idx) => (
              <TeacherStatusCard key={trainer.id || trainer.trainer_id || idx} trainer={trainer} onAssignTask={handleAssignTask} />
            ))}
          </div>
        )}
      </section>

      {/* ── Monitoring table ─────────────────────────── */}
      <section className="pro-card overflow-hidden">
        {/* Table header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4"
             style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div className="section-title">
              <Radio className="h-4 w-4 text-rose-500 animate-pulse" />
              Live Trainer Attendance Tracker
            </div>
            <div className="section-subtitle">
              Click <strong>Edit</strong> on any row to override login time, status or topic.
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/leaves"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                  style={{ border: '1px solid var(--border)' }}>
              Leave Overrides
            </Link>
            <Link to="/admin/holidays"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-50"
                  style={{ background: '#eef2ff', border: '1px solid #c7d2fe' }}>
              Holiday Rules
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="pro-table">
            <thead>
              <tr>
                {['Trainer', 'Login Time', 'Attendance', "Today's Topic", 'Leave Quota', 'Incentive', 'Live Status', ''].map((h) => (
                  <th key={h} className={h === '' ? 'text-right' : h === 'Incentive' || h === 'Live Status' ? 'text-center' : ''}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!monitoringSnapshot || !Array.isArray(monitoringSnapshot.trainers) || monitoringSnapshot.trainers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 text-xs">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 rounded-full border-2 border-slate-200 border-t-slate-400 animate-spin" />
                        Loading trainer snapshot…
                      </div>
                    ) : 'No trainers registered or logged in yet.'}
                  </td>
                </tr>
              ) : (
                monitoringSnapshot.trainers.map((t, idx) => {
                  const loginFormatted = t.login_time
                    ? new Date(t.login_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : '—';
                  const aStyle = attStyle(t.attendance_status);
                  const lStyle = liveStyle(t.status_badge);
                  const safeName = t.trainer_name || 'Trainer';

                  return (
                    <tr key={t.trainer_id || idx}>
                      {/* Trainer */}
                      <td>
                        <Link to={`/admin/trainers/${t.trainer_id}`}
                              className="flex items-center gap-2.5 group w-fit">
                          <div className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 group-hover:scale-105 transition-transform"
                               style={{ background: 'linear-gradient(135deg, #4f46e5, #2563eb)' }}>
                            {safeName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors text-xs">
                              {safeName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{t.phone || 'Linked'}</div>
                          </div>
                        </Link>
                      </td>

                      {/* Login time */}
                      <td className="font-mono font-semibold text-slate-700">{loginFormatted}</td>

                      {/* Attendance badge */}
                      <td>
                        <span className="badge"
                              style={{ background: aStyle.bg, color: aStyle.color, border: `1px solid ${aStyle.border}` }}>
                          {t.attendance_status}
                        </span>
                      </td>

                      {/* Topic */}
                      <td className="max-w-[200px]">
                        {t.today_topic !== '—' ? (
                          <span className="font-semibold text-indigo-800 truncate block" title={t.today_topic}>
                            {t.today_topic}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No session logged</span>
                        )}
                      </td>

                      {/* Leave quota */}
                      <td>
                        <span className="px-2 py-0.5 rounded-md font-mono font-semibold text-slate-600 text-[11px]"
                              style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                          {t.leave_balance_display}
                        </span>
                      </td>

                      {/* Incentive */}
                      <td className="text-center">
                        {(t.trainer_id === 'usr_trainer_1' || safeName.toLowerCase().includes('rahul')) ? (
                          <span className="badge badge-emerald">🏆 ₹2,000</span>
                        ) : (t.trainer_id === 'usr_trainer_2' || safeName.toLowerCase().includes('priya')) ? (
                          <span className="badge badge-emerald">₹1,000</span>
                        ) : (
                          <span className="badge badge-slate">₹0 Base</span>
                        )}
                      </td>

                      {/* Live status */}
                      <td className="text-center">
                        {t.status_badge && (
                          <span className="badge"
                                style={{ background: lStyle.bg, color: lStyle.color, border: 'none' }}>
                            {liveLabel(t.status_badge)}
                          </span>
                        )}
                      </td>

                      {/* Edit */}
                      <td className="text-right">
                        <button
                          onClick={() => handleOpenEditModal(t)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all hover:bg-indigo-50 interactive"
                          style={{ background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }}
                        >
                          <Edit3 className="h-3 w-3" /> Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Topic coverage section ───────────────────── */}
      <section className="pro-card p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between pb-4"
             style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <div className="section-title">
              <BookOpen className="h-4 w-4 text-indigo-600" />
              Batch Syllabus Completion
            </div>
            <div className="section-subtitle">Real-time topic coverage across active course batches</div>
          </div>
          <Link to="/admin/batches"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50"
                style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <Edit3 className="h-3.5 w-3.5" /> Manage Batches
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topicCoverages.length === 0 ? (
            <div className="col-span-3 text-center py-8 text-slate-400 text-xs">
              No active batch topic data available.
            </div>
          ) : (
            topicCoverages.slice(0, 6).map((cov) => (
              <div key={cov.batch_id}
                   className="p-4 rounded-xl space-y-3 transition-all hover:border-indigo-200"
                   style={{ background: '#f8fafc', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs text-slate-800 truncate" title={cov.batch_name}>
                    {cov.batch_name}
                  </span>
                  <span className="font-mono text-xs font-bold text-indigo-600 shrink-0">
                    {cov.coverage_percentage}%
                  </span>
                </div>

                <div className="progress-track">
                  <div className="progress-fill"
                       style={{
                         width: `${cov.coverage_percentage}%`,
                         background: `linear-gradient(90deg, #4f46e5, #2563eb)`,
                       }} />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{cov.covered_topics} / {cov.total_topics} topics · {cov.trainer_name || 'Faculty'}</span>
                  <Link to="/admin/batches"
                        className="text-indigo-500 hover:text-indigo-700 font-semibold flex items-center gap-0.5 transition-colors">
                    Edit <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── Edit modal ───────────────────────────────── */}
      {editingTrainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)' }}>
          <div className="pro-card-elevated p-6 w-full max-w-lg space-y-5 fade-in">
            {/* Modal header */}
            <div className="flex items-start justify-between pb-4"
                 style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <div className="section-title mb-0.5">
                  <Edit3 className="h-4 w-4 text-indigo-600" />
                  Override Attendance Record
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Editing record for <strong className="text-slate-700">{editingTrainer.trainer_name}</strong>
                </p>
              </div>
              <button onClick={() => setEditingTrainer(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            {editMessage && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl text-xs font-medium"
                   style={editMessage.type === 'success'
                     ? { background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46' }
                     : { background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239' }}>
                {editMessage.type === 'success'
                  ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                  : <AlertTriangle className="h-4 w-4 shrink-0" />}
                {editMessage.text}
              </div>
            )}

            <form onSubmit={handleSaveTrainerOverride} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Attendance Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="pro-input text-xs"
                  >
                    {['Present','Late','Not Logged In','On Leave','Half Day','Week Off','Holiday'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Login Time
                  </label>
                  <input type="time" value={editLoginTime}
                         onChange={(e) => setEditLoginTime(e.target.value)}
                         className="pro-input font-mono text-xs" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Today's Topic Covered
                </label>
                <textarea rows={2}
                          placeholder="e.g. Variables, Data Types, Operators and hands-on lab exercises"
                          value={editTopic}
                          onChange={(e) => setEditTopic(e.target.value)}
                          className="pro-input text-xs resize-none" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Location / Lab Name
                </label>
                <input type="text" value={editLocation}
                       onChange={(e) => setEditLocation(e.target.value)}
                       className="pro-input text-xs" />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button type="button" onClick={() => setEditingTrainer(null)}
                        className="btn-secondary text-xs cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={savingEdit}
                        className="btn-primary text-xs cursor-pointer disabled:opacity-60">
                  <Save className="h-3.5 w-3.5" />
                  {savingEdit ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
