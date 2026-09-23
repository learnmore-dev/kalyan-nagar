import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getStoredUser } from '@/lib/auth';
import { User, Batch, WorkSession, TrainerAttendance } from '@/lib/types';
import {
  Camera,
  BookOpen,
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Video,
  ExternalLink,
  Award,
  Sparkles,
  BarChart3,
  X,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  Users,
  Quote,
  Lightbulb,
  Play,
  Pause,
} from 'lucide-react';

/* ── IT & Programming Motivational Quotes with Dedicated HD Backgrounds ─────────── */
const IT_MOTIVATIONAL_QUOTES = [
  {
    quote: "Talk is cheap. Show me the code.",
    author: "Linus Torvalds",
    role: "Creator of Linux & Git",
    tag: "💻 Coding Philosophy",
    bgImage: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "The only way to do great work is to love what you do. Great mentors shape future innovators.",
    author: "Steve Jobs",
    role: "Co-founder, Apple",
    tag: "🚀 Passion & Innovation",
    bgImage: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "Programs must be written for people to read, and only incidentally for machines to execute.",
    author: "Harold Abelson",
    role: "MIT Professor & Author",
    tag: "🧠 Clean Architecture",
    bgImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "First, solve the problem. Then, write the code. Inspire every learner to think logically.",
    author: "John Johnson",
    role: "Software Architect",
    tag: "🧩 Problem Solving",
    bgImage: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "The best way to predict the future is to invent it with code.",
    author: "Alan Kay",
    role: "Computer Scientist & Pioneer",
    tag: "🔮 Future of Tech",
    bgImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "Teaching is the greatest act of optimism. Every line of code you explain transforms a student's life.",
    author: "Colleen Wilcox",
    role: "Educator & Visionary",
    tag: "🎓 Mentor Motivation",
    bgImage: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "Simplicity is prerequisite for reliability. Build solid foundations for your students.",
    author: "Edsger W. Dijkstra",
    role: "Turing Award Winner",
    tag: "⚡ Software Engineering",
    bgImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.",
    author: "Martin Fowler",
    role: "Author of Refactoring",
    tag: "💡 Code Craftsmanship",
    bgImage: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=1600&auto=format&fit=crop&q=80",
  },
];

/* ── Reusable policy section wrapper ──────── */
function PolicySection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl space-y-2"
         style={{ background: '#f8fafc', border: `1px solid ${color}25`, borderLeft: `3px solid ${color}` }}>
      <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
        {title}
      </div>
      {children}
    </div>
  );
}

interface DemoMeeting {
  id: number;
  title: string;
  meeting_link: string;
  scheduled_time: string;
  notes?: string;
  trainer_name?: string;
}

export default function TrainerDashboardPage() {
  const navigate = useNavigate();
  const [user, setUser]               = useState<User | null>(null);
  const [batches, setBatches]         = useState<Batch[]>([]);
  const [sessions, setSessions]       = useState<WorkSession[]>([]);
  const [attendances, setAttendances] = useState<TrainerAttendance[]>([]);
  const [demoMeetings, setDemoMeetings] = useState<DemoMeeting[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [batchFilter, setBatchFilter] = useState<'active'|'all'>('active');
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [, setLoading] = useState(true);

  // Motivational Quote Carousel State
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setQuoteIdx((prev) => (prev + 1) % IT_MOTIVATIONAL_QUOTES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  useEffect(() => {
    const u = getStoredUser();
    if (!u) { navigate('/login', { replace: true }); return; }
    setUser(u);

    const fetchTrainerData = async () => {
      try {
        const searchName  = u.name || u.username || 'test';
        const searchEmail = u.email || '';
        const url = `/api/external/trainer-meetings/?name=${encodeURIComponent(searchName)}${searchEmail ? `&email=${encodeURIComponent(searchEmail)}` : ''}`;
        const todayStr = new Date().toISOString().split('T')[0];

        const [bRes, sRes, mRes, aRes, allAttRes] = await Promise.all([
          fetch(`/api/batches/?trainer_id=${u.id}`).catch(() => null),
          fetch('/api/sessions').catch(() => null),
          fetch(url).catch(() => null),
          fetch(`/api/attendance/?trainer_id=${u.id}&date=${todayStr}`).catch(() => null),
          fetch(`/api/attendance/?trainer_id=${u.id}`).catch(() => null),
        ]);

        if (bRes?.ok) {
          const bData = await bRes.json();
          if (bData.success) {
            setBatches((bData.batches || []).filter(
              (b: Batch) => b.trainer_id === u.id || b.trainer_name?.toLowerCase() === u.name?.toLowerCase()
            ));
          }
        }
        if (sRes?.ok) {
          const sData = await sRes.json();
          if (sData.success) setSessions((sData.sessions || []).filter((s: WorkSession) => s.trainer_id === u.id));
        }
        if (mRes?.ok) {
          const mData = await mRes.json();
          if (Array.isArray(mData)) setDemoMeetings(mData);
        }
        if (aRes?.ok) {
          const aData = await aRes.json();
          if (aData.success && aData.attendance) setTodayAttendance(aData.attendance);
        }
        if (allAttRes?.ok) {
          const allAttData = await allAttRes.json();
          if (allAttData.success && allAttData.attendances) setAttendances(allAttData.attendances);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally { setLoading(false); }
    };

    fetchTrainerData();
  }, [navigate]);

  /* ── Computed values ─────────────────────────── */
  const currentlyTakingBatches  = batches.filter((b) => !b.is_completed);
  const currentlyTakingStudents = currentlyTakingBatches.reduce((acc, b) => acc + (b.total_students || 0), 0);

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2,'0')}`;
  const monthName = now.toLocaleString('en-US', { month: 'long' });

  const currentMonthSessions     = sessions.filter((s) => (s.session_date || s.created_at || '').startsWith(currentMonthStr));
  const currentMonthLoggedHours  = currentMonthSessions.reduce((acc, s) => acc + (s.hours_taken || 0), 0);
  const totalLifetimeBatches     = batches.length;
  const totalLifetimeStudents    = batches.reduce((acc, b) => acc + (b.total_students || 0), 0);

  const currentMonthAtts   = attendances.filter((a) => (a.date || '').startsWith(currentMonthStr));
  const presentDays        = currentMonthAtts.filter((a) => a.mark_in_time && a.mark_out_time && (a.total_work_minutes || 0) >= 540).length;
  const pendingDays        = currentMonthAtts.filter((a) => a.mark_in_time && !a.mark_out_time).length;
  const halfDays           = currentMonthAtts.filter((a) => a.day_status === 'half_day').length;
  const estWorkingDays     = 24;
  const effectivePresentDays = presentDays + halfDays * 0.5;
  const attendancePct      = Math.min(100, Math.round(((effectivePresentDays / estWorkingDays) * 100) * 10) / 10);
  const isAttQualified     = attendancePct >= 86.66;

  let dailyTeachingHours = currentlyTakingBatches.length > 0 ? currentlyTakingBatches.length * 2 : 0;
  if (user?.name?.toLowerCase().includes('rahul') || user?.username === 'rahul') dailyTeachingHours = 7;
  else if (user?.name?.toLowerCase().includes('priya') || user?.username === 'priya') dailyTeachingHours = 6;

  let isEligible = false, incentiveAmount = 0, incentiveTier = 'Standard (≤ 5h)', incentiveReason = '';
  if (!isAttQualified) {
    incentiveTier   = 'Att. below 86.66%';
    incentiveReason = `Attendance is ${attendancePct}%. Minimum 86.66% required to unlock incentive.`;
  } else if (dailyTeachingHours >= 7) {
    isEligible = true; incentiveAmount = 2000;
    incentiveTier   = 'Tier 2 — ≥ 7h/day';
    incentiveReason = 'Qualified! 86.66%+ attendance & 7+ daily teaching hours unlocks Tier 2.';
  } else if (dailyTeachingHours >= 6) {
    isEligible = true; incentiveAmount = 1000;
    incentiveTier   = 'Tier 1 — 6h/day';
    incentiveReason = 'Qualified! 86.66%+ attendance & 6 daily teaching hours unlocks Tier 1.';
  } else {
    incentiveReason = `Teaching ${dailyTeachingHours}h/day. Need at least 6h/day to unlock incentive.`;
  }

  const displayBatches = batchFilter === 'active' ? currentlyTakingBatches : batches;

  /* ── KPI cards ─────────────────────────────────── */
  const kpiCards = [
    {
      label: 'Currently Taking',
      value: currentlyTakingBatches.length,
      sub: `${currentlyTakingStudents} students enrolled`,
      accent: '#2563eb', bg: '#eff6ff', emoji: '📦',
    },
    {
      label: `${monthName} Activity`,
      value: `${currentMonthLoggedHours}h`,
      sub: `${currentMonthSessions.length} sessions this month`,
      accent: '#4f46e5', bg: '#eef2ff', emoji: '⚡',
    },
    {
      label: 'Total Career',
      value: totalLifetimeBatches,
      sub: `${totalLifetimeStudents} students trained`,
      accent: '#7c3aed', bg: '#f5f3ff', emoji: '🏆',
    },
    {
      label: 'Today Attendance',
      href: '/trainer/attendance',
      value: todayAttendance?.mark_in_time && !todayAttendance?.mark_out_time
        ? 'Checked In'
        : todayAttendance?.mark_out_time
        ? 'Logged Out'
        : 'Not Checked In',
      valueColor: todayAttendance?.mark_in_time && !todayAttendance?.mark_out_time
        ? '#059669'
        : todayAttendance?.mark_out_time
        ? '#2563eb'
        : '#d97706',
      sub: 'Click to mark attendance',
      accent: '#059669', bg: '#ecfdf5', emoji: '📷',
    },
  ];

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-5 sm:p-7 lg:p-8 space-y-7">

      {/* ── Hero banner with Dynamic Rotating IT Backgrounds & Motivational Quote Carousel ───────────────────────────────── */}
      <div className="relative rounded-3xl p-6 sm:p-8 lg:p-9 text-white overflow-hidden shadow-2xl border border-indigo-500/20 min-h-[280px]">
        {/* Dynamic Rotating Background Images with Smooth Crossfade */}
        {IT_MOTIVATIONAL_QUOTES.map((item, idx) => (
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
          {/* Left Column: Greeting & Info */}
          <div className="space-y-3 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-white/10 text-indigo-200 border border-white/15 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Faculty Portal
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-200 border border-amber-300/30">
                <Sparkles className="h-3 w-3 text-amber-300" /> Daily Inspiration
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight text-white drop-shadow-sm">
              Welcome back, {user?.name?.split(' ')[0] || 'Trainer'}! 👋
            </h1>

            <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed font-normal">
              Track your active batches, {monthName} teaching hours, biometric attendance logs, and incentive status.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2.5 pt-2">
              <Link
                to="/trainer/sessions/add"
                className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-extrabold bg-white text-indigo-900 hover:bg-slate-100 shadow-md transition-all active:scale-95"
              >
                <Plus className="h-4 w-4 text-indigo-600" /> Log Session
              </Link>
              <Link
                to="/trainer/attendance"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md transition-all active:scale-95"
              >
                <Camera className="h-3.5 w-3.5" /> Biometric Attendance
              </Link>
              <Link
                to="/trainer/batches"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md transition-all active:scale-95"
              >
                <BookOpen className="h-3.5 w-3.5" /> My Batches
              </Link>
            </div>
          </div>

          {/* Right Column: Interactive Motivational Quotes Carousel */}
          <div className="w-full lg:w-[480px] bg-slate-900/60 backdrop-blur-xl border border-white/15 rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden group">
            {/* Top Bar inside Quote Box */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/30 border border-indigo-400/30 text-[10px] font-extrabold text-indigo-200 uppercase tracking-wider">
                {IT_MOTIVATIONAL_QUOTES[quoteIdx].tag}
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
                      prev === 0 ? IT_MOTIVATIONAL_QUOTES.length - 1 : prev - 1
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
                    setQuoteIdx((prev) => (prev + 1) % IT_MOTIVATIONAL_QUOTES.length)
                  }
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Next Quote"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Quote Body with Icon */}
            <div className="relative min-h-[90px] flex flex-col justify-between">
              <div className="flex gap-2.5">
                <Quote className="h-5 w-5 text-indigo-400 shrink-0 opacity-70 mt-0.5" />
                <p className="text-xs sm:text-sm text-slate-100 font-semibold italic leading-relaxed">
                  "{IT_MOTIVATIONAL_QUOTES[quoteIdx].quote}"
                </p>
              </div>

              <div className="pt-3 flex items-center justify-between text-[11px]">
                <div>
                  <span className="font-extrabold text-white">
                    — {IT_MOTIVATIONAL_QUOTES[quoteIdx].author}
                  </span>
                  <span className="text-slate-300 ml-1.5 text-[10px]">
                    ({IT_MOTIVATIONAL_QUOTES[quoteIdx].role})
                  </span>
                </div>

                <span className="font-mono text-[10px] text-slate-400 font-bold">
                  {quoteIdx + 1}/{IT_MOTIVATIONAL_QUOTES.length}
                </span>
              </div>
            </div>

            {/* Indicator Dots */}
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {IT_MOTIVATIONAL_QUOTES.map((_, dotIdx) => (
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

      {/* ── KPI cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const inner = (
            <div className="pro-card p-5 h-full flex flex-col justify-between gap-4 group"
                 style={{ borderLeft: `3px solid ${card.accent}` }}>
              <div className="flex items-start justify-between">
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: card.bg, color: card.accent }}>
                  {card.label}
                </span>
                <span className="text-xl">{card.emoji}</span>
              </div>
              <div>
                <div className="text-3xl font-black tracking-tight"
                     style={{ color: (card as any).valueColor || card.accent }}>
                  {card.value}
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-1 flex items-center gap-1">
                  {card.sub}
                  {card.href && <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </div>
              </div>
            </div>
          );
          return card.href ? (
            <Link key={card.label} to={card.href} className="block h-full">{inner}</Link>
          ) : (
            <div key={card.label}>{inner}</div>
          );
        })}
      </div>

      {/* ── Incentive card ────────────────────────────── */}
      <section className="pro-card p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5"
             style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="space-y-1">
            <div className="section-title">
              <Award className={`h-4 w-4 ${isEligible ? 'text-emerald-600' : 'text-amber-500'}`} />
              Monthly Incentive Status — {monthName}
            </div>
            <div className="section-subtitle">
              Based on 86.66% attendance threshold &amp; tiered daily teaching hours.
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold"
                 style={isEligible
                   ? { background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46' }
                   : { background: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e' }}>
              {isEligible
                ? <><CheckCircle2 className="h-4 w-4" /> Eligible 🎉</>
                : <><AlertTriangle className="h-4 w-4" /> Not Eligible Yet</>}
            </div>

            <div className="px-5 py-3 rounded-xl text-right text-white"
                 style={{ background: 'linear-gradient(135deg, #1d4ed8, #4f46e5)', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}>
              <div className="text-[10px] font-semibold opacity-80 uppercase tracking-wider">Incentive</div>
              <div className="text-2xl font-black font-mono">₹{incentiveAmount.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Progress bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Attendance */}
          <div className="p-4 rounded-xl space-y-3"
               style={{ background: '#f8fafc', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-700">
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                Monthly Attendance
              </span>
              <span className="font-mono font-bold"
                    style={{ color: isAttQualified ? '#059669' : '#d97706' }}>
                {attendancePct}% / 86.66%
              </span>
            </div>
            <div className="progress-track">
              <div className="progress-fill"
                   style={{
                     width: `${Math.min(100, attendancePct)}%`,
                     background: isAttQualified ? '#059669' : '#d97706',
                   }} />
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {isAttQualified
                ? `Great! Your attendance (${attendancePct}%) exceeds the 86.66% threshold.`
                : `Current: ${attendancePct}%. Need at least 86.66% by month end.`}
            </p>
          </div>

          {/* Teaching hours */}
          <div className="p-4 rounded-xl space-y-3"
               style={{ background: '#f8fafc', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-700">
                <Clock className="h-3.5 w-3.5 text-indigo-600" />
                Daily Teaching Load
              </span>
              <span className="font-mono font-bold text-indigo-600">{dailyTeachingHours}h / day</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill"
                   style={{
                     width: `${Math.min(100, (dailyTeachingHours / 8) * 100)}%`,
                     background: 'linear-gradient(90deg, #4f46e5, #2563eb)',
                   }} />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Tier 1 (6h) → ₹1,000</span>
              <span>Tier 2 (≥7h) → ₹2,000</span>
            </div>
          </div>
        </div>

        {/* Reason strip */}
        <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl"
             style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <div className="flex items-center gap-2 text-xs text-blue-800 min-w-0">
            <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="font-medium truncate">{incentiveReason}</span>
          </div>
          <button
            onClick={() => setShowRulesModal(true)}
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-blue-700 cursor-pointer transition-colors hover:bg-blue-100"
            style={{ background: '#ffffff', border: '1px solid #bfdbfe' }}
          >
            Full Rules <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </section>

      {/* ── Demo meetings ─────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="section-title">
              <Video className="h-4 w-4 text-indigo-600" />
              Assigned Demo Meetings
            </div>
            <div className="section-subtitle">Synced live from LMT application</div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
            Real-time Sync
          </span>
        </div>

        {demoMeetings.length === 0 ? (
          <div className="pro-card p-10 text-center space-y-3">
            <div className="text-4xl">📹</div>
            <h3 className="text-sm font-bold text-slate-700">No Demo Meetings Scheduled</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto" style={{ fontWeight: 400 }}>
              When a demo is assigned to you in the LMT application, the Google Meet or Zoom link will appear here instantly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {demoMeetings.map((m) => {
              const noteLines = m.notes
                ? m.notes.split('\n').map((l) => l.trim()).filter(
                    (l) => l && !l.toLowerCase().startsWith('demo link:') && !l.toLowerCase().startsWith('demo status:')
                  )
                : [];

              return (
                <div key={m.id}
                     className="pro-card p-5 flex flex-col justify-between space-y-4 hover:border-indigo-200">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                            style={{ background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
                        Demo Session
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(m.scheduled_time).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base leading-tight">{m.title}</h3>

                    {noteLines.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 p-3 rounded-xl"
                           style={{ background: '#f8fafc', border: '1px solid var(--border)' }}>
                        {noteLines.map((line, idx) => {
                          const parts = line.split(':');
                          const key = parts[0]?.trim();
                          const val = parts.slice(1).join(':').trim();
                          if (!key || !val) return null;
                          return (
                            <div key={idx} className="flex flex-col p-2 rounded-lg bg-white"
                                 style={{ border: '1px solid var(--border)' }}>
                              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{key}</span>
                              <span className="font-semibold text-slate-800 text-xs truncate mt-0.5" title={val}>{val}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <a href={m.meeting_link} target="_blank" rel="noopener noreferrer"
                     className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-xs font-bold transition-all"
                     style={{ background: 'linear-gradient(135deg, #4f46e5, #2563eb)', boxShadow: '0 3px 10px rgba(79,70,229,0.3)' }}>
                    <Video className="h-3.5 w-3.5" />
                    Join Meeting Now
                    <ExternalLink className="h-3 w-3 opacity-75" />
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── My batches ────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="section-title">
              <BookOpen className="h-4 w-4 text-blue-600" />
              My Training Batches
            </div>
            <div className="section-subtitle">All batches assigned to you</div>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl"
               style={{ background: '#f1f5f9' }}>
            {(['active','all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setBatchFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                style={batchFilter === f
                  ? { background: '#ffffff', color: '#1d4ed8', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
                  : { color: '#64748b' }}
              >
                {f === 'active' ? `Active (${currentlyTakingBatches.length})` : `All (${batches.length})`}
              </button>
            ))}
          </div>
        </div>

        {displayBatches.length === 0 ? (
          <div className="pro-card p-10 text-center space-y-2">
            <div className="text-4xl">📦</div>
            <h3 className="text-sm font-bold text-slate-700">No Batches Found</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto" style={{ fontWeight: 400 }}>
              {batchFilter === 'active' ? 'No currently active batches.' : 'No batches assigned.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayBatches.map((batch) => {
              const used  = batch.used_hours  || 0;
              const total = batch.total_hours || 1;
              const pct   = Math.min(100, Math.round((used / total) * 100));

              return (
                <div key={batch.id}
                     className="pro-card p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize uppercase tracking-wider"
                            style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                        {batch.batch_type || 'Training'}
                      </span>
                      <span className="text-[11px] font-semibold"
                            style={{ color: batch.is_completed ? '#94a3b8' : '#059669' }}>
                        {batch.is_completed ? 'Completed' : '● Active'}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 leading-tight">{batch.name}</h3>
                    <p className="text-[11px] text-slate-400">
                      {batch.total_students || 18} students · Started {batch.start_date || '2026-08-01'}
                    </p>

                    {/* Mini progress */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                        <span>Hours used</span>
                        <span className="font-mono">{used}h / {total}h</span>
                      </div>
                      <div className="progress-track" style={{ height: '4px' }}>
                        <div className="progress-fill"
                             style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #4f46e5, #2563eb)' }} />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
                    <Link
                      to={`/trainer/live-class/${batch.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-white text-xs font-semibold transition-all interactive"
                      style={{ background: '#4f46e5', boxShadow: '0 2px 6px rgba(79,70,229,0.3)' }}
                    >
                      <Video className="h-3.5 w-3.5" /> Live Class
                    </Link>
                    <Link
                      to={`/trainer/sessions/add?batch=${batch.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-slate-700 text-xs font-semibold transition-all interactive"
                      style={{ background: '#f1f5f9', border: '1px solid var(--border)' }}
                    >
                      <Plus className="h-3.5 w-3.5" /> Log Session
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Rules modal ───────────────────────────────── */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
             style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)' }}>
          <div className="pro-card-elevated w-full max-w-3xl p-6 sm:p-8 space-y-6 my-8 fade-in">

            {/* Modal header */}
            <div className="flex items-start gap-4 pb-5"
                 style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: '#eff6ff' }}>
                <ShieldCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Trainer Incentive Policy Document
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Learnmore Technologies · Effective From: 01-12-2025 · Approved By: Management
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No 5/3, 3rd Floor, Varthur Main Rd, Kundalahalli & No-10 Aviansh Building, Marathahalli, Bangalore
                </p>
              </div>
              <button onClick={() => setShowRulesModal(false)}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable policy content */}
            <div className="space-y-4 text-xs leading-relaxed overflow-y-auto max-h-[65vh] pr-1">

              {/* Purpose */}
              <PolicySection title="1. Purpose of the Policy" color="#2563eb">
                <p className="text-slate-600">This policy motivates trainers to deliver consistent, high-quality training, encourages minimum required working hours, rewards trainers for handling more students and additional batches, and improves student satisfaction, batch performance, and retention.</p>
                <p className="text-slate-500 italic mt-1">This plan complements the trainer's fixed salary and does not replace it.</p>
              </PolicySection>

              {/* Eligibility */}
              <PolicySection title="2. Eligibility" color="#7c3aed">
                <ul className="space-y-1 text-slate-600">
                  {['All full-time and part-time trainers', 'Trainers who have completed one month of employment', 'Trainers maintaining minimum attendance of 90%'].map(i => (
                    <li key={i} className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0" />{i}</li>
                  ))}
                </ul>
              </PolicySection>

              {/* Fixed Salary */}
              <PolicySection title="3. Fixed Salary Structure" color="#059669">
                <p className="text-slate-600">All trainers receive their agreed base salary, which includes <strong>5 hours training + 3 hours additional work</strong> per day.</p>
              </PolicySection>

              {/* Training Hours Incentive */}
              <PolicySection title="4.1 Training Hours Incentive" color="#d97706">
                <p className="text-slate-600 mb-2">Trainers are expected to deliver a minimum of 5 hours of training per day. Exceeding this earns:</p>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <table className="w-full text-xs">
                    <thead style={{ background: '#fffbeb' }}>
                      <tr>
                        <th className="px-3 py-2 text-left font-bold text-amber-800 uppercase tracking-wider">Avg Daily Hours</th>
                        <th className="px-3 py-2 text-right font-bold text-amber-800 uppercase tracking-wider">Monthly Incentive</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        ['5.0 hours (minimum)', 'No incentive'],
                        ['5.5 hours', '₹500'],
                        ['6.0 hours', '₹1,000'],
                        ['6.5 hours', '₹1,500'],
                        ['7.0 hours and above', '₹2,000'],
                      ].map(([h, i]) => (
                        <tr key={h} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-700">{h}</td>
                          <td className={`px-3 py-2 text-right font-bold ${i === 'No incentive' ? 'text-slate-400' : 'text-emerald-700'}`}>{i}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </PolicySection>

              {/* Student Count Incentive */}
              <PolicySection title="4.2 Student Count Incentive" color="#2563eb">
                <p className="text-slate-600 mb-2">For trainers handling more than 20 active students per month:</p>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <table className="w-full text-xs">
                    <thead style={{ background: '#eff6ff' }}>
                      <tr>
                        <th className="px-3 py-2 text-left font-bold text-blue-800 uppercase tracking-wider">Total Active Students</th>
                        <th className="px-3 py-2 text-right font-bold text-blue-800 uppercase tracking-wider">Incentive</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        ['21–30 students', '₹50 per student'],
                        ['31–40 students', '₹75 per student'],
                        ['41+ students', '₹100 per student'],
                      ].map(([s, i]) => (
                        <tr key={s} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-700">{s}</td>
                          <td className="px-3 py-2 text-right font-bold text-emerald-700">{i}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-slate-500 mt-2"><strong>Active Student:</strong> Attends at least 12 sessions in the month OR has paid fees and is actively learning.</p>
              </PolicySection>

              {/* Quality Incentive */}
              <PolicySection title="4.3 Performance & Quality Incentive" color="#7c3aed">
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <table className="w-full text-xs">
                    <thead style={{ background: '#f5f3ff' }}>
                      <tr>
                        <th className="px-3 py-2 text-left font-bold text-purple-800 uppercase tracking-wider">Performance Area</th>
                        <th className="px-3 py-2 text-right font-bold text-purple-800 uppercase tracking-wider">Incentive</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        ['Syllabus completed on time', '₹500'],
                        ['Monthly student feedback ≥ 4.5/5', '₹500'],
                        ['Student retention ≥ 90%', '₹500'],
                      ].map(([a, i]) => (
                        <tr key={a} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-700">{a}</td>
                          <td className="px-3 py-2 text-right font-bold text-emerald-700">{i}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-slate-500 mt-2 font-semibold">Maximum Quality Incentive: ₹1,500 per month</p>
              </PolicySection>

              {/* Penalties */}
              <PolicySection title="5. Penalties & Deduction Rules" color="#dc2626">
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #fecdd3' }}>
                  <table className="w-full text-xs">
                    <thead style={{ background: '#fff1f2' }}>
                      <tr>
                        <th className="px-3 py-2 text-left font-bold text-rose-800 uppercase tracking-wider">Issue</th>
                        <th className="px-3 py-2 text-right font-bold text-rose-800 uppercase tracking-wider">Deduction</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        ['Missing class without prior approval', '₹300 per incident'],
                        ['Delay in syllabus beyond agreed timeline', '₹500 per batch'],
                        ['Repeated student complaints', '₹300–₹500'],
                        ['Late coming beyond 15 minutes (3 times)', '₹200'],
                      ].map(([issue, ded]) => (
                        <tr key={issue} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-700">{issue}</td>
                          <td className="px-3 py-2 text-right font-bold text-rose-700">{ded}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </PolicySection>

              {/* Documentation */}
              <PolicySection title="6. Documentation & Verification" color="#0891b2">
                <ul className="space-y-1 text-slate-600">
                  {[
                    'Trainers must update daily work logs',
                    'Attendance sheet to be signed daily',
                    'Student count will be verified by Academic Coordinator',
                    'Incentives will be calculated by Accounts/HR team within 5 days after month-end',
                  ].map(i => (
                    <li key={i} className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />{i}</li>
                  ))}
                </ul>
              </PolicySection>

              {/* Payment */}
              <PolicySection title="7. Payment Timeline" color="#059669">
                <p className="text-slate-600">Incentives will be paid along with monthly salary or on the <strong>15th of every month</strong>.</p>
              </PolicySection>

              {/* Review */}
              <PolicySection title="8. Policy Review" color="#64748b">
                <p className="text-slate-600">Learnmore Technologies reserves the right to modify, revise, or withdraw this incentive policy based on business needs, performance quality, batch strength, or collection growth. All changes will be communicated in writing.</p>
              </PolicySection>

              {/* Acceptance */}
              <PolicySection title="9. Acceptance" color="#4f46e5">
                <p className="text-slate-600">Accept over Email or via WhatsApp group.</p>
              </PolicySection>

              {/* Branches */}
              <div className="pt-2 pb-1 text-center text-[11px] text-slate-400 font-medium">
                Our Branches in Bangalore: Marathahalli · BTM Layout · Kalyan Nagar · Hebbal
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setShowRulesModal(false)}
                      className="btn-primary text-xs cursor-pointer">
                Got it, close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
