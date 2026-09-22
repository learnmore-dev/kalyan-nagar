import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Batch, WorkSession } from '@/lib/types';
import { Plus, ArrowLeft } from 'lucide-react';

export default function TrainerBatchDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const batchId = (params?.id as string) || '';

  const [batch, setBatch] = useState<Batch | null>(null);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    const fetchBatchData = async () => {
      try {
        const [bRes, sRes] = await Promise.all([
          fetch(`/api/batches/`),
          fetch(`/api/sessions?batch_id=${batchId}`),
        ]);

        const bData = await bRes.json();
        const sData = await sRes.json();

        if (bData.success) {
          const found = bData.batches.find((b: Batch) => b.id === batchId);
          setBatch(found || bData.batches[0] || null);
        }
        if (sData.success) {
          setSessions(sData.sessions || []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };

    fetchBatchData();
  }, [batchId]);

  const totalHours = batch?.total_hours || 30;
  const usedHours =
    sessions.reduce((sum, s) => sum + (s.hours_taken || 0), 0) ||
    batch?.used_hours ||
    0;
  const remainingHours = Math.max(0, totalHours - usedHours);
  const delayHours = usedHours > totalHours ? usedHours - totalHours : 0;

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Batches
          </button>

          <Link
            to={`/trainer/sessions/add?batch=${batch?.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" /> Add New Session
          </Link>
        </div>

        <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600">
              BATCH OVERVIEW
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {batch?.name || 'Batch Overview'}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-500 mt-2 font-medium">
                <span>👤 Trainer: <strong className="text-slate-800">{batch?.trainer_name || 'Not assigned'}</strong></span>
                <span>•</span>
                <span>📅 Start: <strong className="text-slate-800">{batch?.start_date || '—'}</strong></span>
                <span>•</span>
                <span>🎓 Students: <strong className="text-slate-800">{batch?.total_students ?? 0}</strong></span>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 self-start">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> On Time
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-slate-100">
            <div className="rounded-2xl bg-slate-50/80 border border-slate-200 p-4 space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                TOTAL HOURS
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 font-mono">
                {totalHours} hrs
              </div>
              <div className="text-[11px] text-slate-500">Planned duration</div>
            </div>

            <div className="rounded-2xl bg-blue-50/70 border border-blue-200 p-4 space-y-1">
              <div className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">
                USED HOURS
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-700 font-mono">
                {usedHours} hrs
              </div>
              <div className="text-[11px] text-blue-600">Sessions logged</div>
            </div>

            <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200 p-4 space-y-1">
              <div className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">
                REMAINING
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono">
                {remainingHours} hrs
              </div>
              <div className="text-[11px] text-emerald-600">Hours left</div>
            </div>

            <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-4 space-y-1">
              <div className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">
                DELAY HOURS
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-700 font-mono">
                {delayHours} hrs
              </div>
              <div className="text-[11px] text-amber-600">Behind schedule</div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              📝 Work Sessions Log
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              {sessions.length} sessions logged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-[#fafcff] text-slate-400 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-4 w-12 text-center">#</th>
                  <th className="px-6 py-4">DATE</th>
                  <th className="px-6 py-4">HOURS</th>
                  <th className="px-6 py-4">TOPIC COVERED</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                      No work sessions logged yet for this batch.
                    </td>
                  </tr>
                ) : (
                  sessions.map((session, index) => (
                    <tr
                      key={session.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4 text-center font-bold text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-slate-700">
                        📅 {session.session_date}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 font-bold text-xs font-mono">
                          ⏱️ {session.hours_taken} h
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium leading-relaxed">
                        <div>{session.description}</div>
                        {session.students_attendance && session.students_attendance.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px]">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                              👥 {session.total_students_present || session.students_attendance.filter((s) => s.status === 'present').length}/{session.students_attendance.length} Present
                            </span>
                            {session.students_attendance.some((s) => s.status === 'absent') && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 text-rose-800 font-bold border border-rose-200">
                                ❌ {session.students_attendance.filter((s) => s.status === 'absent').length} Absent
                              </span>
                            )}
                            {session.students_attendance.some((s) => s.status === 'leave') && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 font-bold border border-amber-200">
                                🏖️ {session.students_attendance.filter((s) => s.status === 'leave').length} On Leave
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
    </main>
  );
}
