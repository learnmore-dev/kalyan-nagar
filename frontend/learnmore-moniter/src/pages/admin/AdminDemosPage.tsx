import React, { useEffect, useMemo, useState } from 'react';
import { Batch, User } from '@/lib/types';
import { RefreshCw, Search, Trash2, Video } from 'lucide-react';

export default function AdminDemosPage() {
  const [demos, setDemos] = useState<Batch[]>([]);
  const [trainers, setTrainers] = useState<User[]>([]);
  const [trainerFilter, setTrainerFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadDemos = async () => {
    setLoading(true);
    setError('');
    try {
      const [batchResponse, trainerResponse] = await Promise.all([
        fetch('/api/batches/?batch_type=demo'),
        fetch('/api/users/?role=trainer'),
      ]);
      const batchData = await batchResponse.json();
      if (!batchResponse.ok || !batchData.success) {
        throw new Error(batchData.error || 'Could not load demos.');
      }
      setDemos((batchData.batches || []).filter((batch: Batch) => batch.batch_type === 'demo'));

      if (trainerResponse.ok) {
        const trainerData = await trainerResponse.json();
        if (trainerData.success) setTrainers(trainerData.users || []);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load demos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDemos();
  }, []);

  const trainerNames = useMemo(() => {
    const trainerById = new Map(trainers.map((trainer) => [trainer.id, trainer.name]));
    const names = demos.map((demo) => ({
      id: demo.trainer_id,
      name: demo.trainer_name || trainerById.get(demo.trainer_id) || 'Unassigned',
    }));
    return Array.from(new Map(names.map((trainer) => [trainer.id, trainer])).values())
      .sort((first, second) => first.name.localeCompare(second.name));
  }, [demos, trainers]);

  const filteredDemos = useMemo(() => {
    const query = search.trim().toLowerCase();
    return demos.filter((demo) => {
      if (trainerFilter !== 'all' && demo.trainer_id !== trainerFilter) return false;
      if (!query) return true;
      const trainerName = demo.trainer_name || trainers.find((trainer) => trainer.id === demo.trainer_id)?.name || '';
      return [demo.name, demo.student_name, demo.student_phone, demo.course_name, trainerName]
        .some((value) => value?.toLowerCase().includes(query));
    });
  }, [demos, search, trainerFilter, trainers]);

  const handleDeleteDemo = async (demo: Batch) => {
    const trainerName = demo.trainer_name || trainers.find((trainer) => trainer.id === demo.trainer_id)?.name || 'Unassigned trainer';
    const demoLabel = demo.student_name || demo.name;
    if (!window.confirm(`Delete demo for ${demoLabel} assigned to ${trainerName}? This cannot be undone.`)) return;

    setDeletingId(demo.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/batches/${encodeURIComponent(demo.id)}/`, { method: 'DELETE' });
      if (!response.ok) {
        let message = 'Could not delete demo.';
        try {
          const data = await response.json();
          message = data.error || data.message || message;
        } catch {
          // The server may return an empty error response.
        }
        throw new Error(message);
      }

      setDemos((current) => current.filter((item) => item.id !== demo.id));
      setNotice(`Demo for ${demoLabel} deleted.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete demo.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Video className="h-6 w-6 text-indigo-600" /> Demo Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">Review and remove demos assigned to any trainer.</p>
        </div>
        <button
          type="button"
          onClick={loadDemos}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      <section className="flex flex-col sm:flex-row gap-3">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search student, course, or trainer"
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400"
          />
        </label>
        <select
          value={trainerFilter}
          onChange={(event) => setTrainerFilter(event.target.value)}
          aria-label="Filter demos by trainer"
          className="min-w-52 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400"
        >
          <option value="all">All trainers</option>
          {trainerNames.map((trainer) => (
            <option key={trainer.id} value={trainer.id}>{trainer.name}</option>
          ))}
        </select>
      </section>

      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Assigned demos</h2>
          <span className="text-xs font-medium text-slate-500">{filteredDemos.length} shown / {demos.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Student / Demo</th>
                <th className="px-4 py-3 font-semibold">Trainer</th>
                <th className="px-4 py-3 font-semibold">Course</th>
                <th className="px-4 py-3 font-semibold">Schedule</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">Loading demos...</td></tr>
              ) : filteredDemos.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">No demos found.</td></tr>
              ) : filteredDemos.map((demo) => (
                <tr key={demo.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{demo.student_name || demo.name}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{demo.student_phone || demo.name}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {demo.trainer_name || trainers.find((trainer) => trainer.id === demo.trainer_id)?.name || 'Unassigned'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{demo.course_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <div>{demo.start_date || '—'}</div>
                    {demo.timing && <div className="text-xs text-slate-500">{demo.timing}</div>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteDemo(demo)}
                      disabled={deletingId === demo.id}
                      className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deletingId === demo.id ? 'Deleting...' : 'Delete demo'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}