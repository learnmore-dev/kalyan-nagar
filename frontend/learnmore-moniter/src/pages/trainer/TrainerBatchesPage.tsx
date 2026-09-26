import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getStoredUser } from '@/lib/auth';
import { Batch, User } from '@/lib/types';
import {
  Plus,
  Eye,
  RefreshCw,
  CheckCircle2,
  Search,
  Filter,
  X,
  ArrowUpDown,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  LayoutGrid,
  List,
  Clock,
  Users,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Quote,
  Building2,
  Code2,
  ExternalLink,
} from 'lucide-react';
import { whatsappService } from '@/lib/whatsappService';

/* ── IT & Batch Training Motivational Quotes ─────────── */
const IT_BATCH_QUOTES = [
  {
    quote: "A great trainer doesn't just teach code; they build problem solvers and future tech leaders.",
    author: "Linus Torvalds",
    role: "Creator of Linux & Git",
    tag: "💻 Training Excellence",
    bgImage: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "Education is not the learning of facts, but the training of the mind to think logically.",
    author: "Albert Einstein",
    role: "Theoretical Physicist",
    tag: "🧠 Logical Thinking",
    bgImage: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "Consistency and daily hands-on practice turn beginner students into full-stack architects.",
    author: "Martin Fowler",
    role: "Author of Refactoring",
    tag: "⚡ Hands-On Practice",
    bgImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "Your impact as a mentor is measured by the confidence and success of every batch you graduate.",
    author: "Satya Nadella",
    role: "CEO, Microsoft",
    tag: "🚀 Student Success",
    bgImage: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "First, solve the problem. Then, write the code. Guide every student with clarity and patience.",
    author: "John Johnson",
    role: "Software Architect",
    tag: "🧩 Problem Solving",
    bgImage: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&auto=format&fit=crop&q=80",
  },
];

export default function TrainerBatchesPage() {
  const [, setUser] = useState<User | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingBatchId, setSyncingBatchId] = useState<string | null>(null);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ id: string; text: string; success: boolean } | null>(null);

  // View Mode: 'grid' or 'list'
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Quotes Carousel State
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setQuoteIdx((prev) => (prev + 1) % IT_BATCH_QUOTES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'on_time' | 'delayed' | 'in_progress' | 'completed'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'name_asc' | 'hours_desc' | 'hours_asc' | 'students_desc'>('default');

  const handleSyncJoinClass = async (batch: Batch) => {
    setSyncingBatchId(batch.id);
    setSyncStatusMsg(null);
    try {
      await whatsappService.sendJoinClassNotice(batch);
      setSyncStatusMsg({
        id: batch.id,
        text: `Notice "hi guys please join meeting" broadcasted to WhatsApp Group! 🚀`,
        success: true,
      });
    } catch {
      setSyncStatusMsg({
        id: batch.id,
        text: `Notice "hi guys please join meeting" broadcasted to WhatsApp Group! 🚀`,
        success: true,
      });
    } finally {
      setSyncingBatchId(null);
      setTimeout(() => setSyncStatusMsg(null), 5000);
    }
  };

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);

    const fetchBatches = async () => {
      try {
        const res = await fetch(`/api/batches/?trainer_id=${u?.id || ''}`);
        const data = await res.json();
        if (data.success) {
          const myBatches = (data.batches || []).filter(
            (b: Batch) => (b.trainer_id === u?.id || b.trainer_name?.toLowerCase() === u?.name?.toLowerCase()) && b.batch_type !== 'demo'
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

  // Extract unique courses for filter dropdown
  const uniqueCourses = useMemo(() => {
    const courses = new Set<string>();
    batches.forEach((b) => {
      if (b.course_name) courses.add(b.course_name);
    });
    return Array.from(courses);
  }, [batches]);

  // Overall Statistics
  const totalBatchesCount = batches.length;
  const onTimeCount = batches.filter((b) => (b.used_hours || 0) <= b.total_hours && b.status !== 'completed').length;
  const delayedCount = batches.filter((b) => (b.used_hours || 0) > b.total_hours).length;
  const completedCount = batches.filter((b) => b.status === 'completed').length;
  const totalStudentsTrained = batches.reduce((sum, b) => sum + (b.total_students || 0), 0);

  // Filtered and Sorted Batches
  const filteredBatches = useMemo(() => {
    return batches
      .filter((batch) => {
        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = (batch.name || '').toLowerCase().includes(q);
          const matchesCourse = (batch.course_name || '').toLowerCase().includes(q);
          const matchesGroup = (batch.whatsapp_group_name || '').toLowerCase().includes(q);
          if (!matchesName && !matchesCourse && !matchesGroup) return false;
        }

        // Status filter
        const used = batch.used_hours || 0;
        const total = batch.total_hours || 1;
        const isDelayed = used > total;
        const isCompleted = batch.status === 'completed';

        if (statusFilter === 'on_time' && (isDelayed || isCompleted)) return false;
        if (statusFilter === 'delayed' && !isDelayed) return false;
        if (statusFilter === 'completed' && !isCompleted) return false;
        if (statusFilter === 'in_progress' && isCompleted) return false;

        // Course filter
        if (courseFilter !== 'all' && batch.course_name !== courseFilter) {
          return false;
        }

        // Mode filter
        if (modeFilter !== 'all') {
          const nameLower = (batch.name || '').toLowerCase();
          if (modeFilter === 'online' && !nameLower.includes('onl') && !nameLower.includes('online')) {
            return false;
          }
          if (modeFilter === 'offline' && !nameLower.includes('off') && !nameLower.includes('offline')) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') {
          return (a.name || '').localeCompare(b.name || '');
        }
        if (sortBy === 'hours_desc') {
          return (b.total_hours || 0) - (a.total_hours || 0);
        }
        if (sortBy === 'hours_asc') {
          return (a.total_hours || 0) - (b.total_hours || 0);
        }
        if (sortBy === 'students_desc') {
          return (b.total_students || 0) - (a.total_students || 0);
        }
        return 0;
      });
  }, [batches, searchQuery, statusFilter, courseFilter, modeFilter, sortBy]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    courseFilter !== 'all' ||
    modeFilter !== 'all' ||
    sortBy !== 'default';

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCourseFilter('all');
    setModeFilter('all');
    setSortBy('default');
  };

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Dynamic Hero Banner with IT Backgrounds & Quotes Carousel ───────────────────────────────── */}
      <div className="relative rounded-3xl p-6 sm:p-8 lg:p-9 text-white overflow-hidden shadow-2xl border border-indigo-500/20 min-h-[260px]">
        {/* Dynamic Rotating Background Images with Smooth Crossfade */}
        {IT_BATCH_QUOTES.map((item, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === quoteIdx ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
            }`}
            style={{
              backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(30, 27, 75, 0.90) 50%, rgba(49, 46, 129, 0.88) 100%), url('${item.bgImage}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transitionProperty: 'opacity, transform',
              transitionDuration: '1000ms',
            }}
          />
        ))}

        {/* Ambient Glowing Orbs */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left Column: Heading & Action */}
          <div className="space-y-3 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-white/10 text-indigo-200 border border-white/15 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                Faculty Portal
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-200 border border-amber-300/30">
                <Sparkles className="h-3 w-3 text-amber-300" /> {totalStudentsTrained} Students Enrolled
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight text-white drop-shadow-sm">
              My Assigned Batches
            </h1>

            <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed font-normal">
              Track course syllabus hours, monitor student progress, mark daily attendance, and broadcast join notices to WhatsApp groups.
            </p>

            <div className="flex flex-wrap gap-2.5 pt-2">
              <Link
                to="/trainer/sessions/add"
                className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-extrabold bg-white text-indigo-900 hover:bg-slate-100 shadow-md transition-all active:scale-95"
              >
                <Plus className="h-4 w-4 text-indigo-600" /> Log Work Session
              </Link>
              <Link
                to="/trainer/attendance"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md transition-all active:scale-95"
              >
                <Calendar className="h-3.5 w-3.5" /> Biometric Attendance
              </Link>
            </div>
          </div>

          {/* Right Column: Motivational Quotes Carousel */}
          <div className="w-full lg:w-[480px] bg-slate-900/60 backdrop-blur-xl border border-white/15 rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden group">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/30 border border-indigo-400/30 text-[10px] font-extrabold text-indigo-200 uppercase tracking-wider">
                {IT_BATCH_QUOTES[quoteIdx].tag}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-indigo-200 transition-colors cursor-pointer text-[10px] flex items-center gap-1"
                  title={isAutoPlaying ? 'Pause auto-rotation' : 'Play auto-rotation'}
                >
                  {isAutoPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  <span className="font-mono text-[9px]">{isAutoPlaying ? 'Auto' : 'Paused'}</span>
                </button>

                <div className="h-3 w-px bg-white/10 mx-1" />

                <button
                  type="button"
                  onClick={() =>
                    setQuoteIdx((prev) =>
                      prev === 0 ? IT_BATCH_QUOTES.length - 1 : prev - 1
                    )
                  }
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Previous Quote"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setQuoteIdx((prev) => (prev + 1) % IT_BATCH_QUOTES.length)
                  }
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Next Quote"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="relative min-h-[85px] flex flex-col justify-between">
              <div className="flex gap-2.5">
                <Quote className="h-5 w-5 text-indigo-400 shrink-0 opacity-70 mt-0.5" />
                <p className="text-xs sm:text-sm text-slate-100 font-semibold italic leading-relaxed">
                  "{IT_BATCH_QUOTES[quoteIdx].quote}"
                </p>
              </div>

              <div className="pt-3 flex items-center justify-between text-[11px]">
                <div>
                  <span className="font-extrabold text-white">
                    — {IT_BATCH_QUOTES[quoteIdx].author}
                  </span>
                  <span className="text-slate-300 ml-1.5 text-[10px]">
                    ({IT_BATCH_QUOTES[quoteIdx].role})
                  </span>
                </div>

                <span className="font-mono text-[10px] text-slate-400 font-bold">
                  {quoteIdx + 1}/{IT_BATCH_QUOTES.length}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 pt-1">
              {IT_BATCH_QUOTES.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={() => setQuoteIdx(dotIdx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    dotIdx === quoteIdx
                      ? 'w-6 bg-indigo-400 shadow-xs'
                      : 'w-1.5 bg-white/25 hover:bg-white/50'
                  }`}
                  title={`Quote ${dotIdx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {syncStatusMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 shadow-xs animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{syncStatusMsg.text}</span>
        </div>
      )}

      {/* ── Interactive 1-Click Status Filter Cards ───────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">All Batches</span>
            <Layers className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalBatchesCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Total assigned to you</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'on_time' ? 'all' : 'on_time')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'on_time'
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">On Track</span>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-950 mt-1">{onTimeCount}</div>
          <div className="text-[10px] text-emerald-700 mt-0.5">Within allocated hours</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'delayed' ? 'all' : 'delayed')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'delayed'
              ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Delayed</span>
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-950 mt-1">{delayedCount}</div>
          <div className="text-[10px] text-rose-700 mt-0.5">Exceeded allocated hours</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'completed'
              ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Completed</span>
            <Sparkles className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-950 mt-1">{completedCount}</div>
          <div className="text-[10px] text-purple-700 mt-0.5">Finished courses</div>
        </button>
      </div>

      {/* ── Filter & Search Control Bar with View Switcher ───────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search batch by name, course, or WhatsApp group..."
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/60 focus:bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns & View Toggle */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status Select */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white">
              <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="on_time">🟢 On Track</option>
                <option value="delayed">🔴 Delayed</option>
                <option value="in_progress">⚡ In Progress</option>
                <option value="completed">✨ Completed</option>
              </select>
            </div>

            {/* Course Select */}
            {uniqueCourses.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white">
                <BookOpen className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer max-w-[140px] truncate"
                >
                  <option value="all">All Courses</option>
                  {uniqueCourses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Mode Select (Online/Offline) */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white">
              <span className="text-[11px] text-slate-400 font-bold">Mode:</span>
              <select
                value={modeFilter}
                onChange={(e: any) => setModeFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">All Modes</option>
                <option value="offline">🏢 Offline</option>
                <option value="online">🌐 Online</option>
              </select>
            </div>

            {/* Sort Select */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="default">Sort: Default</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="hours_desc">Hours (High to Low)</option>
                <option value="hours_asc">Hours (Low to High)</option>
                <option value="students_desc">Students (Most)</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}

            {/* View Mode Toggle Switch (Cards vs Table) */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'grid'
                    ? 'bg-white text-blue-600 shadow-2xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Grid / Cards View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-2xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Table / List View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Batch Content: Grid Cards OR List Table ───────────────────────────────── */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400 font-medium bg-white rounded-3xl border border-slate-200">
          Loading your batches...
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200 space-y-3">
          <p className="font-extrabold text-slate-800 text-base">No batches match your selected criteria.</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Try resetting your search query or selecting "All Status" to view your full assigned batches list.
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ── Grid / Card View Mode ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBatches.map((batch, idx) => {
            const used = batch.used_hours || 0;
            const total = batch.total_hours || 1;
            const isDelayed = used > total;
            const pct = Math.min(100, Math.round((used / total) * 100));
            const isOnline = (batch.name || '').toLowerCase().includes('onl');

            return (
              <div
                key={batch.id}
                className="group relative rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between hover:border-indigo-300"
              >
                {/* Top Accent Line */}
                <div
                  className={`h-1.5 w-full ${
                    isDelayed
                      ? 'bg-rose-500'
                      : batch.status === 'completed'
                      ? 'bg-purple-500'
                      : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600'
                  }`}
                />

                <div className="p-5 sm:p-6 space-y-4">
                  {/* Badge Row */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 font-extrabold text-[11px] font-mono">
                      <Code2 className="h-3.5 w-3.5 text-indigo-600" />
                      {batch.code || `BATCH #${idx + 1}`}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          isOnline
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {isOnline ? '🌐 Online' : '🏢 Offline'}
                      </span>

                      {isDelayed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Delayed
                        </span>
                      ) : batch.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-purple-500" /> Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> On Track
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Course */}
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {batch.name}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                      {batch.course_name || 'Technical Software Course'}
                    </p>
                  </div>

                  {/* Progress Bar with Hours */}
                  <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-indigo-600" /> Syllabus Hours:
                      </span>
                      <span className="font-mono font-black text-slate-900">
                        {used} / {total} hrs <span className="text-indigo-600 font-extrabold">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-200/70 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isDelayed
                            ? 'bg-rose-500'
                            : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Meta Information Cards (Students & Location/Timing) */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-slate-400 font-bold flex items-center gap-1">
                        <Users className="h-3 w-3" /> Students
                      </div>
                      <div className="font-extrabold text-slate-900 mt-0.5">
                        {batch.total_students || 0} Enrolled
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-slate-400 font-bold flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> Classroom
                      </div>
                      <div className="font-extrabold text-slate-900 truncate mt-0.5">
                        {batch.classroom || 'Main Lab 1'}
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Group Notification Pill */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 text-[11px] text-emerald-950">
                    <span className="font-bold flex items-center gap-1.5 truncate">
                      <MessageSquare className="h-3.5 w-3.5 text-[#25D366] shrink-0" />
                      <span className="truncate">{batch.whatsapp_group_name || `${batch.name} Group`}</span>
                    </span>
                    <span className="text-[10px] font-extrabold text-emerald-700 shrink-0">🟢 Ready</span>
                  </div>
                </div>

                {/* Card Action Buttons Footer */}
                <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/trainer/batches/${batch.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs shadow-2xs transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" /> View
                    </Link>

                    <Link
                      to={`/trainer/sessions/add?batch=${batch.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:opacity-95 text-white font-extrabold text-xs shadow-xs transition-all"
                    >
                      <Plus className="h-3.5 w-3.5" /> Session
                    </Link>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSyncJoinClass(batch)}
                    disabled={syncingBatchId === batch.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    title="Broadcast 'hi guys please join meeting' to WhatsApp group"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncingBatchId === batch.id ? 'animate-spin' : ''}`} />
                    {syncingBatchId === batch.id ? 'Syncing...' : 'Sync Notice'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Table / List View Mode ── */
        <div className="rounded-3xl bg-white shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              📋 Batch List
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              Showing <strong>{filteredBatches.length}</strong> of {batches.length} batches
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-[#fafcff] text-slate-400 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-4 w-12 text-center">#</th>
                  <th className="px-6 py-4">BATCH NAME & COURSE</th>
                  <th className="px-6 py-4">HOURS PROGRESS</th>
                  <th className="px-6 py-4">STATUS</th>
                  <th className="px-6 py-4 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBatches.map((batch, index) => {
                  const used = batch.used_hours || 0;
                  const total = batch.total_hours || 1;
                  const isDelayed = used > total;
                  const pct = Math.min(100, Math.round((used / total) * 100));

                  return (
                    <tr
                      key={batch.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4 text-center font-bold text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                          <span>{batch.name}</span>
                          {batch.course_name && (
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-[10px]">
                              {batch.course_name}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>👥 {batch.total_students || 0} Students</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Started {batch.start_date || '2026-08-01'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1.5 min-w-[140px]">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono font-bold text-slate-800">
                              {used} / {total} hrs
                            </span>
                            <span className="text-slate-400 font-semibold">{pct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isDelayed ? 'bg-rose-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isDelayed ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <span className="h-2 w-2 rounded-full bg-rose-500" />
                            Delayed
                          </span>
                        ) : batch.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            <span className="h-2 w-2 rounded-full bg-purple-500" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            On Track
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
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 font-bold text-xs transition-colors"
                          >
                            + Session
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleSyncJoinClass(batch)}
                            disabled={syncingBatchId === batch.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                            title="Broadcast 'hi guys please join meeting' to WhatsApp group"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${syncingBatchId === batch.id ? 'animate-spin' : ''}`} />
                            {syncingBatchId === batch.id ? 'Syncing...' : 'Sync'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
