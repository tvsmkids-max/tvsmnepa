import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";
import { Box, LinearProgress } from "@mui/material";

// ─── Auth ───
const LoginPage = lazy(() => import("../pages/auth/LoginPage"));
const NotFoundPage = lazy(() => import("../pages/errors/NotFoundPage"));
const UnauthorizedPage = lazy(() => import("../pages/errors/UnauthorizedPage"));

// ─── Layout ───
const DashboardLayout = lazy(() => import("../layouts/DashboardLayout"));

// ─── Dashboards ───
const AdminDashboard = lazy(() => import("../pages/dashboard/AdminDashboard"));
const TeacherDashboard = lazy(
  () => import("../pages/dashboard/TeacherDashboard"),
);

// ─── Profile ───
const TeacherProfilePage = lazy(
  () => import("../pages/profile/TeacherProfilePage"),
);

// ─── Management ───
const ClassListPage = lazy(() => import("../pages/classes/ClassListPage"));
const TeacherListPage = lazy(() => import("../pages/teachers/TeacherListPage"));
const StudentListPage = lazy(() => import("../pages/students/StudentListPage"));
const StudentDetailPage = lazy(
  () => import("../pages/students/StudentDetailPage"),
);

// ─── Section Shift ───
const ShiftPage = lazy(() => import("../pages/shift/ShiftPage"));

// ─── Sessions & Settings ───
const SessionManagePage = lazy(
  () => import("../pages/sessions/SessionManagePage"),
);
const SettingsPage = lazy(() => import("../pages/settings/SettingsPage"));

// ─── Attendance ───
const MarkAttendancePage = lazy(
  () => import("../pages/attendance/MarkAttendancePage"),
);
const AttendanceHistoryPage = lazy(
  () => import("../pages/attendance/AttendanceHistoryPage"),
);

// ─── Holidays ───
const HolidayManagePage = lazy(
  () => import("../pages/holidays/HolidayManagePage"),
);

// ─── Reports ───
const DailyReportPage = lazy(() => import("../pages/reports/DailyReportPage"));
const MonthlyReportPage = lazy(
  () => import("../pages/reports/MonthlyReportPage"),
);
const DefaultersReportPage = lazy(
  () => import("../pages/reports/DefaultersReportPage"),
);
const RegisterReportPage = lazy(
  () => import("../pages/reports/RegisterReportPage"),
);

// ─── Analytics ───
const AnalyticsDashboard = lazy(
  () => import("../pages/analytics/AnalyticsDashboard"),
);

// ─── Management Dashboard (Public) ───
const ManagementDashboard = lazy(
  () => import("../pages/management/ManagementDashboard"),
);

// ─── Activity Logs ───
const ActivityLogPage = lazy(() => import("../pages/activity/ActivityLogPage"));

// ─── Promotion ───
const PromotionPage = lazy(() => import("../pages/promotion/PromotionPage"));

// ─── Backup ───
const BackupPage = lazy(() => import("../pages/backup/BackupPage"));

// ─── Suspense Loader ───
const PageLoader = () => (
  <Box
    sx={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
    }}
  >
    <LinearProgress
      sx={{
        height: 3,
        "& .MuiLinearProgress-bar": {
          background:
            "linear-gradient(90deg, #1565C0 0%, #3B82F6 50%, #1565C0 100%)",
        },
      }}
    />
  </Box>
);

const routerFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

const AppRouter = () => (
  <BrowserRouter future={routerFutureFlags}>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ═══ PUBLIC ROUTES ═══ */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route
          path="/management/attendance/:secretKey"
          element={<ManagementDashboard />}
        />

        {/* ═══ PROTECTED ROUTES ═══ */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* ─── Dashboards ─── */}
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

          {/* ─── Profile ─── */}
          <Route path="profile" element={<TeacherProfilePage />} />

          {/* ─── Students ─── */}
          <Route path="students" element={<StudentListPage />} />
          <Route path="students/:id" element={<StudentDetailPage />} />

          {/* ─── Section Shift (Admin only) ─── */}
          <Route
            path="students/shift"
            element={
              <RoleRoute roles={["admin"]}>
                <ShiftPage />
              </RoleRoute>
            }
          />

          {/* ─── Classes ─── */}
          <Route path="classes" element={<ClassListPage />} />

          {/* ─── Teachers (Admin only) ─── */}
          <Route
            path="teachers"
            element={
              <RoleRoute roles={["admin"]}>
                <TeacherListPage />
              </RoleRoute>
            }
          />

          {/* ─── Sessions (Admin only) ─── */}
          <Route
            path="sessions"
            element={
              <RoleRoute roles={["admin"]}>
                <SessionManagePage />
              </RoleRoute>
            }
          />

          {/* ─── Settings (Admin only) ─── */}
          <Route
            path="settings"
            element={
              <RoleRoute roles={["admin"]}>
                <SettingsPage />
              </RoleRoute>
            }
          />

          {/* ─── Attendance ─── */}
          <Route path="attendance/mark" element={<MarkAttendancePage />} />
          <Route
            path="attendance/history"
            element={<AttendanceHistoryPage />}
          />

          {/* ─── Holidays ─── */}
          <Route path="holidays" element={<HolidayManagePage />} />

          {/* ─── Reports ─── */}
          <Route
            path="reports"
            element={<Navigate to="/reports/daily" replace />}
          />
          <Route path="reports/daily" element={<DailyReportPage />} />
          <Route path="reports/monthly" element={<MonthlyReportPage />} />
          <Route path="reports/defaulters" element={<DefaultersReportPage />} />
          <Route path="reports/register" element={<RegisterReportPage />} />

          {/* ─── Analytics ─── */}
          <Route path="analytics" element={<AnalyticsDashboard />} />

          {/* ─── Activity Logs (Admin only) ─── */}
          <Route
            path="activity-logs"
            element={
              <RoleRoute roles={["admin"]}>
                <ActivityLogPage />
              </RoleRoute>
            }
          />

          {/* ─── Promotion (Admin only) ─── */}
          <Route
            path="promotion"
            element={
              <RoleRoute roles={["admin"]}>
                <PromotionPage />
              </RoleRoute>
            }
          />

          {/* ─── Backup & Restore (Admin only) ─── */}
          <Route
            path="backup"
            element={
              <RoleRoute roles={["admin"]}>
                <BackupPage />
              </RoleRoute>
            }
          />
        </Route>

        {/* ═══ 404 ═══ */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default AppRouter;
