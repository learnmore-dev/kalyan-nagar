import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Batch, Student } from '@/lib/types';
import { callBaileysUpdateGroupParticipants } from '@/lib/whatsappService';
import {
  ArrowLeft,
  Clock,
  Users,
  Calendar,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  Copy,
  Check,
  ExternalLink,
  UserPlus,
  Trash2,
  Phone,
  Mail,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface Session {
  id: string;
  date: string;
  trainer_name: string;
  topic: string;
  hours: number;
  notes: string;
}

export default function AdminBatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bRes, sRes, studRes] = await Promise.all([
        fetch(`/api/batches/${id}/`),
        fetch(`/api/batches/${id}/sessions/`),
        fetch(`/api/students/?batch_id=${id}`),
      ]);

      const bData = await bRes.json();
      const sData = await sRes.json();
      const studData = await studRes.json();

      if (bData.success) {
        setBatch(bData.batch);
      } else if (bData.id) {
        setBatch(bData);
      }

      if (sData.success) {
        setSessions(sData.sessions || []);
      }
      if (studData.success) {
        setStudents(studData.students || []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleCopyInviteLink = () => {
    if (!batch?.whatsapp_group_link) return;
    navigator.clipboard.writeText(batch.whatsapp_group_link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !batch) return;

    setIsSubmittingStudent(true);
    setActionNotice(null);

    try {
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
        fetchData();
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

  const handleRemoveStudent = async (student: Student) => {
    if (!window.confirm(`Are you sure you want to remove "${student.name}" from this batch and WhatsApp group?`)) {
      return;
    }

    setRemovingStudentId(student.id);
    setActionNotice(null);

    try {
      const targetGroup = batch?.whatsapp_group_id || batch?.whatsapp_group_name || batch?.name;
      if (student.phone && targetGroup) {
        try {
          await callBaileysUpdateGroupParticipants(targetGroup, [student.phone], 'remove');
        } catch (waErr) {
          console.warn('WhatsApp group remove notice:', waErr);
        }
      }

      const delRes = await fetch(`/api/students/${student.id}/`, {
        method: 'DELETE',
      });

      if (delRes.ok) {
        setActionNotice({
          type: 'success',
          message: `Student "${student.name}" removed from batch and WhatsApp group.`,
        });
        fetchData();
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

  if (loading) return (
    <main className="flex-1 p-8 flex items-center justify-center">
      <div className="h-6 w-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
    </main>
  );

  if (!batch) return (
    <main className="flex-1 p-8 text-center text-slate-400">Batch not found.</main>
  );

  const usedHours = batch.used_hours || sessions.reduce((sum, s) => sum + (s.hours || 0), 0) || 0;
  const remaining = batch.total_hours - usedHours;
  const pct = Math.min(100, Math.round((usedHours / (batch.total_hours || 1)) * 100));
  const isDelayed = usedHours > batch.total_hours;
  const statusColor = batch.status === 'completed' ? '#4f46e5' : isDelayed ? '#d97706' : '#059669';
  const statusLabel = batch.status === 'completed' ? '✔ Completed' : isDelayed ? '⏱ Delayed' : '✔ On Time';
  const groupName = batch.whatsapp_group_name || `${batch.name} Group`;

  return (
    <main className="flex-1 w-full max-w-[1200px] mx-auto p-5 sm:p-7 space-y-6">

      {/* Back */}
      <div className="flex items-center justify-between">
        <Link to="/admin/batches" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Batches
        </Link>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
        >
          <UserPlus className="h-4 w-4" /> + Add Student to Group
        </button>
      </div>

      {/* Notice Toast */}
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

      {/* Header card */}
      <div className="pro-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">{batch.name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Trainer: <strong className="text-slate-700">{batch.trainer_name || 'Unassigned'}</strong>
              {batch.start_date && <> · Started {batch.start_date}</>}
              {batch.branch && <> · Branch: <strong className="text-indigo-600">{batch.branch}</strong></>}
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-full text-xs font-bold self-start"
                style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}40` }}>
            {statusLabel}
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <Clock className="h-4 w-4 text-indigo-600" />, label: 'Planned Hours', value: `${batch.total_hours}h`, color: '#4f46e5' },
            { icon: <TrendingUp className="h-4 w-4 text-emerald-600" />, label: 'Hours Logged', value: `${usedHours}h`, color: '#059669' },
            { icon: <AlertTriangle className="h-4 w-4 text-amber-500" />, label: isDelayed ? 'Over by' : 'Remaining', value: isDelayed ? `+${Math.abs(remaining)}h` : `${remaining}h`, color: isDelayed ? '#d97706' : '#64748b' },
            { icon: <Users className="h-4 w-4 text-blue-600" />, label: 'Students', value: students.length || batch.total_students || 0, color: '#2563eb' },
          ].map((s) => (
            <div key={s.label} className="p-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mb-1">{s.icon}{s.label}</div>
              <div className="text-xl font-black font-mono" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-600">Syllabus Completion</span>
            <span className="font-mono font-bold" style={{ color: statusColor }}>{pct}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%`, background: isDelayed ? '#d97706' : 'linear-gradient(90deg,#4f46e5,#2563eb)' }} />
          </div>
          {isDelayed && (
            <p className="text-[11px] text-amber-700 font-medium">
              ⚠ Batch has exceeded planned hours by {Math.abs(remaining)}h — marked as <strong>Delayed</strong>.
            </p>
          )}
        </div>
      </div>

      {/* ── WhatsApp Group & Student Management Roster ── */}
      <div className="rounded-3xl bg-white shadow-sm border border-slate-200 overflow-hidden">
        {/* Header Bar */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-white border-b border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-sm">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <span>{groupName}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    🟢 Active Group
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {students.length} students synced with WhatsApp group
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {batch.whatsapp_group_link && (
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
                <th className="px-6 py-4">STATUS</th>
                <th className="px-6 py-4 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No students added to this batch yet. Click "+ Add Student" to add members.
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

      {/* Sessions table */}
      <div className="pro-card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between"
             style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div className="section-title"><BookOpen className="h-4 w-4 text-indigo-600" /> Session Log</div>
            <div className="section-subtitle">{sessions.length} sessions logged · {usedHours}h total</div>
          </div>
          <Link to={`/trainer/sessions/add?batch=${id}`}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                style={{ background: '#4f46e5' }}>
            + Add Session
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No sessions logged yet for this batch.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="pro-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Trainer</th>
                  <th>Topic Covered</th>
                  <th className="text-center">Hours</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => {
                  const cumulative = sessions.slice(0, i + 1).reduce((acc, x) => acc + x.hours, 0);
                  const sessionStatus = cumulative > batch.total_hours ? 'delayed' : 'on_time';
                  return (
                    <tr key={s.id}>
                      <td className="font-mono text-slate-400">{i + 1}</td>
                      <td className="font-semibold text-slate-700 whitespace-nowrap">{s.date}</td>
                      <td className="text-slate-600">{s.trainer_name || batch.trainer_name}</td>
                      <td className="max-w-[260px]">
                        <span className="font-semibold text-indigo-800" title={s.topic}>
                          {s.topic || <span className="text-slate-400 italic">No topic logged</span>}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="font-mono font-bold text-slate-800">{s.hours}h</span>
                      </td>
                      <td>
                        {sessionStatus === 'delayed' ? (
                          <span className="badge badge-amber">⏱ Delay</span>
                        ) : (
                          <span className="badge badge-emerald">✔ On Time</span>
                        )}
                      </td>
                      <td className="text-slate-500 max-w-[200px] truncate" title={s.notes}>
                        {s.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary footer */}
        <div className="px-5 py-3 flex items-center justify-between text-xs font-semibold"
             style={{ background: '#f8fafc', borderTop: '1px solid var(--border)' }}>
          <span className="text-slate-500">Total logged: <strong className="text-slate-800">{usedHours}h</strong> of <strong>{batch.total_hours}h</strong> planned</span>
          <span className="font-bold" style={{ color: statusColor }}>{statusLabel}</span>
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
