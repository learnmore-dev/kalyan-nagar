import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearStoredUser, getStoredUser } from '@/lib/auth';
import { djangoFetch } from '@/lib/djangoClient';
import { User } from '@/lib/types';
import {
  LayoutDashboard,
  BookOpen,
  Camera,
  PlusCircle,
  CheckSquare,
  CalendarDays,
  LogOut,
  Menu,
  X,
  Video,
  ChevronRight,
  Zap,
} from 'lucide-react';

const TRAINER_PREFETCH_MAP: Record<string, string[]> = {
  '/trainer/dashboard':    ['/api/batches/', '/api/leaves', '/api/sessions'],
  '/trainer/demos':        ['/api/batches/'],
  '/trainer/batches':      ['/api/batches/'],
  '/trainer/attendance':   ['/api/attendance/'],
  '/trainer/sessions/add': ['/api/batches/', '/api/courses'],
  '/trainer/tasks':        ['/api/tasks', '/api/syllabus'],
  '/trainer/leaves':       ['/api/leaves'],
};

const NAV_GROUPS = [
  {
    label: 'Overview',
    links: [
      { href: '/trainer/dashboard', label: 'Overview',         icon: LayoutDashboard },
      { href: '/trainer/demos',     label: 'My Demos & Joined', icon: Video },
    ],
  },
  {
    label: 'Teaching',
    links: [
      { href: '/trainer/batches',      label: 'My Batches',      icon: BookOpen },
      { href: '/trainer/attendance',   label: 'Mark Attendance', icon: Camera },
      { href: '/trainer/sessions/add', label: 'Log Work Session', icon: PlusCircle },
      { href: '/trainer/tasks',        label: 'Tasks & Syllabus', icon: CheckSquare },
    ],
  },
  {
    label: 'HR & Leave',
    links: [
      { href: '/trainer/leaves', label: 'My Leaves', icon: CalendarDays },
    ],
  },
];

export default function TrainerSidebar() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [currentUser, setCurrentUser]   = useState<User | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<{
    batchId: string; batchName: string; url: string;
  } | null>(null);

  useEffect(() => {
    setCurrentUser(getStoredUser());

    const checkActiveMeeting = () => {
      try {
        const raw = localStorage.getItem('active_live_meeting');
        setActiveMeeting(raw ? JSON.parse(raw) : null);
      } catch {
        setActiveMeeting(null);
      }
    };

    checkActiveMeeting();
    const interval = setInterval(checkActiveMeeting, 3000);
    return () => clearInterval(interval);
  }, []);

  const prefetchRouteData = (href: string) => {
    const endpoints = TRAINER_PREFETCH_MAP[href];
    if (endpoints) endpoints.forEach((p) => djangoFetch(p).catch(() => {}));
  };

  const handleLogout = () => {
    clearStoredUser();
    navigate('/login');
  };

  const userName = currentUser?.name || 'Faculty Trainer';
  const initial  = userName.charAt(0).toUpperCase();

  const isActive = (href: string) =>
    location.pathname === href ||
    (href === '/trainer/dashboard' && location.pathname === '/trainer');

  /* ── Shared nav content (reused in both desktop & mobile) ── */
  const NavContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <>
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
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
                  onClick={onLinkClick}
                  onMouseEnter={() => prefetchRouteData(item.href)}
                  onFocus={() => prefetchRouteData(item.href)}
                  className="sidebar-link group"
                  style={active ? {
                    color: '#ffffff',
                    background: 'rgba(37,99,235,0.75)',
                    boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                  } : {}}
                >
                  <Icon className="sidebar-icon"
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
    </>
  );

  /* ── Live meeting alert widget ─────────────────────────────── */
  const LiveMeetingAlert = ({ onLinkClick }: { onLinkClick?: () => void }) =>
    activeMeeting ? (
      <div className="mx-1 mb-2 p-3 rounded-xl space-y-2 shrink-0 animate-pulse"
           style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-rose-400 animate-ping" />
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-300">
            Live Class Active
          </span>
        </div>
        <p className="text-[11px] font-semibold text-slate-200 line-clamp-1">
          {activeMeeting.batchName}
        </p>
        <Link
          to={activeMeeting.url}
          onClick={onLinkClick}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-white font-bold text-[11px] transition-colors"
          style={{ background: 'rgba(239,68,68,0.8)' }}
        >
          <Video className="w-3.5 h-3.5" />
          Return to Class
        </Link>
      </div>
    ) : null;

  /* ── User / logout footer ──────────────────────────────────── */
  const UserFooter = () => (
    <div className="shrink-0 px-3 pb-4 pt-2"
         style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-2"
           style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white"
             style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold text-white truncate leading-tight">{userName}</div>
          <div className="text-[10px] text-blue-400 font-medium">Faculty Trainer</div>
        </div>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgba(148,163,184,0.4)' }} />
      </div>
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-semibold cursor-pointer transition-all"
        style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
      >
        <LogOut className="h-3.5 w-3.5 shrink-0" />
        Sign Out
      </button>
    </div>
  );

  return (
    <>
      {/* ════════════════════════════════════════
          MOBILE — sticky top bar
         ════════════════════════════════════════ */}
      <div className="lg:hidden w-full sticky top-0 z-40 flex items-center justify-between px-4 py-3"
           style={{ background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white font-black text-[11px]"
               style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}>
            LT
          </div>
          <span className="font-bold text-sm text-white tracking-tight">Learnmore</span>
          {activeMeeting && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-rose-300"
                  style={{ background: 'rgba(239,68,68,0.15)' }}>
              <Zap className="h-3 w-3" /> LIVE
            </span>
          )}
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-lg transition-colors"
          style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}
          aria-label="Toggle Navigation"
        >
          {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* ════════════════════════════════════════
          MOBILE — slide-in drawer
         ════════════════════════════════════════ */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => setIsMobileOpen(false)}
        >
          <div
            className="w-[240px] max-w-[85vw] h-full flex flex-col overflow-y-auto"
            style={{ background: '#0f172a' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 shrink-0"
                 style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white font-black text-[11px]"
                     style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}>
                  LT
                </div>
                <div>
                  <div className="text-[13px] font-bold text-white">Learnmore</div>
                  <div className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide">Trainer Portal</div>
                </div>
              </div>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: '#64748b' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Live meeting alert */}
            <div className="px-3 pt-3">
              <LiveMeetingAlert onLinkClick={() => setIsMobileOpen(false)} />
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              <NavContent onLinkClick={() => setIsMobileOpen(false)} />
            </nav>

            <UserFooter />
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          DESKTOP — fixed left sidebar
         ════════════════════════════════════════ */}
      <aside className="w-[220px] shrink-0 hidden lg:flex flex-col h-screen sticky top-0 overflow-hidden"
             style={{ background: 'var(--sidebar-bg)' }}>

        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white font-black text-[11px] shrink-0"
               style={{ background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', boxShadow: '0 2px 8px rgba(37,99,235,0.45)' }}>
            LT
          </div>
          <div className="leading-tight min-w-0">
            <div className="text-[13px] font-bold text-white truncate tracking-tight">Learnmore</div>
            <div className="text-[10px] font-semibold text-blue-400 tracking-wide uppercase">Trainer Portal</div>
          </div>
        </div>

        {/* Live meeting alert */}
        <div className="px-3">
          <LiveMeetingAlert />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-5" style={{ scrollbarWidth: 'none' }}>
          <NavContent />
        </nav>

        <UserFooter />
      </aside>
    </>
  );
}
