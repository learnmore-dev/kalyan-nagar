import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredUser } from '@/lib/auth';
import { User, Leave, LeaveType } from '@/lib/types';
import { MANDATORY_HOLIDAYS_2026, OPTIONAL_HOLIDAYS_2026, CASUAL_LEAVE_LIMIT_PER_MONTH, OPTIONAL_HOLIDAY_LIMIT_PER_YEAR } from '@/lib/holidays';
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
  const [selectedMandatoryHoliday, setSelectedMandatoryHoliday] = useState<string>('');
  const [selectedCustomHoliday, setSelectedCustomHoliday] = useState<string>('');
  const [balance, setBalance] = useState<any>(null);
  const [mandatoryHolidaysList, setMandatoryHolidaysList] = useState<any[]>(MANDATORY_HOLIDAYS_2026);
  const [optionalHolidaysList, setOptionalHolidaysList] = useState<any[]>(OPTIONAL_HOLIDAYS_2026);
  const [customHolidaysList, setCustomHolidaysList] = useState<any[]>([]);
  const [holidayTab, setHolidayTab] = useState<'mandatory' | 'optional' | 'custom'>('mandatory');

  const fetchUserData = async (userId: string) => {
    try {
      const [lRes, bRes, hRes] = await Promise.all([
        fetch(`/api/leaves/?trainer_id=${encodeURIComponent(userId)}`),
        fetch(`/api/leaves/adjust/?trainer_id=${encodeURIComponent(userId)}`),
        fetch('/api/holidays/'),
      ]);

      const lData = await lRes.json();
      if (lData?.success) {
        setLeaves(lData.leaves || []);
      }

      const bData = await bRes.json();
      if (bData?.success) {
        const found = bData.balance || (bData.balances && bData.balances.find((b: any) => (b.trainer_id || b.trainer) === userId));
        if (found) setBalance(found);
      }

      const hData = await hRes.json();
      if (hData?.success && Array.isArray(hData.holidays)) {
        const mand = hData.holidays.filter((h: any) => h.type === 'mandatory');
        const opts = hData.holidays.filter((h: any) => h.type === 'optional');
        const cust = hData.holidays.filter((h: any) => h.type !== 'mandatory' && h.type !== 'optional');
        if (mand.length > 0) setMandatoryHolidaysList(mand);
        if (opts.length > 0) setOptionalHolidaysList(opts);
        setCustomHolidaysList(cust);
      }
    } catch {
      // silent fallback
    }
  };

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      navigate('/login', { replace: true });
      return;
    }
    setUser(u);
    fetchUserData(u.id);
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
      const h = optionalHolidaysList.find((x) => x.date === selectedOptionalHoliday);
      if (h) {
        finalReason = `Optional Holiday: ${h.name}. ${reason}`;
      }
    } else if (leaveType === 'mandatory_holiday' && selectedMandatoryHoliday) {
      finalStart = selectedMandatoryHoliday;
      finalEnd = selectedMandatoryHoliday;
      const h = mandatoryHolidaysList.find((x) => x.date === selectedMandatoryHoliday);
      if (h) {
        finalReason = `Mandatory Holiday: ${h.name}. ${reason}`;
      }
    } else if (leaveType === 'custom' && selectedCustomHoliday) {
      finalStart = selectedCustomHoliday;
      finalEnd = selectedCustomHoliday;
      const h = customHolidaysList.find((x) => x.date === selectedCustomHoliday);
      if (h) {
        finalReason = `Special Admin Leave: ${h.name}. ${reason}`;
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
        setSelectedOptionalHoliday('');
        setSelectedMandatoryHoliday('');
        setSelectedCustomHoliday('');
        fetchUserData(user.id);
      } else {
        setMessage({ text: data.error || data.detail || 'Failed to apply leave', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Network error', type: 'error' });
    }
  };

  const handleSelectHolidayFromCard = (
    hDate: string,
    hName: string,
    type: 'optional' | 'mandatory' | 'custom' = 'optional'
  ) => {
    if (type === 'mandatory') {
      setLeaveType('mandatory_holiday');
      setSelectedMandatoryHoliday(hDate);
    } else if (type === 'custom') {
      setLeaveType('custom');
      setSelectedCustomHoliday(hDate);
    } else {
      setLeaveType('optional_holiday');
      setSelectedOptionalHoliday(hDate);
    }
    setStartDate(hDate);
    setEndDate(hDate);
    setReason(`${type === 'mandatory' ? 'Mandatory Holiday' : type === 'custom' ? 'Custom Admin Leave' : 'Optional Holiday'} for ${hName}`);
    // Scroll to form smoothly
    const formElem = document.getElementById('leave-application-form');
    if (formElem) {
      formElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const casualLeavesUsedThisMonth = leaves.filter((l) => {
    if (l.leave_type !== 'casual' || l.status === 'rejected') return false;
    const d = new Date(l.start_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const approvedLeavesCount = leaves.filter((l) => l.status === 'approved');
  const casualTakenTotal = approvedLeavesCount.filter((l) => l.leave_type === 'casual').length;
  const sickTakenTotal = approvedLeavesCount.filter((l) => l.leave_type === 'sick').length;
  const weekoffsTakenTotal = approvedLeavesCount.filter((l) => l.leave_type === 'weekoff').length;
  const optionalTakenTotal = approvedLeavesCount.filter((l) => l.leave_type === 'optional_holiday').length;
  const mandatoryTakenTotal = approvedLeavesCount.filter((l) => l.leave_type === 'mandatory_holiday').length;
  const customTakenTotal = approvedLeavesCount.filter((l) => l.leave_type === 'custom').length;

  // Real quotas and available balances
  const casualSickQuota = balance?.casual_sick_quota ?? 12;
  const casualSickUsed = balance?.casual_sick_used ?? (casualTakenTotal + sickTakenTotal);
  const casualSickAvailable = Math.max(0, casualSickQuota - casualSickUsed);

  const optionalQuota = balance?.optional_holiday_quota ?? 5;
  const optionalUsed = balance?.optional_holiday_used ?? optionalTakenTotal;
  const optionalAvailable = Math.max(0, optionalQuota - optionalUsed);

  const mandatoryCount = mandatoryHolidaysList.length;

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

      {/* ── 5 Rich Leave Balance Cards Showing ALL Leave Types ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Casual Leave */}
        <div className="rounded-2xl p-4 bg-white border border-teal-200/80 shadow-sm space-y-1 bg-gradient-to-br from-white to-teal-50/40">
          <div className="text-[11px] font-bold text-teal-700 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Coffee className="h-3.5 w-3.5 text-teal-600" /> Casual</span>
            <span className="text-[9px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded-full font-extrabold">1/Mo</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-teal-900">
            {casualSickAvailable} / {casualSickQuota} <span className="text-xs font-medium text-teal-600 font-sans">Left</span>
          </div>
          <p className="text-[11px] text-teal-700/80 font-medium truncate">
            Month: <strong className="text-teal-900">{casualLeavesUsedThisMonth}/1</strong> ({casualTakenTotal} total)
          </p>
        </div>

        {/* Card 2: Sick / Medical Leave */}
        <div className="rounded-2xl p-4 bg-white border border-rose-200/80 shadow-sm space-y-1 bg-gradient-to-br from-white to-rose-50/40">
          <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5"><HeartPulse className="h-3.5 w-3.5 text-rose-600" /> Medical</span>
            <span className="text-[9px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded-full font-extrabold">Health</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-rose-900">
            {sickTakenTotal} <span className="text-xs font-medium text-rose-600 font-sans">Used</span>
          </div>
          <p className="text-[11px] text-rose-700/80 font-medium truncate">
            Medical recuperation days
          </p>
        </div>

        {/* Card 3: Mandatory Holidays */}
        <div className="rounded-2xl p-4 bg-white border border-indigo-200/80 shadow-sm space-y-1 bg-gradient-to-br from-white to-indigo-50/40">
          <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-indigo-600" /> Mandatory</span>
            <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-full font-extrabold">Official Off</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-indigo-900">
            {mandatoryCount} <span className="text-xs font-medium text-indigo-600 font-sans">Days</span>
          </div>
          <p className="text-[11px] text-indigo-700/80 font-medium truncate">
            Compulsory paid company holidays
          </p>
        </div>

        {/* Card 4: Optional Holidays */}
        <div className="rounded-2xl p-4 bg-white border border-amber-200/80 shadow-sm space-y-1 bg-gradient-to-br from-white to-amber-50/40">
          <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Sun className="h-3.5 w-3.5 text-amber-600" /> Optional</span>
            <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-extrabold">Festivals</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-600">
            {optionalAvailable} / {optionalQuota} <span className="text-xs font-medium text-amber-500 font-sans">Left</span>
          </div>
          <p className="text-[11px] text-amber-700/80 font-medium truncate">
            {optionalUsed} / {optionalQuota} festivals taken
          </p>
        </div>

        {/* Card 5: Week Offs */}
        <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-sm space-y-1 bg-gradient-to-br from-white to-slate-50/50">
          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-slate-600" /> Week Offs</span>
            <span className="text-[9px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded-full font-extrabold">Weekly</span>
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900">
            {weekoffsTakenTotal} <span className="text-xs font-medium text-slate-600 font-sans">Approved</span>
          </div>
          <p className="text-[11px] text-slate-600 font-medium truncate">
            Scheduled rest days approved
          </p>
        </div>
      </div>

      {/* ── Official Holidays & Rest Portal (Mandatory + Optional + Custom) ────────────────── */}
      <div className="rounded-3xl p-6 bg-white border border-slate-200/90 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" /> Company Holiday Calendar & Official Leaves
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              View mandatory public holidays, optional festival pool, and admin announced leaves. Click any card to apply or view status.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setHolidayTab('mandatory')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                holidayTab === 'mandatory'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🏛️ Mandatory ({mandatoryHolidaysList.length})
            </button>
            <button
              type="button"
              onClick={() => setHolidayTab('optional')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                holidayTab === 'optional'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ✨ Optional ({optionalHolidaysList.length})
            </button>
            {customHolidaysList.length > 0 && (
              <button
                type="button"
                onClick={() => setHolidayTab('custom')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  holidayTab === 'custom'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🌟 Admin Leaves ({customHolidaysList.length})
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Mandatory Holidays */}
        {holidayTab === 'mandatory' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">
                Official compulsory paid holidays scheduled for all faculty and staff.
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-extrabold">
                {mandatoryHolidaysList.length} Compulsory Days
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {mandatoryHolidaysList.map((h: any) => {
                const leaveMatch = leaves.find((l) => l.start_date === h.date && l.leave_type === 'mandatory_holiday');
                const isApproved = leaveMatch?.status === 'approved';
                const isPending = leaveMatch?.status === 'pending';

                return (
                  <div
                    key={h.date}
                    className={`p-4 rounded-2xl border transition-all space-y-2 flex flex-col justify-between ${
                      isApproved
                        ? 'bg-emerald-50/60 border-emerald-300'
                        : isPending
                        ? 'bg-amber-50/60 border-amber-300'
                        : 'bg-indigo-50/30 border-indigo-200 hover:border-indigo-400 hover:shadow-xs'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-slate-500">📅 {h.date}</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-indigo-100 text-indigo-800">
                          Mandatory
                        </span>
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-900 leading-snug">{h.name}</h4>
                      {h.description && <p className="text-[10px] text-slate-500 italic">{h.description}</p>}
                    </div>

                    <div className="pt-2">
                      {isApproved || isPending ? (
                        <div className="text-[11px] font-bold text-slate-600 italic flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          {isApproved ? 'Recorded in Profile' : 'Pending Review'}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectHolidayFromCard(h.date, h.name, 'mandatory')}
                          className="w-full py-1.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] shadow-xs cursor-pointer transition-colors"
                        >
                          Select & File →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Optional Festival Holidays */}
        {holidayTab === 'optional' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">
                You are entitled to pick any {optionalQuota} festival holidays. Click "Select & Apply" to request one.
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-extrabold">
                {optionalAvailable} of {optionalQuota} Available
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {optionalHolidaysList.map((h: any) => {
                const leaveMatch = leaves.find((l) => l.start_date === h.date && l.leave_type === 'optional_holiday');
                const isApproved = leaveMatch?.status === 'approved';
                const isPending = leaveMatch?.status === 'pending';

                return (
                  <div
                    key={h.date}
                    className={`p-4 rounded-2xl border transition-all space-y-2 flex flex-col justify-between ${
                      isApproved
                        ? 'bg-emerald-50/60 border-emerald-300'
                        : isPending
                        ? 'bg-amber-50/60 border-amber-300'
                        : 'bg-slate-50/70 border-slate-200 hover:border-amber-400 hover:shadow-xs'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-slate-500">📅 {h.date}</span>
                        {isApproved ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800">
                            Availed
                          </span>
                        ) : isPending ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 text-amber-800">
                            Pending
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                            Available
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-900 leading-snug">{h.name}</h4>
                    </div>

                    <div className="pt-2">
                      {isApproved || isPending ? (
                        <div className="text-[11px] font-bold text-slate-500 italic flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Application Filed
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectHolidayFromCard(h.date, h.name, 'optional')}
                          className="w-full py-1.5 px-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[11px] shadow-xs cursor-pointer transition-colors"
                        >
                          Select & Apply →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Custom & Special Admin Leaves */}
        {holidayTab === 'custom' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-700">
                Special holidays and custom rest days declared by administration.
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-[10px] font-extrabold">
                {customHolidaysList.length} Special Leaves
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {customHolidaysList.map((h: any) => {
                const leaveMatch = leaves.find((l) => l.start_date === h.date && l.leave_type === 'custom');
                const isApproved = leaveMatch?.status === 'approved';
                const isPending = leaveMatch?.status === 'pending';

                return (
                  <div
                    key={h.date + h.name}
                    className="p-4 rounded-2xl border border-purple-200 bg-purple-50/40 space-y-2 flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-purple-700">📅 {h.date}</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-purple-100 text-purple-800">
                          🌟 Admin Leave
                        </span>
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-900 leading-snug">{h.name}</h4>
                      {h.description && <p className="text-[11px] text-slate-600 italic">{h.description}</p>}
                    </div>

                    <div className="pt-2">
                      {isApproved || isPending ? (
                        <div className="text-[11px] font-bold text-slate-600 italic flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Application Filed
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectHolidayFromCard(h.date, h.name, 'custom')}
                          className="w-full py-1.5 px-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-[11px] shadow-xs cursor-pointer transition-colors"
                        >
                          Select & Apply →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
        <div id="leave-application-form" className="rounded-2xl p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
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
                <option value="casual">Casual Leave (1/month) — {casualSickAvailable}/{casualSickQuota} Left</option>
                <option value="sick">Sick / Medical Leave</option>
                <option value="emergency">Emergency Leave</option>
                <option value="mandatory_holiday">🏛️ Mandatory Holiday (Compulsory Calendar Off)</option>
                <option value="optional_holiday">✨ Optional Holiday (Festival Pool) — {optionalAvailable}/{optionalQuota} Available</option>
                {customHolidaysList.length > 0 && (
                  <option value="custom">🌟 Special / Custom Admin Announced Leave</option>
                )}
                <option value="weekoff">Week Off</option>
              </select>
            </div>

            {leaveType === 'optional_holiday' ? (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-700 font-bold">Select 2026 Optional Holiday</label>
                  <span className="text-[11px] font-extrabold text-amber-700">{optionalAvailable} of {optionalQuota} Available</span>
                </div>
                <select
                  required
                  value={selectedOptionalHoliday}
                  onChange={(e) => setSelectedOptionalHoliday(e.target.value)}
                  className="w-full rounded-xl bg-amber-50/50 border border-amber-300 px-3.5 py-2.5 text-amber-900 font-semibold focus:border-amber-500 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="">-- Choose 2026 Festival / Holiday --</option>
                  {optionalHolidaysList.map((h: any) => (
                    <option key={h.date} value={h.date}>
                      {h.name} ({h.date})
                    </option>
                  ))}
                </select>
              </div>
            ) : leaveType === 'mandatory_holiday' ? (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-700 font-bold">Select Mandatory Company Holiday</label>
                  <span className="text-[11px] font-extrabold text-indigo-700">Official Paid Off</span>
                </div>
                <select
                  required
                  value={selectedMandatoryHoliday}
                  onChange={(e) => setSelectedMandatoryHoliday(e.target.value)}
                  className="w-full rounded-xl bg-indigo-50/50 border border-indigo-300 px-3.5 py-2.5 text-indigo-900 font-semibold focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="">-- Choose Mandatory Holiday --</option>
                  {mandatoryHolidaysList.map((h: any) => (
                    <option key={h.date} value={h.date}>
                      🏛️ {h.name} ({h.date})
                    </option>
                  ))}
                </select>
              </div>
            ) : leaveType === 'custom' ? (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-700 font-bold">Select Admin Special Leave</label>
                  <span className="text-[11px] font-extrabold text-purple-700">Admin Declared</span>
                </div>
                <select
                  required
                  value={selectedCustomHoliday}
                  onChange={(e) => setSelectedCustomHoliday(e.target.value)}
                  className="w-full rounded-xl bg-purple-50/50 border border-purple-300 px-3.5 py-2.5 text-purple-900 font-semibold focus:border-purple-500 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="">-- Choose Special Admin Leave --</option>
                  {customHolidaysList.map((h: any) => (
                    <option key={h.date} value={h.date}>
                      🌟 {h.name} ({h.date}){h.description ? ` - ${h.description}` : ''}
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
