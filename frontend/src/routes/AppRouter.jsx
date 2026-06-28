import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";
import { Box, CircularProgress } from "@mui/material";

const LoginPage = lazy(() => import("../pages/auth/LoginPage"));
const NotFoundPage = lazy(() => import("../pages/errors/NotFoundPage"));
const UnauthorizedPage = lazy(() => import("../pages/errors/UnauthorizedPage"));
const DashboardLayout = lazy(() => import("../layouts/DashboardLayout"));
const AdminDashboard = lazy(() => import("../pages/dashboard/AdminDashboard"));
const TeacherDashboard = lazy(
  () => import("../pages/dashboard/TeacherDashboard"),
);
const ClassListPage = lazy(() => import("../pages/classes/ClassListPage"));
const TeacherListPage = lazy(() => import("../pages/teachers/TeacherListPage"));
const StudentListPage = lazy(() => import("../pages/students/StudentListPage"));
const StudentDetailPage = lazy(
  () => import("../pages/students/StudentDetailPage"),
);
const SessionManagePage = lazy(
  () => import("../pages/sessions/SessionManagePage"),
);
const SettingsPage = lazy(() => import("../pages/settings/SettingsPage"));
const MarkAttendancePage = lazy(
  () => import("../pages/attendance/MarkAttendancePage"),
);
const AttendanceHistoryPage = lazy(
  () => import("../pages/attendance/AttendanceHistoryPage"),
);
const HolidayManagePage = lazy(
  () => import("../pages/holidays/HolidayManagePage"),
);
const NotificationsPage = lazy(
  () => import("../pages/notifications/NotificationsPage"),
);
const ReportsPage = lazy(() => import("../pages/reports/ReportsPage"));
const AnalyticsDashboard = lazy(
  () => import("../pages/analytics/AnalyticsDashboard"),
);
const ActivityLogPage = lazy(() => import("../pages/activity/ActivityLogPage"));
const PromotionPage = lazy(() => import("../pages/promotion/PromotionPage"));

// ─── NEW: Teacher Profile Page ───
const TeacherProfilePage = lazy(
  () => import("../pages/profile/TeacherProfilePage"),
);

const Loader = () => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
    }}
  >
    <CircularProgress size={48} />
  </Box>
);

const routerFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

const AppRouter = () => (
  <BrowserRouter future={routerFutureFlags}>
    <Suspense fallback={<Loader />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Dashboards */}
          <Route
            path="dashboard"
            element={
              <RoleRoute roles={["admin"]}>
                <AdminDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="teacher/dashboard"
            element={
              <RoleRoute roles={["teacher"]}>
                <TeacherDashboard />
              </RoleRoute>
            }
          />

          {/* ─── PROFILE — Both admin & teacher ─── */}
          <Route path="profile" element={<TeacherProfilePage />} />

          {/* Management */}
          <Route path="classes" element={<ClassListPage />} />
          <Route
            path="teachers"
            element={
              <RoleRoute roles={["admin"]}>
                <TeacherListPage />
              </RoleRoute>
            }
          />
          <Route path="students" element={<StudentListPage />} />
          <Route path="students/:id" element={<StudentDetailPage />} />
          <Route
            path="sessions"
            element={
              <RoleRoute roles={["admin"]}>
                <SessionManagePage />
              </RoleRoute>
            }
          />
          <Route
            path="settings"
            element={
              <RoleRoute roles={["admin"]}>
                <SettingsPage />
              </RoleRoute>
            }
          />

          {/* Attendance */}
          <Route path="attendance/mark" element={<MarkAttendancePage />} />
          <Route
            path="attendance/history"
            element={<AttendanceHistoryPage />}
          />

          {/* Holidays */}
          <Route path="holidays" element={<HolidayManagePage />} />

          {/* Reports & Analytics */}
          <Route path="reports" element={<ReportsPage />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />

          {/* Notifications — Both admin & teacher (per role-based filtering) */}
          <Route path="notifications" element={<NotificationsPage />} />

          {/* Activity Logs — Admin only */}
          <Route
            path="activity-logs"
            element={
              <RoleRoute roles={["admin"]}>
                <ActivityLogPage />
              </RoleRoute>
            }
          />

          <Route
            path="promotion"
            element={
              <RoleRoute roles={["admin"]}>
                <PromotionPage />
              </RoleRoute>
            }
          />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default AppRouter;
