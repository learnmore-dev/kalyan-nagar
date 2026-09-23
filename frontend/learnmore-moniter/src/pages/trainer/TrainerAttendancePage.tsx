import React, { useState, useEffect } from 'react';
import WebcamCapture from '@/components/WebcamCapture';
import { getStoredUser } from '@/lib/auth';
import { formatTimeSafely } from '@/lib/whatsappService';
import { User, TrainerAttendance } from '@/lib/types';
import {
  Camera,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
  LogOut,
  LogIn,
  RefreshCw,
  CalendarDays,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Quote,
  Play,
  Pause,
  Sparkles,
  Zap,
} from 'lucide-react';

/* ── Biometric & Discipline Quotes with HD Backgrounds ─────────── */
const ATTENDANCE_QUOTES = [
  {
    quote: "Punctuality is not just about being on time, it's about respecting your commitments and students' valuable time.",
    author: "Robin Sharma",
    role: "Leadership Author",
    tag: "⏱️ Punctuality & Respect",
    bgImage: "https://images.unsplash.com/photo-1508962914676-134849a727f0?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "Success is nothing more than a few simple disciplines, practiced every single day.",
    author: "Jim Rohn",
    role: "Philosopher & Mentor",
    tag: "⚡ Daily Discipline",
    bgImage: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "Long-term consistency trumps short-term intensity. Show up every day with passion and energy.",
    author: "Bruce Lee",
    role: "Philosopher & Icon",
    tag: "🔥 Consistency & Energy",
    bgImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "Time is the most valuable asset a mentor has. How you spend it defines your students' future.",
    author: "Theophrastus",
    role: "Philosopher",
    tag: "💎 Time Value",
    bgImage: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "Discipline is the bridge between your goals and your achievements in every class you lead.",
    author: "John C. Maxwell",
    role: "Leadership Expert",
    tag: "🎯 Focus & Excellence",
    bgImage: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1600&auto=format&fit=crop&q=80",
  },
];

export default function TrainerAttendancePage() {
  const [user, setUser] = useState<User | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<TrainerAttendance | null>(null);
  const [allAttendances, setAllAttendances] = useState<TrainerAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Quotes Carousel State
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Live Digital Clock
  const [liveTime, setLiveTime] = useState<string>(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setQuoteIdx((prev) => (prev + 1) % ATTENDANCE_QUOTES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const [showCameraModal, setShowCameraModal] = useState(false);
  const [captureAction, setCaptureAction] = useState<'in' | 'out'>('in');

  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchTrainerAttendanceData = async (userId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/?trainer_id=${userId}`);
      const data = await res.json();
      if (data.success) {
        setAllAttendances(data.attendances || []);
        const todayRecord = data.attendances.find(
          (a: TrainerAttendance) => a.trainer_id === userId && a.date === todayStr
        );
        setTodayAttendance(todayRecord || null);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);
    if (u) {
      fetchTrainerAttendanceData(u.id);
    }
  }, []);

  const handleOpenCapture = (action: 'in' | 'out') => {
    setCaptureAction(action);
    setShowCameraModal(true);
  };

  const handleCaptureSubmit = async (
    selfieBase64: string,
    coords?: { lat: string; lon: string; address: string }
  ) => {
    if (!user || submitting) return;
    setSubmitting(true);
    setMessage(null);
    setShowCameraModal(false);

    try {
      const parsedLat = coords?.lat ? parseFloat(coords.lat) : undefined;
      const parsedLng = coords?.lon ? parseFloat(coords.lon) : undefined;
      const locName = coords?.address || (coords?.lat ? `GPS: ${coords.lat}, ${coords.lon}` : 'Live GPS Location');

      const res = await fetch('/api/attendance/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainer_id: user.id,
          trainer_name: user.name,
          action: captureAction === 'in' ? 'mark_in' : 'mark_out',
          type: captureAction,
          photo: selfieBase64,
          selfie_url: selfieBase64,
          latitude: parsedLat,
          longitude: parsedLng,
          location_name: locName,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({
          text: `Check-${captureAction.toUpperCase()} marked successfully! WhatsApp group notified.`,
          type: 'success',
        });
        await fetchTrainerAttendanceData(user.id);
      } else {
        setMessage({ text: data.error || 'Failed to record attendance', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error submitting attendance', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const isCheckedIn = !!(todayAttendance?.mark_in_time || (todayAttendance as any)?.check_in_time);
  const isCheckedOut = !!(todayAttendance?.mark_out_time || (todayAttendance as any)?.check_out_time);

  const formattedInTime = formatTimeSafely(todayAttendance?.mark_in_time || (todayAttendance as any)?.check_in_time);
  const formattedOutTime = formatTimeSafely(todayAttendance?.mark_out_time || (todayAttendance as any)?.check_out_time);

  const monthlyList = allAttendances
    .filter((a) => a.date.startsWith(selectedMonth))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPages = Math.max(1, Math.ceil(monthlyList.length / itemsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, monthlyList.length);
  const paginatedList = monthlyList.slice(startIndex, endIndex);

  const isLateRecord = (a: TrainerAttendance) => {
    if (!a.mark_in_time) return false;
    const d = new Date(a.mark_in_time);
    const mins = d.getHours() * 60 + d.getMinutes();
    return mins > 615; // 10:15 AM
  };

  const getRecordDayStatus = (rec: TrainerAttendance) => {
    if (!rec.mark_in_time) {
      if (rec.day_status === 'leave') return 'leave';
      if (rec.day_status === 'weekoff') return 'weekoff';
      if (rec.day_status === 'holiday') return 'holiday';
      return 'absent';
    }
    if (!rec.mark_out_time) {
      return 'pending';
    }
    const parseMins = (tStr?: string | null) => {
      if (!tStr) return null;
      const s = String(tStr).trim();
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes();
      if (s.includes(':')) {
        const parts = s.split(':');
        let h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (s.toLowerCase().includes('pm') && h < 12) h += 12;
        if (s.toLowerCase().includes('am') && h === 12) h = 0;
        if (!isNaN(h) && !isNaN(m)) return h * 60 + m;
      }
      return null;
    };

    let mins = rec.total_work_minutes || 0;
    if (!mins && rec.mark_in_time && rec.mark_out_time) {
      const inM = parseMins(rec.mark_in_time);
      const outM = parseMins(rec.mark_out_time);
      if (inM !== null && outM !== null) {
        mins = outM - inM;
        if (mins < 0) mins += 24 * 60;
      }
    }

    if (mins < 300) return 'leave';
    if (mins < 540) return 'half_day';
    return 'present';
  };

  const pendingDays = monthlyList.filter((a) => getRecordDayStatus(a) === 'pending').length;
  const presentDays = monthlyList.filter(
    (a) => getRecordDayStatus(a) === 'present' && !isLateRecord(a)
  ).length;

  const lateDays = monthlyList.filter((a) => isLateRecord(a)).length;
  const halfDays = monthlyList.filter((a) => getRecordDayStatus(a) === 'half_day').length;
  const leaveDays = monthlyList.filter((a) => getRecordDayStatus(a) === 'leave').length;
  const absentDays = monthlyList.filter(
    (a) => getRecordDayStatus(a) === 'absent'
  ).length;

  let totalMinutesMonth = 0;
  monthlyList.forEach((a) => {
    const parseMins = (tStr?: string | null) => {
      if (!tStr) return null;
      const s = String(tStr).trim();
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes();
      if (s.includes(':')) {
        const parts = s.split(':');
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(h) && !isNaN(m)) return h * 60 + m;
      }
      return null;
    };

    if (a.total_work_minutes && !isNaN(Number(a.total_work_minutes))) {
      totalMinutesMonth += Number(a.total_work_minutes);
    } else if (a.mark_in_time && a.mark_out_time) {
      const inM = parseMins(a.mark_in_time);
      const outM = parseMins(a.mark_out_time);
      if (inM !== null && outM !== null) {
        let diff = outM - inM;
        if (diff < 0) diff += 24 * 60;
        totalMinutesMonth += diff;
      }
    } else if (a.mark_in_time) {
      totalMinutesMonth += a.day_status === 'half_day' ? 240 : 480;
    }
  });
  const totalHoursMonth = isNaN(totalMinutesMonth) ? '0.0' : (totalMinutesMonth / 60).toFixed(1);

  const handlePrevMonth = () => {
    let [y, m] = selectedMonth.split('-').map(Number);
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    const formatted = `${y}-${String(m).padStart(2, '0')}`;
    setSelectedMonth(formatted);
    setCurrentPage(1);
  };

  const handleNextMonth = () => {
    let [y, m] = selectedMonth.split('-').map(Number);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    const formatted = `${y}-${String(m).padStart(2, '0')}`;
    setSelectedMonth(formatted);
    setCurrentPage(1);
  };

  const [dispY, dispM] = (selectedMonth || '2026-09').split('-').map(Number);
  const monthDisplayLabel = new Date(dispY, (dispM || 1) - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-7">
      {/* ── Dynamic Biometric HUD Banner with Discipline Quotes ───────────────────────────────── */}
      <div className="relative rounded-3xl p-6 sm:p-8 lg:p-9 text-white overflow-hidden shadow-2xl border border-emerald-500/25 min-h-[260px]">
        {/* Dynamic Rotating Background Images with Smooth Crossfade */}
        {ATTENDANCE_QUOTES.map((item, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === quoteIdx ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
              }`}
            style={{
              backgroundImage: `linear-gradient(135deg, rgba(6, 78, 59, 0.94) 0%, rgba(15, 23, 42, 0.92) 50%, rgba(17, 24, 39, 0.90) 100%), url('${item.bgImage}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transitionProperty: 'opacity, transform',
              transitionDuration: '1000ms',
            }}
          />
        ))}

        {/* Ambient Glowing Orbs */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left Column: Title & Actions */}
          <div className="space-y-3 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 backdrop-blur-md">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> Biometric Face & GPS Security
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-white/10 text-white border border-white/15">
                <Clock className="h-3.5 w-3.5 text-emerald-400" /> {liveTime}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight text-white drop-shadow-sm">
              Biometric Attendance Portal
            </h1>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-normal">
              Capture verified daily check-in selfies with live geo-location, track shift durations, and review full monthly logs.
            </p>

            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => user && fetchTrainerAttendanceData(user.id)}
                className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-extrabold bg-white text-emerald-950 hover:bg-slate-100 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 text-emerald-600 ${loading ? 'animate-spin' : ''}`} /> Refresh Status
              </button>
            </div>
          </div>

          {/* Right Column: Interactive Motivational Quotes Carousel */}
          <div className="w-full lg:w-[480px] bg-slate-950/70 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden group">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/30 border border-emerald-400/30 text-[10px] font-extrabold text-emerald-200 uppercase tracking-wider">
                {ATTENDANCE_QUOTES[quoteIdx].tag}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-200 transition-colors cursor-pointer text-[10px] flex items-center gap-1"
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
                      prev === 0 ? ATTENDANCE_QUOTES.length - 1 : prev - 1
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
                    setQuoteIdx((prev) => (prev + 1) % ATTENDANCE_QUOTES.length)
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
                <Quote className="h-5 w-5 text-emerald-400 shrink-0 opacity-80 mt-0.5" />
                <p className="text-xs sm:text-sm text-slate-100 font-semibold italic leading-relaxed">
                  "{ATTENDANCE_QUOTES[quoteIdx].quote}"
                </p>
              </div>

              <div className="pt-3 flex items-center justify-between text-[11px]">
                <div>
                  <span className="font-extrabold text-white">
                    — {ATTENDANCE_QUOTES[quoteIdx].author}
                  </span>
                  <span className="text-emerald-300 ml-1.5 text-[10px]">
                    ({ATTENDANCE_QUOTES[quoteIdx].role})
                  </span>
                </div>

                <span className="font-mono text-[10px] text-emerald-300 font-bold">
                  {quoteIdx + 1}/{ATTENDANCE_QUOTES.length}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 pt-1">
              {ATTENDANCE_QUOTES.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={() => setQuoteIdx(dotIdx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${dotIdx === quoteIdx
                      ? 'w-6 bg-emerald-400 shadow-xs'
                      : 'w-1.5 bg-white/25 hover:bg-white/50'
                    }`}
                  title={`Quote ${dotIdx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2.5 shadow-xs ${message.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white p-6 sm:p-7 shadow-xs border border-slate-200/80 space-y-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Camera className="h-4 w-4 text-indigo-600" /> Today's Action
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-extrabold">
                GPS & Face Verify
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-center">
              <div className="text-xs font-bold text-slate-500">Shift Status for Today</div>
              <div className="text-lg font-black">
                {isCheckedOut ? (
                  <span className="text-blue-600 flex items-center justify-center gap-1.5">
                    🔵 Shift Completed
                  </span>
                ) : isCheckedIn ? (
                  <span className="text-emerald-600 flex items-center justify-center gap-1.5">
                    🟢 Currently Working (Checked In)
                  </span>
                ) : (
                  <span className="text-amber-600 flex items-center justify-center gap-1.5">
                    🟡 Not Checked In Yet
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                {isCheckedOut
                  ? 'You have logged out for today. See you tomorrow!'
                  : isCheckedIn
                    ? 'Check out when your shift or classes are complete.'
                    : 'Please capture a selfie to start your working day.'}
              </div>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            {!isCheckedIn ? (
              <button
                type="button"
                onClick={() => handleOpenCapture('in')}
                disabled={submitting}
                className="w-full py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <LogIn className="h-5 w-5" />
                {submitting ? 'Recording Check-In...' : '📸 Take Selfie & Check IN'}
              </button>
            ) : !isCheckedOut ? (
              <button
                type="button"
                onClick={() => handleOpenCapture('out')}
                disabled={submitting}
                className="w-full py-4 px-5 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <LogOut className="h-5 w-5" />
                {submitting ? 'Recording Check-Out...' : '📸 Take Selfie & Check OUT'}
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold text-center">
                ✅ You have checked in and checked out for today.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 sm:p-7 shadow-xs border border-slate-200/80 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Today's Time & GPS Logs</span>
              <span className="font-mono text-xs text-slate-400">{todayStr}</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-bold flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-emerald-600" /> Login Time
                </span>
                <span className="font-mono font-extrabold text-slate-900 text-sm">
                  {formattedInTime}
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-bold flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-rose-600" /> Logout Time
                </span>
                <span className="font-mono font-extrabold text-slate-900 text-sm">
                  {formattedOutTime}
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-bold flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-rose-500" /> Location
                </span>
                <span className="text-slate-800 font-bold truncate max-w-[180px]" title={todayAttendance?.location_name || 'Campus Lab'}>
                  {todayAttendance?.location_name || 'Main Campus Lab 1'}
                </span>
              </div>
            </div>
          </div>

          {todayAttendance?.photo_in && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={todayAttendance.photo_in}
                  alt="Selfie Check In"
                  className="h-12 w-12 rounded-xl object-cover border border-emerald-400 cursor-pointer hover:opacity-90"
                  onClick={() => setViewPhotoUrl(todayAttendance.photo_in!)}
                />
                <div>
                  <div className="text-xs font-bold text-slate-900">Today's Selfie Photo</div>
                  <div className="text-[11px] text-slate-500 font-mono">{formattedInTime}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewPhotoUrl(todayAttendance.photo_in!)}
                className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" /> View
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-200/80 shadow-xs overflow-hidden space-y-0">
        <div className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-indigo-600" /> Month-wise Attendance History
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Detailed record of all daily logins, logouts, working hours, and selfie captures.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="px-4 py-2 bg-white rounded-xl border border-slate-300 font-extrabold text-xs text-slate-900 shadow-2xs min-w-[150px] text-center font-mono">
              {monthDisplayLabel}
            </div>

            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 p-4 sm:p-5 bg-white border-b border-slate-100">
          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
            <div className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">
              🟢 Present
            </div>
            <div className="text-xl font-black text-emerald-950 font-mono">{presentDays} Days</div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-300 space-y-1">
            <div className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider">
              ⏳ Pending
            </div>
            <div className="text-xl font-black text-amber-950 font-mono">{pendingDays} Days</div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
            <div className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">
              🟡 Late Login
            </div>
            <div className="text-xl font-black text-amber-950 font-mono">{lateDays} Days</div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-300 space-y-1">
            <div className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider">
              🌓 Half Day Leave
            </div>
            <div className="text-xl font-black text-amber-950 font-mono">{halfDays} Days</div>
          </div>

          <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-1">
            <div className="text-[10px] font-extrabold text-purple-800 uppercase tracking-wider">
              🟠 On Leave
            </div>
            <div className="text-xl font-black text-purple-950 font-mono">{leaveDays} Days</div>
          </div>

          <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-1">
            <div className="text-[10px] font-extrabold text-rose-800 uppercase tracking-wider">
              🔴 Absent
            </div>
            <div className="text-xl font-black text-rose-950 font-mono">{absentDays} Days</div>
          </div>

          <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-1">
            <div className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider">
              ⏱️ Hours Logged
            </div>
            <div className="text-xl font-black text-blue-950 font-mono">{totalHoursMonth}h</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#fafcff] text-slate-400 font-extrabold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-4 px-4">DATE</th>
                <th className="py-4 px-4">MARK IN</th>
                <th className="py-4 px-4">MARK OUT</th>
                <th className="py-4 px-4">DURATION</th>
                <th className="py-4 px-4">LOCATION</th>
                <th className="py-4 px-4">SELFIE</th>
                <th className="py-4 px-4 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-bold">
                    No attendance records found for {monthDisplayLabel}.
                  </td>
                </tr>
              ) : (
                paginatedList.map((rec) => {
                  const rowDate = new Date(rec.date);
                  const formattedDate = rowDate.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });
                  const dayOfWeek = rowDate.toLocaleDateString('en-US', { weekday: 'short' });

                  const inFormatted = formatTimeSafely(rec.mark_in_time);
                  const outFormatted = formatTimeSafely(rec.mark_out_time);

                  const parseToMins = (str?: string | null) => {
                    if (!str) return null;
                    const s = str.trim();
                    const d = new Date(s);
                    if (!isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes();
                    if (s.includes(':')) {
                      const parts = s.split(':');
                      const h = parseInt(parts[0], 10);
                      const m = parseInt(parts[1], 10);
                      if (!isNaN(h) && !isNaN(m)) return h * 60 + m;
                    }
                    return null;
                  };

                  let shiftDurationStr = '—';
                  const inMins = parseToMins(rec.mark_in_time);
                  if (inMins !== null) {
                    const outMins = parseToMins(rec.mark_out_time);
                    let diff = 0;
                    if (outMins !== null) {
                      diff = outMins - inMins;
                    } else {
                      const now = new Date();
                      const currentMins = now.getHours() * 60 + now.getMinutes();
                      diff = currentMins - inMins;
                    }
                    if (diff < 0) diff += 24 * 60;
                    const h = Math.floor(diff / 60);
                    const m = diff % 60;
                    shiftDurationStr = `${h}h ${m}m`;
                  }

                  let isLate = false;
                  if (rec.mark_in_time) {
                    const d = new Date(rec.mark_in_time);
                    const mins = d.getHours() * 60 + d.getMinutes();
                    isLate = mins > 615;
                  }

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900">{formattedDate}</div>
                        <div className="text-[11px] text-slate-500 font-medium">{dayOfWeek}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {inFormatted !== '—' ? (
                          <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md">
                            🟢 {inFormatted}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {outFormatted !== '—' ? (
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md">
                            🚪 {outFormatted}
                          </span>
                        ) : rec.mark_in_time ? (
                          <span className="px-2 py-0.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-md font-extrabold text-xs inline-flex items-center gap-1">
                            ⏳ Pending
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-extrabold text-indigo-700">
                        {shiftDurationStr}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 font-medium max-w-[160px] truncate" title={rec.location_name || 'Campus Lab'}>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                          <span className="truncate">{rec.location_name || 'Campus Lab 1'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {rec.photo_in ? (
                          <img
                            src={rec.photo_in}
                            alt="Selfie"
                            className="h-8 w-8 rounded-lg object-cover border border-emerald-300 cursor-pointer hover:scale-110 transition-transform"
                            onClick={() => setViewPhotoUrl(rec.photo_in!)}
                            title="Click to view photo"
                          />
                        ) : (
                          <span className="text-slate-300 font-mono text-[10px]">No Photo</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {getRecordDayStatus(rec) === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                            ⏳ Pending
                          </span>
                        ) : getRecordDayStatus(rec) === 'leave' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800">
                            🟠 On Leave
                          </span>
                        ) : getRecordDayStatus(rec) === 'half_day' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                            🌓 Half Day Leave
                          </span>
                        ) : getRecordDayStatus(rec) === 'absent' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                            🔴 Absent
                          </span>
                        ) : isLate ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-yellow-100 text-yellow-900 border border-yellow-300">
                            🟡 Late Login
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            🟢 Present
                          </span>
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
        {monthlyList.length > 0 && (
          <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-medium">
            <div className="flex flex-wrap items-center gap-2">
              <span>Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>entries per page</span>
              <span className="text-slate-300 mx-1 hidden sm:inline">|</span>
              <span>
                Showing <strong className="text-slate-900 font-mono">{startIndex + 1}</strong> to{' '}
                <strong className="text-slate-900 font-mono">{endIndex}</strong> of{' '}
                <strong className="text-slate-900 font-mono">{monthlyList.length}</strong> entries
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={validCurrentPage === 1}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-extrabold flex items-center gap-1 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>

              <div className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-extrabold text-slate-900 text-xs shadow-2xs">
                Page {validCurrentPage} of {totalPages}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={validCurrentPage >= totalPages}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-extrabold flex items-center gap-1 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showCameraModal && (
        <WebcamCapture
          title={captureAction === 'in' ? '📸 Check-In Selfie & GPS Capture' : '📸 Check-Out Selfie & GPS Capture'}
          onCapture={handleCaptureSubmit}
          onCancel={() => setShowCameraModal(false)}
        />
      )}

      {viewPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 rounded-3xl p-5 max-w-md w-full border border-slate-800 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-white">
              <span className="font-extrabold text-sm flex items-center gap-2">
                <Camera className="h-4 w-4 text-emerald-400" /> Biometric Selfie Verification
              </span>
              <button
                onClick={() => setViewPhotoUrl(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-800 bg-black flex items-center justify-center">
              <img src={viewPhotoUrl} alt="Fullsize Selfie" className="h-full w-full object-cover" />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
