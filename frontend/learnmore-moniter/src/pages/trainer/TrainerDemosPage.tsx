import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredUser } from '@/lib/auth';
import { User } from '@/lib/types';
import {
  Video,
  Search,
  Filter,
  CheckCircle2,
  ExternalLink,
  UserCheck,
  Calendar,
  Building2,
  GraduationCap,
  Sparkles,
  Phone,
  Mail,
  User as UserIcon,
  RefreshCw
} from 'lucide-react';

interface DemoMeeting {
  id: number;
  title: string;
  meeting_link: string;
  scheduled_time: string;
  notes?: string;
  trainer_name?: string;
}

export default function TrainerDemosPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [demoMeetings, setDemoMeetings] = useState<DemoMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  const fetchDemos = async (u: User) => {
    setLoading(true);
    try {
      const searchName = u.name || u.username || 'test';
      const searchEmail = u.email || '';
      const url = `/api/external/trainer-meetings/?name=${encodeURIComponent(searchName)}${searchEmail ? `&email=${encodeURIComponent(searchEmail)}` : ''}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setDemoMeetings(data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch demo meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      navigate('/login', { replace: true });
      return;
    }
    setUser(u);
    fetchDemos(u);
  }, [navigate]);

  const parsedMeetings = useMemo(() => {
    return demoMeetings.map(m => {
      const kvMap: Record<string, string> = {};
      if (m.notes) {
        m.notes.split(/\r?\n/).forEach(line => {
          const parts = line.split(':');
          const k = parts[0]?.trim();
          const v = parts.slice(1).join(':').trim();
          if (k && v) {
            kvMap[k.toLowerCase()] = v;
          }
        });
      }

      const isJoined = (kvMap['status'] || '').toLowerCase() === 'joined';
      const statusVal = kvMap['status'] || 'Scheduled';
      const branchVal = kvMap['branch'] || 'General';

      return {
        ...m,
        kvMap,
        isJoined,
        statusVal,
        branchVal,
        studentName: kvMap['student name'] || m.title.replace('Demo:', '').trim(),
        courseName: kvMap['course'] || 'N/A',
        counsellorName: kvMap['assign counsellor'] || 'N/A',
        mobile: kvMap['mobile'] || 'N/A',
        email: kvMap['email'] || 'N/A',
        trainingMode: kvMap['training mode'] || 'N/A',
        city: kvMap['city'] || 'N/A',
        source: kvMap['source'] || 'N/A',
        nextFollowup: kvMap['next follow-up'] || 'N/A'
      };
    });
  }, [demoMeetings]);

  const DEFAULT_BRANCHES = ["Kalyan Nagar", "BTM", "Marathahalli", "Online"];

  const availableBranches = useMemo(() => {
    const set = new Set<string>(DEFAULT_BRANCHES);
    parsedMeetings.forEach(pm => {
      if (pm.branchVal && pm.branchVal !== 'N/A') set.add(pm.branchVal);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [parsedMeetings]);

  const filteredMeetings = useMemo(() => {
    return parsedMeetings.filter(item => {
      const matchSearch =
        search === '' ||
        item.studentName.toLowerCase().includes(search.toLowerCase()) ||
        item.mobile.toLowerCase().includes(search.toLowerCase()) ||
        item.courseName.toLowerCase().includes(search.toLowerCase()) ||
        item.counsellorName.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'joined' && item.isJoined) ||
        (statusFilter === 'not_joined' && !item.isJoined) ||
        item.statusVal.toLowerCase() === statusFilter.toLowerCase();

      const matchBranch =
        branchFilter === 'all' ||
        item.branchVal.toLowerCase() === branchFilter.toLowerCase();

      return matchSearch && matchStatus && matchBranch;
    });
  }, [parsedMeetings, search, statusFilter, branchFilter]);

  const totalCount = parsedMeetings.length;
  const joinedCount = parsedMeetings.filter(m => m.isJoined).length;
  const conversionRate = totalCount > 0 ? ((joinedCount / totalCount) * 100).toFixed(1) : '0.0';

  return (
    <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white font-bold text-xs">
            <Sparkles className="w-3.5 h-3.5" /> Demo & Conversion Analytics
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Assigned Demo History
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 max-w-xl">
            View all demo sessions assigned to you, track student details, counsellor info, and live student admission/joined status.
          </p>
        </div>

        <button
          onClick={() => user && fetchDemos(user)}
          className="px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Demos Assigned
            </div>
            <div className="text-3xl font-extrabold text-slate-800">{totalCount}</div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 font-bold text-xl">
            <Video className="w-6 h-6" />
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Joined / Converted Students
            </div>
            <div className="text-3xl font-extrabold text-emerald-600">{joinedCount}</div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 font-bold text-xl">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Demo Conversion Rate
            </div>
            <div className="text-3xl font-extrabold text-purple-600">{conversionRate}%</div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 font-bold text-xl">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, course, counsellor, or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="joined">✓ Joined Students Only</option>
              <option value="not_joined">Pending / Follow-up Only</option>
              <option value="today">Today Status</option>
              <option value="in progress">In Progress</option>
            </select>
          </div>

          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Branches</option>
            {availableBranches.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl bg-white p-12 text-center text-slate-400 space-y-2 border border-slate-200">
          <div className="animate-spin text-2xl font-bold">↻</div>
          <p className="text-xs font-bold">Loading your demo records...</p>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center text-slate-400 space-y-2 border border-slate-200">
          <div className="text-3xl">🎥</div>
          <h3 className="text-sm font-extrabold text-slate-800">No Demo Records Found</h3>
          <p className="text-xs max-w-sm mx-auto">
            Try adjusting your search or filter options.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredMeetings.map((m) => (
            <div
              key={m.id}
              className={`rounded-3xl bg-white p-6 shadow-sm border space-y-4 flex flex-col justify-between transition-all hover:shadow-md ${
                m.isJoined ? 'border-emerald-300 ring-2 ring-emerald-500/10' : 'border-slate-200 hover:border-indigo-300'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Student Name
                    </span>
                    <h3 className="font-black text-xl text-slate-900 leading-tight">
                      {m.studentName}
                    </h3>
                  </div>

                  {m.isJoined ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-500 text-white font-extrabold text-xs shadow-sm animate-pulse">
                      <CheckCircle2 className="w-3.5 h-3.5" /> JOINED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs">
                      {m.statusVal}
                    </span>
                  )}
                </div>

                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="flex flex-col bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <GraduationCap className="w-3 h-3 text-indigo-500" /> Course
                    </span>
                    <span className="font-bold text-slate-800 text-xs truncate mt-0.5" title={m.courseName}>
                      {m.courseName}
                    </span>
                  </div>

                  <div className="flex flex-col bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <UserIcon className="w-3 h-3 text-blue-500" /> Counsellor
                    </span>
                    <span className="font-bold text-slate-800 text-xs truncate mt-0.5" title={m.counsellorName}>
                      {m.counsellorName}
                    </span>
                  </div>

                  <div className="flex flex-col bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-purple-500" /> Branch
                    </span>
                    <span className="font-bold text-slate-800 text-xs truncate mt-0.5" title={m.branchVal}>
                      {m.branchVal}
                    </span>
                  </div>

                  <div className="flex flex-col bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-500" /> Mobile
                    </span>
                    <span className="font-bold text-slate-800 text-xs truncate mt-0.5" title={m.mobile}>
                      {m.mobile}
                    </span>
                  </div>

                  <div className="flex flex-col bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-rose-500" /> Email
                    </span>
                    <span className="font-bold text-slate-800 text-xs truncate mt-0.5" title={m.email}>
                      {m.email}
                    </span>
                  </div>

                  <div className="flex flex-col bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-500" /> Demo Time
                    </span>
                    <span className="font-bold text-slate-800 text-xs truncate mt-0.5">
                      {new Date(m.scheduled_time).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              {m.meeting_link && (
                <div className="pt-2">
                  <a
                    href={m.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all transform active:scale-[0.99]"
                  >
                    <Video className="w-4 h-4" />
                    <span>Join Meeting Now</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
