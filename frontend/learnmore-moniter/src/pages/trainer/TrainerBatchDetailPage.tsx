import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Batch, WorkSession, Student } from '@/lib/types';
import { callBaileysUpdateGroupParticipants } from '@/lib/whatsappService';
import {
  Plus,
  ArrowLeft,
  Users,
  MessageSquare,
  ExternalLink,
  Copy,
  Check,
  UserPlus,
  Trash2,
  Phone,
  Mail,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Clock,
  BookOpen,
  Calendar,
} from 'lucide-react';

export default function TrainerBatchDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const batchId = (params?.id as string) || '';

  const [batch, setBatch] = useState<Batch | null>(null);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for adding new student
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(null);

  const fetchBatchData = async () => {
    try {
      setLoading(true);
      const [bRes, sRes, studRes] = await Promise.all([
        fetch(`/api/batches/`),
        fetch(`/api/sessions?batch_id=${batchId}`),
        fetch(`/api/students/?batch_id=${batchId}`),
      ]);

      const bData = await bRes.json();
      const sData = await sRes.json();
      const studData = await studRes.json();

      if (bData.success) {
        const found = bData.batches.find((b: Batch) => String(b.id) === String(batchId));
        setBatch(found || bData.batches[0] || null);
      }
      if (sData.success) {
        setSessions(sData.sessions || []);
      }
      if (studData.success) {
        setStudents(studData.students || []);
      }
    } catch (err) {
      console.error('Failed to load batch details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatchData();
  }, [batchId]);

  // Handle Copy Invite Link
  const handleCopyInviteLink = () => {
    if (!batch?.whatsapp_group_link) return;
    navigator.clipboard.writeText(batch.whatsapp_group_link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Handle Add Student to Database & WhatsApp Group
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !batch) return;

    setIsSubmittingStudent(true);
    setActionNotice(null);

    try {
      // 1. Save student in Django DB
      const res = await fetch('/api/students/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch: batch.id,
          batch_name: batch.name,
          name: newStudentName.trim(),
          phone: newStudentPhone.trim(),
          email: newStudentEmail.trim(),
        }),
      });

      if (res.ok) {
        // 2. If phone is provided and batch has group, push into WhatsApp group
        const targetGroup = batch.whatsapp_group_id || batch.whatsapp_group_name || batch.name;
        if (newStudentPhone.trim() && targetGroup) {
          try {
            await callBaileysUpdateGroupParticipants(targetGroup, [newStudentPhone.trim()], 'add');
          } catch (waErr) {
            console.warn('WhatsApp group sync notice:', waErr);
          }
        }

        setActionNotice({
          type: 'success',
          message: `Student "${newStudentName}" added to batch and WhatsApp group successfully!`,
        });

        setNewStudentName('');
        setNewStudentPhone('');
        setNewStudentEmail('');
        setIsAddModalOpen(false);
        fetchBatchData();
      } else {
        const errData = await res.json();
        setActionNotice({
          type: 'error',
          message: errData.error || 'Failed to add student. Please try again.',
        });
      }
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err?.message || 'An error occurred while saving student.',
      });
    } finally {
      setIsSubmittingStudent(false);
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  // Handle Remove Student from Batch & WhatsApp Group
  const handleRemoveStudent = async (student: Student) => {
    if (!window.confirm(`Are you sure you want to remove "${student.name}" from this batch and WhatsApp group?`)) {
      return;
    }

    setRemovingStudentId(student.id);
    setActionNotice(null);

    try {
      // 1. Remove from WhatsApp group if phone exists
      const targetGroup = batch?.whatsapp_group_id || batch?.whatsapp_group_name || batch?.name;
      if (student.phone && targetGroup) {
        try {
          await callBaileysUpdateGroupParticipants(targetGroup, [student.phone], 'remove');
        } catch (waErr) {
          console.warn('WhatsApp group remove notice:', waErr);
        }
      }

      // 2. Delete student record from DB
      const delRes = await fetch(`/api/students/${student.id}/`, {
        method: 'DELETE',
      });

      if (delRes.ok) {
        setActionNotice({
          type: 'success',
          message: `Student "${student.name}" removed from batch and WhatsApp group.`,
        });
        fetchBatchData();
      } else {
        setActionNotice({
          type: 'error',
          message: 'Failed to delete student from database.',
        });
      }
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err?.message || 'Error occurred while removing student.',
      });
    } finally {
      setRemovingStudentId(null);
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const totalHours = batch?.total_hours || 30;
  const usedHours =
    sessions.reduce((sum, s) => sum + (s.hours_taken || 0), 0) ||
    batch?.used_hours ||
    0;
  const remainingHours = Math.max(0, totalHours - usedHours);
  const delayHours = usedHours > totalHours ? usedHours - totalHours : 0;
  const groupName = batch?.whatsapp_group_name || `${batch?.name || 'Batch'} Group`;

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Top Bar: Back & Actions ── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/trainer/batches')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Batches
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <UserPlus className="h-4 w-4" /> + Add Student to Group
          </button>

          <Link
            to={`/trainer/sessions/add?batch=${batch?.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" /> Log Session
          </Link>
        </div>
      </div>

      {/* ── Notice Toast / Banner ── */}
      {actionNotice && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 border shadow-xs transition-all ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {actionNotice.type === 'success' ? (
            <Check className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          )}
          <span className="text-xs font-bold leading-relaxed">{actionNotice.message}</span>
        </div>
      )}

      {/* ── Batch Header Overview ── */}
      <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600">
              BATCH OVERVIEW & LIVE WHATSAPP ROSTER
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Active Batch
          </span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {batch?.name || 'Batch Overview'}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-500 mt-2 font-medium">
              <span>👤 Trainer: <strong className="text-slate-800">{batch?.trainer_name || 'Assigned Trainer'}</strong></span>
              <span>•</span>
              <span>📚 Course: <strong className="text-slate-800">{batch?.course_name || 'IT Technology'}</strong></span>
              <span>•</span>
              <span>📅 Start Date: <strong className="text-slate-800">{batch?.start_date || '—'}</strong></span>
              <span>•</span>
              <span>🏢 Branch: <strong className="text-indigo-600 font-extrabold">{batch?.branch || 'Kalyan Nagar'}</strong></span>
            </div>
          </div>
        </div>

        {/* ── Stats Metric Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-slate-100">
          <div className="rounded-2xl bg-slate-50/80 border border-slate-200 p-4 space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              TOTAL HOURS
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 font-mono">
              {totalHours} hrs
            </div>
            <div className="text-[11px] text-slate-500">Planned duration</div>
          </div>

          <div className="rounded-2xl bg-blue-50/70 border border-blue-200 p-4 space-y-1">
            <div className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">
              USED HOURS
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-700 font-mono">
              {usedHours} hrs
            </div>
            <div className="text-[11px] text-blue-600">{sessions.length} sessions logged</div>
          </div>

          <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200 p-4 space-y-1">
            <div className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">
              REMAINING
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono">
              {remainingHours} hrs
            </div>
            <div className="text-[11px] text-emerald-600">Hours to complete</div>
          </div>

          <div className="rounded-2xl bg-purple-50/70 border border-purple-200 p-4 space-y-1">
            <div className="text-[11px] font-bold text-purple-500 uppercase tracking-wider">
              STUDENTS
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-purple-700 font-mono">
              {students.length}
            </div>
            <div className="text-[11px] text-purple-600">In WhatsApp Group</div>
          </div>
        </div>
      </div>

      {/* ── WhatsApp Group & Interactive Student Roster Card ── */}
      <div className="rounded-3xl bg-white shadow-sm border border-slate-200 overflow-hidden space-y-0">
        {/* WhatsApp Group Header Bar */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-white border-b border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-sm">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <span>{groupName}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    🟢 Live Group
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {students.length} enrolled students synced with WhatsApp group
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {batch?.whatsapp_group_link && (
              <>
                <button
                  type="button"
                  onClick={handleCopyInviteLink}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  title="Copy WhatsApp Group Invite Link"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedLink ? 'Copied Link!' : 'Copy Group Link'}</span>
                </button>

                <a
                  href={batch.whatsapp_group_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
                >
                  <span>Open WhatsApp</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </>
            )}

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>+ Add Student</span>
            </button>
          </div>
        </div>

        {/* Student Table */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-600" /> Batch Students & WhatsApp Members Roster
          </h4>
          <span className="text-xs text-slate-400 font-bold">
            Total {students.length} students
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-[#fafcff] text-slate-400 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-4 w-12 text-center">#</th>
                <th className="px-6 py-4">STUDENT NAME</th>
                <th className="px-6 py-4">WHATSAPP PHONE</th>
                <th className="px-6 py-4">EMAIL</th>
                <th className="px-6 py-4">GROUP STATUS</th>
                <th className="px-6 py-4 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 space-y-2">
                    <p className="font-extrabold text-slate-700 text-sm">No students added to this batch yet.</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Click "+ Add Student" above to enroll late joiners directly into this batch and WhatsApp group.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(true)}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs cursor-pointer"
                    >
                      <UserPlus className="h-3.5 w-3.5" /> Add First Student
                    </button>
                  </td>
                </tr>
              ) : (
                students.map((st, idx) => (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 text-center font-bold text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-extrabold text-slate-900 text-sm">{st.name}</div>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-slate-700">
                      {st.phone ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                          <Phone className="h-3 w-3 text-[#25D366]" /> {st.phone}
                        </span>
                      ) : (
                        <span className="text-slate-400">No phone</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {st.email ? (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3 w-3 text-slate-400" /> {st.email}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Check className="h-3 w-3 text-emerald-600" /> Synced
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveStudent(st)}
                        disabled={removingStudentId === st.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                        title="Remove student from batch and WhatsApp group"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>{removingStudentId === st.id ? 'Removing...' : 'Remove'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Work Sessions Log Table ── */}
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
                  <tr key={session.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 text-center font-bold text-slate-400">
                      {index + 1}
                    </td>
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
                      {session.students_attendance && session.students_attendance.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px]">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                            👥 {session.total_students_present || session.students_attendance.filter((s) => s.status === 'present').length}/{session.students_attendance.length} Present
                          </span>
                          {session.students_attendance.some((s) => s.status === 'absent') && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 text-rose-800 font-bold border border-rose-200">
                              ❌ {session.students_attendance.filter((s) => s.status === 'absent').length} Absent
                            </span>
                          )}
                          {session.students_attendance.some((s) => s.status === 'leave') && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 font-bold border border-amber-200">
                              🏖️ {session.students_attendance.filter((s) => s.status === 'leave').length} On Leave
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Student Modal ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Add Student to Batch</h3>
                  <p className="text-xs text-slate-500 font-medium">Adds to database & WhatsApp group</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Student Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">WhatsApp Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={newStudentPhone}
                    onChange={(e) => setNewStudentPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400">10-digit mobile number for automated WhatsApp sync.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Email Address (Optional)</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="e.g. rahul@example.com"
                    value={newStudentEmail}
                    onChange={(e) => setNewStudentEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingStudent}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold text-xs shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingStudent && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{isSubmittingStudent ? 'Adding & Syncing...' : 'Add Student Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
