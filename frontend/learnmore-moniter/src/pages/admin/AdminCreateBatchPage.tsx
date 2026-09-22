import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/lib/types';
import { CourseSyllabus, INSTITUTE_COURSES } from '@/lib/syllabusData';
import { ArrowLeft, CheckCircle2, MessageSquare, Sparkles, BookOpen, Layers, Copy, Check, Users, Plus, Trash2, UserPlus, ClipboardList } from 'lucide-react';

export default function AdminCreateBatchPage() {
  const navigate = useNavigate();
  const [trainers, setTrainers] = useState<User[]>([]);
  const [courses, setCourses] = useState<CourseSyllabus[]>(INSTITUTE_COURSES);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('course_sql');

  const [name, setName] = useState('SQL & Database Engineering — Morning Batch');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalHours, setTotalHours] = useState('40');
  const [trainerId, setTrainerId] = useState('');
  const [status, setStatus] = useState('active');

  // Enrolled Students State
  const [studentList, setStudentList] = useState<Array<{ name: string; phone: string }>>([
    { name: '', phone: '+91 ' },
  ]);
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // WhatsApp Integration States
  const [whatsappGroupName, setWhatsappGroupName] = useState('');
  const [autoCreateWhatsApp, setAutoCreateWhatsApp] = useState(true);
  const [createdWhatsAppInfo, setCreatedWhatsAppInfo] = useState<{ groupName: string; inviteLink: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Student helper functions
  const addStudent = () => {
    setStudentList((prev) => [...prev, { name: '', phone: '+91 ' }]);
  };

  const updateStudent = (index: number, field: 'name' | 'phone', val: string) => {
    setStudentList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const removeStudent = (index: number) => {
    setStudentList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApplyBulkText = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n');
    const parsed: Array<{ name: string; phone: string }> = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const parts = trimmed.split(/,|\t|-/);
      if (parts.length >= 2) {
        parsed.push({
          name: parts[0].trim(),
          phone: parts.slice(1).join('').trim(),
        });
      } else if (trimmed) {
        parsed.push({
          name: trimmed,
          phone: '+91 98000 00000',
        });
      }
    });

    if (parsed.length > 0) {
      setStudentList(parsed);
      setShowBulkPaste(false);
      setBulkText('');
    }
  };

  useEffect(() => {
    fetch('/api/users?role=trainer')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTrainers(data.users || []);
          if (data.users?.length > 0 && !trainerId) {
            setTrainerId(data.users[0].id);
          }
        }
      });

    fetch('/api/courses/')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.courses?.length > 0) {
          setCourses(data.courses);
        }
      })
      .catch(() => {});
  }, []);

  // WhatsApp Group Naming Builder States
  const [branch, setBranch] = useState<'KN' | 'MT' | 'BTM' | string>('KN');
  const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const getMonthFromDate = (d: string) => {
    try {
      const m = new Date(d).getMonth();
      return MONTH_NAMES[m] || 'AUG';
    } catch {
      return 'AUG';
    }
  };
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getMonthFromDate(startDate));
  const [mode, setMode] = useState<'OFF' | 'ON'>('OFF');
  const [batchTime, setBatchTime] = useState<string>('10AM');
  const [courseCode, setCourseCode] = useState<string>('SQL');

  const COURSE_SHORT_CODES: Record<string, string> = {
    course_python: 'PY',
    course_java: 'JAVA',
    course_mern: 'MERN',
    course_mean: 'MEAN',
    course_sql: 'SQL',
    course_powerbi: 'PBI',
    course_datascience: 'DS',
    course_genai: 'AI',
    course_devops: 'DEVOPS',
    course_linux: 'LINUX',
    course_manual_testing: 'TEST',
    course_dsa: 'DSA',
    course_cpp: 'CPP',
    course_django: 'DJANGO',
    course_azure_developer: 'AZ-DEV',
    course_azure_admin: 'AZ-ADM',
    course_azure_databricks: 'AZ-DBX',
    course_azure_data_engineering: 'AZ-DE',
    course_azure_ad: 'AZ-AD',
    course_cybersecurity: 'CYBER',
    course_excel: 'EXCEL',
    course_basic_computer: 'BC',
    course_sap_mm: 'SAP-MM',
    course_sap_fico: 'SAP-FI',
    course_salesforce_developer: 'SF-DEV',
    course_salesforce_admin: 'SF-ADM',
    course_golang: 'GO',
    course_flutter: 'FLT',
    course_android: 'AND',
    course_angular: 'ANGULAR',
    course_react: 'REACT',
  };

  useEffect(() => {
    if (startDate) {
      setSelectedMonth(getMonthFromDate(startDate));
    }
  }, [startDate]);

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    const selectedCourse = courses.find((c) => c.id === courseId);
    if (selectedCourse) {
      setName(`${selectedCourse.name.replace(' Syllabus', '')} — New Batch`);
      setTotalHours(String(selectedCourse.default_hours || 40));
      const mappedCode = COURSE_SHORT_CODES[courseId] || courseId.replace('course_', '').toUpperCase();
      setCourseCode(mappedCode);
    }
  };

  useEffect(() => {
    const formatted = `LMT-${branch}-${selectedMonth}-${mode}-${courseCode}-${batchTime}`.toUpperCase();
    setWhatsappGroupName(formatted);
    setName(formatted);
  }, [branch, selectedMonth, mode, courseCode, batchTime]);

  const handleBatchNameChange = (val: string) => {
    setName(val);
    setWhatsappGroupName(val);
  };

  const handleWhatsAppGroupNameChange = (val: string) => {
    setWhatsappGroupName(val);
    setName(val);
  };

  const selectedCourseObj = courses.find((c) => c.id === selectedCourseId);
  const selectedTrainerObj = trainers.find((t) => t.id === trainerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalSyncName = (whatsappGroupName || name).trim();
    if (!finalSyncName || !totalHours || !trainerId) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const validStudents = studentList.filter((s) => s.name && s.name.trim().length > 0);

      const res = await fetch('/api/batches/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalSyncName,
          whatsapp_group_name: finalSyncName,
          course_id: selectedCourseId,
          course_name: selectedCourseObj?.name || 'Standard Course',
          start_date: startDate,
          total_hours: Number(totalHours),
          total_students: validStudents.length > 0 ? validStudents.length : 12,
          students: validStudents,
          trainer_id: trainerId,
          is_active: status === 'active',
          batch_type: 'training',
          auto_whatsapp_group: autoCreateWhatsApp,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to create batch');
        setLoading(false);
        return;
      }

      if (data.whatsapp) {
        setCreatedWhatsAppInfo(data.whatsapp);
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Server error');
      setLoading(false);
    }
  };

  const copyInviteLink = () => {
    if (createdWhatsAppInfo?.inviteLink) {
      navigator.clipboard.writeText(createdWhatsAppInfo.inviteLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </button>

      {/* Form Container */}
      <div className="w-full rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-white">
        {/* Purple Gradient Header Banner */}
        <div className="w-full bg-gradient-to-r from-[#667eea] to-[#764ba2] p-6 text-center text-white relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold tracking-wide backdrop-blur-md mb-1.5">
            <Sparkles className="h-3.5 w-3.5 text-yellow-300" /> Syllabus-Linked Batch Provisioning
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Create New Batch & Assign Course Syllabus
          </h2>
          <p className="text-xs text-white/80 pt-1">
            Select course syllabus to empower Trainer with 1-click topic logging on attendance & WhatsApp
          </p>
        </div>

        {error && (
          <div className="m-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="m-6 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              Batch Created & WhatsApp Group Initialized Successfully!
            </div>

            {createdWhatsAppInfo && (
              <div className="p-3 bg-white rounded-xl border border-emerald-200/80 space-y-2 font-normal text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-[#128C7E]">
                    <MessageSquare className="h-4 w-4 text-[#25D366]" /> Group: {createdWhatsAppInfo.groupName}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                    🟢 Auto-Created
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="font-mono text-[11px] text-slate-500 truncate">
                    {createdWhatsAppInfo.inviteLink}
                  </span>
                  <button
                    type="button"
                    onClick={copyInviteLink}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedLink ? 'Copied' : 'Copy Link'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 text-xs sm:text-sm">
          {/* 1. Course Category & Syllabus Selector */}
          <div className="space-y-2 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200">
            <label className="block font-bold text-indigo-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-indigo-600" /> SELECT OFFICIAL COURSE SYLLABUS *
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full rounded-xl border border-indigo-300 bg-white px-3.5 py-2.5 text-slate-900 font-bold focus:border-indigo-600 focus:outline-none transition-all cursor-pointer"
            >
              {Array.from(new Set(courses.map((c) => c.category))).map((cat) => (
                <optgroup key={cat} label={`📂 ${cat}`}>
                  {courses
                    .filter((c) => c.category === cat)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        🎓 {c.name} ({c.modules.length} Modules • {c.default_hours} hrs)
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>

            {selectedCourseObj && (
              <div className="flex items-center justify-between text-[11px] text-indigo-800 pt-1">
                <span>Category: <strong>{selectedCourseObj.category}</strong></span>
                <span>Curriculum: <strong>{selectedCourseObj.modules.length} Detailed Modules</strong></span>
              </div>
            )}
          </div>

          {/* Batch Name */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              BATCH NAME *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. SQL & Database Engineering — Morning Batch"
              value={name}
              onChange={(e) => handleBatchNameChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 font-semibold focus:border-indigo-600 focus:outline-none transition-all"
            />
          </div>

          {/* Start Date & Total Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                START DATE *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-800 focus:border-indigo-600 focus:outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                TOTAL HOURS *
              </label>
              <input
                type="number"
                required
                placeholder="e.g. 40"
                value={totalHours}
                onChange={(e) => setTotalHours(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-800 font-semibold focus:border-indigo-600 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Assigned Trainer */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              ASSIGNED TRAINER *
            </label>
            <select
              required
              value={trainerId}
              onChange={(e) => setTrainerId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 font-bold focus:border-indigo-600 focus:outline-none transition-all cursor-pointer"
            >
              <option value="">Select Trainer</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  👨‍🏫 {t.name} ({t.designation || 'Trainer'})
                </option>
              ))}
            </select>
          </div>

          {/* Enrolled Students & Phone Numbers Roster */}
          <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-black text-xs sm:text-sm text-indigo-950 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-indigo-600" /> Student Enrollment & WhatsApp Numbers ({studentList.length} Students)
                </h3>
                <p className="text-[11px] text-indigo-700">
                  Students will automatically appear in Trainer Attendance & WhatsApp Session Logging.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkPaste(!showBulkPaste)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-900 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  {showBulkPaste ? 'Hide Paste Box' : 'Bulk Paste'}
                </button>

                {studentList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setStudentList([])}
                    className="px-2.5 py-1 rounded-lg bg-rose-100/80 hover:bg-rose-200 text-rose-800 font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Bulk Paste Box */}
            {showBulkPaste && (
              <div className="p-3 bg-white rounded-xl border border-indigo-300 space-y-2">
                <label className="block text-[11px] font-bold text-indigo-950">
                  📋 Paste Students List (One student per line: "Name, +91 Phone"):
                </label>
                <textarea
                  rows={4}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="Rahul Patel, +91 98981 12345&#10;Sneha Shah, +91 98250 23456&#10;Priya Mehta, +91 97140 34567"
                  className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-600 bg-slate-50"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleApplyBulkText}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors"
                  >
                    Apply Pasted Students
                  </button>
                </div>
              </div>
            )}

            {/* Student Rows Table */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {studentList.map((st, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 rounded-xl bg-white border border-indigo-100 shadow-2xs hover:border-indigo-300 transition-all"
                >
                  <span className="w-6 text-center font-bold text-xs text-indigo-500 shrink-0">
                    #{index + 1}
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Student Full Name"
                    value={st.name}
                    onChange={(e) => updateStudent(index, 'name', e.target.value)}
                    className="flex-1 min-w-[120px] px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Phone / WhatsApp Number"
                    value={st.phone}
                    onChange={(e) => updateStudent(index, 'phone', e.target.value)}
                    className="w-36 sm:w-44 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 focus:outline-none focus:border-indigo-500 shrink-0"
                  />
                  <button
                    type="button"
                    onClick={() => removeStudent(index)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                    title="Remove Student"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Student Button */}
            <button
              type="button"
              onClick={addStudent}
              className="w-full py-2 border-2 border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-100/50 rounded-xl text-indigo-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Student (Name & Phone)
            </button>
          </div>

          {/* WhatsApp Group Provisioning Section */}
          <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-extrabold text-xs text-emerald-950 flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-[#25D366]" /> Automated WhatsApp Group Setup
                </span>
                <p className="text-[11px] text-emerald-700">
                  Auto-builds standard group name: <code className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-mono font-bold">LMT-BRANCH-MONTH-MODE-COURSE-TIME</code>
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCreateWhatsApp}
                  onChange={(e) => setAutoCreateWhatsApp(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#25D366]"></div>
              </label>
            </div>

            {autoCreateWhatsApp && (
              <div className="space-y-3.5 pt-2 border-t border-emerald-200/60">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="space-y-1">
                    <label className="block font-bold text-emerald-900 text-[10px] uppercase tracking-wider">
                      1. Branch *
                    </label>
                    <select
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="w-full rounded-xl border border-emerald-300 bg-white px-2.5 py-2 text-slate-800 text-xs font-bold focus:outline-none focus:border-emerald-600 cursor-pointer"
                    >
                      <option value="KN">KN (Kalyan Nagar)</option>
                      <option value="MT">MT (Marathahalli)</option>
                      <option value="BTM">BTM (BTM Layout)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-emerald-900 text-[10px] uppercase tracking-wider">
                      2. Month *
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full rounded-xl border border-emerald-300 bg-white px-2.5 py-2 text-slate-800 text-xs font-bold focus:outline-none focus:border-emerald-600 cursor-pointer"
                    >
                      {MONTH_NAMES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-emerald-900 text-[10px] uppercase tracking-wider">
                      3. Mode *
                    </label>
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value as 'OFF' | 'ON')}
                      className="w-full rounded-xl border border-emerald-300 bg-white px-2.5 py-2 text-slate-800 text-xs font-bold focus:outline-none focus:border-emerald-600 cursor-pointer"
                    >
                      <option value="OFF">OFF (Offline)</option>
                      <option value="ON">ON (Online)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-emerald-900 text-[10px] uppercase tracking-wider">
                      4. Course Code *
                    </label>
                    <input
                      type="text"
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                      placeholder="e.g. PY, JAVA"
                      className="w-full rounded-xl border border-emerald-300 bg-white px-2.5 py-2 text-slate-800 text-xs font-bold focus:outline-none focus:border-emerald-600 uppercase"
                    />
                  </div>

                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="block font-bold text-emerald-900 text-[10px] uppercase tracking-wider">
                      5. Time *
                    </label>
                    <input
                      type="text"
                      value={batchTime}
                      onChange={(e) => setBatchTime(e.target.value.toUpperCase())}
                      placeholder="e.g. 10AM, 7PM"
                      className="w-full rounded-xl border border-emerald-300 bg-white px-2.5 py-2 text-slate-800 text-xs font-bold focus:outline-none focus:border-emerald-600 uppercase"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] font-bold text-emerald-800">Quick Times:</span>
                  {['08AM', '10AM', '1130AM', '02PM', '05PM', '07PM', '08PM'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setBatchTime(t)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                        batchTime === t
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-emerald-100/80 hover:bg-emerald-200 text-emerald-900'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="p-3 bg-white rounded-xl border border-emerald-300 shadow-sm space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block font-black text-emerald-950 text-[10px] uppercase tracking-wider">
                      FINAL WHATSAPP GROUP NAME
                    </label>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ⚡ Live Auto-Generated
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={whatsappGroupName}
                    onChange={(e) => handleWhatsAppGroupNameChange(e.target.value.toUpperCase())}
                    className="w-full font-mono text-xs sm:text-sm font-extrabold text-emerald-950 bg-emerald-50/50 rounded-lg px-3 py-2 border border-emerald-300 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-[#667eea] via-indigo-600 to-[#764ba2] hover:opacity-95 text-white font-extrabold py-3.5 text-sm shadow-xl shadow-indigo-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Creating Batch & Initializing Syllabus...</span>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Create Batch & Link Syllabus
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
