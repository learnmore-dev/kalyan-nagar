import React, { useState, useEffect } from 'react';
import { getStoredUser } from '@/lib/auth';
import { User, TaskLog, TaskCategory } from '@/lib/types';
import {
  FileText,
  CheckCircle2,
  Clock,
  RotateCcw,
  BookOpen,
  Calendar,
  Layers,
  ArrowRight,
  Plus,
  Play,
  Pause,
  CheckSquare,
  Sparkles,
  BarChart3,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Quote,
  Flame,
  Zap,
  Target
} from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  doubt_solving: 'Student Doubt Solving',
  paper_checking: 'Test Paper Evaluation',
  calling: 'Parent / Absentee Calling',
  curriculum_planning: 'Curriculum & Notes Prep',
  lab_assistance: 'Lab Practical Assistance',
  other: 'Other Work',
};

/* ── Deep Work & Sprint Execution Quotes with HD Tech Backgrounds ─────────── */
const TASK_EXECUTION_QUOTES = [
  {
    quote: "Deep work is the ability to focus without distraction on a cognitively demanding task. It makes you produce at an elite level.",
    author: "Cal Newport",
    role: "Author of Deep Work & CS Professor",
    tag: "⚡ Deep Work Mastery",
    bgImage: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "You do not rise to the level of your goals. You fall to the level of your systems. Execute daily sprints consistently.",
    author: "James Clear",
    role: "Author of Atomic Habits",
    tag: "🎯 Systems & Discipline",
    bgImage: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "Efficiency is doing things right; effectiveness is doing the right things. Track every minute spent delivering value.",
    author: "Peter Drucker",
    role: "Management Consultant & Educator",
    tag: "🔥 High-Leverage Impact",
    bgImage: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "Focus on the task right in front of you as if it were the last thing you were doing in your life.",
    author: "Marcus Aurelius",
    role: "Stoic Philosopher & Roman Emperor",
    tag: "💎 Relentless Focus",
    bgImage: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "Small daily improvements over time lead to stunning results. Finish every pending task with passion.",
    author: "Robin Sharma",
    role: "Leadership & Performance Mentor",
    tag: "🚀 Sprint Momentum",
    bgImage: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600&auto=format&fit=crop&q=80",
  },
];

const PAGE_SIZE = 5;

export default function TrainerTasksPage() {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<TaskLog[]>([]);
  const [activeTask, setActiveTask] = useState<TaskLog | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  // Quotes Carousel State
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setQuoteIdx((prev) => (prev + 1) % TASK_EXECUTION_QUOTES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  // Pagination & Filtering State
  const [currentPage, setCurrentPage] = useState(1);
  const [taskTypeFilter, setTaskTypeFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [batchFilter, setBatchFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingTask, setViewingTask] = useState<TaskLog | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('doubt_solving');
  const [notes, setNotes] = useState('');

  const fetchTasks = async (userId: string) => {
    try {
      const res = await fetch(`/api/tasks?trainer_id=${userId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
        const current = data.tasks.find((t: TaskLog) => !t.is_completed);
        if (current) setActiveTask(current);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    const u = getStoredUser();
    if (u) {
      setUser(u);
      fetchTasks(u.id);
    }
  }, []);

  const parseStartTime = (isoStr: string) => {
    if (!isoStr) return Date.now();
    let formatted = isoStr;
    if (!formatted.includes('T') && formatted.includes(' ')) {
      formatted = formatted.replace(' ', 'T');
    }
    const parsed = new Date(formatted).getTime();
    return isNaN(parsed) ? Date.now() : parsed;
  };

  // Timer loop for active task
  useEffect(() => {
    let timer: any = null;
    if (activeTask) {
      const startMs = parseStartTime(activeTask.start_time);
      const calcElapsed = () => Math.max(0, Math.floor((Date.now() - startMs) / 1000));

      setElapsedSec(calcElapsed());
      timer = setInterval(() => {
        setElapsedSec(calcElapsed());
      }, 1000);
    } else {
      setElapsedSec(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeTask]);

  const handleStartTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;

    const tempId = `task_${Date.now()}`;
    const newTask: TaskLog = {
      id: tempId,
      trainer_id: user.id,
      trainer_name: user.name,
      title: title.trim(),
      category,
      notes,
      is_completed: false,
      duration_minutes: 0,
      start_time: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    // Immediately start active task locally for instant response
    setActiveTask(newTask);
    setTasks((prev) => [newTask, ...prev]);

    setTitle('');
    setNotes('');
    setCategory('doubt_solving');
    setShowAddModal(false);

    // Sync to backend
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          trainer_id: user.id,
          title: newTask.title,
          category: newTask.category,
          notes: newTask.notes,
        }),
      });
      const data = await res.json();
      if (data.success && data.task) {
        const savedTask: TaskLog = {
          ...data.task,
          id: String(data.task.id),
        };
        setActiveTask(savedTask);
        setTasks((prev) => [savedTask, ...prev.filter((t) => t.id !== tempId)]);
      }
    } catch {
      // silent
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    if (!user) return;
    const duration_minutes = Math.max(1, Math.round(elapsedSec / 60));
    const targetId = activeTask?.id || taskId;

    // Update local state immediately
    setActiveTask(null);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId || t.id === targetId ? { ...t, is_completed: true, duration_minutes } : t))
    );

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', taskId: targetId, duration_minutes }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTasks(user.id);
      }
    } catch {
      // silent
    }
  };

  const handleResetFilters = () => {
    setTaskTypeFilter('all');
    setBatchFilter('all');
    setCategoryFilter('all');
    setCurrentPage(1);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Default initial tasks if list is empty
  const defaultTasks: TaskLog[] = [
    {
      id: 'mock_1',
      trainer_id: user?.id || 't1',
      trainer_name: user?.name || 'Rahul Sharma',
      title: 'PARENT / ABSENTEE CALLING',
      category: 'calling',
      notes: 'Make parent calls for absent students and update the call log.',
      is_completed: false,
      duration_minutes: 0,
      start_time: new Date(Date.now() - 3600000).toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: 'mock_2',
      trainer_id: user?.id || 't1',
      trainer_name: user?.name || 'Rahul Sharma',
      title: 'LAB PRACTICAL ASSISTANCE',
      category: 'lab_assistance',
      notes: 'Assist students during lab practical sessions and resolve queries.',
      is_completed: true,
      duration_minutes: 45,
      start_time: new Date(Date.now() - 86400000).toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: 'mock_3',
      trainer_id: user?.id || 't1',
      trainer_name: user?.name || 'Rahul Sharma',
      title: 'TEST PAPER EVALUATION',
      category: 'paper_checking',
      notes: 'Evaluate Java & SQL mid-term test papers for Batch A.',
      is_completed: false,
      duration_minutes: 0,
      start_time: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: 'mock_4',
      trainer_id: user?.id || 't1',
      trainer_name: user?.name || 'Rahul Sharma',
      title: 'CURRICULUM & NOTES PREP',
      category: 'curriculum_planning',
      notes: 'Prepare Python Data Structures lecture notes and slides.',
      is_completed: true,
      duration_minutes: 60,
      start_time: new Date(Date.now() - 172800000).toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: 'mock_5',
      trainer_id: user?.id || 't1',
      trainer_name: user?.name || 'Rahul Sharma',
      title: 'STUDENT DOUBT SOLVING 1-ON-1',
      category: 'doubt_solving',
      notes: 'Resolve doubt tickets for SQL Subqueries and Joins.',
      is_completed: true,
      duration_minutes: 30,
      start_time: new Date(Date.now() - 259200000).toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: 'mock_6',
      trainer_id: user?.id || 't1',
      trainer_name: user?.name || 'Rahul Sharma',
      title: 'WEEKLY BATCH REVIEW & FEEDBACK',
      category: 'other',
      notes: 'Log student attendance review and feedback scores.',
      is_completed: false,
      duration_minutes: 0,
      start_time: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ];

  const allDisplayTasks = tasks;

  // Filtering
  const filteredTasks = allDisplayTasks.filter((task) => {
    if (taskTypeFilter === 'pending' && task.is_completed) return false;
    if (taskTypeFilter === 'completed' && !task.is_completed) return false;
    if (categoryFilter !== 'all' && task.category !== categoryFilter) return false;
    return true;
  });

  // Pagination calculations (5 per page)
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + PAGE_SIZE);

  const totalCount = allDisplayTasks.length;
  const completedCount = allDisplayTasks.filter((t) => t.is_completed).length;
  const pendingCount = allDisplayTasks.filter((t) => !t.is_completed).length;
  const completionRate = totalCount > 0 ? ((completedCount / totalCount) * 100).toFixed(1) : '0.0';

  if (!user) return null;

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Dynamic Deep Work & Sprint Execution Hero Banner ───────────────────────────────── */}
      <div className="relative rounded-3xl p-6 sm:p-8 lg:p-9 text-white overflow-hidden shadow-2xl border border-amber-500/30 min-h-[260px] bg-slate-950">
        {/* Dynamic Rotating Background Images with Smooth Crossfade */}
        {TASK_EXECUTION_QUOTES.map((item, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === quoteIdx ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
            }`}
            style={{
              backgroundImage: `linear-gradient(135deg, rgba(194, 65, 12, 0.94) 0%, rgba(124, 45, 18, 0.92) 50%, rgba(15, 23, 42, 0.93) 100%), url('${item.bgImage}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transitionProperty: 'opacity, transform',
              transitionDuration: '1000ms',
            }}
          />
        ))}

        {/* Ambient Glowing Orbs */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-64 h-64 bg-orange-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left Column: Title & Info */}
          <div className="space-y-3 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-400/20 text-amber-200 border border-amber-400/30 backdrop-blur-md">
                <Flame className="w-3.5 h-3.5 text-amber-300" /> Daily Sprint & Execution Hub
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-white/10 text-white border border-white/15">
                <Target className="h-3.5 w-3.5 text-amber-400" /> Focus Tracker
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight text-white drop-shadow-sm">
              Trainer Task & Sprint Log
            </h1>

            <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed font-normal">
              Track real-time activity timers, doubt-solving sessions, evaluation milestones, and sprint progress with complete focus.
            </p>

            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-white text-amber-950 font-extrabold text-xs shadow-md hover:bg-amber-50 transition-all cursor-pointer active:scale-95"
              >
                <Plus className="h-4 w-4 text-amber-600" /> Add New Task
              </button>
            </div>
          </div>

          {/* Right Column: Interactive Motivational Quotes Carousel */}
          <div className="w-full lg:w-[480px] bg-slate-950/75 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden group">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/30 border border-amber-400/30 text-[10px] font-extrabold text-amber-200 uppercase tracking-wider">
                {TASK_EXECUTION_QUOTES[quoteIdx].tag}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                  className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  title={isAutoPlaying ? 'Pause rotation' : 'Play rotation'}
                >
                  {isAutoPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setQuoteIdx((prev) => (prev - 1 + TASK_EXECUTION_QUOTES.length) % TASK_EXECUTION_QUOTES.length)
                  }
                  className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  title="Previous quote"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setQuoteIdx((prev) => (prev + 1) % TASK_EXECUTION_QUOTES.length)}
                  className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  title="Next quote"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="min-h-[72px] flex items-start gap-3">
              <Quote className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 opacity-80" />
              <p className="text-xs sm:text-sm font-medium text-slate-100 italic leading-snug">
                "{TASK_EXECUTION_QUOTES[quoteIdx].quote}"
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="text-xs font-bold text-white">{TASK_EXECUTION_QUOTES[quoteIdx].author}</div>
                <div className="text-[10px] text-amber-300">{TASK_EXECUTION_QUOTES[quoteIdx].role}</div>
              </div>

              {/* Step indicator dots */}
              <div className="flex items-center gap-1">
                {TASK_EXECUTION_QUOTES.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    type="button"
                    onClick={() => setQuoteIdx(dotIdx)}
                    className={`h-1.5 rounded-full transition-all ${
                      dotIdx === quoteIdx ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Stopwatch Banner */}
      {activeTask && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 border border-blue-500/40 shadow-xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="h-3.5 w-3.5 rounded-full bg-emerald-400 pulse-green shrink-0" />
            <div>
              <div className="text-[10px] font-black uppercase text-cyan-400 tracking-wider font-mono">
                ACTIVE TASK STOPWATCH IN PROGRESS
              </div>
              <div className="text-base font-bold text-white">{activeTask.title}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-black font-mono tracking-tight text-emerald-400">
              {formatTimer(elapsedSec)}
            </div>
            <button
              onClick={() => handleCompleteTask(activeTask.id)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer transform-gpu active:scale-95"
            >
              <CheckCircle2 className="h-4 w-4" /> Finish & Log Task ({Math.max(1, Math.round(elapsedSec / 60))}m)
            </button>
          </div>
        </div>
      )}

      {/* 2. Filter Bar */}
      <div className="canva-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          {/* Task Type Filter */}
          <div className="space-y-1 min-w-[180px] flex-1 sm:flex-none">
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Task Type
            </label>
            <select
              value={taskTypeFilter}
              onChange={(e) => {
                setTaskTypeFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="all">📝 All Tasks</option>
              <option value="pending">⏳ Pending Tasks</option>
              <option value="completed">✅ Completed Tasks</option>
            </select>
          </div>

          {/* Batch Filter */}
          <div className="space-y-1 min-w-[200px] flex-1 sm:flex-none">
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Batch
            </label>
            <select
              value={batchFilter}
              onChange={(e) => {
                setBatchFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="all">👥 All Batches</option>
              <option value="lmt_sql">LMT-KN-SEP-OFF-SQL-10AM</option>
              <option value="lmt_py">LMT-KN-PY-MORNING</option>
              <option value="lmt_fullstack">LMT-FULLSTACK-EVE</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="space-y-1 min-w-[200px] flex-1 sm:flex-none">
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="all">📂 All Categories</option>
              <option value="doubt_solving">Student Doubt Solving</option>
              <option value="paper_checking">Test Paper Evaluation</option>
              <option value="calling">Parent / Absentee Calling</option>
              <option value="curriculum_planning">Curriculum & Notes Prep</option>
              <option value="lab_assistance">Lab Practical Assistance</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleResetFilters}
            className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer transform-gpu active:scale-95"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset Filters</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer transform-gpu active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Start Stopwatch Task</span>
          </button>
        </div>
      </div>

      {/* 3. Task Overview Stat Cards */}
      <div className="canva-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">Task Overview</h2>
            <p className="text-xs text-slate-500 font-medium">Your pending and completed tasks at a glance</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Total Tasks */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-extrabold text-blue-900 uppercase tracking-wider">Total Tasks</div>
              <div className="text-2xl font-black text-blue-900 font-mono">{totalCount}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <FileText className="h-5 w-5" />
            </div>
          </div>

          {/* Pending */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">Pending</div>
              <div className="text-2xl font-black text-amber-900 font-mono">{pendingCount}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
              <Clock className="h-5 w-5" />
            </div>
          </div>

          {/* Completed */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider">Completed</div>
              <div className="text-2xl font-black text-emerald-900 font-mono">{completedCount}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

          {/* Completion Rate */}
          <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-extrabold text-purple-900 uppercase tracking-wider">Completion Rate</div>
              <div className="text-2xl font-black text-purple-900 font-mono">{completionRate}%</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Assigned Tasks List Section */}
      <div className="canva-card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">Assigned Tasks</h2>
              <p className="text-xs text-slate-500 font-medium">Complete your pending tasks and stay on track</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>Showing {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, filteredTasks.length)} of {filteredTasks.length} tasks</span>
          </div>
        </div>

        {/* Task Cards List */}
        <div className="space-y-4">
          {paginatedTasks.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-bold">
              No tasks found matching the selected filters.
            </div>
          ) : (
            paginatedTasks.map((task) => (
              <div
                key={task.id}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm ${
                    task.is_completed ? 'bg-purple-600' : 'bg-rose-500'
                  }`}>
                    <FileText className="h-6 w-6" />
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">
                      {task.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-2xl">
                      {task.notes || 'Task activity details logged for faculty track record.'}
                    </p>

                    {/* Pill Badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {task.batch_name && (
                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200/60">
                          Batch: {task.batch_name}
                        </span>
                      )}
                      <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-[11px] font-bold border border-purple-200/60">
                        Category: {CATEGORY_LABELS[task.category] || String(task.category || 'other').replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Status & Action Pill Buttons */}
                <div className="flex flex-wrap items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                  <div className="space-y-1 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      {task.is_completed ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-extrabold border border-emerald-200 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Completed
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-extrabold border border-rose-200 flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 text-rose-600" /> Pending
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 justify-end">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span>{task.is_completed ? `Completed in ${task.duration_minutes || 45} mins` : 'Due: Active Time-Block'}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {!task.is_completed && (
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        className="px-3.5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer transform-gpu active:scale-95"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Mark Complete</span>
                      </button>
                    )}

                    {!activeTask && !task.is_completed && (
                      <button
                        onClick={() => {
                          setActiveTask(task);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-3.5 py-2 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Start Timer</span>
                      </button>
                    )}

                    <button
                      onClick={() => setViewingTask(task)}
                      className="px-4 py-2 rounded-full border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer transform-gpu active:scale-95"
                    >
                      <span>View Details</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 5. Pagination Controls (5 items per page) */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-500 font-semibold">
              Page <span className="font-extrabold text-slate-900">{currentPage}</span> of <span className="font-extrabold text-slate-900">{totalPages}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`h-8 w-8 rounded-xl text-xs font-extrabold transition-all ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal 1: Start Stopwatch Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="canva-card w-full max-w-lg p-6 sm:p-8 space-y-6 bg-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900">Start / Log New Task Activity</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleStartTask} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 font-extrabold uppercase mb-1.5">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1-on-1 Doubt solving for Batch A"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-extrabold uppercase mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                >
                  <option value="doubt_solving">Student Doubt Solving</option>
                  <option value="paper_checking">Test Paper Evaluation</option>
                  <option value="calling">Parent / Absentee Calling</option>
                  <option value="curriculum_planning">Curriculum & Notes Prep</option>
                  <option value="lab_assistance">Lab Practical Assistance</option>
                  <option value="other">Other Work</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-extrabold uppercase mb-1.5">Notes / Details</label>
                <input
                  type="text"
                  placeholder="Specific student names or topics..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold flex items-center gap-2 shadow-md shadow-blue-600/25 cursor-pointer transform-gpu active:scale-95"
                >
                  <Play className="h-4 w-4" /> Start Stopwatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: View Details Modal */}
      {viewingTask && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="canva-card w-full max-w-md p-6 sm:p-8 space-y-5 bg-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900">Task Details</h3>
              </div>
              <button
                onClick={() => setViewingTask(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-700">
              <div>
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Task Title</div>
                <div className="text-base font-black text-slate-900">{viewingTask.title}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
                  <div className="text-[10px] text-slate-400 font-extrabold uppercase">Status</div>
                  <div className="font-extrabold pt-0.5">
                    {viewingTask.is_completed ? (
                      <span className="text-emerald-600 font-black">✅ Completed</span>
                    ) : (
                      <span className="text-rose-600 font-black">⏳ Pending</span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
                  <div className="text-[10px] text-slate-400 font-extrabold uppercase">Category</div>
                  <div className="font-extrabold text-blue-700 pt-0.5 truncate">
                    {CATEGORY_LABELS[viewingTask.category] || String(viewingTask.category).replace(/_/g, ' ')}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Description & Notes</div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 text-slate-800 leading-relaxed italic">
                  "{viewingTask.notes || 'No extra notes logged.'}"
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                {viewingTask.batch_name && (
                  <div>
                    <div className="text-[10px] text-slate-400 font-extrabold uppercase">Assigned Batch</div>
                    <div className="font-extrabold text-slate-800">{viewingTask.batch_name}</div>
                  </div>
                )}
                <div>
                  <div className="text-[10px] text-slate-400 font-extrabold uppercase">Duration / Log Time</div>
                  <div className="font-extrabold text-slate-800">{viewingTask.duration_minutes || 45} Minutes</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
              {!viewingTask.is_completed && (
                <button
                  onClick={() => {
                    handleCompleteTask(viewingTask.id);
                    setViewingTask(null);
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transform-gpu active:scale-95"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Mark Task Completed</span>
                </button>
              )}
              <button
                onClick={() => setViewingTask(null)}
                className="px-6 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
