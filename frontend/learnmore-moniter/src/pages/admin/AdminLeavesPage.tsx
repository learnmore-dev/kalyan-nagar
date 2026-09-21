import React, { useState, useEffect } from 'react';
import { Leave, User, TrainerLeaveBalance, LeaveAuditLog } from '@/lib/types';
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Search,
  Filter as FilterIcon,
  X,
  Sliders,
  History,
  ShieldCheck,
  Plus,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function AdminLeavesPage() {
  const [activeTab, setActiveTab] = useState<'requests' | 'balances' | 'audits'>('requests');
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [trainers, setTrainers] = useState<User[]>([]);
  const [balances, setBalances] = useState<TrainerLeaveBalance[]>([]);
  const [auditLogs, setAuditLogs] = useState<LeaveAuditLog[]>([]);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [trainerFilter, setTrainerFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination states
  const [requestsPage, setRequestsPage] = useState<number>(1);
  const [balancesPage, setBalancesPage] = useState<number>(1);
  const [auditsPage, setAuditsPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Adjustment Modal
  const [adjustingTrainer, setAdjustingTrainer] = useState<TrainerLeaveBalance | null>(null);
  const [adjustLeaveType, setAdjustLeaveType] = useState<'casual_sick' | 'optional_holiday'>('casual_sick');
  const [newBalanceValue, setNewBalanceValue] = useState<number>(12);
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustMsg, setAdjustMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [adjustLoading, setAdjustLoading] = useState(false);

  const fetchLeavesData = async () => {
    try {
      const [lRes, uRes, bRes] = await Promise.all([
        fetch('/api/leaves'),
        fetch('/api/users?role=trainer'),
        fetch('/api/leaves/adjust'),
      ]);
      const lData = await lRes.json();
      const uData = await uRes.json();
      const bData = await bRes.json();
      if (lData.success) setLeaves(lData.leaves || []);
      if (uData.success) setTrainers(uData.users || []);
      if (bData.success) {
        setBalances(bData.balances || []);
        setAuditLogs(bData.auditLogs || []);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchLeavesData();
  }, []);

  // Reset pagination on filter or tab change
  useEffect(() => {
    setRequestsPage(1);
    setBalancesPage(1);
    setAuditsPage(1);
  }, [statusFilter, trainerFilter, searchQuery, activeTab, itemsPerPage]);

  const handleDecision = async (id: string, decisionStatus: 'approved' | 'rejected' | 'pending') => {
    // Optimistic UI update immediately
    setLeaves((prev) => prev.map((l) => l.id === id ? { ...l, status: decisionStatus } : l));
    try {
      await fetch(`/api/leaves/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: decisionStatus }),
      });
    } catch {
      // silent
    }
    fetchLeavesData();
  };

  const handleOpenAdjustModal = (b: TrainerLeaveBalance) => {
    setAdjustingTrainer(b);
    setAdjustLeaveType('casual_sick');
    setNewBalanceValue(b.casual_sick_quota);
    setAdjustReason('');
    setAdjustMsg(null);
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingTrainer) return;
    setAdjustLoading(true);
    setAdjustMsg(null);

    try {
      const res = await fetch('/api/leaves/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainer_id: adjustingTrainer.trainer_id,
          admin_name: 'Director (Admin)',
          leave_type: adjustLeaveType,
          new_balance: newBalanceValue,
          reason: adjustReason || 'Administrative quota override',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAdjustMsg({ text: data.message || 'Leave quota adjusted successfully!', type: 'success' });
        fetchLeavesData();
        setTimeout(() => {
          setAdjustingTrainer(null);
        }, 1200);
      } else {
        setAdjustMsg({ text: data.error || 'Failed to adjust balance', type: 'error' });
      }
    } catch (err: any) {
      setAdjustMsg({ text: err.message || 'Network error', type: 'error' });
    } finally {
      setAdjustLoading(false);
    }
  };

  const pendingCount = leaves.filter((l) => l.status === 'pending').length;
  const approvedCount = leaves.filter((l) => l.status === 'approved').length;
  const rejectedCount = leaves.filter((l) => l.status === 'rejected').length;

  // Merge trainers and balances so EVERY user/trainer has a leave balance entry
  const allBalances: TrainerLeaveBalance[] = trainers.map((t) => {
    const found = balances.find((b) => b.trainer_id === t.id);
    if (found) {
      return {
        ...found,
        trainer_name: found.trainer_name || t.name,
      };
    }
    return {
      trainer_id: t.id,
      trainer_name: t.name,
      casual_sick_quota: (t as any).casual_sick_quota ?? 12,
      casual_sick_used: (t as any).casual_sick_used ?? 0,
      optional_holiday_quota: (t as any).optional_holiday_quota ?? 5,
      optional_holiday_used: (t as any).optional_holiday_used ?? 0,
      mandatory_holiday_count: 5,
    };
  });

  balances.forEach((b) => {
    if (!allBalances.some((item) => item.trainer_id === b.trainer_id)) {
      allBalances.push(b);
    }
  });

  // Filtered Lists
  const filteredLeaves = leaves.filter((leave) => {
    if (statusFilter !== 'all' && leave.status !== statusFilter) return false;
    if (trainerFilter !== 'all' && leave.trainer_id !== trainerFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (leave.trainer_name || '').toLowerCase().includes(q);
      const matchReason = (leave.reason || '').toLowerCase().includes(q);
      const matchType = (leave.leave_type || '').toLowerCase().includes(q);
      if (!matchName && !matchReason && !matchType) return false;
    }
    return true;
  });

  const filteredBalances = allBalances.filter((b) => {
    if (trainerFilter !== 'all' && b.trainer_id !== trainerFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!(b.trainer_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (trainerFilter !== 'all' && log.trainer_id !== trainerFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTrainer = (log.trainer_name || '').toLowerCase().includes(q);
      const matchAdmin = (log.admin_name || '').toLowerCase().includes(q);
      const matchReason = (log.reason || '').toLowerCase().includes(q);
      if (!matchTrainer && !matchAdmin && !matchReason) return false;
    }
    return true;
  });

  // Paginated Slices
  const totalRequestsPages = Math.ceil(filteredLeaves.length / itemsPerPage) || 1;
  const paginatedLeaves = filteredLeaves.slice((requestsPage - 1) * itemsPerPage, requestsPage * itemsPerPage);

  const totalBalancesPages = Math.ceil(filteredBalances.length / itemsPerPage) || 1;
  const paginatedBalances = filteredBalances.slice((balancesPage - 1) * itemsPerPage, balancesPage * itemsPerPage);

  const totalAuditsPages = Math.ceil(filteredAuditLogs.length / itemsPerPage) || 1;
  const paginatedAuditLogs = filteredAuditLogs.slice((auditsPage - 1) * itemsPerPage, auditsPage * itemsPerPage);

  // Pagination Controls Renderer Helper
  const renderPaginationFooter = (
    currentPage: number,
    totalPages: number,
    totalItems: number,
    onPageChange: (p: number) => void
  ) => {
    const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endIdx = Math.min(currentPage * itemsPerPage, totalItems);

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 border-t border-slate-200 text-xs">
        <div className="flex items-center gap-2 text-slate-500 font-medium">
          <span>
            Showing <strong className="text-slate-800">{startIdx}</strong> to <strong className="text-slate-800">{endIdx}</strong> of <strong className="text-slate-800">{totalItems}</strong> entries
          </span>
          <div className="flex items-center gap-1.5 ml-3">
            <span className="text-[11px] font-bold text-slate-400">Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="p-1 rounded-lg border border-slate-300 bg-white font-bold text-slate-700 focus:outline-none"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Previous Page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                currentPage === page
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Next Page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CalendarDays className="h-7 w-7 text-indigo-600" /> Leave Management & Admin Override
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Review leave requests, adjust trainer quotas (12 Casual / 5 Optional), and inspect complete audit trails.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-white text-indigo-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📥 Leave Requests ({pendingCount} Pending)
          </button>
          <button
            onClick={() => setActiveTab('balances')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'balances'
                ? 'bg-white text-indigo-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⚖️ Quotas & Balances
          </button>
          <button
            onClick={() => setActiveTab('audits')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'audits'
                ? 'bg-white text-indigo-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🛡️ Audit Logs ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search trainer name, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 bg-slate-50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Status Filter (Only for Requests Tab) */}
          {activeTab === 'requests' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 text-xs rounded-xl border border-slate-300 font-semibold text-slate-700 bg-slate-50 focus:outline-none"
            >
              <option value="all">All Statuses ({leaves.length})</option>
              <option value="pending">Pending ({pendingCount})</option>
              <option value="approved">Approved ({approvedCount})</option>
              <option value="rejected">Rejected ({rejectedCount})</option>
            </select>
          )}

          {/* Trainer Filter */}
          <select
            value={trainerFilter}
            onChange={(e) => setTrainerFilter(e.target.value)}
            className="p-2 text-xs rounded-xl border border-slate-300 font-semibold text-slate-700 bg-slate-50 focus:outline-none"
          >
            <option value="all">All Trainers</option>
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {(statusFilter !== 'all' || trainerFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setTrainerFilter('all');
                setSearchQuery('');
              }}
              className="p-2 rounded-xl bg-rose-50 text-rose-700 font-bold text-xs hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: LEAVE REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Top Summary Pills */}
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Pending: <strong className="text-slate-900">{pendingCount}</strong>
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Approved: <strong className="text-slate-900">{approvedCount}</strong>
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              Rejected: <strong className="text-slate-900">{rejectedCount}</strong>
            </span>
          </div>

          {/* Leave Requests Table */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold">
                    <th className="py-3.5 px-4">Trainer</th>
                    <th className="py-3.5 px-4">Leave Type</th>
                    <th className="py-3.5 px-4">Duration</th>
                    <th className="py-3.5 px-4">User Leave Balance</th>
                    <th className="py-3.5 px-4">Reason</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginatedLeaves.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                        No leave applications found matching your filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedLeaves.map((leave) => {
                      const tb = allBalances.find((b) => b.trainer_id === leave.trainer_id);
                      const cAvail = tb ? tb.casual_sick_quota - tb.casual_sick_used : 12;
                      const oAvail = tb ? tb.optional_holiday_quota - tb.optional_holiday_used : 5;
                      return (
                        <tr key={leave.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            👨‍🏫 {leave.trainer_name || 'Trainer'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase font-mono">
                              {leave.leave_type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700 font-bold">
                            📅 {leave.start_date === leave.end_date ? leave.start_date : `${leave.start_date} to ${leave.end_date}`}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col text-[11px] font-extrabold gap-0.5">
                              <span className="text-slate-800">
                                Casual: <span className="text-emerald-700">{cAvail}/{tb?.casual_sick_quota || 12} Left</span>
                              </span>
                              <span className="text-slate-800">
                                Optional: <span className="text-amber-700">{oAvail}/{tb?.optional_holiday_quota || 5} Left</span>
                              </span>
                            </div>
                          </td>
                        <td className="py-3 px-4 text-slate-600 italic max-w-xs truncate">
                          "{leave.reason}"
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                              leave.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : leave.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                leave.status === 'approved'
                                  ? 'bg-emerald-500'
                                  : leave.status === 'rejected'
                                  ? 'bg-rose-500'
                                  : 'bg-amber-500'
                              }`}
                            />
                            {leave.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5">
                          {leave.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleDecision(leave.id, 'approved')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleDecision(leave.id, 'rejected')}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {renderPaginationFooter(requestsPage, totalRequestsPages, filteredLeaves.length, setRequestsPage)}
          </div>
        </div>
      )}

      {/* TAB 2: QUOTAS & BALANCES (ADMIN OVERRIDE) */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl text-xs text-indigo-900 font-medium">
            💡 <strong>Admin Leave Override:</strong> You have full permission to manually increase or decrease trainer leave balances (e.g. from 12 → 10 or 10 → 12). Every adjustment is recorded in the immutable audit log below.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedBalances.map((b) => (
              <div key={b.trainer_id} className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    👨‍🏫 {b.trainer_name}
                  </h3>
                  <button
                    onClick={() => handleOpenAdjustModal(b)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] border border-indigo-200 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Sliders className="h-3.5 w-3.5" /> Adjust Balance
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
                    <span className="font-semibold text-slate-600">Casual / Sick Leave Quota:</span>
                    <span className="font-mono font-extrabold text-slate-900">
                      {b.casual_sick_quota - b.casual_sick_used} / {b.casual_sick_quota} Available
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-amber-50/40 rounded-xl border border-amber-200/60">
                    <span className="font-semibold text-amber-900">Optional Holidays:</span>
                    <span className="font-mono font-extrabold text-amber-800">
                      {b.optional_holiday_quota - b.optional_holiday_used} / {b.optional_holiday_quota} Available
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-emerald-50/40 rounded-xl border border-emerald-200/60">
                    <span className="font-semibold text-emerald-900">Mandatory Holidays:</span>
                    <span className="font-mono font-extrabold text-emerald-800">5 / 5 Entitled</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls for Balances */}
          <div className="rounded-2xl border border-slate-200/80 overflow-hidden bg-white">
            {renderPaginationFooter(balancesPage, totalBalancesPages, filteredBalances.length, setBalancesPage)}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === 'audits' && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-indigo-600" /> Immutable Leave Adjustment Audit Trail
            </h3>
            <span className="text-[11px] font-bold text-slate-500">Every manual override is permanently logged</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold">
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Trainer</th>
                  <th className="py-3.5 px-4">Leave Type</th>
                  <th className="py-3.5 px-4">Balance Change</th>
                  <th className="py-3.5 px-4">Reason / Notes</th>
                  <th className="py-3.5 px-4">Modified By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 font-medium">
                      No manual leave modifications recorded yet.
                    </td>
                  </tr>
                ) : (
                  paginatedAuditLogs.map((log) => (
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
                      <td className="py-3 px-4 font-bold text-slate-900">
                        👨‍🏫 {log.trainer_name}
                      </td>
                      <td className="py-3 px-4 font-bold text-indigo-700">
                        {log.leave_type}
                      </td>
                      <td className="py-3 px-4 font-mono font-extrabold text-slate-800">
                        {log.old_balance} → <span className="text-indigo-600 font-black">{log.new_balance}</span> ({log.adjustment > 0 ? `+${log.adjustment}` : log.adjustment})
                      </td>
                      <td className="py-3 px-4 text-slate-600 italic">
                        "{log.reason}"
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700">
                        🛡️ {log.admin_name}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls for Audits */}
          {renderPaginationFooter(auditsPage, totalAuditsPages, filteredAuditLogs.length, setAuditsPage)}
        </div>
      )}

      {/* ADJUST LEAVE MODAL */}
      {adjustingTrainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Sliders className="h-5 w-5 text-indigo-600" /> Adjust Leave Balance
              </h3>
              <button
                onClick={() => setAdjustingTrainer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {adjustMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                  adjustMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-rose-50 border-rose-300 text-rose-800'
                }`}
              >
                {adjustMsg.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                )}
                {adjustMsg.text}
              </div>
            )}

            <form onSubmit={handleSaveAdjustment} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Trainer</label>
                <input
                  type="text"
                  disabled
                  value={adjustingTrainer.trainer_name}
                  className="w-full p-2.5 bg-slate-100 rounded-xl font-bold text-slate-800 border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Leave Category</label>
                <select
                  value={adjustLeaveType}
                  onChange={(e) => {
                    const type = e.target.value as any;
                    setAdjustLeaveType(type);
                    setNewBalanceValue(
                      type === 'casual_sick'
                        ? adjustingTrainer.casual_sick_quota
                        : adjustingTrainer.optional_holiday_quota
                    );
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold focus:outline-none focus:border-indigo-600 bg-slate-50"
                >
                  <option value="casual_sick">Casual / Sick Leave Quota (Default: 12)</option>
                  <option value="optional_holiday">Optional Festival Holiday Quota (Default: 5)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">New Total Annual Quota</label>
                <input
                  type="number"
                  value={newBalanceValue}
                  onChange={(e) => setNewBalanceValue(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold focus:outline-none focus:border-indigo-600 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Reason for Override</label>
                <input
                  type="text"
                  placeholder="e.g. Approved extra quota by management"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 bg-slate-50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustingTrainer(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold cursor-pointer"
                >
                  {adjustLoading ? 'Saving...' : 'Save New Quota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
