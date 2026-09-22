import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Batch, User, Student, StudentStatus, StudentAttendanceRecord } from '@/lib/types';
import { CourseSyllabus, INSTITUTE_COURSES, getCourseById } from '@/lib/syllabusData';
import { getStoredUser } from '@/lib/auth';
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
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function TrainerAddSessionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedBatchId = searchParams.get('batch') || '';

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

  const [currentSyllabus, setCurrentSyllabus] = useState<CourseSyllabus | null>(null);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState<number>(0);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [customNotes, setCustomNotes] = useState<string>('');
  const [showSyllabusPicker, setShowSyllabusPicker] = useState<boolean>(true);
  const [batchCoverage, setBatchCoverage] = useState<{ total_topics: number; covered_topics: number; coverage_percentage: number } | null>(null);

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

    const currentBatch = batches.find((b) => b.id === selectedBatchId);
    if (currentBatch) {
      let course: CourseSyllabus | undefined;
      if (currentBatch.course_id) {
        course = getCourseById(currentBatch.course_id);
      }
      if (!course) {
        const nameLower = currentBatch.name.toLowerCase();
        course =
          INSTITUTE_COURSES.find((c) => nameLower.includes(c.name.toLowerCase().replace(' course syllabus', '').replace(' syllabus', ''))) ||
          (nameLower.includes('sql') ? getCourseById('course_sql') : undefined) ||
          (nameLower.includes('mern') ? getCourseById('course_mern') : undefined) ||
          (nameLower.includes('mean') ? getCourseById('course_mean') : undefined) ||
          (nameLower.includes('tableau') ? getCourseById('course_tableau') : undefined) ||
          (nameLower.includes('power bi') || nameLower.includes('powerbi') ? getCourseById('course_powerbi') : undefined) ||
          (nameLower.includes('excel') ? getCourseById('course_excel') : undefined) ||
          (nameLower.includes('django') ? getCourseById('course_django') : undefined) ||
          (nameLower.includes('python') ? getCourseById('course_python') : undefined) ||
          (nameLower.includes('data science') ? getCourseById('course_datascience') : undefined) ||
          (nameLower.includes('genai') || nameLower.includes('machine learning') ? getCourseById('course_genai') : undefined) ||
          (nameLower.includes('mlops') ? getCourseById('course_mlops') : undefined) ||
          (nameLower.includes('selenium') && nameLower.includes('python') ? getCourseById('course_selenium_python') : undefined) ||
          (nameLower.includes('selenium') ? getCourseById('course_selenium_java') : undefined) ||
          (nameLower.includes('manual testing') || nameLower.includes('testing') ? getCourseById('course_manual_testing') : undefined) ||
          (nameLower.includes('successfactors') ? getCourseById('course_sap_successfactors') : undefined) ||
          (nameLower.includes('sap mm') ? getCourseById('course_sap_mm') : undefined) ||
          (nameLower.includes('sap fico') || nameLower.includes('fico') ? getCourseById('course_sap_fico') : undefined) ||
          (nameLower.includes('salesforce') && nameLower.includes('dev') ? getCourseById('course_salesforce_developer') : undefined) ||
          (nameLower.includes('salesforce') ? getCourseById('course_salesforce_admin') : undefined) ||
          (nameLower.includes('azure dev') || nameLower.includes('az-204') ? getCourseById('course_azure_developer') : undefined) ||
          (nameLower.includes('azure admin') || nameLower.includes('az-104') ? getCourseById('course_azure_admin') : undefined) ||
          (nameLower.includes('databricks') ? getCourseById('course_azure_databricks') : undefined) ||
          (nameLower.includes('azure data') ? getCourseById('course_azure_data_engineering') : undefined) ||
          (nameLower.includes('azure ad') || nameLower.includes('active directory') ? getCourseById('course_azure_ad') : undefined) ||
          (nameLower.includes('devops') ? getCourseById('course_devops') : undefined) ||
          (nameLower.includes('linux') ? getCourseById('course_linux') : undefined) ||
          (nameLower.includes('flutter') || nameLower.includes('dart') ? getCourseById('course_flutter') : undefined) ||
          (nameLower.includes('android') || nameLower.includes('kotlin') ? getCourseById('course_android') : undefined) ||
          (nameLower.includes('cyber') || nameLower.includes('security') ? getCourseById('course_cybersecurity') : undefined) ||
          (nameLower.includes('c++') || nameLower.includes('c & c++') ? getCourseById('course_cpp') : undefined) ||
          (nameLower.includes('dsa') || nameLower.includes('data structure') ? getCourseById('course_dsa') : undefined) ||
          (nameLower.includes('angular') ? getCourseById('course_angular') : undefined) ||
          (nameLower.includes('golang') || nameLower.includes('go ') ? getCourseById('course_golang') : undefined) ||
          (nameLower.includes('basic computer') || nameLower.includes('computer') ? getCourseById('course_basic_computer') : undefined) ||
          INSTITUTE_COURSES[0];
      }

      setCurrentSyllabus(course || null);
      setSelectedModuleIndex(0);
      setSelectedTopics([]);
    }

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

    const fetchCoverage = async () => {
      try {
        const res = await fetch(`/api/topics/coverage?batch_id=${selectedBatchId}`);
        const data = await res.json();
        if (data.success && data.coverage) {
          setBatchCoverage(data.coverage);
        }
      } catch {
        // silent
      }
    };
    fetchCoverage();
  }, [selectedBatchId, batches]);

  const updateTopicCoveredText = (topics: string[], notes: string) => {
    if (!currentSyllabus) {
      const lines = topics.map((t) => `• ${t}`);
      if (notes.trim()) lines.push(`\n📝 Practice / Notes: ${notes.trim()}`);
      setTopicCovered(lines.join('\n'));
      return;
    }

    const grouped = new Map<string, string[]>();
    topics.forEach((t) => {
      const parentMod = currentSyllabus.modules.find((m) => m.topics.includes(t));
      const modTitle = parentMod
        ? `MODULE ${parentMod.module_number} >> ${parentMod.title}`
        : 'Additional Topics';
      if (!grouped.has(modTitle)) {
        grouped.set(modTitle, []);
      }
      grouped.get(modTitle)!.push(t);
    });

    const blocks: string[] = [];
    grouped.forEach((modTopics, modHeader) => {
      blocks.push(`${modHeader}\n` + modTopics.map((t) => `• ${t}`).join('\n'));
    });

    if (notes.trim()) {
      blocks.push(`📝 Practice / Notes: ${notes.trim()}`);
    }

    setTopicCovered(blocks.join('\n\n'));
  };

  const handleToggleTopic = (topic: string) => {
    const nextTopics = selectedTopics.includes(topic)
      ? selectedTopics.filter((t) => t !== topic)
      : [...selectedTopics, topic];

    setSelectedTopics(nextTopics);
    updateTopicCoveredText(nextTopics, customNotes);
  };

  const handleSelectAllInModule = () => {
    const activeMod = currentSyllabus?.modules[selectedModuleIndex];
    if (!activeMod) return;

    const combined = Array.from(new Set([...selectedTopics, ...activeMod.topics]));
    setSelectedTopics(combined);
    updateTopicCoveredText(combined, customNotes);
  };

  const handleClearModuleTopics = () => {
    const activeMod = currentSyllabus?.modules[selectedModuleIndex];
    if (!activeMod) return;

    const remaining = selectedTopics.filter((t) => !activeMod.topics.includes(t));
    setSelectedTopics(remaining);
    updateTopicCoveredText(remaining, customNotes);
  };

  const handleClearAllSelection = () => {
    setSelectedTopics([]);
    updateTopicCoveredText([], customNotes);
  };

  const handleModuleChange = (newIdx: number) => {
    setSelectedModuleIndex(newIdx);
  };

  const handleCustomNotesChange = (val: string) => {
    setCustomNotes(val);
    updateTopicCoveredText(selectedTopics, val);
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
  const activeModule = currentSyllabus?.modules[selectedModuleIndex];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId || !hoursTaken || !topicCovered.trim()) {
      alert('Please fill in topics covered and session hours.');
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

      const coveredModuleNumbers: number[] = [];
      if (currentSyllabus) {
        currentSyllabus.modules.forEach((m) => {
          if (m.topics.some((t) => selectedTopics.includes(t))) {
            coveredModuleNumbers.push(m.module_number);
          }
        });
      }
      const moduleNameLabel =
        coveredModuleNumbers.length > 1
          ? `MODULES ${coveredModuleNumbers.join(', ')}`
          : activeModule
          ? `MODULE ${activeModule.module_number} >> ${activeModule.title}`
          : undefined;

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_id: selectedBatchId,
          trainer_id: user?.id || '',
          trainer_name: user?.name || user?.username || 'Trainer',
          course_id: currentSyllabus?.id,
          course_name: currentSyllabus?.name,
          module_name: moduleNameLabel,
          selected_topics: selectedTopics,
          session_date: sessionDate,
          hours_taken: hoursNum,
          description: topicCovered,
          whatsapp_sent: autoSendWhatsApp,
          students_attendance: studentsAttendancePayload,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const absentStudents = studentsAttendancePayload.filter((s) => s.status === 'absent');
        const leaveStudents = studentsAttendancePayload.filter((s) => s.status === 'leave');

        const formattedMessage = [
          `📖 *Topics Covered Today:*`,
          `${topicCovered}`,
          ``,
          `👥 *STUDENT ATTENDANCE & LEAVES:*`,
          `📈 *Attendance:* ${presentCount}/${totalCount} Present (${attendancePct}%)`,
          absentStudents.length > 0
            ? `❌ *Absent:* ${absentStudents.map((s) => s.student_name).join(', ')} (${absentStudents.length})`
            : `✅ *Absent:* None (All Present)`,
          leaveStudents.length > 0
            ? `🏖️ *On Leave:* ${leaveStudents.map((s) => `${s.student_name} (${s.leave_reason || 'Approved'})`).join(', ')}`
            : null,
        ]
          .filter(Boolean)
          .join('\n');

        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(formattedMessage)}`;
        setWhatsappShareUrl(waUrl);

        if (data.whatsapp?.deliveredTo) {
          setSuccessMsg(
            `Session logged & automatically broadcasted to WhatsApp Group: "${data.whatsapp.deliveredTo}"! 🤖`
          );
        } else {
          setSuccessMsg(`Session logged successfully with Syllabus Topics & Student Attendance!`);
        }

        setTopicCovered('');
        setSelectedTopics([]);
        setCustomNotes('');
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

        <div className="w-full rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-white">
          <div className="w-full bg-gradient-to-r from-[#667eea] to-[#764ba2] p-6 text-center text-white relative overflow-hidden">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold tracking-wide backdrop-blur-md mb-1.5">
              <Sparkles className="h-3.5 w-3.5 text-yellow-300" /> Syllabus Topic Picker & Attendance Engine
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Add Work Session & Select Syllabus Topics
            </h2>
            <p className="text-xs text-white/80 pt-1">
              Select module & topics from official course syllabus — auto-broadcasts to WhatsApp Group
            </p>
          </div>

          {successMsg && (
            <div className="m-6 p-4.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                {successMsg}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {whatsappShareUrl && (
                  <a
                    href={whatsappShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs shadow-sm transition-all"
                  >
                    <MessageSquare className="h-4 w-4" /> Open in WhatsApp
                  </a>
                )}

                <button
                  onClick={() => navigate(`/trainer/batches/${selectedBatchId}`)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  View Batch Overview
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-indigo-600" /> CLASS DATE
                </label>
                <input
                  type="date"
                  required
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-800 font-semibold focus:border-indigo-600 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-indigo-600" /> HOURS TAKEN
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-800 font-semibold focus:border-indigo-600 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-indigo-600" /> SELECT BATCH
              </label>
              {batches.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                  ⚠️ No batches have been assigned to your profile yet. Please ask the Institute Admin to assign a batch to you before logging hours.
                </div>
              ) : (
                <>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 font-bold focus:border-indigo-600 focus:outline-none transition-all cursor-pointer"
                  >
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name} ({batch.used_hours || 0}/{batch.total_hours} hrs)
                      </option>
                    ))}
                  </select>

                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-[#25D366]" />
                      Linked Group: <strong>{currentBatchObj?.whatsapp_group_name || `${currentBatchObj?.name || 'Batch'} WhatsApp Group`}</strong>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 font-extrabold text-[10px]">
                      🟢 Auto-Broadcast Ready
                    </span>
                  </div>
                </>
              )}
            </div>

            {currentSyllabus && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-blue-50/50 to-slate-50 border border-indigo-200 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-indigo-950 flex items-center gap-1.5">
                        <span>{currentSyllabus.name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-200/70 text-indigo-900 text-[10px] font-mono">
                          {currentSyllabus.modules.length} Modules
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Select today's module & subtopics — auto-fills Topic Covered below
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSyllabusPicker(!showSyllabusPicker)}
                    className="p-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>{showSyllabusPicker ? 'Hide Picker' : 'Show Syllabus'}</span>
                    {showSyllabusPicker ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {batchCoverage && (
                  <div className="p-3 bg-white rounded-xl border border-indigo-200/80 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        📊 <span>Course Topic Coverage:</span>
                      </span>
                      <span className="font-mono font-extrabold text-indigo-700">
                        {batchCoverage.covered_topics} / {batchCoverage.total_topics} Topics ({batchCoverage.coverage_percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-600 to-blue-500 transition-all duration-300"
                        style={{ width: `${batchCoverage.coverage_percentage}%` }}
                      />
                    </div>
                  </div>
                )}

                {showSyllabusPicker && (
                  <div className="space-y-3.5 pt-1">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-extrabold text-indigo-900 uppercase">
                          1. CHOOSE MODULE TO VIEW & SELECT TOPICS:
                        </label>
                        {selectedTopics.length > 0 && (
                          <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full">
                            {selectedTopics.length} Topics Selected Across Syllabus
                          </span>
                        )}
                      </div>
                      <select
                        value={selectedModuleIndex}
                        onChange={(e) => handleModuleChange(Number(e.target.value))}
                        className="w-full rounded-xl bg-white border border-indigo-300 px-3.5 py-2.5 text-xs font-bold text-indigo-950 focus:outline-none focus:border-indigo-600 shadow-2xs cursor-pointer"
                      >
                        {currentSyllabus.modules.map((m, mIdx) => {
                          const count = m.topics.filter((t) => selectedTopics.includes(t)).length;
                          const full = count === m.topics.length && m.topics.length > 0;
                          return (
                            <option key={mIdx} value={mIdx}>
                              MODULE {m.module_number} &gt;&gt; {m.title} ({m.topics.length} Topics){count > 0 ? ` ── [${count}/${m.topics.length} Selected ${full ? '✓ FULL MODULE' : ''}]` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {activeModule && (
                      <div className="space-y-2 bg-white p-3.5 rounded-xl border border-indigo-200/80 shadow-2xs">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <span className="text-[11px] font-bold text-slate-700">
                            2. Check Topics in <strong>Module {activeModule.module_number}: {activeModule.title}</strong>
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleSelectAllInModule}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                            >
                              Select All in Module
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={handleClearModuleTopics}
                              className="text-[10px] font-bold text-slate-500 hover:text-slate-700 underline cursor-pointer"
                            >
                              Clear Module
                            </button>
                            {selectedTopics.length > 0 && (
                              <>
                                <span className="text-slate-300">|</span>
                                <button
                                  type="button"
                                  onClick={handleClearAllSelection}
                                  className="text-[10px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                                >
                                  Clear All
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {activeModule.topics.map((topic, tIdx) => {
                            const isChecked = selectedTopics.includes(topic);
                            return (
                              <button
                                key={tIdx}
                                type="button"
                                onClick={() => handleToggleTopic(topic)}
                                className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                                  isChecked
                                    ? 'bg-indigo-50/90 border-indigo-400 text-indigo-950 shadow-2xs ring-1 ring-indigo-400'
                                    : 'bg-slate-50/50 hover:bg-slate-100 border-slate-200 text-slate-700'
                                }`}
                              >
                                <div className="mt-0.5 shrink-0">
                                  {isChecked ? (
                                    <CheckSquare className="h-4 w-4 text-indigo-600" />
                                  ) : (
                                    <Square className="h-4 w-4 text-slate-400" />
                                  )}
                                </div>
                                <span className="text-xs font-semibold leading-tight">{topic}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-indigo-900 uppercase mb-1">
                        3. Add Practical / Lab Notes (Optional):
                      </label>
                      <input
                        type="text"
                        value={customNotes}
                        onChange={(e) => handleCustomNotesChange(e.target.value)}
                        placeholder="e.g. Conducted hands-on query lab & solved student doubt queries..."
                        className="w-full rounded-xl bg-white border border-indigo-200 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-indigo-600" /> TOPIC COVERED (FINAL BROADCAST PREVIEW) *
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Auto-filled from syllabus, fully editable</span>
              </label>
              <textarea
                required
                rows={4}
                value={topicCovered}
                onChange={(e) => setTopicCovered(e.target.value)}
                placeholder="Topics selected above will automatically appear here formatted with bullet points..."
                className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none transition-all resize-none font-mono text-xs leading-relaxed"
              />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                      Student Attendance & Leaves ({students.length} Students)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Mark students as Present, Absent, or on Leave with reason
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={markAllPresent}
                    className="px-3 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-xs border border-emerald-200 transition-colors cursor-pointer"
                  >
                    ✓ Mark All Present
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <div className="p-2 rounded-xl bg-emerald-100/60 border border-emerald-200 text-emerald-900">
                  <div className="text-[10px] font-bold uppercase tracking-wider">Present</div>
                  <div className="text-lg font-black">{presentCount} <span className="text-xs font-semibold text-emerald-700">({attendancePct}%)</span></div>
                </div>
                <div className="p-2 rounded-xl bg-rose-100/60 border border-rose-200 text-rose-900">
                  <div className="text-[10px] font-bold uppercase tracking-wider">Absent</div>
                  <div className="text-lg font-black">{absentCount}</div>
                </div>
                <div className="p-2 rounded-xl bg-amber-100/60 border border-amber-200 text-amber-900">
                  <div className="text-[10px] font-bold uppercase tracking-wider">On Leave</div>
                  <div className="text-lg font-black">{leaveCount}</div>
                </div>
              </div>

              {loadingStudents ? (
                <div className="p-8 text-center text-xs text-slate-400 font-medium">
                  Loading students for this batch...
                </div>
              ) : students.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                  No students found in this batch.
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {students.map((student, sIdx) => {
                    const current = attendanceState[student.id] || { status: 'present', reason: '' };
                    return (
                      <div
                        key={student.id}
                        className={`p-3 rounded-2xl border transition-all ${
                          current.status === 'present'
                            ? 'bg-white border-slate-200'
                            : current.status === 'absent'
                            ? 'bg-rose-50/50 border-rose-200'
                            : 'bg-amber-50/50 border-amber-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {sIdx + 1}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900 text-xs">{student.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{student.phone || 'No phone'}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 self-start sm:self-auto">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, 'present')}
                              className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                                current.status === 'present'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <UserCheck className="h-3 w-3" />
                              <span>Present</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, 'absent')}
                              className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                                current.status === 'absent'
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <UserX className="h-3 w-3" />
                              <span>Absent</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, 'leave')}
                              className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                                current.status === 'leave'
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <Plane className="h-3 w-3" />
                              <span>Leave</span>
                            </button>
                          </div>
                        </div>

                        {current.status === 'leave' && (
                          <div className="mt-2.5 pt-2 border-t border-amber-200/80">
                            <input
                              type="text"
                              value={current.reason}
                              onChange={(e) => handleReasonChange(student.id, e.target.value)}
                              placeholder="Reason for leave (e.g. High fever, College Exam, Family function)..."
                              className="w-full px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-600"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center gap-3">
              <input
                type="checkbox"
                id="autoSendWhatsApp"
                checked={autoSendWhatsApp}
                onChange={(e) => setAutoSendWhatsApp(e.target.checked)}
                className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="autoSendWhatsApp" className="text-xs font-bold text-emerald-950 cursor-pointer select-none">
                ⚡ Automatically Broadcast Topics & Student Attendance to WhatsApp Group
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-[#667eea] via-indigo-600 to-[#764ba2] hover:opacity-95 text-white font-extrabold py-3.5 text-sm shadow-xl shadow-indigo-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Broadcasting Session & Attendance to WhatsApp...</span>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Save Session & Broadcast to WhatsApp
                </>
              )}
            </button>
          </form>
        </div>
    </main>
  );
}
