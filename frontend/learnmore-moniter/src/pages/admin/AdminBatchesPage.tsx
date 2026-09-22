import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Batch, User } from '@/lib/types';
import {
  Package,
  Plus,
  Search,
  User as UserIcon,
  Filter,
  Edit2,
  Eye,
  PlusCircle,
  CheckCircle,
  RotateCcw,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

export default function AdminBatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [trainers, setTrainers] = useState<User[]>([]);
  const [nameFilter, setNameFilter] = useState('');
  const [trainerFilter, setTrainerFilter] = useState('');
  const [progressStatusFilter, setProgressStatusFilter] = useState('all');
  const [activeStateFilter, setActiveStateFilter] = useState('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Applied filters state
  const [appliedFilters, setAppliedFilters] = useState({
    name: '',
    trainer: '',
    progress: 'all',
    activeState: 'all'
  });

  const [editIsActive, setEditIsActive] = useState(true);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [editName, setEditName] = useState('');
  const [editHours, setEditHours] = useState(0);
  const [editStudents, setEditStudents] = useState(0);
  const [editTrainerId, setEditTrainerId] = useState('');

  const fetchBatchesAndTrainers = async () => {
    try {
      const [bRes, tRes] = await Promise.all([
        fetch('/api/batches/'),
        fetch('/api/users?role=trainer')
      ]);
      const bData = await bRes.json();
      const tData = await tRes.json();
      if (bData.success) setBatches(bData.batches || []);
      if (tData.success && tData.users) setTrainers(tData.users || []);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchBatchesAndTrainers();
  }, []);

  const handleApplyFilter = () => {
    setAppliedFilters({
      name: nameFilter,
      trainer: trainerFilter,
      progress: progressStatusFilter,
      activeState: activeStateFilter
    });
    setCurrentPage(1);
  };

  const handleResetFilter = () => {
    setNameFilter('');
    setTrainerFilter('');
    setProgressStatusFilter('all');
    setActiveStateFilter('all');
    setAppliedFilters({
      name: '',
      trainer: '',
      progress: 'all',
      activeState: 'all'
    });
    setCurrentPage(1);
  };

  const handleToggleComplete = async (batch: Batch) => {
    const newIsActive = !batch.is_active;
    try {
      await fetch(`/api/batches/${batch.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newIsActive, is_completed: !newIsActive }),
      });
      fetchBatchesAndTrainers();
    } catch { fetchBatchesAndTrainers(); }
  };

  const handleDeleteBatch = async (batchId: string, batchName: string) => {
    if (!window.confirm(`Delete batch "${batchName}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/batches/${encodeURIComponent(batchId)}/`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        fetchBatchesAndTrainers();
      } else {
        alert(data.error || data.message || 'Failed to delete batch');
      }
    } catch { alert('Error deleting batch'); }
  };

  const openEditModal = (batch: Batch) => {
    setEditingBatch(batch);
    setEditName(batch.name);
    setEditHours(batch.total_hours);
    setEditStudents(batch.total_students || 0);
    setEditTrainerId(batch.trainer_id);
    setEditIsActive(batch.is_active);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;

    await fetch(`/api/batches/${editingBatch.id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editName,
        total_hours: editHours,
        total_students: editStudents,
        trainer_id: editTrainerId,
        is_active: editIsActive,
        is_completed: !editIsActive,
      }),
    });

    setEditingBatch(null);
    fetchBatchesAndTrainers();
  };

  // Stats calculation
  const totalCount = batches.length;
  const activeCount = batches.filter((b) => b.is_active).length;
  const completedCount = batches.filter((b) => !b.is_active).length;
  const delayedCount = batches.filter((b) => (b.used_hours || 0) > b.total_hours).length;
  const totalTrainersCount = trainers.length;

  const filteredBatches = batches.filter((batch) => {
    if (appliedFilters.name && !batch.name.toLowerCase().includes(appliedFilters.name.toLowerCase())) {
      return false;
    }
    if (appliedFilters.trainer) {
      const tName = (batch.trainer_name || '').toLowerCase();
      if (!tName.includes(appliedFilters.trainer.toLowerCase())) return false;
    }
    if (appliedFilters.activeState === 'active' && !batch.is_active) return false;
    if (appliedFilters.activeState === 'inactive' && batch.is_active) return false;
    if (appliedFilters.progress === 'completed' && batch.is_active) return false;
    if (appliedFilters.progress === 'delayed' && (batch.used_hours || 0) <= batch.total_hours) return false;
    if (appliedFilters.progress === 'on_time' && (batch.used_hours || 0) > batch.total_hours) return false;
    return true;
  });

  // Pagination calculation
  const totalItems = filteredBatches.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedBatches = filteredBatches.slice(startIndex, endIndex);

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          📦 Batch Management
        </h1>

        <Link
          to="/admin/batches/create"
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#4f46e5] to-[#4338ca] hover:opacity-95 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all self-start cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Create New Batch
        </Link>
      </div>

      {/* Top 5 Summary Chips Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
            <Package className="h-4 w-4 text-amber-500" /> Total
          </div>
          <div className="text-2xl font-extrabold text-[#4f46e5]">{totalCount}</div>
        </div>

        {/* Active */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Active
          </div>
          <div className="text-2xl font-extrabold text-[#4f46e5]">{activeCount}</div>
        </div>

        {/* Completed */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
            🏁 Completed
          </div>
          <div className="text-2xl font-extrabold text-[#4f46e5]">{completedCount}</div>
        </div>

        {/* Delayed */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
            ⏱️ Delayed
          </div>
          <div className="text-2xl font-extrabold text-[#4f46e5]">{delayedCount}</div>
        </div>

        {/* Trainers */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
            🎓 Trainers
          </div>
          <div className="text-2xl font-extrabold text-slate-800">{totalTrainersCount}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Batch Name */}
          <div className="space-y-1.5">
            <label className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] flex items-center gap-1">
              🔍 BATCH NAME
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g., Data Science, Python..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="w-full rounded-full border border-slate-200 bg-slate-50/50 px-4 py-2 text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Trainer Filter */}
          <div className="space-y-1.5">
            <label className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] flex items-center gap-1">
              👤 TRAINER
            </label>
            <input
              type="text"
              placeholder="Trainer username or name..."
              value={trainerFilter}
              onChange={(e) => setTrainerFilter(e.target.value)}
              list="trainer-suggestions"
              className="w-full rounded-full border border-slate-200 bg-slate-50/50 px-4 py-2 text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-2xs"
            />
            <datalist id="trainer-suggestions">
              {trainers.map((t) => (
                <option key={t.id} value={t.name}>
                  @{t.username}
                </option>
              ))}
            </datalist>
          </div>

          {/* Progress Status */}
          <div className="space-y-1.5">
            <label className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] flex items-center gap-1">
              📌 PROGRESS STATUS
            </label>
            <select
              value={progressStatusFilter}
              onChange={(e) => setProgressStatusFilter(e.target.value)}
              className="w-full rounded-full border border-slate-200 bg-slate-50/50 px-4 py-2 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white cursor-pointer shadow-2xs"
            >
              <option value="all">All</option>
              <option value="on_time">On Time</option>
              <option value="delayed">Delayed</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Active State */}
          <div className="space-y-1.5">
            <label className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] flex items-center gap-1">
              🟢 ACTIVE STATE
            </label>
            <select
              value={activeStateFilter}
              onChange={(e) => setActiveStateFilter(e.target.value)}
              className="w-full rounded-full border border-slate-200 bg-slate-50/50 px-4 py-2 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white cursor-pointer shadow-2xs"
            >
              <option value="all">All (Active + Inactive)</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleApplyFilter}
            className="px-6 py-2 rounded-full bg-[#4f46e5] hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            Apply Filters
          </button>
          <button
            onClick={handleResetFilter}
            className="px-5 py-2 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Batches Table with Pagination */}
      <div className="rounded-3xl bg-white shadow-xs border border-slate-200/80 overflow-hidden space-y-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[950px] border-collapse">
            <thead className="bg-[#f8fafc] text-slate-500 font-extrabold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-4 w-10 text-center">#</th>
                <th className="px-4 py-4">BATCH NAME</th>
                <th className="px-4 py-4">TRAINER</th>
                <th className="px-4 py-4">START DATE</th>
                <th className="px-4 py-4 text-center">STUDENTS</th>
                <th className="px-4 py-4">HOURS PROGRESS</th>
                <th className="px-4 py-4">STATUS</th>
                <th className="px-4 py-4">ACTIVE</th>
                <th className="px-4 py-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {paginatedBatches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-slate-400 font-medium">
                    No batches found matching the search criteria.
                  </td>
                </tr>
              ) : (
                paginatedBatches.map((batch, index) => {
                  const displayIndex = startIndex + index + 1;
                  const used = batch.used_hours || 0;
                  const total = batch.total_hours || 1;
                  const isOver = used > total;
                  const delayHrs = isOver ? used - total : 0;
                  const pct = Math.min(Math.round((used / total) * 100), 100);

                  return (
                    <tr key={batch.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-4 text-center font-bold text-slate-500">
                        {displayIndex}
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-900 max-w-[200px]">
                        {batch.name}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4f46e5] text-white font-extrabold text-xs shrink-0 shadow-2xs">
                            {batch.trainer_name?.charAt(0).toUpperCase() || 'T'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{batch.trainer_name || 'Unassigned'}</div>
                            <div className="text-[10px] text-slate-400 font-mono">@{batch.trainer_name?.toLowerCase().replace(/\s+/g, '')}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-700 whitespace-nowrap">
                        {batch.start_date ? new Date(batch.start_date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : '19 Jan 2026'}
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-slate-800">
                        {batch.total_students || 0}
                      </td>
                      <td className="px-4 py-4 min-w-[150px]">
                        <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                          <span className="font-bold text-slate-800">{used}h / {total}h</span>
                          {isOver && (
                            <span className="text-[11px] font-bold text-rose-500 ml-2">
                              +{delayHrs}h delay
                            </span>
                          )}
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${isOver ? 'bg-emerald-500' : used > 0 ? 'bg-emerald-500' : 'bg-slate-200'}`}
                            style={{ width: pct > 0 ? `${pct}%` : '100%' }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {!batch.is_active ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                            📊 Completed
                          </span>
                        ) : isOver ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100/90 text-amber-800 border border-amber-200/60">
                            ⏱️ Delayed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100/90 text-emerald-800 border border-emerald-200/60">
                            ✔ On Time
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold ${
                            batch.is_active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {batch.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                          {/* Edit */}
                          <button
                            onClick={() => openEditModal(batch)}
                            className="px-3 py-1 rounded-full border border-amber-300/80 bg-white hover:bg-amber-50 text-amber-800 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                          >
                            ✏️ Edit
                          </button>

                          {/* View */}
                          <Link
                            to={`/admin/batches/${batch.id}`}
                            className="px-3 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[11px] flex items-center gap-1 transition-colors shadow-2xs"
                          >
                            👁️ View
                          </Link>

                          {/* + Session */}
                          <Link
                            to={`/trainer/sessions/add?batch=${batch.id}`}
                            className="px-3 py-1 rounded-full border border-emerald-300/80 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1 transition-colors shadow-2xs"
                          >
                            ➕ Session
                          </Link>

                          {/* Complete / Reopen */}
                          <button
                            onClick={() => handleToggleComplete(batch)}
                            className={`px-3 py-1 rounded-full border font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs ${
                              batch.is_active
                                ? 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700'
                                : 'border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800'
                            }`}
                          >
                            {batch.is_active ? '🏁 Complete' : '🔁 Reopen'}
                          </button>

                          {/* Delete Batch */}
                          <button
                            onClick={() => handleDeleteBatch(batch.id, batch.name)}
                            className="px-2.5 py-1 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                            title="Delete Batch"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50/80 border-t border-slate-200 text-xs text-slate-600">
            {/* Showing count */}
            <div className="font-semibold text-slate-600">
              Showing <span className="font-extrabold text-slate-900">{totalItems > 0 ? startIndex + 1 : 0}</span> to{' '}
              <span className="font-extrabold text-slate-900">{endIndex}</span> of{' '}
              <span className="font-extrabold text-indigo-600">{totalItems}</span> batches
            </div>

            {/* Page Size Selector & Navigation */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Rows per page dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Page Number Controls */}
              <div className="flex items-center gap-1">
                {/* First Page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={validCurrentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="First Page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>

                {/* Prev Page */}
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validCurrentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* Page indicators */}
                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - validCurrentPage) <= 1)
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      const showEllipsis = prev && p - prev > 1;
                      return (
                        <React.Fragment key={p}>
                          {showEllipsis && <span className="px-1 text-slate-400 font-bold">…</span>}
                          <button
                            onClick={() => setCurrentPage(p)}
                            className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                              validCurrentPage === p
                                ? 'bg-[#4f46e5] text-white shadow-2xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                {/* Next Page */}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validCurrentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                {/* Last Page */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={validCurrentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Last Page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Edit Modal */}
      {editingBatch && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-[#4f46e5] to-[#4338ca] p-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                ✏️ Edit Batch Details
              </h3>
              <button
                onClick={() => setEditingBatch(null)}
                className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Batch Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Total Hours
                  </label>
                  <input
                    type="number"
                    required
                    value={editHours}
                    onChange={(e) => setEditHours(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Students
                  </label>
                  <input
                    type="number"
                    value={editStudents}
                    onChange={(e) => setEditStudents(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Assigned Trainer
                </label>
                <select
                  value={editTrainerId}
                  onChange={(e) => setEditTrainerId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Active / Inactive toggle */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Batch Status
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditIsActive(true)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      editIsActive
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ✅ Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditIsActive(false)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      !editIsActive
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    🔴 Inactive
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBatch(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
