import React, { useState, useEffect } from 'react';
import {
  Calendar,
  RefreshCw,
  Clock,
  BookOpen,
  CheckSquare,
  Users,
  Zap,
  Search,
  Filter,
  AlertCircle,
  MapPin,
  X,
  ExternalLink,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface Block {
  type: 'class' | 'task' | 'idle';
  label: string;
  start: string;
  end: string;
  duration_minutes: number;
  batch_name?: string;
  category?: string;
  is_completed?: boolean;
  color: string;
}

interface TrainerRow {
  trainer_id: string;
  trainer_name: string;
  username: string;
  designation: string;
  check_in: string | null;
  check_out: string | null;
  day_status: string;
  photo_in: string | null;
  photo_out: string | null;
  location_name: string | null;
  live_status: string;
  live_label: string;
  current_task_title: string | null;
  current_batch_name: string | null;
  status_started_at: string | null;
  total_class_minutes: number;
  total_task_minutes: number;
  total_idle_minutes: number;
  total_logged_minutes: number;
  session_count: number;
  task_count: number;
  blocks: Block[];
}

/* ── Time Helpers ──────────────────────────────────── */
const toMin = (t: string) => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

const fmtMin = (m: number) => {
  if (!m || m <= 0) return '0m';
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min > 0 ? min + 'm' : ''}`.trim() : `${min}m`;
};

/* Day starts at 08:00 and ends at 20:00 = 720 min window */
const DAY_START = 8 * 60;   // 480
const DAY_END   = 20 * 60;  // 1200
const DAY_SPAN  = DAY_END - DAY_START; // 720

const pct = (timeStr: string) => {
  const m = toMin(timeStr);
  return Math.max(0, Math.min(100, ((m - DAY_START) / DAY_SPAN) * 100));
};

const widthPct = (start: string, end: string) => {
  const s = Math.max(toMin(start), DAY_START);
  const e = Math.min(toMin(end),   DAY_END);
  return Math.max(0.6, ((e - s) / DAY_SPAN) * 100);
};

/* Hour markers: 8 AM to 8 PM */
const HOUR_MARKS = Array.from({ length: 13 }, (_, i) => {
  const h = 8 + i;
  return { label: h === 12 ? '12PM' : h < 12 ? `${h}AM` : `${h - 12}PM`, pct: ((i * 60) / DAY_SPAN) * 100 };
});

/* Live status style helper */
const getLiveBadge = (status: string) => {
  switch (status) {
    case 'in_class':
      return { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', dot: '#2563eb', label: 'In Class' };
    case 'on_task':
      return { bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9', dot: '#7c3aed', label: 'Working on Task' };
    case 'break':
      return { bg: '#fffbeb', border: '#fef3c7', text: '#b45309', dot: '#d97706', label: 'On Break' };
    case 'has_sessions':
      return { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', dot: '#16a34a', label: 'Has Sessions' };
    default:
      return { bg: '#fff1f2', border: '#fecdd3', text: '#be123c', dot: '#e11d48', label: 'Idle / Free' };
  }
};

export default function AdminTrainerTimelinePage() {
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const [date, setDate]                   = useState(getTodayStr());
  const [trainers, setTrainers]           = useState<TrainerRow[]>([]);
  const [loading, setLoading]             = useState(true);
  const [autoRefresh, setAutoRefresh]     = useState(true);
  const [searchTerm, setSearchTerm]       = useState('');
  const [statusFilter, setStatusFilter]   = useState<'all' | 'in_class' | 'on_task' | 'idle' | 'occupied'>('all');
  const [tooltip, setTooltip]             = useState<{ block: Block; x: number; y: number } | null>(null);
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerRow | null>(null);
  const [nowMin, setNowMin]               = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  const isToday = date === getTodayStr();

  // Update current time every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async (d: string, showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res  = await fetch(`/api/trainer-timeline/?date=${d}`);
      const data = await res.json();
      if (data.success) {
        setTrainers(data.trainers || []);
      }
    } catch {
      /* silent retry */
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(date);
  }, [date]);

  // Auto refresh every 15s if today & autoRefresh enabled
  useEffect(() => {
    if (!autoRefresh || !isToday) return;
    const interval = setInterval(() => {
      fetchData(date, false);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, isToday, date]);

  /* Filtered Trainers */
  const filteredTrainers = trainers.filter(t => {
    const matchesSearch =
      t.trainer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.designation && t.designation.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'in_class') return t.live_status === 'in_class';
    if (statusFilter === 'on_task') return t.live_status === 'on_task';
    if (statusFilter === 'idle') return t.live_status === 'idle' && t.session_count === 0 && t.task_count === 0;
    if (statusFilter === 'occupied') return t.session_count > 0 || t.task_count > 0;

    return true;
  });

  /* Aggregate summary metrics */
  const inClassCount   = trainers.filter(t => t.live_status === 'in_class').length;
  const onTaskCount    = trainers.filter(t => t.live_status === 'on_task').length;
  const idleCount      = trainers.filter(t => t.live_status === 'idle' && !t.session_count && !t.task_count).length;
  const totalWorkMins  = trainers.reduce((acc, t) => acc + t.total_logged_minutes, 0);
  const totalIdleMins  = trainers.reduce((acc, t) => acc + t.total_idle_minutes, 0);

  const nowPct = Math.max(0, Math.min(100, ((nowMin - DAY_START) / DAY_SPAN) * 100));
  const nowTimeString = `${String(Math.floor(nowMin / 60)).padStart(2, '0')}:${String(nowMin % 60).padStart(2, '0')}`;

  return (
    <main
      className="flex-1 w-full max-w-[1700px] mx-auto p-4 sm:p-7 space-y-6"
      onClick={() => setTooltip(null)}
    >

      {/* ── Header ──────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-indigo-600 animate-pulse" />
              Live Trainer Activity Timeline
            </h1>
            {isToday && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold animate-pulse">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                LIVE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Real-time visual monitoring of classes, tasks, attendance, and idle intervals per trainer.
          </p>
        </div>

        {/* Controls: Date Picker, Auto Refresh, Refresh Button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date selector */}
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
            <Calendar className="h-4 w-4 text-indigo-600" />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            />
          </div>

          {/* Quick "Today" shortcut if custom date selected */}
          {!isToday && (
            <button
              onClick={() => setDate(getTodayStr())}
              className="px-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              Jump to Today
            </button>
          )}

          {/* Live Auto Refresh toggle */}
          {isToday && (
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                autoRefresh
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
                  : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
              }`}
              title="Toggle automatic refresh every 15s"
            >
              <span className={`h-2 w-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
              Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
            </button>
          )}

          {/* Manual Refresh button */}
          <button
            onClick={() => fetchData(date)}
            className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs text-slate-600 hover:text-indigo-600 hover:border-indigo-300 transition-colors cursor-pointer"
            title="Refresh Timeline Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Summary Stats Cards ───────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        {[
          {
            label: 'Total Trainers',
            value: trainers.length,
            color: '#2563eb',
            bg: '#eff6ff',
            icon: <Users className="h-4 w-4" />,
            subtitle: `${trainers.filter(t => t.check_in).length} Checked In Today`
          },
          {
            label: 'In Class Now',
            value: inClassCount,
            color: '#2563eb',
            bg: '#dbeafe',
            icon: <BookOpen className="h-4 w-4" />,
            subtitle: `${trainers.reduce((a, t) => a + t.session_count, 0)} Total Sessions`
          },
          {
            label: 'On Task Now',
            value: onTaskCount,
            color: '#7c3aed',
            bg: '#f5f3ff',
            icon: <CheckSquare className="h-4 w-4" />,
            subtitle: `${trainers.reduce((a, t) => a + t.task_count, 0)} Total Tasks`
          },
          {
            label: 'Idle / Free',
            value: idleCount,
            color: '#e11d48',
            bg: '#fff1f2',
            icon: <Zap className="h-4 w-4" />,
            subtitle: `${fmtMin(totalIdleMins)} Total Idle Time`
          },
          {
            label: 'Logged Work Hrs',
            value: `${(totalWorkMins / 60).toFixed(1)}h`,
            color: '#059669',
            bg: '#ecfdf5',
            icon: <Clock className="h-4 w-4" />,
            subtitle: `${fmtMin(totalWorkMins)} Productive`
          },
        ].map(s => (
          <div
            key={s.label}
            className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
            style={{ borderTop: `3px solid ${s.color}` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                {s.label}
              </span>
              <div
                className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 font-bold"
                style={{ background: s.bg, color: s.color }}
              >
                {s.icon}
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black font-mono tracking-tight text-slate-800">
                {s.value}
              </div>
              <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                {s.subtitle}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters & Search Toolbar ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search trainer by name, username, or role..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <span className="text-slate-400 mr-1 flex items-center gap-1 text-[11px]">
            <Filter className="h-3 w-3" /> Filter:
          </span>
          {[
            { id: 'all', label: 'All Trainers' },
            { id: 'in_class', label: '🔵 In Class' },
            { id: 'on_task', label: '🟣 On Task' },
            { id: 'idle', label: '🔴 Idle / Free' },
            { id: 'occupied', label: '⚡ Has Activity' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                statusFilter === f.id
                  ? 'bg-slate-900 text-white shadow-xs font-black'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Legend Bar ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between text-xs font-semibold bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200/60">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="h-3 w-7 rounded-md bg-blue-600 border border-blue-700 shadow-xs" />
            <span className="text-slate-700">Batch / Class Session</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-7 rounded-md bg-purple-600 border border-purple-700 shadow-xs" />
            <span className="text-slate-700">Task / Syllabus Work</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-7 rounded-md border border-rose-400"
              style={{
                background: 'repeating-linear-gradient(45deg, #fff1f2, #fff1f2 4px, #fecdd3 4px, #fecdd3 8px)'
              }}
            />
            <span className="text-slate-700">Idle Gap (Unassigned)</span>
          </div>
          {isToday && (
            <div className="flex items-center gap-2">
              <span className="h-3 w-1.5 bg-rose-500 rounded-full shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
              <span className="text-rose-600 font-bold">Current Time Indicator</span>
            </div>
          )}
        </div>
        <span className="text-slate-400 text-[11px]">Click row or block for detailed breakdown</span>
      </div>

      {/* ── Timeline Grid ───────────────────────────── */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 flex flex-col items-center justify-center gap-3 text-slate-400 text-sm font-medium">
          <div className="h-8 w-8 rounded-full border-3 border-indigo-100 border-t-indigo-600 animate-spin" />
          Fetching live timeline data…
        </div>
      ) : filteredTrainers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-2">
          <AlertCircle className="h-8 w-8 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">No matching trainers found.</p>
          <p className="text-xs text-slate-400">Try adjusting your search terms or filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Hour Ruler */}
          <div
            className="flex items-end px-4 pt-3 pb-2 bg-slate-50/80 border-b border-slate-200 relative"
            style={{ marginLeft: '220px' }}
          >
            <div className="relative w-full h-5">
              {HOUR_MARKS.map(h => (
                <div
                  key={h.label}
                  className="absolute text-[10px] font-mono font-bold text-slate-400 -translate-x-1/2"
                  style={{ left: `${h.pct}%` }}
                >
                  {h.label}
                </div>
              ))}
            </div>
          </div>

          {/* Trainer Rows */}
          <div className="divide-y divide-slate-100">
            {filteredTrainers.map(trainer => {
              const bBadge = getLiveBadge(trainer.live_status);
              const hasActivity = trainer.session_count > 0 || trainer.task_count > 0;

              return (
                <div
                  key={trainer.trainer_id}
                  className="flex items-center gap-0 hover:bg-slate-50/70 transition-colors group cursor-pointer"
                  onClick={() => setSelectedTrainer(trainer)}
                >

                  {/* Left Column: Trainer Info */}
                  <div className="w-[220px] shrink-0 p-3.5 space-y-1.5 border-r border-slate-100 bg-white group-hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center font-black text-xs text-white shrink-0 shadow-xs"
                        style={{ background: 'linear-gradient(135deg, #4f46e5, #2563eb)' }}
                      >
                        {trainer.trainer_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                          {trainer.trainer_name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          @{trainer.username}
                        </div>
                      </div>
                    </div>

                    {/* Live Status Badge */}
                    <div className="flex items-center justify-between gap-1 pt-0.5">
                      <div
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                        style={{
                          background: bBadge.bg,
                          borderColor: bBadge.border,
                          color: bBadge.text
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{
                            background: bBadge.dot,
                            animation: trainer.live_status === 'in_class' ? 'pulse 2s infinite' : 'none'
                          }}
                        />
                        <span className="truncate max-w-[120px]">{bBadge.label}</span>
                      </div>

                      <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                    </div>

                    {/* Attendance check-in / out time */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                      <span>Check In:</span>
                      <span className="font-bold text-slate-700">
                        {trainer.check_in ? (
                          `${trainer.check_in}${trainer.check_out ? ` → ${trainer.check_out}` : ' → Live'}`
                        ) : (
                          <span className="text-rose-500 font-sans font-semibold">Not Checked In</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Timeline Grid Bar */}
                  <div className="flex-1 py-3 px-4 relative">
                    <div
                      className="relative h-10 rounded-xl overflow-hidden shadow-inner"
                      style={{
                        background: hasActivity ? '#f8fafc' : '#fff1f2',
                        border: hasActivity ? '1px solid #e2e8f0' : '1px solid #fecdd3'
                      }}
                    >
                      {/* Hour Grid Lines */}
                      {HOUR_MARKS.slice(1, -1).map(h => (
                        <div
                          key={h.label}
                          className="absolute top-0 h-full border-l border-dashed border-slate-200/70"
                          style={{ left: `${h.pct}%` }}
                        />
                      ))}

                      {/* Live NOW Red Line Marker */}
                      {isToday && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-20 shadow-[0_0_8px_rgba(244,63,94,0.9)]"
                          style={{ left: `${nowPct}%` }}
                        >
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-rose-600 text-white text-[8px] font-black px-1 rounded-xs uppercase tracking-tighter">
                            NOW
                          </div>
                        </div>
                      )}

                      {/* Fallback if no activity recorded */}
                      {!hasActivity && !trainer.check_in && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5" /> No attendance or activity logged today
                          </span>
                        </div>
                      )}

                      {/* Render Blocks (Classes, Tasks, Idle Gaps) */}
                      {trainer.blocks.map((block, bi) => {
                        const left  = pct(block.start);
                        const width = widthPct(block.start, block.end);
                        const isClass = block.type === 'class';
                        const isTask  = block.type === 'task';
                        const isIdle  = block.type === 'idle';

                        return (
                          <div
                            key={bi}
                            className="absolute top-1 bottom-1 rounded-lg cursor-pointer flex items-center px-2 overflow-hidden transition-all hover:scale-[1.01] hover:z-30 shadow-xs"
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                              background: isClass
                                ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                                : isTask
                                ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                                : 'repeating-linear-gradient(45deg, #fff1f2, #fff1f2 5px, #ffe4e6 5px, #ffe4e6 10px)',
                              border: isClass
                                ? '1.5px solid #1e40af'
                                : isTask
                                ? '1.5px solid #5b21b6'
                                : '1px dashed #f43f5e',
                              color: isIdle ? '#e11d48' : '#ffffff',
                              minWidth: '6px',
                            }}
                            onClick={e => {
                              e.stopPropagation();
                              setTooltip({ block, x: e.clientX, y: e.clientY });
                            }}
                          >
                            {width > 3 && (
                              <span className="text-[10px] font-bold truncate tracking-tight flex items-center gap-1">
                                {isClass && '📚 '}
                                {isTask && '✅ '}
                                {isIdle && '⏳ '}
                                {width > 7 ? block.label : ''}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Stats summary bar below timeline */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5 text-[10px] font-semibold">
                      <div className="flex items-center gap-3 text-slate-500">
                        {trainer.session_count > 0 && (
                          <span className="flex items-center gap-1 text-blue-700 font-bold">
                            <BookOpen className="h-3 w-3" />
                            {trainer.session_count} Class{trainer.session_count > 1 ? 'es' : ''} ({fmtMin(trainer.total_class_minutes)})
                          </span>
                        )}
                        {trainer.task_count > 0 && (
                          <span className="flex items-center gap-1 text-purple-700 font-bold">
                            <CheckSquare className="h-3 w-3" />
                            {trainer.task_count} Task{trainer.task_count > 1 ? 's' : ''} ({fmtMin(trainer.total_task_minutes)})
                          </span>
                        )}
                        {trainer.total_idle_minutes > 0 && (
                          <span className="flex items-center gap-1 text-rose-600 font-bold">
                            <AlertTriangle className="h-3 w-3" />
                            Idle Gap: {fmtMin(trainer.total_idle_minutes)}
                          </span>
                        )}
                      </div>

                      <div className="text-slate-700 font-mono font-bold">
                        Logged: <span className="text-indigo-600">{fmtMin(trainer.total_logged_minutes)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Block Tooltip Popup ─────────────────────────────────── */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none rounded-2xl shadow-2xl p-3.5 space-y-1.5 text-xs animate-in fade-in zoom-in-95 duration-150"
          style={{
            top: tooltip.y - 12,
            left: Math.min(window.innerWidth - 260, tooltip.x + 12),
            background: '#0f172a',
            color: '#f8fafc',
            width: '260px',
            transform: 'translateY(-100%)',
            border: '1px solid rgba(255,255,255,0.15)'
          }}
        >
          <div className="flex items-center justify-between font-bold text-white text-sm">
            <span>
              {tooltip.block.type === 'class' ? '📚 Class Session' : tooltip.block.type === 'task' ? '✅ Task Log' : '⏳ Idle Gap'}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
              {fmtMin(tooltip.block.duration_minutes)}
            </span>
          </div>

          <div className="text-slate-200 font-medium leading-tight">
            {tooltip.block.label}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-white/10 text-[11px] font-mono text-indigo-300">
            <Clock className="h-3.5 w-3.5" />
            <span>{tooltip.block.start} → {tooltip.block.end}</span>
          </div>

          {tooltip.block.batch_name && (
            <div className="text-[11px] text-blue-300 font-semibold">
              Batch: {tooltip.block.batch_name}
            </div>
          )}
        </div>
      )}

      {/* ── Trainer Detail Modal Drawer ───────────────────────────── */}
      {selectedTrainer && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedTrainer(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-12 w-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-md"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #2563eb)' }}
                >
                  {selectedTrainer.trainer_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    {selectedTrainer.trainer_name}
                  </h2>
                  <p className="text-xs text-slate-500 font-semibold">
                    {selectedTrainer.designation} · <span className="font-mono text-indigo-600">@{selectedTrainer.username}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTrainer(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Attendance & Shift Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Check In</span>
                <div className="font-mono font-bold text-slate-800 text-sm mt-0.5">
                  {selectedTrainer.check_in || '—'}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Check Out</span>
                <div className="font-mono font-bold text-slate-800 text-sm mt-0.5">
                  {selectedTrainer.check_out || 'Active'}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attendance Status</span>
                <div className="font-bold text-emerald-600 text-sm mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="capitalize">{selectedTrainer.day_status || 'Present'}</span>
                </div>
              </div>

              {selectedTrainer.location_name && (
                <div className="col-span-2 sm:col-span-3 pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-slate-600 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span>Location: {selectedTrainer.location_name}</span>
                </div>
              )}
            </div>

            {/* Activity Time Distribution Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Time Distribution ({fmtMin(selectedTrainer.total_logged_minutes + selectedTrainer.total_idle_minutes)})</span>
                <span className="text-slate-400 text-[11px]">
                  {Math.round((selectedTrainer.total_logged_minutes / Math.max(1, selectedTrainer.total_logged_minutes + selectedTrainer.total_idle_minutes)) * 100)}% Productive
                </span>
              </div>

              <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
                <div
                  className="bg-blue-600 h-full transition-all"
                  style={{
                    width: `${(selectedTrainer.total_class_minutes / Math.max(1, selectedTrainer.total_logged_minutes + selectedTrainer.total_idle_minutes)) * 100}%`
                  }}
                  title={`Classes: ${fmtMin(selectedTrainer.total_class_minutes)}`}
                />
                <div
                  className="bg-purple-600 h-full transition-all"
                  style={{
                    width: `${(selectedTrainer.total_task_minutes / Math.max(1, selectedTrainer.total_logged_minutes + selectedTrainer.total_idle_minutes)) * 100}%`
                  }}
                  title={`Tasks: ${fmtMin(selectedTrainer.total_task_minutes)}`}
                />
                <div
                  className="bg-rose-400 h-full transition-all"
                  style={{
                    width: `${(selectedTrainer.total_idle_minutes / Math.max(1, selectedTrainer.total_logged_minutes + selectedTrainer.total_idle_minutes)) * 100}%`
                  }}
                  title={`Idle: ${fmtMin(selectedTrainer.total_idle_minutes)}`}
                />
              </div>
            </div>

            {/* Timeline Blocks Chronological List */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Chronological Activity Log ({selectedTrainer.blocks.length} events)
              </h3>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                {selectedTrainer.blocks.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 font-medium">
                    No activities recorded for this day.
                  </div>
                ) : (
                  selectedTrainer.blocks.map((b, i) => (
                    <div key={i} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs">
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                            b.type === 'class' ? 'bg-blue-600' : b.type === 'task' ? 'bg-purple-600' : 'bg-rose-500'
                          }`}
                        />
                        <div>
                          <div className="font-bold text-slate-800">{b.label}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {b.start} → {b.end}
                          </div>
                        </div>
                      </div>

                      <div className="font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl text-[11px]">
                        {fmtMin(b.duration_minutes)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer action button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedTrainer(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
