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
const TeacherProfilePage = lazy(
  () => import("../pages/profile/TeacherProfilePage"),
);

// ─── NEW: Backup Page ───
const BackupPage = lazy(() => import("../pages/backup/BackupPage"));

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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />

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

          <Route path="profile" element={<TeacherProfilePage />} />

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

          <Route path="attendance/mark" element={<MarkAttendancePage />} />
          <Route
            path="attendance/history"
            element={<AttendanceHistoryPage />}
          />

          <Route path="holidays" element={<HolidayManagePage />} />

          <Route path="reports" element={<ReportsPage />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />

          <Route path="notifications" element={<NotificationsPage />} />

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

          {/* ─── NEW: Backup & Restore (Admin only) ─── */}
          <Route
            path="backup"
            element={
              <RoleRoute roles={["admin"]}>
                <BackupPage />
              </RoleRoute>
            }
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default AppRouter;
