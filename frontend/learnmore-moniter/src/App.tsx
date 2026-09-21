import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getStoredUser } from '@/lib/auth';

// Layouts & Guards
import AdminLayout from '@/components/AdminLayout';
import TrainerLayout from '@/components/TrainerLayout';
import AdminGuard from '@/components/AdminGuard';
import TrainerGuard from '@/components/TrainerGuard';

// Auth
import LoginPage from '@/pages/login/LoginPage';

// Admin Pages
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminAttendancePage from '@/pages/admin/AdminAttendancePage';
import AdminBatchesPage from '@/pages/admin/AdminBatchesPage';
import AdminCreateBatchPage from '@/pages/admin/AdminCreateBatchPage';
import AdminCoursesPage from '@/pages/admin/AdminCoursesPage';
import AdminHolidaysPage from '@/pages/admin/AdminHolidaysPage';
import AdminLeavesPage from '@/pages/admin/AdminLeavesPage';
import AdminLecturesPage from '@/pages/admin/AdminLecturesPage';
import AdminLiveMonitorPage from '@/pages/admin/AdminLiveMonitorPage';
import AdminMonitoringPage from '@/pages/admin/AdminMonitoringPage';
import AdminReportsPage from '@/pages/admin/AdminReportsPage';
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';
import AdminTrainersPage from '@/pages/admin/AdminTrainersPage';
import AdminTrainerDetailPage from '@/pages/admin/AdminTrainerDetailPage';
import AdminBatchDetailPage from '@/pages/admin/AdminBatchDetailPage';
import AdminCreateUserPage from '@/pages/admin/AdminCreateUserPage';
import AdminTrainerTimelinePage from '@/pages/admin/AdminTrainerTimelinePage';
import AdminWhatsAppPage from '@/pages/admin/AdminWhatsAppPage';

// Trainer Pages
import TrainerDashboardPage from '@/pages/trainer/TrainerDashboardPage';
import TrainerAttendancePage from '@/pages/trainer/TrainerAttendancePage';
import TrainerBatchesPage from '@/pages/trainer/TrainerBatchesPage';
import TrainerBatchDetailPage from '@/pages/trainer/TrainerBatchDetailPage';
import TrainerDemosPage from '@/pages/trainer/TrainerDemosPage';
import TrainerLeavesPage from '@/pages/trainer/TrainerLeavesPage';
import TrainerLiveClassPage from '@/pages/trainer/TrainerLiveClassPage';
import TrainerTasksPage from '@/pages/trainer/TrainerTasksPage';
import TrainerAddSessionPage from '@/pages/trainer/TrainerAddSessionPage';

// Live Join Page
import StudentDirectJoinPage from '@/pages/live/LiveJoinPage';

function RootRedirect() {
  const user = getStoredUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/trainer" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root Redirect */}
        <Route path="/" element={<RootRedirect />} />

        {/* Public / Auth */}
        <Route path="/login" element={<LoginPage />} />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdminLayout />
            </AdminGuard>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="attendance" element={<AdminAttendancePage />} />
          <Route path="batches" element={<AdminBatchesPage />} />
          <Route path="batches/:id" element={<AdminBatchDetailPage />} />
          <Route path="batches/create" element={<AdminCreateBatchPage />} />
          <Route path="courses" element={<AdminCoursesPage />} />
          <Route path="holidays" element={<AdminHolidaysPage />} />
          <Route path="leaves" element={<AdminLeavesPage />} />
          <Route path="lectures" element={<AdminLecturesPage />} />
          <Route path="live-monitor" element={<AdminLiveMonitorPage />} />
          <Route path="monitoring" element={<Navigate to="/admin/trainer-timeline" replace />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="trainers" element={<AdminTrainersPage />} />
          <Route path="trainers/create" element={<AdminCreateUserPage />} />
          <Route path="users/create" element={<AdminCreateUserPage />} />
          <Route path="trainer-timeline" element={<AdminTrainerTimelinePage />} />
          <Route path="trainers/:id" element={<AdminTrainerDetailPage />} />
          <Route path="whatsapp" element={<AdminWhatsAppPage />} />
        </Route>

        {/* Trainer Routes */}
        <Route
          path="/trainer"
          element={
            <TrainerGuard>
              <TrainerLayout />
            </TrainerGuard>
          }
        >
          <Route index element={<TrainerDashboardPage />} />
          <Route path="dashboard" element={<TrainerDashboardPage />} />
          <Route path="attendance" element={<TrainerAttendancePage />} />
          <Route path="batches" element={<TrainerBatchesPage />} />
          <Route path="batches/:id" element={<TrainerBatchDetailPage />} />
          <Route path="demos" element={<TrainerDemosPage />} />
          <Route path="leaves" element={<TrainerLeavesPage />} />
          <Route path="live-class" element={<TrainerLiveClassPage />} />
          <Route path="tasks" element={<TrainerTasksPage />} />
          <Route path="add-session" element={<TrainerAddSessionPage />} />
          <Route path="sessions/add" element={<TrainerAddSessionPage />} />
        </Route>

        {/* Live Join Route */}
        <Route path="/live/join/:batchId" element={<StudentDirectJoinPage />} />
        <Route path="/live/join" element={<StudentDirectJoinPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
