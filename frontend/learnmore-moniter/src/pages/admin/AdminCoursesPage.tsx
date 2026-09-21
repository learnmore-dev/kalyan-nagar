import React, { useState, useEffect } from 'react';
import { CourseSyllabus, CourseModule } from '@/lib/syllabusData';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Clock,
  Layers,
  Search,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle
} from 'lucide-react';

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<CourseSyllabus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [notice, setNotice] = useState<string | null>(null);

  // Modal View Syllabus state
  const [viewingCourse, setViewingCourse] = useState<CourseSyllabus | null>(null);

  // Modal Add / Edit Course state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Full-Stack Web Development');
  const [formHours, setFormHours] = useState('45');
  const [formDescription, setFormDescription] = useState('');
  const [modules, setModules] = useState<CourseModule[]>([
    { module_number: 1, title: 'Introduction & Fundamentals', topics: ['Basic Concepts', 'Environment Setup'] },
  ]);
  const [saving, setSaving] = useState(false);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/syllabus');
      const data = await res.json();
      if (data.success) {
        setCourses(data.courses || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const categories = Array.from(new Set(courses.map((c) => c.category))).filter(Boolean);

  const filteredCourses = courses.filter((c) => {
    if (selectedCategory !== 'all' && c.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleDeleteCourse = async (courseId: string, courseName: string) => {
    if (!window.confirm(`Are you sure you want to delete course "${courseName}"?`)) return;
    try {
      const res = await fetch(`/api/syllabus?id=${courseId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setNotice(`🗑️ Course "${courseName}" deleted successfully!`);
        fetchCourses();
        setTimeout(() => setNotice(null), 3000);
      } else {
        alert(data.error || 'Failed to delete course');
      }
    } catch {
      alert('Error deleting course');
    }
  };

  const handleOpenAddModal = () => {
    setEditingCourseId(null);
    setFormName('');
    setFormCategory(categories[0] || 'Full-Stack Web Development');
    setFormHours('45');
    setFormDescription('');
    setModules([
      { module_number: 1, title: 'Module 1: Introduction & Fundamentals', topics: ['Core Concepts', 'Environment Setup'] },
    ]);
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (c: CourseSyllabus) => {
    setEditingCourseId(c.id);
    setFormName(c.name);
    setFormCategory(c.category);
    setFormHours(String(c.default_hours || 45));
    setFormDescription(c.description || '');
    setModules(c.modules && c.modules.length > 0 ? c.modules : [
      { module_number: 1, title: 'Module 1: Fundamentals', topics: ['Core Concepts'] },
    ]);
    setIsFormOpen(true);
  };

  const handleAddModule = () => {
    const nextNum = modules.length + 1;
    setModules([
      ...modules,
      { module_number: nextNum, title: `Module ${nextNum}: New Topic Section`, topics: ['Topic 1'] },
    ]);
  };

  const handleRemoveModule = (index: number) => {
    setModules(modules.filter((_, i) => i !== index));
  };

  const handleModuleTitleChange = (index: number, title: string) => {
    const copy = [...modules];
    copy[index].title = title;
    setModules(copy);
  };

  const handleModuleTopicsChange = (index: number, text: string) => {
    const copy = [...modules];
    copy[index].topics = text.split('\n').map((t) => t.trim()).filter(Boolean);
    setModules(copy);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setSaving(true);
    try {
      const payload = {
        id: editingCourseId || undefined,
        name: formName.trim(),
        category: formCategory.trim(),
        default_hours: Number(formHours) || 40,
        description: formDescription.trim(),
        modules,
      };

      const res = await fetch('/api/syllabus', {
        method: editingCourseId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setIsFormOpen(false);
        setNotice(editingCourseId ? '✅ Course updated successfully!' : '🎉 New Course added successfully!');
        fetchCourses();
        setTimeout(() => setNotice(null), 3000);
      } else {
        alert(data.error || 'Failed to save course');
      }
    } catch {
      alert('Error saving course');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
            <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-600">
              ACADEMIC MANAGEMENT
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            📚 Course & Syllabus HQ
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Manage training syllabuses, modules, teaching hours, and course categories.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:opacity-95 text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add New Course
        </button>
      </div>

      {notice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search courses, technologies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Courses ({courses.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 font-medium text-xs">
          Loading courses & syllabuses...
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 border border-slate-200 text-center space-y-3">
          <div className="text-4xl">📚</div>
          <h3 className="text-base font-extrabold text-slate-800">No Courses Found</h3>
          <p className="text-xs text-slate-500">Try adjusting your search query or add a new course.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map((course) => {
            const totalTopics = (course.modules || []).reduce(
              (acc, m) => acc + (m.topics?.length || 0),
              0
            );

            return (
              <div
                key={course.id}
                className="rounded-3xl bg-white p-6 shadow-xs border border-slate-200 space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                      {course.category}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-500 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-indigo-500" />
                      {course.default_hours || 40} hrs
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-snug">
                      {course.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                      {course.description || 'Comprehensive syllabus designed for industry job requirements.'}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-indigo-600" />
                      {course.modules?.length || 0} Modules
                    </span>
                    <span className="text-slate-400 font-semibold font-mono">
                      {totalTopics} Total Topics
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => setViewingCourse(course)}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5" /> View Syllabus
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(course)}
                    className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    title="Edit Course"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCourse(course.id, course.name)}
                    className="p-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs transition-colors cursor-pointer"
                    title="Delete Course"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: View Syllabus Details */}
      {viewingCourse && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setViewingCourse(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                  {viewingCourse.category} • {viewingCourse.default_hours} Hours
                </span>
                <h2 className="text-lg font-extrabold">{viewingCourse.name}</h2>
              </div>
              <button
                onClick={() => setViewingCourse(null)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <p className="text-xs text-slate-600">{viewingCourse.description}</p>

              <div className="space-y-3">
                <h3 className="font-extrabold text-sm text-slate-900">
                  Modules & Topics ({viewingCourse.modules?.length || 0})
                </h3>

                {(viewingCourse.modules || []).map((m, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-extrabold text-xs text-indigo-900 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px]">
                        {m.module_number}
                      </span>
                      <span>{m.title}</span>
                    </div>
                    <ul className="pl-7 space-y-1 text-xs text-slate-600 list-disc">
                      {(m.topics || []).map((t, tIdx) => (
                        <li key={tIdx}>{t}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
              <button
                onClick={() => setViewingCourse(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 font-bold text-xs text-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add or Edit Course */}
      {isFormOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setIsFormOpen(false)}
        >
          <div
            className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between">
              <h2 className="text-base font-extrabold flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {editingCourseId ? '✏️ Edit Course Syllabus' : '➕ Add New Course & Syllabus'}
              </h2>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px]">
                    Course Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Next.js 15 & React Mastery"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px]">
                    Default Hours *
                  </label>
                  <input
                    type="number"
                    required
                    min="10"
                    max="300"
                    value={formHours}
                    onChange={(e) => setFormHours(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px]">
                  Category *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Full-Stack Web Development, Database & Analytics..."
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px]">
                  Short Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of syllabus objectives and target skillset..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Modules Editor */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-indigo-600" />
                    Syllabus Modules & Topics ({modules.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddModule}
                    className="px-3 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Module
                  </button>
                </div>

                <div className="space-y-3">
                  {modules.map((mod, mIdx) => (
                    <div key={mIdx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="h-6 w-6 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          {mIdx + 1}
                        </span>
                        <input
                          type="text"
                          required
                          placeholder={`Module ${mIdx + 1} Title`}
                          value={mod.title}
                          onChange={(e) => handleModuleTitleChange(mIdx, e.target.value)}
                          className="flex-1 rounded-lg border border-slate-300 bg-white p-2 font-bold text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                        />
                        {modules.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveModule(mIdx)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                            title="Remove Module"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-1 pl-8">
                        <label className="text-[10px] text-slate-500 font-bold uppercase">
                          Topics (One per line)
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Topic 1&#10;Topic 2&#10;Topic 3..."
                          value={(mod.topics || []).join('\n')}
                          onChange={(e) => handleModuleTopicsChange(mIdx, e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingCourseId ? 'Save Changes' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
