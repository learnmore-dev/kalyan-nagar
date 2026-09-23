import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredUser } from '@/lib/auth';
import { User } from '@/lib/types';
import {
  Video,
  Search,
  Filter,
  CheckCircle2,
  ExternalLink,
  UserCheck,
  Calendar,
  Building2,
  GraduationCap,
  Sparkles,
  Phone,
  Mail,
  User as UserIcon,
  RefreshCw,
  Quote,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
} from 'lucide-react';

/* ── IT & Demo Motivational Quotes with HD Backgrounds ─────────── */
const IT_DEMO_QUOTES = [
  {
    quote: "A great demo doesn't just show features; it shows students how their life and career can transform.",
    author: "Satya Nadella",
    role: "CEO, Microsoft",
    tag: "🎯 Demo Excellence",
    bgImage: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "Talk is cheap. Show me the code and teach with real-world industry hands-on projects.",
    author: "Linus Torvalds",
    role: "Creator of Linux & Git",
    tag: "💻 Coding Mastery",
    bgImage: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "Your most impactful demo is when a student believes: 'I can build this myself!'",
    author: "Steve Jobs",
    role: "Co-founder, Apple",
    tag: "🚀 Student Inspiration",
    bgImage: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "The secret to converting a demo is empathy, passion, and simplifying complex tech concepts.",
    author: "Sundar Pichai",
    role: "CEO, Alphabet & Google",
    tag: "✨ Mentor Impact",
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
    quote: "The best way to predict the future is to build and teach cutting-edge technology.",
    author: "Alan Kay",
    role: "Computer Scientist & Pioneer",
    tag: "🔮 Future of Tech",
    bgImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop&q=80",
  },
];

interface DemoMeeting {
  id: number;
  title: string;
  meeting_link: string;
  scheduled_time: string;
  notes?: string;
  trainer_name?: string;
}

export default function TrainerDemosPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [demoMeetings, setDemoMeetings] = useState<DemoMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  // Motivational Quote Carousel State
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setQuoteIdx((prev) => (prev + 1) % IT_DEMO_QUOTES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  const fetchDemos = async (u: User) => {
    setLoading(true);
    try {
      const searchName = u.name || u.username || 'test';
      const searchEmail = u.email || '';
      const url = `/api/external/trainer-meetings/?name=${encodeURIComponent(searchName)}${searchEmail ? `&email=${encodeURIComponent(searchEmail)}` : ''}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setDemoMeetings(data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch demo meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      navigate('/login', { replace: true });
      return;
    }
    setUser(u);
    fetchDemos(u);
  }, [navigate]);

  const parsedMeetings = useMemo(() => {
    return demoMeetings.map(m => {
      const kvMap: Record<string, string> = {};
      if (m.notes) {
        m.notes.split(/\r?\n/).forEach(line => {
          const parts = line.split(':');
          const k = parts[0]?.trim();
          const v = parts.slice(1).join(':').trim();
          if (k && v) {
            kvMap[k.toLowerCase()] = v;
          }
        });
      }

      const isJoined = (kvMap['status'] || '').toLowerCase() === 'joined';
      const statusVal = kvMap['status'] || 'Scheduled';
      const branchVal = kvMap['branch'] || 'General';

      return {
        ...m,
        kvMap,
        isJoined,
        statusVal,
        branchVal,
        studentName: kvMap['student name'] || m.title.replace('Demo:', '').trim(),
        courseName: kvMap['course'] || 'N/A',
        counsellorName: kvMap['assign counsellor'] || 'N/A',
        mobile: kvMap['mobile'] || 'N/A',
        email: kvMap['email'] || 'N/A',
        trainingMode: kvMap['training mode'] || 'N/A',
        city: kvMap['city'] || 'N/A',
        source: kvMap['source'] || 'N/A',
        nextFollowup: kvMap['next follow-up'] || 'N/A'
      };
    });
  }, [demoMeetings]);

  const DEFAULT_BRANCHES = ["Kalyan Nagar", "BTM", "Marathahalli", "Online"];

  const availableBranches = useMemo(() => {
    const set = new Set<string>(DEFAULT_BRANCHES);
    parsedMeetings.forEach(pm => {
      if (pm.branchVal && pm.branchVal !== 'N/A') set.add(pm.branchVal);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [parsedMeetings]);

  const filteredMeetings = useMemo(() => {
    return parsedMeetings.filter(item => {
      const matchSearch =
        search === '' ||
        item.studentName.toLowerCase().includes(search.toLowerCase()) ||
        item.mobile.toLowerCase().includes(search.toLowerCase()) ||
        item.courseName.toLowerCase().includes(search.toLowerCase()) ||
        item.counsellorName.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'joined' && item.isJoined) ||
        (statusFilter === 'not_joined' && !item.isJoined) ||
        item.statusVal.toLowerCase() === statusFilter.toLowerCase();

      const matchBranch =
        branchFilter === 'all' ||
        item.branchVal.toLowerCase() === branchFilter.toLowerCase();

      return matchSearch && matchStatus && matchBranch;
    });
  }, [parsedMeetings, search, statusFilter, branchFilter]);

  const totalCount = parsedMeetings.length;
  const joinedCount = parsedMeetings.filter(m => m.isJoined).length;
  const conversionRate = totalCount > 0 ? ((joinedCount / totalCount) * 100).toFixed(1) : '0.0';

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Hero Banner with Dynamic Rotating IT Backgrounds & Motivational Quotes Carousel ───────────────────────────────── */}
      <div className="relative rounded-3xl p-6 sm:p-8 lg:p-9 text-white overflow-hidden shadow-2xl border border-indigo-500/20 min-h-[280px]">
        {/* Dynamic Rotating Background Images with Smooth Crossfade */}
        {IT_DEMO_QUOTES.map((item, idx) => (
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
          {/* Left Column: Title & Actions */}
          <div className="space-y-3 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-white/10 text-indigo-200 border border-white/15 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Demo & Conversion Analytics
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Live Tracking
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight text-white drop-shadow-sm">
              Assigned Demo History
            </h1>

            <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed font-normal">
              Review assigned student demos, counsellor information, meeting links, and real-time admission conversion results.
            </p>

            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => user && fetchDemos(user)}
                className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-extrabold bg-white text-indigo-900 hover:bg-slate-100 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 text-indigo-600 ${loading ? 'animate-spin' : ''}`} /> Refresh Demos
              </button>
            </div>
          </div>

          {/* Right Column: Interactive Motivational Quotes Carousel */}
          <div className="w-full lg:w-[480px] bg-slate-900/60 backdrop-blur-xl border border-white/15 rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden group">
            {/* Top Bar inside Quote Box */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/30 border border-indigo-400/30 text-[10px] font-extrabold text-indigo-200 uppercase tracking-wider">
                {IT_DEMO_QUOTES[quoteIdx].tag}
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
                      prev === 0 ? IT_DEMO_QUOTES.length - 1 : prev - 1
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
                    setQuoteIdx((prev) => (prev + 1) % IT_DEMO_QUOTES.length)
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
                  "{IT_DEMO_QUOTES[quoteIdx].quote}"
                </p>
              </div>

              <div className="pt-3 flex items-center justify-between text-[11px]">
                <div>
                  <span className="font-extrabold text-white">
                    — {IT_DEMO_QUOTES[quoteIdx].author}
                  </span>
                  <span className="text-slate-300 ml-1.5 text-[10px]">
                    ({IT_DEMO_QUOTES[quoteIdx].role})
                  </span>
                </div>

                <span className="font-mono text-[10px] text-slate-400 font-bold">
                  {quoteIdx + 1}/{IT_DEMO_QUOTES.length}
                </span>
              </div>
            </div>

            {/* Indicator Dots */}
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {IT_DEMO_QUOTES.map((_, dotIdx) => (
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Demos Assigned
            </div>
            <div className="text-3xl font-extrabold text-slate-800">{totalCount}</div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 font-bold text-xl">
            <Video className="w-6 h-6" />
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Joined / Converted Students
            </div>
            <div className="text-3xl font-extrabold text-emerald-600">{joinedCount}</div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 font-bold text-xl">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Demo Conversion Rate
            </div>
            <div className="text-3xl font-extrabold text-purple-600">{conversionRate}%</div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 font-bold text-xl">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, course, counsellor, or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="joined">✓ Joined Students Only</option>
              <option value="not_joined">Pending / Follow-up Only</option>
              <option value="today">Today Status</option>
              <option value="in progress">In Progress</option>
            </select>
          </div>

          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Branches</option>
            {availableBranches.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl bg-white p-12 text-center text-slate-400 space-y-2 border border-slate-200">
          <div className="animate-spin text-2xl font-bold">↻</div>
          <p className="text-xs font-bold">Loading your demo records...</p>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center text-slate-400 space-y-2 border border-slate-200">
          <div className="text-3xl">🎥</div>
          <h3 className="text-sm font-extrabold text-slate-800">No Demo Records Found</h3>
          <p className="text-xs max-w-sm mx-auto">
            Try adjusting your search or filter options.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredMeetings.map((m) => (
            <div
              key={m.id}
              className={`rounded-3xl bg-white p-6 shadow-sm border space-y-4 flex flex-col justify-between transition-all hover:shadow-md ${
                m.isJoined ? 'border-emerald-300 ring-2 ring-emerald-500/10' : 'border-slate-200 hover:border-indigo-300'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Student Name
                    </span>
                    <h3 className="font-black text-xl text-slate-900 leading-tight">
                      {m.studentName}
                    </h3>
                  </div>

                  {m.isJoined ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-500 text-white font-extrabold text-xs shadow-sm animate-pulse">
                      <CheckCircle2 className="w-3.5 h-3.5" /> JOINED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs">
                      {m.statusVal}
                    </span>
                  )}
                </div>

                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="flex flex-col bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <GraduationCap className="w-3 h-3 text-indigo-500" /> Course
                    </span>
                    <span className="font-bold text-slate-800 text-xs truncate mt-0.5" title={m.courseName}>
                      {m.courseName}
                    </span>
                  </div>

                  <div className="flex flex-col bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <UserIcon className="w-3 h-3 text-blue-500" /> Counsellor
                    </span>
                    <span className="font-bold text-slate-800 text-xs truncate mt-0.5" title={m.counsellorName}>
                      {m.counsellorName}
                    </span>
                  </div>

                  <div className="flex flex-col bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-purple-500" /> Branch
                    </span>
                    <span className="font-bold text-slate-800 text-xs truncate mt-0.5" title={m.branchVal}>
                      {m.branchVal}
                    </span>
                  </div>

                  <div className="flex flex-col bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-500" /> Mobile
                    </span>
                    <span className="font-bold text-slate-800 text-xs truncate mt-0.5" title={m.mobile}>
                      {m.mobile}
                    </span>
                  </div>

                  <div className="flex flex-col bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-rose-500" /> Email
                    </span>
                    <span className="font-bold text-slate-800 text-xs truncate mt-0.5" title={m.email}>
                      {m.email}
                    </span>
                  </div>

                  <div className="flex flex-col bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-500" /> Demo Time
                    </span>
                    <span className="font-bold text-slate-800 text-xs truncate mt-0.5">
                      {new Date(m.scheduled_time).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              {m.meeting_link && (
                <div className="pt-2">
                  <a
                    href={m.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all transform active:scale-[0.99]"
                  >
                    <Video className="w-4 h-4" />
                    <span>Join Meeting Now</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
