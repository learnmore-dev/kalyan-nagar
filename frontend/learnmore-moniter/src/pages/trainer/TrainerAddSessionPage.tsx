import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Batch, User, Student, StudentStatus, StudentAttendanceRecord } from '@/lib/types';
import { getStoredUser } from '@/lib/auth';
import { whatsappService } from '@/lib/whatsappService';
import {
  Calendar,
  Clock,
  BookOpen,
  MessageSquare,
  CheckCircle2,
  ArrowLeft,
  Users,
  UserCheck,
  UserX,
  Plane,
  Sparkles,
  Paperclip,
  FileText,
  Trash2,
  UploadCloud,
  Quote,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
} from 'lucide-react';

/* ── Teaching & Knowledge Delivery Quotes with HD Backgrounds ─────────── */
const TEACHING_QUOTES = [
  {
    quote: "If you can't explain it simply, you don't understand it well enough. Teach with clarity and practical examples.",
    author: "Richard Feynman",
    role: "Nobel Laureate Physicist",
    tag: "💡 The Feynman Method",
    bgImage: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "Teaching is the highest form of understanding. Every line of code you clarify builds a coder's future.",
    author: "Aristotle",
    role: "Philosopher & Polymath",
    tag: "🎓 Teaching Mastery",
    bgImage: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "The mind is not a vessel to be filled, but a fire to be kindled with creative coding projects.",
    author: "Plutarch",
    role: "Philosopher & Essayist",
    tag: "🔥 Igniting Passion",
    bgImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "Knowledge increases by sharing, not by saving. Empower your batch with industry best practices.",
    author: "Kamari aka Lyrikal",
    role: "Educator & Author",
    tag: "🚀 Knowledge Sharing",
    bgImage: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1600&auto=format&fit=crop&q=80",
  },
  {
    quote: "Tell me and I forget. Teach me and I remember. Involve me in live coding and I truly learn.",
    author: "Benjamin Franklin",
    role: "Polymath & Inventor",
    tag: "⚡ Hands-On Learning",
    bgImage: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1600&auto=format&fit=crop&q=80",
  },
];

export default function TrainerAddSessionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedBatchId = searchParams.get('batch') || '';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quotes Carousel State
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setQuoteIdx((prev) => (prev + 1) % TEACHING_QUOTES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  const [user, setUser] = useState<User | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(preSelectedBatchId);
  const [sessionDate, setSessionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [hoursTaken, setHoursTaken] = useState<string>('2');
  const [topicCovered, setTopicCovered] = useState<string>('');
  const [autoSendWhatsApp, setAutoSendWhatsApp] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [whatsappShareUrl, setWhatsappShareUrl] = useState<string | null>(null);

  // Document / Attachment upload state
  const [attachedFile, setAttachedFile] = useState<{
    base64: string;
    fileName: string;
    mimeType: string;
    sizeFormatted: string;
  } | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);
  const [attendanceState, setAttendanceState] = useState<
    Record<string, { status: StudentStatus; reason: string }>
  >({});

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);

    const fetchBatches = async () => {
      try {
        const res = await fetch(`/api/batches/?trainer_id=${u?.id || ''}`);
        const data = await res.json();
        if (data.success) {
          const myBatches = (data.batches || []).filter(
            (b: Batch) => b.trainer_id === u?.id || b.trainer_name?.toLowerCase() === u?.name?.toLowerCase()
          );
          setBatches(myBatches);
          if (!selectedBatchId && myBatches.length > 0) {
            setSelectedBatchId(preSelectedBatchId || myBatches[0].id);
          }
        }
      } catch {
        // silent
      }
    };

    fetchBatches();
  }, [preSelectedBatchId]);

  useEffect(() => {
    if (!selectedBatchId) return;

    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const res = await fetch(`/api/students?batch_id=${selectedBatchId}`);
        const data = await res.json();
        if (data.success && data.students) {
          setStudents(data.students);
          const initialMap: Record<string, { status: StudentStatus; reason: string }> = {};
          data.students.forEach((s: Student) => {
            initialMap[s.id] = { status: 'present', reason: '' };
          });
          setAttendanceState(initialMap);
        }
      } catch {
        // silent
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [selectedBatchId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB > 15) {
      alert('File size exceeds 15MB limit. Please choose a smaller file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      const formattedSize =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;

      setAttachedFile({
        base64: base64String,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeFormatted: formattedSize,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStatusChange = (studentId: string, status: StudentStatus) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        status,
        reason: status === 'leave' ? prev[studentId]?.reason || '' : '',
      },
    }));
  };

  const handleReasonChange = (studentId: string, reason: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        reason,
      },
    }));
  };

  const markAllPresent = () => {
    const updated: Record<string, { status: StudentStatus; reason: string }> = {};
    students.forEach((s) => {
      updated[s.id] = { status: 'present', reason: '' };
    });
    setAttendanceState(updated);
  };

  const presentCount = students.filter((s) => attendanceState[s.id]?.status === 'present').length;
  const absentCount = students.filter((s) => attendanceState[s.id]?.status === 'absent').length;
  const leaveCount = students.filter((s) => attendanceState[s.id]?.status === 'leave').length;
  const totalCount = students.length;
  const attendancePct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 100;

  const currentBatchObj = batches.find((b) => b.id === selectedBatchId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId || !hoursTaken || !topicCovered.trim()) {
      alert('Please enter the topic covered and class hours.');
      return;
    }

    setLoading(true);

    try {
      const hoursNum = parseFloat(hoursTaken) || 2;

      const studentsAttendancePayload: StudentAttendanceRecord[] = students.map((s) => {
        const entry = attendanceState[s.id] || { status: 'present', reason: '' };
        return {
          student_id: s.id,
          student_name: s.name,
          phone: s.phone,
          status: entry.status,
          leave_reason: entry.status === 'leave' ? entry.reason : undefined,
        };
      });

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_id: selectedBatchId,
          trainer_id: user?.id || '',
          trainer_name: user?.name || user?.username || 'Trainer',
          course_name: currentBatchObj?.course_name || 'Technical Course',
          session_date: sessionDate,
          hours_taken: hoursNum,
          description: topicCovered,
          whatsapp_sent: autoSendWhatsApp,
          students_attendance: studentsAttendancePayload,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const formattedMessage = [
          `🏷️ *Batch:* ${currentBatchObj?.name || 'Batch'}`,
          `📅 *Date:* ${sessionDate}`,
          `━━━━━━━━━━━━━━━━━━━━`,
          `📝 *Topic Covered:* ${topicCovered}`,
          `⏱️ *Hours:* ${hoursNum} hrs`,
          `━━━━━━━━━━━━━━━━━━━━`,
          `👨‍🏫 *Trainer:* ${user?.name || user?.username || 'Trainer'}`
        ].join('\n');
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(formattedMessage)}`;
        setWhatsappShareUrl(waUrl);

        if (autoSendWhatsApp && currentBatchObj) {
          try {
            await whatsappService.sendBatchTopicAndDocument({
              batch: currentBatchObj,
              topicCovered: topicCovered,
              date: sessionDate,
              attachment: attachedFile
                ? {
                    document: attachedFile.base64,
                    fileName: attachedFile.fileName,
                    mimeType: attachedFile.mimeType,
                  }
                : undefined,
            });
          } catch {}
        }

        const groupLabel = currentBatchObj?.whatsapp_group_name || currentBatchObj?.name;
        setSuccessMsg(
          `Session saved successfully! ${
            autoSendWhatsApp
              ? `Message & Document broadcasted to WhatsApp Group: "${groupLabel}"! 🚀`
              : ''
          }`
        );

        setTopicCovered('');
        setAttachedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch {
      alert('Failed to save session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Batches
      </button>

      {/* ── Dynamic Teaching & Broadcast Hero Banner ───────────────────────────────── */}
      <div className="relative rounded-3xl p-6 sm:p-8 lg:p-9 text-white overflow-hidden shadow-2xl border border-indigo-500/30 min-h-[260px] bg-slate-950">
        {/* Dynamic Rotating Background Images with Smooth Crossfade */}
        {TEACHING_QUOTES.map((item, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === quoteIdx ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
            }`}
            style={{
              backgroundImage: `linear-gradient(135deg, rgba(67, 56, 202, 0.94) 0%, rgba(30, 27, 75, 0.93) 50%, rgba(15, 23, 42, 0.92) 100%), url('${item.bgImage}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transitionProperty: 'opacity, transform',
              transitionDuration: '1000ms',
            }}
          />
        ))}

        {/* Ambient Glowing Orbs */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left Column: Title & Info */}
          <div className="space-y-3 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-violet-400/20 text-violet-200 border border-violet-400/30 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Topic Covered & WhatsApp Broadcast
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-white/10 text-white border border-white/15">
                <BookOpen className="h-3.5 w-3.5 text-indigo-300" /> Class Session Logger
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight text-white drop-shadow-sm">
              Log Class Session & Broadcast
            </h1>

            <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed font-normal">
              Enter topics taught today and attach class documents or notes — auto-broadcasts directly to batch WhatsApp group in 1 click!
            </p>
          </div>

          {/* Right Column: Interactive Motivational Quotes Carousel */}
          <div className="w-full lg:w-[480px] bg-slate-950/70 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden group">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/30 border border-indigo-400/30 text-[10px] font-extrabold text-indigo-200 uppercase tracking-wider">
                {TEACHING_QUOTES[quoteIdx].tag}
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
                    setQuoteIdx((prev) => (prev - 1 + TEACHING_QUOTES.length) % TEACHING_QUOTES.length)
                  }
                  className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  title="Previous quote"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setQuoteIdx((prev) => (prev + 1) % TEACHING_QUOTES.length)}
                  className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  title="Next quote"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="min-h-[72px] flex items-start gap-3">
              <Quote className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5 opacity-80" />
              <p className="text-xs sm:text-sm font-medium text-slate-100 italic leading-snug">
                "{TEACHING_QUOTES[quoteIdx].quote}"
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="text-xs font-bold text-white">{TEACHING_QUOTES[quoteIdx].author}</div>
                <div className="text-[10px] text-indigo-300">{TEACHING_QUOTES[quoteIdx].role}</div>
              </div>

              {/* Step indicator dots */}
              <div className="flex items-center gap-1">
                {TEACHING_QUOTES.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    type="button"
                    onClick={() => setQuoteIdx(dotIdx)}
                    className={`h-1.5 rounded-full transition-all ${
                      dotIdx === quoteIdx ? 'w-5 bg-indigo-400' : 'w-1.5 bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Executive Session Form Container ───────────────────────────────── */}
      <div className="w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xl transition-all">
        {successMsg && (
          <div className="m-6 sm:m-8 p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/80 text-emerald-900 space-y-3 shadow-md">
            <div className="flex items-center gap-2.5 font-extrabold text-sm sm:text-base">
              <div className="h-8 w-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              {successMsg}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1 pl-10.5">
              {whatsappShareUrl && (
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <MessageSquare className="h-4 w-4" /> Open Broadcast in WhatsApp
                </a>
              )}

              <button
                onClick={() => navigate(`/trainer/batches/${selectedBatchId}`)}
                className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                View Batch Overview
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 lg:p-10 space-y-8 text-xs sm:text-sm">
          {/* Section 1: Session Meta (Date & Hours) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              <span className="h-5 w-1.5 rounded-full bg-indigo-600" />
              <span>Step 1: Session Schedule & Time</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:border-indigo-300 transition-all space-y-2">
                <label className="block font-bold text-slate-700 text-xs flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Calendar className="h-3.5 w-3.5" />
                  </div>
                  <span>Class Date</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300/90 bg-white px-3.5 py-2.5 text-slate-900 font-bold focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all shadow-xs"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:border-indigo-300 transition-all space-y-2">
                <label className="block font-bold text-slate-700 text-xs flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <span>Session Duration (Hours)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="12"
                  required
                  value={hoursTaken}
                  onChange={(e) => setHoursTaken(e.target.value)}
                  placeholder="e.g. 2"
                  className="w-full rounded-xl border border-slate-300/90 bg-white px-3.5 py-2.5 text-slate-900 font-bold focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Batch Selection & WhatsApp Link */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              <span className="h-5 w-1.5 rounded-full bg-indigo-600" />
              <span>Step 2: Target Batch & Connected Channel</span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
              <label className="block font-bold text-slate-700 text-xs flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <BookOpen className="h-3.5 w-3.5" />
                </div>
                <span>Select Batch</span>
                <span className="text-rose-500">*</span>
              </label>

              {batches.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-amber-200/80 flex items-center justify-center text-amber-800 shrink-0 font-bold">!</div>
                  <span>No batches assigned to your profile yet. Please contact Institute Admin.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <select
                      value={selectedBatchId}
                      onChange={(e) => setSelectedBatchId(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-300/90 bg-white px-4 py-3 text-slate-900 font-bold text-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all cursor-pointer shadow-xs"
                    >
                      {batches.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          🏷️ {batch.name} — ({batch.used_hours || 0}/{batch.total_hours} hrs completed)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50/60 border border-emerald-200/80 text-xs text-emerald-950 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-2 font-semibold">
                      <div className="h-6 w-6 rounded-md bg-[#25D366] text-white flex items-center justify-center shadow-xs">
                        <MessageSquare className="h-3.5 w-3.5" />
                      </div>
                      <span>
                        Target WhatsApp Group: <strong className="text-emerald-900 font-extrabold">{currentBatchObj?.whatsapp_group_name || `${currentBatchObj?.name || 'Batch'} WhatsApp Group`}</strong>
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-200/90 text-emerald-950 font-extrabold text-[10px] uppercase tracking-wide">
                      <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" /> Direct Broadcast Active
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Topic Covered Today */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                <span className="h-5 w-1.5 rounded-full bg-indigo-600" />
                <span>Step 3: Topic Covered Today</span>
                <span className="text-rose-500">*</span>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/60">
                💬 Sent directly to WhatsApp group
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
              {/* Quick Template Suggestion Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-slate-400">Quick Insert:</span>
                {[
                  'Completed Data Types, Variables & Typecasting',
                  'Conditional Statements (If-Else & Nested Loops)',
                  'Object-Oriented Programming (Classes & Objects)',
                  'Live Project Implementation & Hands-on Coding',
                  'Doubt Solving & Code Debugging Session',
                ].map((tmpl, tIdx) => (
                  <button
                    key={tIdx}
                    type="button"
                    onClick={() => setTopicCovered((prev) => (prev ? `${prev}\n• ${tmpl}` : tmpl))}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/60 text-slate-700 hover:text-indigo-900 font-semibold text-[11px] transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    + {tmpl.split(' ')[0]} {tmpl.split(' ')[1]}
                  </button>
                ))}
              </div>

              <textarea
                required
                rows={4}
                value={topicCovered}
                onChange={(e) => setTopicCovered(e.target.value)}
                placeholder="e.g. Today we completed Data Types, Variables, If-Else conditions, and practiced hands-on coding exercises with students..."
                className="w-full rounded-2xl border border-slate-300/90 bg-white p-4 text-slate-900 text-sm leading-relaxed font-semibold focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all resize-none shadow-inner placeholder:font-normal placeholder:text-slate-400"
              />

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Provide clear bullet points so students can review their syllabus topics.</span>
                <span className="font-mono font-bold text-slate-500">{topicCovered.length} characters</span>
              </div>
            </div>
          </div>

          {/* Section 4: Document & Notes Upload Studio */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                <span className="h-5 w-1.5 rounded-full bg-indigo-600" />
                <span>Step 4: Attach Notes / Code Document (Optional)</span>
              </div>
              <span className="text-[11px] font-bold text-slate-400">PDF, PPT, Word, ZIP, Images</span>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/40 via-purple-50/20 to-white border border-indigo-200/80 space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.zip"
                onChange={handleFileUpload}
                className="hidden"
                id="sessionDocumentUpload"
              />

              {!attachedFile ? (
                <label
                  htmlFor="sessionDocumentUpload"
                  className="flex flex-col items-center justify-center p-6 sm:p-8 border-2 border-dashed border-indigo-300/80 hover:border-indigo-600 rounded-2xl bg-white hover:bg-indigo-50/40 transition-all cursor-pointer text-center group shadow-xs hover:shadow-md"
                >
                  <div className="h-14 w-14 rounded-2xl bg-indigo-100/70 text-indigo-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm mb-2.5">
                    <UploadCloud className="h-7 w-7" />
                  </div>
                  <span className="text-sm font-extrabold text-indigo-950 group-hover:text-indigo-600 transition-colors">
                    Click to Browse or Drop Class Document / Notes
                  </span>
                  <p className="text-xs text-slate-500 max-w-md mt-1">
                    Attach notes, PDFs, or assignments — automatically sent directly into the batch WhatsApp group alongside the session message!
                  </p>
                  <div className="flex items-center gap-2 mt-3 text-[10px] font-extrabold text-indigo-700 bg-indigo-100/70 px-3 py-1 rounded-full">
                    <span>PDF</span> • <span>DOCX</span> • <span>PPT</span> • <span>ZIP</span> • <span>Max 15 MB</span>
                  </div>
                </label>
              ) : (
                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-indigo-300 shadow-md">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="h-11 w-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-slate-900 truncate">
                        {attachedFile.fileName}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {attachedFile.sizeFormatted}
                        </span>
                        <span>• Ready to broadcast to WhatsApp</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
                    title="Remove Attached File"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Student Attendance & Leaves */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Users className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                    Batch Student Attendance & Leaves ({students.length} Total)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Mark each enrolled student as Present, Absent, or Leave
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={markAllPresent}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-sm transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <UserCheck className="h-4 w-4" /> Mark All Present
                </button>
              </div>
            </div>

            {/* Attendance Analytics Mini-HUD */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/90 text-center shadow-2xs">
              <div className="p-3 rounded-xl bg-white border border-emerald-300 text-emerald-900 shadow-xs">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Present</div>
                <div className="text-xl sm:text-2xl font-black text-emerald-600">
                  {presentCount} <span className="text-xs font-bold text-emerald-700">({attendancePct}%)</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-rose-300 text-rose-900 shadow-xs">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700">Absent</div>
                <div className="text-xl sm:text-2xl font-black text-rose-600">{absentCount}</div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-amber-300 text-amber-900 shadow-xs">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">On Leave</div>
                <div className="text-xl sm:text-2xl font-black text-amber-600">{leaveCount}</div>
              </div>
            </div>

            {loadingStudents ? (
              <div className="p-10 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-200">
                Loading students for this batch...
              </div>
            ) : students.length === 0 ? (
              <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 text-center text-xs text-slate-400 bg-slate-50">
                No students enrolled in this batch yet.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                {students.map((student, sIdx) => {
                  const current = attendanceState[student.id] || { status: 'present', reason: '' };
                  return (
                    <div
                      key={student.id}
                      className={`p-3.5 rounded-2xl border transition-all shadow-2xs ${
                        current.status === 'present'
                          ? 'bg-white border-slate-200/90'
                          : current.status === 'absent'
                          ? 'bg-rose-50/60 border-rose-200'
                          : 'bg-amber-50/60 border-amber-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-700 font-extrabold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                            {sIdx + 1}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-xs sm:text-sm">{student.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{student.phone || 'No phone number'}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/90 border border-slate-200 self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'present')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                              current.status === 'present'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>Present</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'absent')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                              current.status === 'absent'
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <UserX className="h-3.5 w-3.5" />
                            <span>Absent</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'leave')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                              current.status === 'leave'
                                ? 'bg-amber-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Plane className="h-3.5 w-3.5" />
                            <span>Leave</span>
                          </button>
                        </div>
                      </div>

                      {current.status === 'leave' && (
                        <div className="mt-3 pt-2.5 border-t border-amber-200/80">
                          <input
                            type="text"
                            value={current.reason}
                            onChange={(e) => handleReasonChange(student.id, e.target.value)}
                            placeholder="Reason for leave (e.g. High fever, College Exam, Family function)..."
                            className="w-full px-3.5 py-2 rounded-xl bg-white border border-amber-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-600 font-medium"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Broadcast confirmation checkbox */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300/80 flex items-center gap-3 shadow-xs">
            <input
              type="checkbox"
              id="autoSendWhatsApp"
              checked={autoSendWhatsApp}
              onChange={(e) => setAutoSendWhatsApp(e.target.checked)}
              className="h-5 w-5 rounded-md border-emerald-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
            />
            <label htmlFor="autoSendWhatsApp" className="text-xs sm:text-sm font-extrabold text-emerald-950 cursor-pointer select-none">
              ⚡ Automatically Broadcast Session Topic & Attached Document to WhatsApp Group
            </label>
          </div>

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:opacity-95 active:scale-[0.99] text-white font-extrabold py-4 text-sm sm:text-base shadow-xl shadow-indigo-500/25 transition-all cursor-pointer flex items-center justify-center gap-2.5"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving Session & Broadcasting to WhatsApp Group...
              </span>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" /> Save Session & Broadcast to WhatsApp
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
