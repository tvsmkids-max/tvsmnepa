import React, { useCallback } from "react";
import {
  Box,
  Grid,
  Typography,
  Chip,
  Paper,
  Stack,
  Button,
  Divider,
  Alert,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

// Icons
import SchoolIcon from "@mui/icons-material/School";
import WavingHandIcon from "@mui/icons-material/WavingHand";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import HourglassBottomOutlinedIcon from "@mui/icons-material/HourglassBottomOutlined";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import ClassOutlinedIcon from "@mui/icons-material/ClassOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import BeachAccessOutlinedIcon from "@mui/icons-material/BeachAccessOutlined";
import AnalyticsOutlinedIcon from "@mui/icons-material/AnalyticsOutlined";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";

// Hooks
import useAuth from "../../hooks/useAuth";
import useSettings from "../../hooks/useSettings";
import useThemeMode from "../../hooks/useThemeMode";
import {
  useDashboardKPIs,
  useDashboardAlerts,
  useRecentActivity,
  useTodayStats,
  dashboardKeys,
} from "../../hooks/useDashboard";

// Components
import WeeklyBackupBanner from "../../components/common/WeeklyBackupBanner";
import KpiCard from "./components/KpiCard";
import AlertsCard from "./components/AlertsCard";
import ActivityTimeline from "./components/ActivityTimeline";
import ClassBreakdownCard from "./components/ClassBreakdownCard";

// ─── QUICK ACTION COMPONENT ───
const QuickAction = ({ icon, label, color, onClick, isDark }) => {
  const palette = {
    primary: {
      bg: isDark ? "rgba(59,130,246,0.15)" : "#F0F4FF",
      iconColor: isDark ? "#60A5FA" : "#1E4D98",
      hover: isDark ? "rgba(59,130,246,0.25)" : "#DBEAFE",
    },
    success: {
      bg: isDark ? "rgba(34,197,94,0.15)" : "#E6F4EA",
      iconColor: isDark ? "#4ADE80" : "#15803D",
      hover: isDark ? "rgba(34,197,94,0.25)" : "#C6F6D5",
    },
    error: {
      bg: isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2",
      iconColor: isDark ? "#F87171" : "#B91C1C",
      hover: isDark ? "rgba(239,68,68,0.25)" : "#FECACA",
    },
    warning: {
      bg: isDark ? "rgba(245,158,11,0.15)" : "#FFF4E5",
      iconColor: isDark ? "#FBBF24" : "#92400E",
      hover: isDark ? "rgba(245,158,11,0.25)" : "#FED7AA",
    },
    info: {
      bg: isDark ? "rgba(14,165,233,0.15)" : "#E0F2FE",
      iconColor: isDark ? "#38BDF8" : "#0369A1",
      hover: isDark ? "rgba(14,165,233,0.25)" : "#BAE6FD",
    },
    secondary: {
      bg: isDark ? "rgba(168,85,247,0.15)" : "#F5F3FF",
      iconColor: isDark ? "#C084FC" : "#7C3AED",
      hover: isDark ? "rgba(168,85,247,0.25)" : "#E9D5FF",
    },
  };

  const styles = palette[color] || palette.primary;

  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        p: { xs: 1.5, sm: 2 },
        borderRadius: 2,
        cursor: "pointer",
        transition: "all 0.2s ease",
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        "&:hover": {
          borderColor: styles.iconColor,
          transform: "translateY(-2px)",
          boxShadow: isDark
            ? "0 6px 16px rgba(0,0,0,0.3)"
            : "0 6px 16px rgba(0,0,0,0.08)",
        },
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2,
          bgcolor: styles.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {React.cloneElement(icon, {
          sx: { color: styles.iconColor, fontSize: 22 },
        })}
      </Box>
      <Typography
        variant="caption"
        fontWeight={700}
        textAlign="center"
        sx={{ fontSize: "0.75rem" }}
      >
        {label}
      </Typography>
    </Box>
  );
};

// ─── SECTION HEADER ───
const SectionHeader = ({ icon, title, subtitle, action }) => (
  <Stack
    direction="row"
    justifyContent="space-between"
    alignItems="center"
    sx={{ mb: 1.5, mt: 1 }}
    flexWrap="wrap"
    gap={1}
  >
    <Stack direction="row" alignItems="center" spacing={1}>
      {icon &&
        React.cloneElement(icon, {
          sx: { fontSize: 20, color: "primary.main" },
        })}
      <Box>
        <Typography
          variant="caption"
          fontWeight={800}
          sx={{
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "text.secondary",
            fontSize: "0.72rem",
            display: "block",
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ fontSize: "0.7rem" }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Stack>
    {action}
  </Stack>
);

const AdminDashboard = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { isDark } = useThemeMode();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // TanStack Queries
  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs();
  const { data: alertsData, isLoading: alertsLoading } = useDashboardAlerts();
  const { data: activityData, isLoading: activityLoading } =
    useRecentActivity(10);
  const { data: todayStats, isLoading: todayLoading } = useTodayStats();

  // Refresh handler
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  }, [queryClient]);

  // Greeting helpers
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const currentTime = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const sessionName =
    settings?.activeSession?.name ||
    (typeof settings?.activeSession === "object"
      ? settings.activeSession?.name
      : null);

  return (
    <Box sx={{ pb: { xs: 10, md: 4 } }}>
      {/* ─── WEEKLY BACKUP BANNER ─── */}
      <WeeklyBackupBanner />

      {/* ═══════════════════════════════════════════════════════
          1. ENHANCED GREETING HERO
          ═══════════════════════════════════════════════════════ */}
      <Paper
        sx={{
          mb: 3,
          borderRadius: 3,
          background:
            "linear-gradient(135deg, #0D1B3E 0%, #1A3A7A 50%, #1E4D98 100%)",
          color: "white",
          p: { xs: 2.5, sm: 3 },
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 8px 24px rgba(13,27,62,0.15)",
        }}
      >
        {/* Decorative blobs */}
        <Box
          sx={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(245,166,35,0.18) 0%, transparent 70%)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -40,
            left: -40,
            width: 140,
            height: 140,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)",
          }}
        />

        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={{ xs: 2, md: 1 }}
          >
            {/* Left: Greeting */}
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography
                  variant="caption"
                  sx={{
                    color: "rgba(255,255,255,0.75)",
                    letterSpacing: "0.1em",
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                  }}
                >
                  {greeting()}
                </Typography>
                <WavingHandIcon sx={{ fontSize: 16, color: "#FFD580" }} />
              </Stack>
              <Typography
                variant="h4"
                fontWeight={900}
                sx={{
                  color: "white",
                  fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" },
                  lineHeight: 1.2,
                  mt: 0.5,
                }}
              >
                {user?.name?.split(" ")[0] || "Admin"}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "rgba(255,255,255,0.75)",
                  mt: 0.5,
                  fontSize: { xs: "0.8rem", sm: "0.85rem" },
                  fontWeight: 500,
                }}
              >
                {today} • {currentTime}
              </Typography>

              {/* Quick Summary Chips */}
              {!kpisLoading && kpis && !kpis.isHoliday && (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ mt: 2 }}
                  flexWrap="wrap"
                  useFlexGap
                >
                  <Chip
                    label={`📊 ${kpis.attendancePercentage}% attendance`}
                    size="small"
                    sx={{
                      bgcolor: "rgba(34,197,94,0.25)",
                      color: "#86EFAC",
                      fontWeight: 700,
                      fontSize: "0.72rem",
                      height: 24,
                      border: "1px solid rgba(34,197,94,0.4)",
                    }}
                  />
                  {kpis.pendingClasses > 0 && (
                    <Chip
                      label={`⚠️ ${kpis.pendingClasses} pending`}
                      size="small"
                      sx={{
                        bgcolor: "rgba(245,158,11,0.25)",
                        color: "#FCD34D",
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        height: 24,
                        border: "1px solid rgba(245,158,11,0.4)",
                      }}
                    />
                  )}
                  {kpis.totalAbsent > 0 && (
                    <Chip
                      label={`❌ ${kpis.totalAbsent} absent`}
                      size="small"
                      sx={{
                        bgcolor: "rgba(239,68,68,0.25)",
                        color: "#FCA5A5",
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        height: 24,
                        border: "1px solid rgba(239,68,68,0.4)",
                      }}
                    />
                  )}
                  {kpis.newAdmissions24h > 0 && (
                    <Chip
                      label={`✨ ${kpis.newAdmissions24h} new today`}
                      size="small"
                      sx={{
                        bgcolor: "rgba(59,130,246,0.25)",
                        color: "#93C5FD",
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        height: 24,
                        border: "1px solid rgba(59,130,246,0.4)",
                      }}
                    />
                  )}
                </Stack>
              )}

              {kpis?.isHoliday && (
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Chip
                    icon={<BeachAccessOutlinedIcon sx={{ fontSize: 14 }} />}
                    label={`🏖️ ${kpis.holiday?.name}`}
                    sx={{
                      bgcolor: "rgba(245,166,35,0.25)",
                      color: "#FFD580",
                      fontWeight: 700,
                      "& .MuiChip-icon": { color: "#FFD580" },
                    }}
                  />
                </Stack>
              )}
            </Box>

            {/* Right: Session badge */}
            {sessionName && (
              <Chip
                icon={<SchoolIcon sx={{ fontSize: 16 }} />}
                label={`Active Session: ${sessionName}`}
                sx={{
                  height: 36,
                  px: 1,
                  bgcolor: "rgba(245,166,35,0.2)",
                  color: "#FFD580",
                  fontWeight: 800,
                  fontSize: "0.78rem",
                  border: "1.5px solid rgba(245,166,35,0.4)",
                  borderRadius: 2.5,
                  "& .MuiChip-icon": { color: "#FFD580" },
                  alignSelf: { xs: "flex-start", md: "center" },
                }}
              />
            )}
          </Stack>
        </Box>
      </Paper>

      {/* ═══════════════════════════════════════════════════════
          2. KPI CARDS (Actionable with Trends)
          ═══════════════════════════════════════════════════════ */}
      <SectionHeader
        icon={<AnalyticsOutlinedIcon />}
        title="Today's Key Metrics"
        subtitle="Live attendance overview"
      />
      <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <KpiCard
            title="Attendance"
            value={kpis?.attendancePercentage ?? 0}
            suffix="%"
            icon={<PercentOutlinedIcon />}
            color={
              (kpis?.attendancePercentage ?? 0) >= 75
                ? "success"
                : (kpis?.attendancePercentage ?? 0) >= 50
                  ? "warning"
                  : "error"
            }
            trend={kpis?.attendanceTrend}
            loading={kpisLoading}
            onClick={() => navigate("/reports")}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard
            title="Absent Today"
            value={kpis?.totalAbsent ?? 0}
            icon={<EventBusyOutlinedIcon />}
            color="error"
            trend={kpis?.absentTrend}
            trendInverse={true}
            loading={kpisLoading}
            onClick={() => navigate("/reports")}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard
            title="Pending Classes"
            value={kpis?.pendingClasses ?? 0}
            subtitle={
              kpis?.totalClasses
                ? `of ${kpis.totalClasses} total classes`
                : null
            }
            icon={<HourglassBottomOutlinedIcon />}
            color={
              (kpis?.pendingClasses ?? 0) === 0
                ? "success"
                : (kpis?.pendingClasses ?? 0) <= 2
                  ? "warning"
                  : "error"
            }
            loading={kpisLoading}
            onClick={() => navigate("/attendance/mark")}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard
            title="New Admissions"
            value={kpis?.newAdmissions24h ?? 0}
            subtitle={
              kpis?.newAdmissions7d
                ? `${kpis.newAdmissions7d} in last 7 days`
                : "Last 24 hours"
            }
            icon={<PersonAddOutlinedIcon />}
            color="info"
            loading={kpisLoading}
            onClick={() => navigate("/students")}
          />
        </Grid>
      </Grid>

      {/* ═══════════════════════════════════════════════════════
          3. ATTENDANCE STATS + ALERTS (Side by Side)
          ═══════════════════════════════════════════════════════ */}
      <SectionHeader
        icon={<EventNoteOutlinedIcon />}
        title="Today's Attendance"
        subtitle={today}
        action={
          <Button
            variant="contained"
            size="small"
            startIcon={<EventNoteOutlinedIcon />}
            onClick={() => navigate("/attendance/mark")}
            sx={{
              background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
              fontWeight: 700,
              textTransform: "none",
              fontSize: "0.78rem",
            }}
          >
            Mark Now
          </Button>
        }
      />
      <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 3 }}>
        {/* Attendance Stat Boxes */}
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              height: "100%",
            }}
          >
            <Grid container spacing={1.5}>
              <Grid item xs={6} sm={3}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: isDark
                      ? "rgba(255,255,255,0.03)"
                      : "background.default",
                    border: "1px solid",
                    borderColor: "divider",
                    textAlign: "center",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.7rem",
                      color: "text.secondary",
                      textTransform: "uppercase",
                    }}
                  >
                    Total
                  </Typography>
                  <Typography variant="h4" fontWeight={900} sx={{ mt: 0.5 }}>
                    {kpis?.totalStudents ?? 0}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: isDark ? "rgba(34,197,94,0.1)" : "#E6F4EA",
                    border: "1px solid",
                    borderColor: isDark ? "rgba(34,197,94,0.3)" : "#A7F3D0",
                    textAlign: "center",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: isDark ? "#86EFAC" : "success.dark",
                      fontWeight: 700,
                      fontSize: "0.7rem",
                      textTransform: "uppercase",
                    }}
                  >
                    Present
                  </Typography>
                  <Typography
                    variant="h4"
                    fontWeight={900}
                    sx={{
                      mt: 0.5,
                      color: isDark ? "#86EFAC" : "success.dark",
                    }}
                  >
                    {kpis?.totalPresent ?? 0}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: isDark ? "rgba(239,68,68,0.1)" : "#FEE2E2",
                    border: "1px solid",
                    borderColor: isDark ? "rgba(239,68,68,0.3)" : "#FECACA",
                    textAlign: "center",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: isDark ? "#FCA5A5" : "error.dark",
                      fontWeight: 700,
                      fontSize: "0.7rem",
                      textTransform: "uppercase",
                    }}
                  >
                    Absent
                  </Typography>
                  <Typography
                    variant="h4"
                    fontWeight={900}
                    sx={{
                      mt: 0.5,
                      color: isDark ? "#FCA5A5" : "error.dark",
                    }}
                  >
                    {kpis?.totalAbsent ?? 0}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: isDark ? "rgba(245,158,11,0.1)" : "#FFF4E5",
                    border: "1px solid",
                    borderColor: isDark ? "rgba(245,158,11,0.3)" : "#FED7AA",
                    textAlign: "center",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: isDark ? "#FCD34D" : "warning.dark",
                      fontWeight: 700,
                      fontSize: "0.7rem",
                      textTransform: "uppercase",
                    }}
                  >
                    Unmarked
                  </Typography>
                  <Typography
                    variant="h4"
                    fontWeight={900}
                    sx={{
                      mt: 0.5,
                      color: isDark ? "#FCD34D" : "warning.dark",
                    }}
                  >
                    {kpis?.unmarked ?? 0}
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Quick info banner */}
            {!kpisLoading && kpis && (
              <Box sx={{ mt: 2 }}>
                {kpis.pendingClasses === 0 && kpis.totalClasses > 0 ? (
                  <Alert
                    severity="success"
                    sx={{ borderRadius: 2 }}
                    icon={false}
                  >
                    <Typography variant="body2" fontWeight={700}>
                      ✅ All {kpis.markedClasses} classes have marked attendance
                      today!
                    </Typography>
                  </Alert>
                ) : kpis.pendingClasses > 0 ? (
                  <Alert
                    severity="warning"
                    sx={{ borderRadius: 2 }}
                    icon={false}
                  >
                    <Typography variant="body2" fontWeight={700}>
                      ⚠️ {kpis.pendingClasses} class
                      {kpis.pendingClasses !== 1 ? "es" : ""} still need to mark
                      attendance
                    </Typography>
                  </Alert>
                ) : null}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Alerts Card */}
        <Grid item xs={12} md={4}>
          <AlertsCard data={alertsData} isLoading={alertsLoading} />
        </Grid>
      </Grid>

      {/* ═══════════════════════════════════════════════════════
          4. CLASS-WISE BREAKDOWN
          ═══════════════════════════════════════════════════════ */}
      <SectionHeader
        icon={<ClassOutlinedIcon />}
        title="Class-wise Attendance"
        subtitle="Detailed breakdown by class"
      />
      <Box sx={{ mb: 3 }}>
        <ClassBreakdownCard
          data={todayStats}
          isLoading={todayLoading}
          onRefresh={handleRefresh}
        />
      </Box>

      {/* ═══════════════════════════════════════════════════════
          5. ACTIVITY TIMELINE
          ═══════════════════════════════════════════════════════ */}
      <SectionHeader
        icon={<HistoryOutlinedIcon />}
        title="Recent Activity"
        subtitle="Live feed from the system"
      />
      <Box sx={{ mb: 3 }}>
        <ActivityTimeline data={activityData} isLoading={activityLoading} />
      </Box>

      {/* ═══════════════════════════════════════════════════════
          6. QUICK ACTIONS — GROUPED
          ═══════════════════════════════════════════════════════ */}

      {/* Daily Actions */}
      <SectionHeader
        icon={<EventNoteOutlinedIcon />}
        title="Daily Actions"
        subtitle="Most used"
      />
      <Paper
        sx={{
          p: 2,
          borderRadius: 3,
          mb: 2,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Grid container spacing={1.5}>
          <Grid item xs={6} sm={3}>
            <QuickAction
              icon={<EventNoteOutlinedIcon />}
              label="Mark Attendance"
              color="primary"
              isDark={isDark}
              onClick={() => navigate("/attendance/mark")}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <QuickAction
              icon={<HistoryOutlinedIcon />}
              label="History"
              color="info"
              isDark={isDark}
              onClick={() => navigate("/attendance/history")}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <QuickAction
              icon={<PeopleOutlinedIcon />}
              label="Students"
              color="success"
              isDark={isDark}
              onClick={() => navigate("/students")}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <QuickAction
              icon={<ClassOutlinedIcon />}
              label="Classes"
              color="warning"
              isDark={isDark}
              onClick={() => navigate("/classes")}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Reports & Admin */}
      <SectionHeader
        icon={<AssessmentOutlinedIcon />}
        title="Reports & Administration"
        subtitle="Analytics and management"
      />
      <Paper
        sx={{
          p: 2,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Grid container spacing={1.5}>
          <Grid item xs={6} sm={4} md={2}>
            <QuickAction
              icon={<AssessmentOutlinedIcon />}
              label="Reports"
              color="secondary"
              isDark={isDark}
              onClick={() => navigate("/reports")}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <QuickAction
              icon={<AnalyticsOutlinedIcon />}
              label="Analytics"
              color="info"
              isDark={isDark}
              onClick={() => navigate("/analytics")}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <QuickAction
              icon={<BeachAccessOutlinedIcon />}
              label="Holidays"
              color="error"
              isDark={isDark}
              onClick={() => navigate("/holidays")}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <QuickAction
              icon={<SchoolIcon />}
              label="Sessions"
              color="warning"
              isDark={isDark}
              onClick={() => navigate("/sessions")}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <QuickAction
              icon={<StorageOutlinedIcon />}
              label="Backup"
              color="success"
              isDark={isDark}
              onClick={() => navigate("/backup")}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <QuickAction
              icon={<SettingsOutlinedIcon />}
              label="Settings"
              color="primary"
              isDark={isDark}
              onClick={() => navigate("/settings")}
            />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default AdminDashboard;
