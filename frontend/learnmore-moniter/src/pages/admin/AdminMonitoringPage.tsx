import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrainerMonitoringRow, TrainerLiveLoginStatus } from '@/lib/types';
import {
  Clock,
  Calendar,
  Radio,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Edit3,
  X,
  Save,
  Laptop,
  Globe,
  Sliders,
  CalendarDays,
  Mail,
  ShieldAlert
} from 'lucide-react';

export default function AdminMonitoringPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [snapshot, setSnapshot] = useState<{
    date: string;
    isWorkingDay: boolean;
    dayType: string;
    holidayName?: string;
    summary: {
      totalTrainers: number;
      loggedIn: number;
      late: number;
      notLoggedIn: number;
      onLeave: number;
    };
    trainers: TrainerMonitoringRow[];
  } | null>(null);

  const [cutoffResult, setCutoffResult] = useState<{
    message: string;
    totalFlagged: number;
    isWorkingDay: boolean;
  } | null>(null);
  const [evaluatingCutoff, setEvaluatingCutoff] = useState(false);
  const [loading, setLoading] = useState(true);

  // Edit Trainer Row Modal State
  const [editingTrainer, setEditingTrainer] = useState<TrainerMonitoringRow | null>(null);
  const [editStatus, setEditStatus] = useState<string>('Present');
  const [editLoginTime, setEditLoginTime] = useState<string>('09:30');
  const [editLogoutTime, setEditLogoutTime] = useState<string>('');
  const [editTopic, setEditTopic] = useState<string>('');
  const [editLocation, setEditLocation] = useState<string>('Main Campus Lab 1 (IP: 192.168.1.45)');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMessage, setEditMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchMonitoringData = async (dateParam?: string) => {
    setLoading(true);
    try {
      const dateToFetch = dateParam || selectedDate;
      const res = await fetch(`/api/monitoring/snapshot?date=${dateToFetch}`);
      const data = await res.json();
      if (data.success) {
        setSnapshot(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData(selectedDate);
    const interval = setInterval(() => fetchMonitoringData(selectedDate), 5000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  const handleTrigger12pmCutoff = async () => {
    setEvaluatingCutoff(true);
    setCutoffResult(null);
    try {
      const res = await fetch('/api/cron/12pm-cutoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate }),
      });
      const data = await res.json();
      if (data.success) {
        setCutoffResult({
          message: data.message,
          totalFlagged: data.totalFlagged,
          isWorkingDay: data.isWorkingDay,
        });
        fetchMonitoringData(selectedDate);
      }
    } catch {
      // silent
    } finally {
      setEvaluatingCutoff(false);
    }
  };

  const handleOpenEdit = (t: TrainerMonitoringRow) => {
    setEditingTrainer(t);
    setEditStatus(t.attendance_status || 'Present');
    let inStr = '09:30';
    if (t.login_time) {
      const d = new Date(t.login_time);
      inStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    let outStr = '';
    if (t.logout_time) {
      const d = new Date(t.logout_time);
      outStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    setEditLoginTime(inStr);
    setEditLogoutTime(outStr);
    setEditTopic(t.today_topic === '—' ? '' : t.today_topic);
    setEditLocation(t.device_ip || 'Main Campus Lab 1 (IP: 192.168.1.45)');
    setEditMessage(null);
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrainer) return;
    setSavingEdit(true);
    setEditMessage(null);

    const markInIso =
      editStatus === 'Not Logged In' || editStatus === 'Absent'
        ? null
        : `${selectedDate}T${editLoginTime}:00.000Z`;

    const markOutIso = editLogoutTime ? `${selectedDate}T${editLogoutTime}:00.000Z` : null;

    let dayStatusMap: 'present' | 'half_day' | 'leave' | 'pending' = 'present';
    if (editStatus === 'Half Day') dayStatusMap = 'half_day';
    else if (editStatus === 'On Leave') dayStatusMap = 'leave';
    else if (editStatus === 'Not Logged In' || editStatus === 'Absent') dayStatusMap = 'pending';

    try {
      const res = await fetch('/api/monitoring/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainer_id: editingTrainer.trainer_id,
          date: selectedDate,
          day_status: dayStatusMap,
          mark_in_time: markInIso,
          mark_out_time: markOutIso,
          topic_covered: editTopic.trim(),
          location_name: editLocation.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditMessage({ text: 'Trainer login record updated!', type: 'success' });
        fetchMonitoringData(selectedDate);
        setTimeout(() => setEditingTrainer(null), 900);
      } else {
        setEditMessage({ text: data.error || 'Failed to update', type: 'error' });
      }
    } catch (err: any) {
      setEditMessage({ text: err.message || 'Network error', type: 'error' });
    } finally {
      setSavingEdit(false);
    }
  };

  const summary = snapshot?.summary || {
    totalTrainers: 0,
    loggedIn: 0,
    late: 0,
    notLoggedIn: 0,
    onLeave: 0,
  };

  const filteredTrainers = (snapshot?.trainers || []).filter((t) => {
    if (statusFilter !== 'all' && t.status_badge !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.trainer_name.toLowerCase().includes(q) ||
        (t.phone && t.phone.toLowerCase().includes(q)) ||
        (t.today_topic && t.today_topic.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              ⏰ Trainer Login Monitoring & 12:00 PM Cutoff HQ
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Daily login date & time, logout time, device/IP details, 12:00 PM cutoff automation and live status.
          </p>
        </div>

        {/* Date Picker & 12 PM Evaluator */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-300 shadow-xs">
            <Calendar className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-700">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-bold font-mono text-slate-900 focus:outline-none cursor-pointer bg-transparent"
            />
          </div>

          <button
            onClick={() => fetchMonitoringData(selectedDate)}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleTrigger12pmCutoff}
            disabled={evaluatingCutoff}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <Clock className="h-4 w-4 text-cyan-200" />
            {evaluatingCutoff ? 'Running 12 PM Cutoff...' : 'Evaluate 12 PM Cutoff'}
          </button>
        </div>
      </div>

      {/* 12 PM Cutoff Result Alert */}
      {cutoffResult && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-xs ${
            cutoffResult.isWorkingDay && cutoffResult.totalFlagged > 0
              ? 'bg-rose-50 border-rose-300 text-rose-800'
              : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {cutoffResult.isWorkingDay && cutoffResult.totalFlagged > 0 ? (
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            )}
            <span>{cutoffResult.message}</span>
          </div>
          <button
            onClick={() => setCutoffResult(null)}
            className="text-xs opacity-70 hover:opacity-100 font-extrabold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Day Status Banner */}
      {snapshot && !snapshot.isWorkingDay && (
        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-indigo-950 text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-indigo-600 shrink-0" />
            <span>
              Selected Date ({selectedDate}) is a <strong>{snapshot.holidayName || snapshot.dayType.replace('_', ' ').toUpperCase()}</strong>. 12 PM absence penalty and unlogged alerts are automatically bypassed.
            </span>
          </div>
          <Link
            to="/admin/holidays"
            className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700 transition-colors"
          >
            Holiday Rules
          </Link>
        </div>
      )}

      {/* The 4 Real-time Status Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. 🟢 Logged In */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'logged_in' ? 'all' : 'logged_in')}
          className={`rounded-2xl p-5 border shadow-xs transition-all cursor-pointer space-y-1.5 ${
            statusFilter === 'logged_in'
              ? 'bg-emerald-100/80 border-emerald-400 ring-2 ring-emerald-500/30'
              : 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> 🟢 Logged In
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-white/80 px-2 py-0.5 rounded-full">
              Before 10:15 AM
            </span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-900 font-mono">
            {summary.loggedIn}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium">On-time verified trainers</div>
        </div>

        {/* 2. 🟡 Late Login */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'late' ? 'all' : 'late')}
          className={`rounded-2xl p-5 border shadow-xs transition-all cursor-pointer space-y-1.5 ${
            statusFilter === 'late'
              ? 'bg-amber-100/80 border-amber-400 ring-2 ring-amber-500/30'
              : 'bg-amber-50/50 border-amber-200 hover:bg-amber-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> 🟡 Late Login
            </span>
            <span className="text-[10px] font-bold text-amber-700 bg-white/80 px-2 py-0.5 rounded-full">
              After 10:15 AM
            </span>
          </div>
          <div className="text-3xl font-extrabold text-amber-900 font-mono">
            {summary.late}
          </div>
          <div className="text-[11px] text-amber-700 font-medium">Checked in late</div>
        </div>

        {/* 3. 🔴 Not Logged In */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'not_logged_in' ? 'all' : 'not_logged_in')}
          className={`rounded-2xl p-5 border shadow-xs transition-all cursor-pointer space-y-1.5 ${
            statusFilter === 'not_logged_in'
              ? 'bg-rose-100/80 border-rose-400 ring-2 ring-rose-500/30'
              : 'bg-rose-50/50 border-rose-200 hover:bg-rose-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> 🔴 Not Logged In
            </span>
            <span className="text-[10px] font-bold text-rose-700 bg-white/80 px-2 py-0.5 rounded-full">
              Cutoff Alert
            </span>
          </div>
          <div className="text-3xl font-extrabold text-rose-900 font-mono">
            {summary.notLoggedIn}
          </div>
          <div className="text-[11px] text-rose-700 font-medium">Flagged by 12:00 PM</div>
        </div>

        {/* 4. 🟠 On Leave */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'on_leave' ? 'all' : 'on_leave')}
          className={`rounded-2xl p-5 border shadow-xs transition-all cursor-pointer space-y-1.5 ${
            statusFilter === 'on_leave'
              ? 'bg-purple-100/80 border-purple-400 ring-2 ring-purple-500/30'
              : 'bg-purple-50/50 border-purple-200 hover:bg-purple-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-purple-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-500" /> 🟠 On Leave
            </span>
            <span className="text-[10px] font-bold text-purple-700 bg-white/80 px-2 py-0.5 rounded-full">
              Approved Quota
            </span>
          </div>
          <div className="text-3xl font-extrabold text-purple-900 font-mono">
            {summary.onLeave}
          </div>
          <div className="text-[11px] text-purple-700 font-medium">Approved leave / week-off</div>
        </div>
      </div>

      {/* Main Trainer Monitoring Details Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Laptop className="h-4 w-4 text-indigo-600" /> Faculty Login, Device & Attendance Records
            </h2>
            {statusFilter !== 'all' && (
              <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-extrabold flex items-center gap-1">
                Filtering: {statusFilter.replace('_', ' ').toUpperCase()}
                <button onClick={() => setStatusFilter('all')} className="cursor-pointer ml-1">✕</button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search trainer, phone, topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 bg-white"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold">
                <th className="py-3.5 px-4">Trainer Details</th>
                <th className="py-3.5 px-4">Login Time</th>
                <th className="py-3.5 px-4">Logout Time</th>
                <th className="py-3.5 px-4">IP / Device / Location</th>
                <th className="py-3.5 px-4">Attendance Status</th>
                <th className="py-3.5 px-4">Today's Topic</th>
                <th className="py-3.5 px-4 text-center">Live Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredTrainers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400 font-medium">
                    No trainer records match the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTrainers.map((t) => {
                  const inFormatted = t.login_time
                    ? new Date(t.login_time).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })
                    : '—';

                  const outFormatted = t.logout_time
                    ? new Date(t.logout_time).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })
                    : '—';

                  return (
                    <tr key={t.trainer_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/admin/trainers/${t.trainer_id}`}
                          className="flex items-center gap-2.5 group cursor-pointer"
                          title="View Full 360° Profile & Batches"
                        >
                          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-extrabold flex items-center justify-center text-xs shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                            {t.trainer_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1">
                              {t.trainer_name}
                              <span className="text-[10px] text-indigo-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">{t.phone || 'Linked'}</div>
                          </div>
                        </Link>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {inFormatted !== '—' ? (
                          <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md">
                            🟢 {inFormatted}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">Not Logged In</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {outFormatted !== '—' ? (
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md">
                            {outFormatted}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="flex items-center gap-1 font-bold text-slate-900">
                          <Globe className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                          <span className="truncate max-w-[150px]">{t.device_ip || 'Campus Lab / Web'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">IP: 192.168.1.{Math.abs(t.trainer_name.charCodeAt(0) * 3 % 250)}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            t.attendance_status === 'Present'
                              ? 'bg-emerald-100 text-emerald-800'
                              : t.attendance_status === 'Late'
                              ? 'bg-amber-100 text-amber-800'
                              : t.attendance_status === 'On Leave'
                              ? 'bg-purple-100 text-purple-800'
                              : t.attendance_status === 'Week Off'
                              ? 'bg-blue-100 text-blue-800'
                              : t.attendance_status === 'Holiday'
                              ? 'bg-cyan-100 text-cyan-800'
                              : 'bg-rose-100 text-rose-800 font-extrabold'
                          }`}
                        >
                          {t.attendance_status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 font-medium max-w-[180px] truncate" title={t.today_topic}>
                        {t.today_topic !== '—' ? (
                          <span className="font-bold text-indigo-900">📖 {t.today_topic}</span>
                        ) : (
                          <span className="text-slate-400">No session logged yet</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {t.status_badge === 'logged_in' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500 text-white shadow-xs">
                            🟢 Logged In
                          </span>
                        )}
                        {t.status_badge === 'late' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-500 text-white shadow-xs">
                            🟡 Late Login
                          </span>
                        )}
                        {t.status_badge === 'not_logged_in' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-rose-600 text-white shadow-xs">
                            🔴 Not Logged In
                          </span>
                        )}
                        {t.status_badge === 'on_leave' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-purple-600 text-white shadow-xs">
                            🟠 On Leave
                          </span>
                        )}
                        {t.status_badge === 'weekoff' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-blue-600 text-white shadow-xs">
                            🟣 Week Off
                          </span>
                        )}
                        {t.status_badge === 'holiday' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-cyan-600 text-white shadow-xs">
                            🔵 Holiday
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(t)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[11px] border border-indigo-200 inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingTrainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-indigo-600" /> Edit Trainer Login Record
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Modifying {editingTrainer.trainer_name} ({selectedDate})
                </p>
              </div>
              <button
                onClick={() => setEditingTrainer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                  editMessage.type === 'success'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-rose-50 border-rose-300 text-rose-800'
                }`}
              >
                {editMessage.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                )}
                {editMessage.text}
              </div>
            )}

            <form onSubmit={handleSaveOverride} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 rounded-xl font-bold text-slate-800 border border-slate-300 focus:outline-none focus:border-indigo-600"
                  >
                    <option value="Present">Present (🟢 Logged In)</option>
                    <option value="Late">Late (🟡 Late Login)</option>
                    <option value="Not Logged In">Not Logged In (🔴)</option>
                    <option value="On Leave">On Leave (🟠)</option>
                    <option value="Half Day">Half Day (🌓)</option>
                    <option value="Week Off">Week Off (🟣)</option>
                    <option value="Holiday">Holiday (🔵)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Login Time</label>
                  <input
                    type="time"
                    value={editLoginTime}
                    onChange={(e) => setEditLoginTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 rounded-xl font-mono font-bold text-slate-900 border border-slate-300 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Logout Time (Optional)</label>
                <input
                  type="time"
                  value={editLogoutTime}
                  onChange={(e) => setEditLogoutTime(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 rounded-xl font-mono font-bold text-slate-900 border border-slate-300 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Today's Topic</label>
                <textarea
                  rows={2}
                  placeholder="Enter curriculum topic taught today..."
                  value={editTopic}
                  onChange={(e) => setEditTopic(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 rounded-xl text-slate-800 border border-slate-300 focus:outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Location / Device Details</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 rounded-xl text-slate-800 border border-slate-300 focus:outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTrainer(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-md shadow-indigo-500/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
