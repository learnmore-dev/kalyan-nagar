import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Camera,
  Clock,
  FileBarChart2,
  CalendarDays,
  Calendar,
  MessageSquare,
  Radio,
  Shield,
  ChevronDown,
  GraduationCap,
  Video,
  Sparkles
} from 'lucide-react';
import WhatsAppBotModal from './WhatsAppBotModal';

export default function Navbar() {
  const location = useLocation();
  const pathname = location.pathname;
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);

  return (
    <header className="h-16 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Primary Navigation Tabs */}
      <nav className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
        <Link
          to="/admin/dashboard"
          className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all duration-200 shrink-0 transform-gpu active:scale-95 ${
            pathname === '/admin/dashboard' || pathname === '/admin'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="h-4 w-4" /> Overview
        </Link>

        <Link
          to="/admin/courses"
          className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all duration-200 shrink-0 transform-gpu active:scale-95 ${
            pathname.startsWith('/admin/courses')
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
          }`}
        >
          <GraduationCap className="h-4 w-4" /> Courses
        </Link>

        <Link
          to="/admin/batches"
          className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all duration-200 shrink-0 transform-gpu active:scale-95 ${
            pathname.startsWith('/admin/batches')
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
          }`}
        >
          <BookOpen className="h-4 w-4" /> Batches
        </Link>

        <Link
          to="/admin/lectures"
          className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all duration-200 shrink-0 transform-gpu active:scale-95 ${
            pathname.startsWith('/admin/lectures')
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
          }`}
        >
          <Video className="h-4 w-4" /> Live & Lectures
        </Link>

        <Link
          to="/admin/trainers"
          className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all duration-200 shrink-0 transform-gpu active:scale-95 ${
            pathname === '/admin/trainers'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
          }`}
        >
          <Users className="h-4 w-4" /> Trainers
        </Link>

        <Link
          to="/admin/attendance"
          className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all duration-200 shrink-0 transform-gpu active:scale-95 ${
            pathname === '/admin/attendance'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
          }`}
        >
          <Camera className="h-4 w-4" /> Attendance
        </Link>

        <Link
          to="/admin/monitoring"
          className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all duration-200 shrink-0 transform-gpu active:scale-95 ${
            pathname === '/admin/monitoring'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
          }`}
        >
          <Clock className="h-4 w-4" /> Login Monitor
        </Link>

        <Link
          to="/admin/reports"
          className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all duration-200 shrink-0 transform-gpu active:scale-95 ${
            pathname === '/admin/reports'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
          }`}
        >
          <FileBarChart2 className="h-4 w-4" /> Reports
        </Link>

        <Link
          to="/admin/leaves"
          className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all duration-200 shrink-0 transform-gpu active:scale-95 ${
            pathname === '/admin/leaves'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
          }`}
        >
          <CalendarDays className="h-4 w-4" /> Leaves
        </Link>

        <Link
          to="/admin/holidays"
          className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all duration-200 shrink-0 transform-gpu active:scale-95 ${
            pathname === '/admin/holidays'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
          }`}
        >
          <Calendar className="h-4 w-4" /> Holidays
        </Link>

        {/* WhatsApp Green Button */}
        <Link
          to="/admin/whatsapp"
          className="px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-extrabold text-xs flex items-center gap-1.5 border border-emerald-200/80 transition-all shrink-0 cursor-pointer transform-gpu active:scale-95 shadow-xs"
        >
          <MessageSquare className="h-4 w-4 text-emerald-600" /> WhatsApp
        </Link>

        {/* Radar Pink Button */}
        <Link
          to="/admin/live-monitor"
          className="px-4 py-2 rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 font-extrabold text-xs flex items-center gap-1.5 border border-rose-200/80 transition-all shrink-0 cursor-pointer transform-gpu active:scale-95 shadow-xs"
        >
          <Radio className="h-4 w-4 text-rose-500 animate-pulse" /> Radar
        </Link>
      </nav>

      {/* Right Controls */}
      <div className="flex items-center gap-3 shrink-0">
        <button className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 text-blue-900 text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-xs">
          <Shield className="h-4 w-4 text-indigo-600" />
          <span>Institute Admin</span>
          <ChevronDown className="h-3.5 w-3.5 text-blue-500" />
        </button>

        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black flex items-center justify-center text-xs shadow-md">
          <Sparkles className="h-4 w-4" />
        </div>
      </div>

      <WhatsAppBotModal
        isOpen={isWaModalOpen}
        onClose={() => setIsWaModalOpen(false)}
      />
    </header>
  );
}
