import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearStoredUser, getStoredUser } from '@/lib/auth';
import { djangoFetch } from '@/lib/djangoClient';
import { User } from '@/lib/types';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Camera,
  Clock,
  FileBarChart2,
  CalendarDays,
  Calendar,
  MessageSquare,
  Radio,
  Settings,
  LogOut,
  GraduationCap,
  Video,
  ChevronRight,
  Activity,
} from 'lucide-react';

const PREFETCH_MAP: Record<string, string[]> = {
  '/admin/dashboard':   ['/api/batches/', '/api/leaves', '/api/sessions', '/api/live-activity'],
  '/admin/courses':     ['/api/courses', '/api/syllabus'],
  '/admin/batches':     ['/api/batches/', '/api/courses', '/api/users?role=trainer'],
  '/admin/lectures':    ['/api/batches/'],
  '/admin/trainers':    ['/api/users?role=trainer'],
  '/admin/attendance':  ['/api/attendance/', '/api/users?role=trainer'],
  '/admin/monitoring':  ['/api/monitoring/snapshot'],
  '/admin/reports':     ['/api/attendance/', '/api/leaves'],
  '/admin/leaves':      ['/api/leaves'],
  '/admin/holidays':    ['/api/holidays'],
  '/admin/whatsapp':    ['/api/whatsapp'],
  '/admin/live-monitor':['/api/live-activity'],
};

// Nav groups for visual separation
const NAV_GROUPS = [
  {
    label: 'Overview',
    links: [
      { href: '/admin/dashboard', label: 'Overview',        icon: LayoutDashboard },
    ],
  },
  {
    label: 'Academic',
    links: [
      { href: '/admin/courses',   label: 'Courses & Syllabus', icon: GraduationCap },
      { href: '/admin/batches',   label: 'Batches',            icon: BookOpen },
      { href: '/admin/lectures',  label: 'Live & Lectures',    icon: Video },
    ],
  },
  {
    label: 'Faculty',
    links: [
      { href: '/admin/trainers',    label: 'Trainers',        icon: Users },
      { href: '/admin/attendance',  label: 'Attendance',      icon: Camera },
      { href: '/admin/live-monitor',label: 'Radar',           icon: Radio },
      { href: '/admin/trainer-timeline', label: 'Timeline',   icon: Activity },
    ],
  },
  {
    label: 'Administration',
    links: [
      { href: '/admin/reports',   label: 'Reports',          icon: FileBarChart2 },
      { href: '/admin/leaves',    label: 'Leaves',           icon: CalendarDays },
      { href: '/admin/holidays',  label: 'Holidays',         icon: Calendar },
      { href: '/admin/whatsapp',  label: 'WhatsApp Hub',     icon: MessageSquare },
      { href: '/admin/settings',  label: 'Institute Settings', icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate  = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, []);

  const prefetchRouteData = (href: string) => {
    const endpoints = PREFETCH_MAP[href];
    if (endpoints) {
      endpoints.forEach((path) => {
        djangoFetch(path).catch(() => {});
      });
    }
  };

  const handleLogout = () => {
    clearStoredUser();
    navigate('/login');
  };

  const userName  = currentUser?.name || 'Admin';
  const userRole  = currentUser?.role === 'admin' ? 'Super Admin' : 'Trainer';
  const initial   = userName.charAt(0).toUpperCase();

  const isActive = (href: string) =>
    location.pathname === href ||
    (href === '/admin/dashboard' && location.pathname === '/admin');

  return (
    <aside className="w-[220px] shrink-0 hidden lg:flex flex-col h-screen sticky top-0 overflow-hidden"
           style={{ background: 'var(--sidebar-bg)' }}>

      {/* ── Brand ────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-5 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white font-black text-[11px] shrink-0"
             style={{ background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', boxShadow: '0 2px 8px rgba(37,99,235,0.45)' }}>
          LT
        </div>
        <div className="leading-tight min-w-0">
          <div className="text-[13px] font-bold text-white truncate tracking-tight">Learnmore</div>
          <div className="text-[10px] font-semibold text-blue-400 tracking-wide uppercase">Technologies</div>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-5" style={{ scrollbarWidth: 'none' }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {/* Group label */}
            <div className="px-2 mb-1.5 text-[9px] font-bold uppercase tracking-widest"
                 style={{ color: 'rgba(148,163,184,0.5)' }}>
              {group.label}
            </div>

            <div className="space-y-0.5">
              {group.links.map((item) => {
                const Icon   = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onMouseEnter={() => prefetchRouteData(item.href)}
                    onFocus={() => prefetchRouteData(item.href)}
                    className="sidebar-link group"
                    style={active ? {
                      color: '#ffffff',
                      background: 'rgba(37,99,235,0.75)',
                      boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                    } : {}}
                    data-active={active}
                  >
                    <Icon className={`sidebar-icon ${active ? 'text-white' : ''}`}
                          style={active ? { color: 'rgba(255,255,255,0.9)' } : {}} />
                    <span className="flex-1 text-[12px] truncate">{item.label}</span>
                    {active && (
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-300 shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── User profile ─────────────────────────── */}
      <div className="shrink-0 px-3 pb-4 pt-2"
           style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>

        {/* User card */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-2"
             style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white"
               style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-white truncate leading-tight">{userName}</div>
            <div className="text-[10px] text-blue-400 font-medium">{userRole}</div>
          </div>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(148,163,184,0.4)' }} />
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-semibold cursor-pointer transition-all"
          style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
