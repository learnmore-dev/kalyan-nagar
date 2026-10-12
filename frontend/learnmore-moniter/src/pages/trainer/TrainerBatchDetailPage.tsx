import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Batch, WorkSession, Student } from '@/lib/types';
import {
  Plus,
  ArrowLeft,
  Users,
  Copy,
  ExternalLink,
  MessageCircle,
  Phone,
  PlayCircle,
  Award,
  Check
} from 'lucide-react';

export default function TrainerBatchDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const batchId = (params?.id as string) || '';

  const [batch, setBatch] = useState<Batch | null>(null);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [, setLoading] = useState(true);

  // Persistent student status map from localStorage (falls back to {})
  const [studentStatuses, setStudentStatuses] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(`batch_statuses_${batchId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Load batch, sessions, and students
  useEffect(() => {
    const fetchBatchData = async () => {
      try {
        const [bRes, sRes, stuRes] = await Promise.all([
          fetch(`/api/batches/`),
          fetch(`/api/sessions?batch_id=${batchId}`),
          fetch(`/api/students?batch_id=${batchId}`),
        ]);

        const bData = await bRes.json();
        const sData = await sRes.json();
        const stuData = await stuRes.json();

        let currentBatch: Batch | null = null;
        if (bData.success && bData.batches) {
          currentBatch = bData.batches.find((b: Batch) => b.id === batchId) || bData.batches[0] || null;
          setBatch(currentBatch);
        }
        if (sData.success) {
          setSessions(sData.sessions || []);
        }

        if (stuData.success && stuData.students) {
          setStudents(stuData.students);
        } else if (currentBatch && (currentBatch as any).students) {
          setStudents((currentBatch as any).students);
        }

        // Fetch live CRM status for students
        try {
          const crmRes = await fetch('http://127.0.0.1:8000/api/course-mapping/batches/');
          if (crmRes.ok) {
            const crmData = await crmRes.json();
            const matchedBatch = (crmData.batches || []).find(
              (b: any) => b.id === batchId || b.name === currentBatch?.name
            );
            if (matchedBatch && matchedBatch.students && matchedBatch.students.length > 0) {
              setStudentStatuses((prev) => {
                const updated = { ...prev };
                matchedBatch.students.forEach((st: any) => {
                  const key = st.name || st.phone;
                  if (st.subject_status && st.subject_status !== 'not_started') {
                    updated[key] = st.subject_status;
                    if (st.name) updated[st.name] = st.subject_status;
                  }
                });
                localStorage.setItem(`batch_statuses_${batchId}`, JSON.stringify(updated));
                return updated;
              });
            }
          }
        } catch {
          // silent fallback to localStorage
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };

    fetchBatchData();
  }, [batchId]);

  // Handle student course status change (In Progress vs Completed)
  const handleStudentStatusChange = async (student: Student, newStatus: 'in_progress' | 'completed') => {
    const studentKey = student.name || student.id || student.phone || '';
    setUpdatingStudentId(studentKey);
    setStatusFeedback(null);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/course-mapping/batch-sync/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_name: batch?.name || 'Batch',
          subject_name: batch?.course_name || 'python',
          trainer_name: batch?.trainer_name || '',
          action: newStatus === 'completed' ? 'complete' : 'in_progress',
          start_date: batch?.start_date || new Date().toISOString().split('T')[0],
          completion_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null,
          trainer_remarks: `Status set to ${newStatus} by trainer ${batch?.trainer_name || ''}`,
          students: [{ name: student.name, phone: student.phone }],
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStudentStatuses((prev) => {
          const updated = {
            ...prev,
            [studentKey]: newStatus,
            [student.name]: newStatus,
          };
          if (student.id) updated[student.id] = newStatus;
          if (student.phone) updated[student.phone] = newStatus;
          try {
            localStorage.setItem(`batch_statuses_${batchId}`, JSON.stringify(updated));
          } catch {}
          return updated;
        });
        setStatusFeedback(`✅ ${student.name} marked as ${newStatus.toUpperCase()} in CRM!`);
        setTimeout(() => setStatusFeedback(null), 4000);
      } else {
        alert(data.error || data.message || 'Failed to update student status in CRM.');
      }
    } catch (err) {
      alert('CRM Server (port 8000) not responding. Ensure CRM backend is running.');
    } finally {
      setUpdatingStudentId(null);
    }
  };

  // Bulk update all students in batch
  const handleBulkStatusChange = async (targetStatus: 'in_progress' | 'completed') => {
    if (!students.length) return;
    setUpdatingStudentId('ALL');
    try {
      const res = await fetch('http://127.0.0.1:8000/api/course-mapping/batch-sync/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_name: batch?.name || 'Batch',
          subject_name: batch?.course_name || 'python',
          trainer_name: batch?.trainer_name || '',
          action: targetStatus === 'completed' ? 'complete' : 'in_progress',
          start_date: batch?.start_date || new Date().toISOString().split('T')[0],
          completion_date: targetStatus === 'completed' ? new Date().toISOString().split('T')[0] : null,
          trainer_remarks: `All students marked as ${targetStatus} by trainer ${batch?.trainer_name || ''}`,
          students: students.map((s) => ({ name: s.name, phone: s.phone })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStudentStatuses((prev) => {
          const updated = { ...prev };
          students.forEach((s) => {
            updated[s.name] = targetStatus;
            if (s.id) updated[s.id] = targetStatus;
            if (s.phone) updated[s.phone] = targetStatus;
          });
          try {
            localStorage.setItem(`batch_statuses_${batchId}`, JSON.stringify(updated));
          } catch {}
          return updated;
        });
        setStatusFeedback(`🎉 All ${students.length} students marked as ${targetStatus.toUpperCase()} in CRM!`);
        setTimeout(() => setStatusFeedback(null), 4000);
      } else {
        alert(data.error || data.message || 'Failed to sync all students.');
      }
    } catch {
      alert('CRM Server connection failed.');
    } finally {
      setUpdatingStudentId(null);
    }
  };

  const totalHours = batch?.total_hours || 40;
  const usedHours =
    sessions.reduce((sum, s) => sum + (s.hours_taken || 0), 0) ||
    batch?.used_hours ||
    0;
  const remainingHours = Math.max(0, totalHours - usedHours);

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Batches
        </button>

        <div className="flex items-center gap-2">
          <Link
            to={`/trainer/sessions/add?batch=${batch?.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" /> + Log Work Session
          </Link>
        </div>
      </div>

      {/* Status Feedback Toast */}
      {statusFeedback && (
        <div className="p-3.5 px-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-extrabold text-xs shadow-md flex items-center justify-between animate-in fade-in duration-300">
          <span>{statusFeedback}</span>
          <button onClick={() => setStatusFeedback(null)} className="text-emerald-700 hover:text-emerald-950 font-black">✕</button>
        </div>
      )}

      {/* Batch Overview Header Card */}
      <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-600" />
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600">
            BATCH OVERVIEW & LIVE WHATSAPP ROSTER
          </span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {batch?.name || 'Batch Overview'}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-500 mt-2 font-medium">
              <span>👤 Trainer: <strong className="text-slate-800">{batch?.trainer_name || 'altaf Das'}</strong></span>
              <span>•</span>
              <span>📚 Course: <strong className="text-blue-700 font-bold">{batch?.course_name || 'python'}</strong></span>
              <span>•</span>
              <span>📅 Start Date: <strong className="text-slate-800">{batch?.start_date || '2026-10-11'}</strong></span>
              <span>•</span>
              <span>🏢 Branch: <strong className="text-indigo-700">{batch?.branch || 'Kalyan Nagar'}</strong></span>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 self-start">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Active Batch
          </span>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-slate-100">
          <div className="rounded-2xl bg-slate-50/80 border border-slate-200 p-4 space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">TOTAL HOURS</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 font-mono">{totalHours} hrs</div>
            <div className="text-[11px] text-slate-500">Planned duration</div>
          </div>

          <div className="rounded-2xl bg-blue-50/70 border border-blue-200 p-4 space-y-1">
            <div className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">USED HOURS</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-700 font-mono">{usedHours} hrs</div>
            <div className="text-[11px] text-blue-600">{sessions.length} sessions logged</div>
          </div>

          <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200 p-4 space-y-1">
            <div className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">REMAINING</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono">{remainingHours} hrs</div>
            <div className="text-[11px] text-emerald-600">Hours to complete</div>
          </div>

          <div className="rounded-2xl bg-purple-50/70 border border-purple-200 p-4 space-y-1">
            <div className="text-[11px] font-bold text-purple-500 uppercase tracking-wider">STUDENTS</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-purple-700 font-mono">{students.length || batch?.total_students || 2}</div>
            <div className="text-[11px] text-purple-600">In WhatsApp Group</div>
          </div>
        </div>
      </div>

      {/* WhatsApp Group Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-emerald-50/40 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-slate-900">{batch?.name || 'Batch'}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                ● Live Group
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              {students.length} enrolled students synced with WhatsApp group
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (batch?.whatsapp_group_link) {
                navigator.clipboard.writeText(batch.whatsapp_group_link);
                alert('Group link copied!');
              } else {
                alert('No group link available.');
              }
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-extrabold text-xs shadow-2xs cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5 text-slate-500" /> Copy Group Link
          </button>
          <a
            href={batch?.whatsapp_group_link || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open WhatsApp
          </a>
        </div>
      </div>

      {/* BATCH STUDENTS ROSTER WITH COURSE STATUS CONTROL */}
      <div className="rounded-3xl bg-white shadow-sm border border-slate-200 overflow-hidden space-y-0">
        <div className="p-4 px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              BATCH STUDENTS & WHATSAPP MEMBERS ROSTER
            </h2>
            <span className="text-xs text-slate-500 font-bold ml-1">
              (Total {students.length} students)
            </span>
          </div>

          {/* Bulk quick actions */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-bold hidden md:inline">Quick All:</span>
            <button
              type="button"
              onClick={() => handleBulkStatusChange('in_progress')}
              disabled={updatingStudentId === 'ALL'}
              className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-800 font-extrabold text-xs cursor-pointer transition-all"
            >
              🚀 All In Progress
            </button>
            <button
              type="button"
              onClick={() => handleBulkStatusChange('completed')}
              disabled={updatingStudentId === 'ALL'}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs cursor-pointer transition-all"
            >
              🏆 All Completed
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead className="bg-[#f8fafc] text-slate-400 font-black border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4 w-12 text-center">#</th>
                <th className="px-6 py-4">STUDENT NAME</th>
                <th className="px-6 py-4">WHATSAPP PHONE</th>
                <th className="px-6 py-4">EMAIL</th>
                <th className="px-6 py-4 text-center">COURSE STATUS (CRM)</th>
                <th className="px-6 py-4">GROUP STATUS</th>
                <th className="px-6 py-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400 font-medium">
                    No students enrolled in this batch yet.
                  </td>
                </tr>
              ) : (
                students.map((student, index) => {
                  const studentKey = student.name || student.id || student.phone || '';
                  const currentStatus = studentStatuses[studentKey] || studentStatuses[student.name] || studentStatuses[student.id] || studentStatuses[student.phone || ''] || 'in_progress';
                  const isUpdating = updatingStudentId === studentKey || updatingStudentId === 'ALL';

                  return (
                    <tr key={student.id || index} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 text-center font-bold text-slate-400">{index + 1}</td>
                      <td className="px-6 py-4 font-extrabold text-slate-900 text-sm">
                        {student.name}
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-slate-600">
                        {student.phone ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 font-bold text-slate-700">
                            <Phone className="h-3 w-3 text-emerald-600" /> {student.phone}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono">
                        {student.email || '—'}
                      </td>

                      {/* Course Status Control: In Progress vs Completed */}
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200 shadow-2xs gap-1">
                          <button
                            type="button"
                            onClick={() => handleStudentStatusChange(student, 'in_progress')}
                            disabled={isUpdating}
                            title="Mark student subject as In Progress in CRM"
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all flex items-center gap-1.5 ${
                              currentStatus === 'in_progress'
                                ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-500'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                            }`}
                          >
                            <PlayCircle className="h-3.5 w-3.5" />
                            <span>In Progress</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStudentStatusChange(student, 'completed')}
                            disabled={isUpdating}
                            title="Mark student subject as Completed in CRM"
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all flex items-center gap-1.5 ${
                              currentStatus === 'completed'
                                ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                            }`}
                          >
                            <Award className="h-3.5 w-3.5" />
                            <span>Completed</span>
                          </button>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="h-3 w-3 text-emerald-600" /> Synced
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 font-extrabold text-xs cursor-pointer transition-all"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Work Sessions Log Table */}
      <div className="rounded-3xl bg-white shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            📝 Work Sessions Log
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            {sessions.length} sessions logged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-[#fafcff] text-slate-400 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-4 w-12 text-center">#</th>
                <th className="px-6 py-4">DATE</th>
                <th className="px-6 py-4">HOURS</th>
                <th className="px-6 py-4">TOPIC COVERED</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                    No work sessions logged yet for this batch.
                  </td>
                </tr>
              ) : (
                sessions.map((session, index) => (
                  <tr key={session.id || index} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 text-center font-bold text-slate-400">{index + 1}</td>
                    <td className="px-6 py-4 font-mono font-medium text-slate-700">
                      📅 {session.session_date}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 font-bold text-xs font-mono">
                        ⏱️ {session.hours_taken} h
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium leading-relaxed">
                      <div>{session.description}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
