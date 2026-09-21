import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Users, Calendar, BookOpen, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';

interface Session {
  id: string;
  date: string;
  trainer_name: string;
  topic: string;
  hours: number;
  notes: string;
}

interface BatchDetail {
  id: string;
  name: string;
  trainer_name: string;
  total_hours: number;
  used_hours: number;
  total_students: number;
  start_date: string;
  is_active: boolean;
  status: 'on_time' | 'delayed' | 'completed';
}

export default function AdminBatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/batches/${id}/sessions/`);
        const data = await res.json();
        if (data.success) {
          setBatch(data.batch);
          setSessions(data.sessions || []);
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  if (loading) return (
    <main className="flex-1 p-8 flex items-center justify-center">
      <div className="h-6 w-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
    </main>
  );

  if (!batch) return (
    <main className="flex-1 p-8 text-center text-slate-400">Batch not found.</main>
  );

  const remaining = batch.total_hours - batch.used_hours;
  const pct = Math.min(100, Math.round((batch.used_hours / (batch.total_hours || 1)) * 100));
  const isDelayed = batch.used_hours > batch.total_hours;
  const statusColor = batch.status === 'completed' ? '#4f46e5' : isDelayed ? '#d97706' : '#059669';
  const statusLabel = batch.status === 'completed' ? '✔ Completed' : isDelayed ? '⏱ Delayed' : '✔ On Time';

  return (
    <main className="flex-1 w-full max-w-[1200px] mx-auto p-5 sm:p-7 space-y-6">

      {/* Back */}
      <Link to="/admin/batches" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Batches
      </Link>

      {/* Header card */}
      <div className="pro-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">{batch.name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Trainer: <strong className="text-slate-700">{batch.trainer_name || 'Unassigned'}</strong>
              {batch.start_date && <> · Started {batch.start_date}</>}
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-full text-xs font-bold self-start"
                style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}40` }}>
            {statusLabel}
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <Clock className="h-4 w-4 text-indigo-600" />, label: 'Planned Hours', value: `${batch.total_hours}h`, color: '#4f46e5' },
            { icon: <TrendingUp className="h-4 w-4 text-emerald-600" />, label: 'Hours Logged', value: `${batch.used_hours}h`, color: '#059669' },
            { icon: <AlertTriangle className="h-4 w-4 text-amber-500" />, label: isDelayed ? 'Over by' : 'Remaining', value: isDelayed ? `+${Math.abs(remaining)}h` : `${remaining}h`, color: isDelayed ? '#d97706' : '#64748b' },
            { icon: <Users className="h-4 w-4 text-blue-600" />, label: 'Students', value: batch.total_students, color: '#2563eb' },
          ].map((s) => (
            <div key={s.label} className="p-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mb-1">{s.icon}{s.label}</div>
              <div className="text-xl font-black font-mono" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-600">Syllabus Completion</span>
            <span className="font-mono font-bold" style={{ color: statusColor }}>{pct}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%`, background: isDelayed ? '#d97706' : 'linear-gradient(90deg,#4f46e5,#2563eb)' }} />
          </div>
          {isDelayed && (
            <p className="text-[11px] text-amber-700 font-medium">
              ⚠ Batch has exceeded planned hours by {Math.abs(remaining)}h — marked as <strong>Delayed</strong>.
            </p>
          )}
        </div>
      </div>

      {/* Sessions table */}
      <div className="pro-card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between"
             style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div className="section-title"><BookOpen className="h-4 w-4 text-indigo-600" /> Session Log</div>
            <div className="section-subtitle">{sessions.length} sessions logged · {batch.used_hours}h total</div>
          </div>
          <Link to={`/trainer/sessions/add?batch=${id}`}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                style={{ background: '#4f46e5' }}>
            + Add Session
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No sessions logged yet for this batch.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="pro-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Trainer</th>
                  <th>Topic Covered</th>
                  <th className="text-center">Hours</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => {
                  // Cumulative hours up to this session
                  const cumulative = sessions.slice(0, i + 1).reduce((acc, x) => acc + x.hours, 0);
                  const sessionStatus = cumulative > batch.total_hours ? 'delayed' : 'on_time';
                  return (
                    <tr key={s.id}>
                      <td className="font-mono text-slate-400">{i + 1}</td>
                      <td className="font-semibold text-slate-700 whitespace-nowrap">{s.date}</td>
                      <td className="text-slate-600">{s.trainer_name || batch.trainer_name}</td>
                      <td className="max-w-[260px]">
                        <span className="font-semibold text-indigo-800" title={s.topic}>
                          {s.topic || <span className="text-slate-400 italic">No topic logged</span>}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="font-mono font-bold text-slate-800">{s.hours}h</span>
                      </td>
                      <td>
                        {sessionStatus === 'delayed' ? (
                          <span className="badge badge-amber">⏱ Delay</span>
                        ) : (
                          <span className="badge badge-emerald">✔ On Time</span>
                        )}
                      </td>
                      <td className="text-slate-500 max-w-[200px] truncate" title={s.notes}>
                        {s.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary footer */}
        <div className="px-5 py-3 flex items-center justify-between text-xs font-semibold"
             style={{ background: '#f8fafc', borderTop: '1px solid var(--border)' }}>
          <span className="text-slate-500">Total logged: <strong className="text-slate-800">{batch.used_hours}h</strong> of <strong>{batch.total_hours}h</strong> planned</span>
          <span className="font-bold" style={{ color: statusColor }}>{statusLabel}</span>
        </div>
      </div>
    </main>
  );
}
