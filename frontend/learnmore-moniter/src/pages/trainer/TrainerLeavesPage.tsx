import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredUser } from '@/lib/auth';
import { User, Leave, LeaveType } from '@/lib/types';
import { OPTIONAL_HOLIDAYS_2026, CASUAL_LEAVE_LIMIT_PER_MONTH, OPTIONAL_HOLIDAY_LIMIT_PER_YEAR } from '@/lib/holidays';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sparkles,
  HeartPulse,
  Sun,
  Quote,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Clock,
  Coffee
} from 'lucide-react';

/* ── Work-Life Balance & Wellness Quotes with Calming HD Nature & Work Backgrounds ─────────── */
const WELLNESS_RECHARGE_QUOTES = [
  {
    quote: "Burnout is not the price of success. Rest and recharging your energy makes your teaching sharper and your mind clearer.",
    author: "Arianna Huffington",
    role: "Founder of The Huffington Post & Thrive Global",
    tag: "🌿 Mind Clarity & Rest",
    bgImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "Almost everything will work again if you unplug it for a few minutes, including you.",
    author: "Anne Lamott",
    role: "Novelist & Non-Fiction Author",
    tag: "🔌 Unplug & Recharge",
    bgImage: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "Sharpen the Saw. Preserving and enhancing your greatest asset — you — is essential for sustainable excellence.",
    author: "Stephen Covey",
    role: "Author of The 7 Habits of Highly Effective People",
    tag: "🪓 Sharpen the Saw",
    bgImage: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "Sleep is the best meditation. When mind and body are well-rested, you deliver your best mentorship.",
    author: "Dalai Lama",
    role: "Spiritual Leader & Nobel Peace Laureate",
    tag: "🧘 Inner Balance",
    bgImage: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "Each person deserves a day away in which no problems are confronted, no solutions searched for.",
    author: "Maya Angelou",
    role: "Poet & Civil Rights Activist",
    tag: "☀️ Rest & Rejuvenation",
    bgImage: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&auto=format&fit=crop&q=80",
  },
];

export default function TrainerLeavesPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Quotes Carousel State
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setQuoteIdx((prev) => (prev + 1) % WELLNESS_RECHARGE_QUOTES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  const [leaveType, setLeaveType] = useState<LeaveType>('casual');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [selectedOptionalHoliday, setSelectedOptionalHoliday] = useState<string>('');

  const fetchLeaves = async (userId: string) => {
    try {
      const res = await fetch(`/api/leaves/?trainer_id=${encodeURIComponent(userId)}`);
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setLeaves(data.leaves || []);
        }
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      navigate('/login', { replace: true });
      return;
    }
    setUser(u);
    fetchLeaves(u.id);
  }, [navigate]);

  const handleLeaveTypeChange = (type: LeaveType) => {
    setLeaveType(type);
    if (type === 'weekoff') {
      setReason('Today is my weekoff');
    } else if (reason === 'Today is my weekoff') {
      setReason('');
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setMessage(null);

    let finalStart = startDate;
    let finalEnd = endDate;
    let finalReason = reason;

    if (leaveType === 'optional_holiday' && selectedOptionalHoliday) {
      finalStart = selectedOptionalHoliday;
      finalEnd = selectedOptionalHoliday;
      const h = OPTIONAL_HOLIDAYS_2026.find((x) => x.date === selectedOptionalHoliday);
      if (h) {
        finalReason = `Optional Holiday: ${h.name}. ${reason}`;
      }
    }

    try {
      const res = await fetch('/api/leaves/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainer_id: user.id,
          leave_type: leaveType,
          start_date: finalStart,
          end_date: finalEnd,
          reason: finalReason,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(res.ok ? 'Unexpected response format' : `Server error (${res.status})`);
      }

      if (res.ok && (data.success || data.id)) {
        setMessage({ text: 'Leave applied successfully!', type: 'success' });
        setReason('');
        fetchLeaves(user.id);
      } else {
        setMessage({ text: data.error || data.detail || 'Failed to apply leave', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Network error', type: 'error' });
    }
  };

  const casualLeavesUsedThisMonth = leaves.filter((l) => {
    if (l.leave_type !== 'casual' || l.status === 'rejected') return false;
    const d = new Date(l.start_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const optionalHolidaysUsedThisYear = leaves.filter((l) => {
    if (l.leave_type !== 'optional_holiday' || l.status === 'rejected') return false;
    const d = new Date(l.start_date);
    return d.getFullYear() === new Date().getFullYear();
  }).length;

  if (!user) return null;

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Dynamic Work-Life Balance & Wellness Hero Banner ───────────────────────────────── */}
      <div className="relative rounded-3xl p-6 sm:p-8 lg:p-9 text-white overflow-hidden shadow-2xl border border-teal-500/30 min-h-[260px] bg-slate-950">
        {/* Dynamic Rotating Background Images with Smooth Crossfade */}
        {WELLNESS_RECHARGE_QUOTES.map((item, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === quoteIdx ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
            }`}
            style={{
              backgroundImage: `linear-gradient(135deg, rgba(15, 118, 110, 0.94) 0%, rgba(14, 116, 144, 0.92) 50%, rgba(15, 23, 42, 0.93) 100%), url('${item.bgImage}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transitionProperty: 'opacity, transform',
              transitionDuration: '1000ms',
            }}
          />
        ))}

        {/* Ambient Glowing Orbs */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left Column: Title & Info */}
          <div className="space-y-3 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-teal-400/20 text-teal-200 border border-teal-400/30 backdrop-blur-md">
                <HeartPulse className="w-3.5 h-3.5 text-teal-300" /> Work-Life Balance & Wellness
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-white/10 text-white border border-white/15">
                <CalendarDays className="h-3.5 w-3.5 text-teal-300" /> Leave Portal 2026
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight text-white drop-shadow-sm">
              Trainer Leave & Rest Hub
            </h1>

            <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed font-normal">
              Apply for monthly casual leaves, festival optional leaves, or medical rest with instant transparent quota balances.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <span className="px-3.5 py-1.5 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-white font-extrabold text-xs">
                👨‍🏫 {user?.name || 'Trainer'}
              </span>
            </div>
          </div>

          {/* Right Column: Interactive Motivational Quotes Carousel */}
          <div className="w-full lg:w-[480px] bg-slate-950/75 backdrop-blur-xl border border-teal-500/30 rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden group">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="px-2.5 py-0.5 rounded-lg bg-teal-500/30 border border-teal-400/30 text-[10px] font-extrabold text-teal-200 uppercase tracking-wider">
                {WELLNESS_RECHARGE_QUOTES[quoteIdx].tag}
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
                    setQuoteIdx((prev) => (prev - 1 + WELLNESS_RECHARGE_QUOTES.length) % WELLNESS_RECHARGE_QUOTES.length)
                  }
                  className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  title="Previous quote"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setQuoteIdx((prev) => (prev + 1) % WELLNESS_RECHARGE_QUOTES.length)}
                  className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  title="Next quote"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="min-h-[72px] flex items-start gap-3">
              <Quote className="h-5 w-5 text-teal-400 shrink-0 mt-0.5 opacity-80" />
              <p className="text-xs sm:text-sm font-medium text-slate-100 italic leading-snug">
                "{WELLNESS_RECHARGE_QUOTES[quoteIdx].quote}"
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="text-xs font-bold text-white">{WELLNESS_RECHARGE_QUOTES[quoteIdx].author}</div>
                <div className="text-[10px] text-teal-300">{WELLNESS_RECHARGE_QUOTES[quoteIdx].role}</div>
              </div>

              {/* Step indicator dots */}
              <div className="flex items-center gap-1">
                {WELLNESS_RECHARGE_QUOTES.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    type="button"
                    onClick={() => setQuoteIdx(dotIdx)}
                    className={`h-1.5 rounded-full transition-all ${
                      dotIdx === quoteIdx ? 'w-5 bg-teal-400' : 'w-1.5 bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5 bg-white border border-teal-200/80 shadow-sm space-y-1.5 bg-gradient-to-br from-white to-teal-50/40">
          <div className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
            <Coffee className="h-4 w-4 text-teal-600" /> Monthly Casual Leave Quota
          </div>
          <div className="text-3xl font-extrabold font-mono text-teal-900">
            {casualLeavesUsedThisMonth} / {CASUAL_LEAVE_LIMIT_PER_MONTH} <span className="text-sm font-medium text-teal-600 font-sans">Used</span>
          </div>
          <p className="text-xs text-teal-700/80 font-medium">Allowed 1 casual leave per calendar month</p>
        </div>

        <div className="rounded-2xl p-5 bg-white border border-amber-200/80 shadow-sm space-y-1.5 bg-gradient-to-br from-white to-amber-50/40">
          <div className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
            <Sun className="h-4 w-4 text-amber-600" /> 2026 Optional Holidays Remaining
          </div>
          <div className="text-3xl font-extrabold font-mono text-amber-600">
            {OPTIONAL_HOLIDAY_LIMIT_PER_YEAR - optionalHolidaysUsedThisYear} / {OPTIONAL_HOLIDAY_LIMIT_PER_YEAR} <span className="text-sm font-medium text-amber-500 font-sans">Available</span>
          </div>
          <p className="text-xs text-amber-700/80 font-medium">Pick up to 5 festival days from official 2026 list</p>
        </div>
      </div>

        {message && (
          <div
            className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 border shadow-xs ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Plus className="h-4 w-4 text-indigo-600" /> Submit Leave Application
            </h3>

            <form onSubmit={handleApplyLeave} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => handleLeaveTypeChange(e.target.value as any)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-slate-900 font-medium focus:border-indigo-600 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="casual">Casual Leave (1/month)</option>
                  <option value="sick">Sick / Medical Leave</option>
                  <option value="emergency">Emergency Leave</option>
                  <option value="optional_holiday">Optional Holiday (Select from 2026 Calendar)</option>
                  <option value="weekoff">Week Off</option>
                </select>
              </div>

              {leaveType === 'optional_holiday' ? (
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Select 2026 Optional Holiday</label>
                  <select
                    required
                    value={selectedOptionalHoliday}
                    onChange={(e) => setSelectedOptionalHoliday(e.target.value)}
                    className="w-full rounded-xl bg-amber-50/50 border border-amber-300 px-3.5 py-2.5 text-amber-900 font-semibold focus:border-amber-500 focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="">-- Choose 2026 Festival / Holiday --</option>
                    {OPTIONAL_HOLIDAYS_2026.map((h) => (
                      <option key={h.date} value={h.date}>
                        {h.name} ({h.date})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">From Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-slate-900 font-medium focus:border-indigo-600 focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">To Date</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-slate-900 font-medium focus:border-indigo-600 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Reason for Leave</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Brief explanation for administration..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 p-3 text-slate-900 font-medium focus:border-indigo-600 focus:outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
              >
                Submit Application
              </button>
            </form>
          </div>

          <div className="rounded-2xl p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Calendar className="h-4 w-4 text-indigo-600" /> My Leave Requests
            </h3>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {leaves.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                  No leave applications submitted yet.
                </div>
              ) : (
                leaves.map((leave) => (
                  <div
                    key={leave.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-900 uppercase font-mono text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md">
                        {leave.leave_type.replace('_', ' ')}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-extrabold ${
                          leave.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : leave.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {leave.status}
                      </span>
                    </div>

                    <div className="font-mono font-bold text-slate-800">
                      📅 {leave.start_date === leave.end_date ? leave.start_date : `${leave.start_date} to ${leave.end_date}`}
                    </div>

                    <p className="text-slate-600 italic">"{leave.reason}"</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
    </main>
  );
}
