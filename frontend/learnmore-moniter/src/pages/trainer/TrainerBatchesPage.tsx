import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStoredUser } from '@/lib/auth';
import { Batch, User } from '@/lib/types';
import { Plus, Eye } from 'lucide-react';

export default function TrainerBatchesPage() {
  const [, setUser] = useState<User | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);

    const fetchBatches = async () => {
      try {
        const res = await fetch(`/api/batches/?trainer_id=${u?.id || ''}`);
        const data = await res.json();
        if (data.success) {
          const myBatches = (data.batches || []).filter(
            (b: Batch) => b.trainer_id === u?.id || b.trainer_name?.toLowerCase() === u?.name?.toLowerCase()
          );
          setBatches(myBatches);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();
  }, []);

  const totalBatches = batches.length;
  const onTimeBatches = batches.filter((b) => (b.used_hours || 0) <= b.total_hours).length;
  const delayedBatches = batches.filter((b) => (b.used_hours || 0) > b.total_hours).length;

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
              <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600">
                TRAINER PORTAL
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              My Batches
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              All batches assigned to you — track hours and status at a glance.
            </p>
          </div>

          <Link
            to="/trainer/sessions/add"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all self-start"
          >
            <Plus className="h-4 w-4" /> Add Work Session
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-white border border-slate-200 shadow-sm text-xs font-semibold text-slate-700 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Total Batches: <strong className="text-slate-900">{totalBatches}</strong>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-white border border-slate-200 shadow-sm text-xs font-semibold text-slate-700 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            On Time: <strong className="text-slate-900">{onTimeBatches}</strong>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-white border border-slate-200 shadow-sm text-xs font-semibold text-slate-700 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            Delayed: <strong className="text-slate-900">{delayedBatches}</strong>
          </div>
        </div>

        <div className="rounded-3xl bg-white shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              📋 Batch List
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              Showing {batches.length} batches
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-[#fafcff] text-slate-400 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-4 w-12 text-center">#</th>
                  <th className="px-6 py-4">BATCH NAME</th>
                  <th className="px-6 py-4">TOTAL HOURS</th>
                  <th className="px-6 py-4">STATUS</th>
                  <th className="px-6 py-4 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      No batches assigned yet.
                    </td>
                  </tr>
                ) : (
                  batches.map((batch, index) => {
                    const used = batch.used_hours || 0;
                    const total = batch.total_hours || 1;
                    const isDelayed = used > total;

                    return (
                      <tr
                        key={batch.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-6 py-4 text-center font-bold text-slate-400">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 text-sm">
                            {batch.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {batch.total_students || 0} Students Enrolled • Started {batch.start_date || '2026-08-01'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-800 font-bold text-xs font-mono">
                            ⏱️ {batch.total_hours} h
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {isDelayed ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <span className="h-2 w-2 rounded-full bg-rose-500" />
                              Delayed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              On Time
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              to={`/trainer/batches/${batch.id}`}
                              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" /> View
                            </Link>

                            <Link
                              to={`/trainer/sessions/add?batch=${batch.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs transition-colors"
                            >
                              + Session
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
    </main>
  );
}
