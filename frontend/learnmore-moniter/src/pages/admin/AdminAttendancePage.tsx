import React, { useState, useEffect } from 'react';
import { TrainerAttendance, User } from '@/lib/types';
import { Calendar, CheckCircle2, Clock, MapPin, ExternalLink, XCircle, AlertCircle, Users } from 'lucide-react';

export default function AdminAttendancePage() {
  const [attendances, setAttendances]   = useState<TrainerAttendance[]>([]);
  const [trainers,    setTrainers]      = useState<User[]>([]);
  const [leaves,      setLeaves]        = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading,     setLoading]       = useState(true);
  const [previewSelfie, setPreviewSelfie] = useState<{ url: string; name: string } | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [attRes, userRes, leaveRes] = await Promise.all([
        fetch(`/api/attendance/?date=${selectedDate}`),
        fetch('/api/users/?role=trainer'),
        fetch(`/api/leaves/?date=${selectedDate}`),
      ]);
      const [attData, userData, leaveData] = await Promise.all([
        attRes.json(), userRes.json(), leaveRes.json(),
      ]);
      if (attData.success)   setAttendances(attData.attendances || []);
      if (userData.success)  setTrainers(userData.users || []);
      if (leaveData.success) setLeaves(leaveData.leaves || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [selectedDate]);

  /* ── Per-trainer status ─────────────────── */
  const rows = trainers.map((trainer) => {
    const att = attendances.find(
      (a) => a.trainer_id === trainer.id || (a as any).trainer === trainer.id
    );

    // Check approved/pending leave for this date
    const leave = leaves.find((l) => {
      const tid = l.trainer_id || (l as any).trainer;
      return (
        tid === trainer.id &&
        l.start_date <= selectedDate &&
        l.end_date   >= selectedDate &&
        l.status !== 'rejected'
      );
    });

    const checkedIn  = !!(att?.mark_in_time  || (att as any)?.check_in_time);
    const checkedOut = !!(att?.mark_out_time || (att as any)?.check_out_time);
    const inTime     = att?.mark_in_time  || (att as any)?.check_in_time  || null;
    const outTime    = att?.mark_out_time || (att as any)?.check_out_time || null;
    const selfie     = (att as any)?.selfie_in_url || (att as any)?.photo_in || null;
    const lat        = (att as any)?.latitude_in  || (att as any)?.latitude  || null;
    const lng        = (att as any)?.longitude_in || (att as any)?.longitude || null;
    const workMins   = att?.total_work_minutes || 0;

    let status: 'present' | 'half_day' | 'leave_approved' | 'leave_pending' | 'absent';

    if (checkedIn) {
      const ds = (att?.day_status || '').toLowerCase();
      status = ds === 'half_day' ? 'half_day' : 'present';
    } else if (leave) {
      status = leave.status === 'approved' ? 'leave_approved' : 'leave_pending';
    } else {
      status = 'absent';
    }

    return { trainer, att, checkedIn, checkedOut, inTime, outTime, selfie, lat, lng, workMins, leave, status };
  });

  /* ── Summary counts ─────────────────────── */
  const presentCount  = rows.filter((r) => r.status === 'present' || r.status === 'half_day').length;
  const leaveCount    = rows.filter((r) => r.status === 'leave_approved' || r.status === 'leave_pending').length;
  const absentCount   = rows.filter((r) => r.status === 'absent').length;
  const total         = rows.length;

  const statusConfig = {
    present:       { label: 'PRESENT',        bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0', dot: '#059669' },
    half_day:      { label: 'HALF DAY',       bg: '#fffbeb', color: '#92400e', border: '#fcd34d', dot: '#d97706' },
    leave_approved:{ label: 'ON LEAVE',       bg: '#f5f3ff', color: '#5b21b6', border: '#ddd6fe', dot: '#7c3aed' },
    leave_pending: { label: 'LEAVE (PENDING)',bg: '#fff7ed', color: '#9a3412', border: '#fed7aa', dot: '#ea580c' },
    absent:        { label: 'ABSENT',         bg: '#fff1f2', color: '#9f1239', border: '#fecdd3', dot: '#dc2626' },
  };

  const fmtTime = (t: string | null) => {
    if (!t) return '—';
    try {
      return new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return t; }
  };

  const fmtDuration = (mins: number) => {
    if (!mins) return '—';
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-5 sm:p-7 space-y-6">

      {/* ── Header ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            📸 Daily Attendance Register
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Showing attendance for <strong className="text-slate-700">{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm self-start">
          <Calendar className="h-4 w-4 text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* ── Summary cards ───────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Total Faculty', value: total, bg: '#eff6ff', color: '#1d4ed8',
            icon: <Users className="h-4 w-4" />,
            names: rows.map(r => r.trainer.name),
          },
          {
            label: 'Present', value: presentCount, bg: '#ecfdf5', color: '#065f46',
            icon: <CheckCircle2 className="h-4 w-4" />,
            names: rows.filter(r => r.status === 'present' || r.status === 'half_day').map(r => r.trainer.name),
          },
          {
            label: 'On Leave', value: leaveCount, bg: '#f5f3ff', color: '#5b21b6',
            icon: <Clock className="h-4 w-4" />,
            names: rows.filter(r => r.status === 'leave_approved' || r.status === 'leave_pending').map(r => r.trainer.name),
          },
          {
            label: 'Absent', value: absentCount, bg: '#fff1f2', color: '#9f1239',
            icon: <XCircle className="h-4 w-4" />,
            names: rows.filter(r => r.status === 'absent').map(r => r.trainer.name),
          },
        ].map((s) => (
          <div key={s.label} className="pro-card p-4 space-y-2"
               style={{ borderLeft: `3px solid ${s.color}` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
                     style={{ background: s.bg, color: s.color }}>
                  {s.icon}
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.label}</div>
                  <div className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</div>
                </div>
              </div>
            </div>
            {/* Names list */}
            {s.names.length > 0 && (
              <div className="space-y-1 pt-1" style={{ borderTop: `1px solid ${s.color}20` }}>
                {s.names.map((name) => (
                  <div key={name} className="flex items-center gap-1.5 text-[11px] font-semibold"
                       style={{ color: s.color }}>
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: s.color }} />
                    {name}
                  </div>
                ))}
              </div>
            )}
            {s.names.length === 0 && (
              <div className="text-[11px] text-slate-400 italic pt-1" style={{ borderTop: `1px solid ${s.color}20` }}>
                None
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Attendance table ─────────────────── */}
      <div className="pro-card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between"
             style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
          <div className="section-title">📋 Faculty Log — {selectedDate}</div>
          <button onClick={fetchAll}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer">
            🔄 Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="pro-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Trainer</th>
                <th className="text-center">Selfie</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Duration</th>
                <th>GPS Location</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 text-xs">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 rounded-full border-2 border-slate-200 border-t-slate-400 animate-spin" />
                      Loading…
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 text-xs">
                    No trainers found.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const sc = statusConfig[row.status];
                  return (
                    <tr key={row.trainer.id}>
                      {/* # */}
                      <td className="font-mono text-slate-400 text-center">{idx + 1}</td>

                      {/* Trainer */}
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
                               style={{ background: 'linear-gradient(135deg,#4f46e5,#2563eb)' }}>
                            {row.trainer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 text-xs">{row.trainer.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">@{row.trainer.username}</div>
                          </div>
                        </div>
                      </td>

                      {/* Selfie */}
                      <td className="text-center">
                        {row.selfie ? (
                          <img
                            src={row.selfie}
                            alt="selfie"
                            onClick={() => setPreviewSelfie({ url: row.selfie!, name: row.trainer.name })}
                            className="h-10 w-10 rounded-xl object-cover border-2 border-emerald-400 cursor-pointer hover:scale-105 transition-transform mx-auto"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>

                      {/* Check In */}
                      <td className="font-mono font-semibold text-emerald-700 text-xs">
                        {fmtTime(row.inTime)}
                      </td>

                      {/* Check Out */}
                      <td className="font-mono font-semibold text-slate-600 text-xs">
                        {row.checkedOut ? fmtTime(row.outTime) : row.checkedIn ? (
                          <span className="text-blue-500 font-semibold">Still In</span>
                        ) : '—'}
                      </td>

                      {/* Duration */}
                      <td>
                        <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold"
                              style={{ background: '#eff6ff', color: '#1d4ed8' }}>
                          {fmtDuration(row.workMins)}
                        </span>
                      </td>

                      {/* GPS */}
                      <td>
                        {row.lat && row.lng ? (
                          <a href={`https://www.google.com/maps/search/?api=1&query=${row.lat},${row.lng}`}
                             target="_blank" rel="noreferrer"
                             className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                            <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                            {`${Number(row.lat).toFixed(4)}, ${Number(row.lng).toFixed(4)}`}
                            <ExternalLink className="h-3 w-3 opacity-50" />
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {(row.att as any)?.location_name || '—'}
                          </span>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                              style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: sc.dot }} />
                          {sc.label}
                        </span>
                        {row.leave && (
                          <div className="text-[10px] text-slate-400 mt-0.5 capitalize">
                            {row.leave.leave_type}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer summary */}
        {!loading && rows.length > 0 && (
          <div className="px-5 py-3 flex flex-wrap gap-4 text-xs font-semibold"
               style={{ background: '#f8fafc', borderTop: '1px solid var(--border)' }}>
            <span style={{ color: '#059669' }}>✔ Present: {presentCount}</span>
            <span style={{ color: '#7c3aed' }}>📋 Leave: {leaveCount}</span>
            <span style={{ color: '#dc2626' }}>✗ Absent: {absentCount}</span>
            <span className="text-slate-400">Total: {total}</span>
          </div>
        )}
      </div>

      {/* Selfie preview modal */}
      {previewSelfie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(6px)' }}
             onClick={() => setPreviewSelfie(null)}>
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl max-w-sm w-full fade-in"
               onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 flex items-center justify-between"
                 style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="font-bold text-sm text-slate-800">{previewSelfie.name} — Check-in Selfie</span>
              <button onClick={() => setPreviewSelfie(null)}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer text-lg leading-none">✕</button>
            </div>
            <img src={previewSelfie.url} alt="selfie" className="w-full object-cover" />
          </div>
        </div>
      )}
    </main>
  );
}
