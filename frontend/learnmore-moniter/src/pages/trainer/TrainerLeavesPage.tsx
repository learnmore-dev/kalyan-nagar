import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredUser } from '@/lib/auth';
import { User, Leave, LeaveType } from '@/lib/types';
import { OPTIONAL_HOLIDAYS_2026, CASUAL_LEAVE_LIMIT_PER_MONTH, OPTIONAL_HOLIDAY_LIMIT_PER_YEAR } from '@/lib/holidays';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  AlertCircle,
  Calendar
} from 'lucide-react';

export default function TrainerLeavesPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [leaveType, setLeaveType] = useState<LeaveType>('casual');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [selectedOptionalHoliday, setSelectedOptionalHoliday] = useState<string>('');

  const fetchLeaves = async (userId: string) => {
    try {
      const res = await fetch(`/api/leaves?trainer_id=${userId}`);
      const data = await res.json();
      if (data.success) {
        setLeaves(data.leaves || []);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      navigate('/login', { replace: true });
      return;
    }
    setUser(u);
    fetchLeaves(u.id);
  }, [navigate]);

  const handleLeaveTypeChange = (type: LeaveType) => {
    setLeaveType(type);
    if (type === 'weekoff') {
      setReason('Today is my weekoff');
    } else if (reason === 'Today is my weekoff') {
      setReason('');
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setMessage(null);

    let finalStart = startDate;
    let finalEnd = endDate;
    let finalReason = reason;

    if (leaveType === 'optional_holiday' && selectedOptionalHoliday) {
      finalStart = selectedOptionalHoliday;
      finalEnd = selectedOptionalHoliday;
      const h = OPTIONAL_HOLIDAYS_2026.find((x) => x.date === selectedOptionalHoliday);
      if (h) {
        finalReason = `Optional Holiday: ${h.name}. ${reason}`;
      }
    }

    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainer_id: user.id,
          leave_type: leaveType,
          start_date: finalStart,
          end_date: finalEnd,
          reason: finalReason,
        }),
      });

      const data = await res.json();
      if (res.ok && (data.success || data.id)) {
        setMessage({ text: 'Leave applied successfully!', type: 'success' });
        setReason('');
        fetchLeaves(user.id);
      } else {
        setMessage({ text: data.error || data.detail || 'Failed to apply leave', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Network error', type: 'error' });
    }
  };

  const casualLeavesUsedThisMonth = leaves.filter((l) => {
    if (l.leave_type !== 'casual' || l.status === 'rejected') return false;
    const d = new Date(l.start_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const optionalHolidaysUsedThisYear = leaves.filter((l) => {
    if (l.leave_type !== 'optional_holiday' || l.status === 'rejected') return false;
    const d = new Date(l.start_date);
    return d.getFullYear() === new Date().getFullYear();
  }).length;

  if (!user) return null;

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <CalendarDays className="h-7 w-7 text-indigo-600" /> Apply Leave & 2026 Holiday Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Submit casual, medical, or festival optional leaves with instant policy tracking.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs">
              👨‍🏫 {user?.name || 'Trainer'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl p-5 bg-white border border-slate-200/80 shadow-xs space-y-1.5">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Casual Leave Quota</div>
            <div className="text-3xl font-extrabold font-mono text-slate-900">
              {casualLeavesUsedThisMonth} / {CASUAL_LEAVE_LIMIT_PER_MONTH} <span className="text-sm font-medium text-slate-400 font-sans">Used</span>
            </div>
            <p className="text-xs text-slate-500">Allowed 1 casual leave per calendar month</p>
          </div>

          <div className="rounded-2xl p-5 bg-white border border-amber-200/80 shadow-xs space-y-1.5 bg-gradient-to-br from-white to-amber-50/40">
            <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">2026 Optional Holidays Remaining</div>
            <div className="text-3xl font-extrabold font-mono text-amber-600">
              {OPTIONAL_HOLIDAY_LIMIT_PER_YEAR - optionalHolidaysUsedThisYear} / {OPTIONAL_HOLIDAY_LIMIT_PER_YEAR} <span className="text-sm font-medium text-amber-500 font-sans">Available</span>
            </div>
            <p className="text-xs text-amber-700/80">Pick up to 5 festival days from official 2026 list</p>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 border shadow-xs ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Plus className="h-4 w-4 text-indigo-600" /> Submit Leave Application
            </h3>

            <form onSubmit={handleApplyLeave} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => handleLeaveTypeChange(e.target.value as any)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-slate-900 font-medium focus:border-indigo-600 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="casual">Casual Leave (1/month)</option>
                  <option value="sick">Sick / Medical Leave</option>
                  <option value="emergency">Emergency Leave</option>
                  <option value="optional_holiday">Optional Holiday (Select from 2026 Calendar)</option>
                  <option value="weekoff">Week Off</option>
                </select>
              </div>

              {leaveType === 'optional_holiday' ? (
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Select 2026 Optional Holiday</label>
                  <select
                    required
                    value={selectedOptionalHoliday}
                    onChange={(e) => setSelectedOptionalHoliday(e.target.value)}
                    className="w-full rounded-xl bg-amber-50/50 border border-amber-300 px-3.5 py-2.5 text-amber-900 font-semibold focus:border-amber-500 focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="">-- Choose 2026 Festival / Holiday --</option>
                    {OPTIONAL_HOLIDAYS_2026.map((h) => (
                      <option key={h.date} value={h.date}>
                        {h.name} ({h.date})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">From Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-slate-900 font-medium focus:border-indigo-600 focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">To Date</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-slate-900 font-medium focus:border-indigo-600 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Reason for Leave</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Brief explanation for administration..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 p-3 text-slate-900 font-medium focus:border-indigo-600 focus:outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
              >
                Submit Application
              </button>
            </form>
          </div>

          <div className="rounded-2xl p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Calendar className="h-4 w-4 text-indigo-600" /> My Leave Requests
            </h3>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {leaves.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                  No leave applications submitted yet.
                </div>
              ) : (
                leaves.map((leave) => (
                  <div
                    key={leave.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-900 uppercase font-mono text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md">
                        {leave.leave_type.replace('_', ' ')}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-extrabold ${
                          leave.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : leave.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {leave.status}
                      </span>
                    </div>

                    <div className="font-mono font-bold text-slate-800">
                      📅 {leave.start_date === leave.end_date ? leave.start_date : `${leave.start_date} to ${leave.end_date}`}
                    </div>

                    <p className="text-slate-600 italic">"{leave.reason}"</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
    </main>
  );
}
