import React, { useState, useCallback } from "react";
import {
  Box,
  Paper,
  Grid,
  Stack,
  Typography,
  Chip,
  Button,
  IconButton,
  LinearProgress,
  Skeleton,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  alpha,
  Avatar,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import BeachAccessOutlinedIcon from "@mui/icons-material/BeachAccessOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarningRoundedIcon from "@mui/icons-material/WarningRounded";

import useAuth from "../../hooks/useAuth";
import useThemeMode from "../../hooks/useThemeMode";
import {
  useTeacherSummary,
  useTeacherDefaulters,
  useUpcomingHolidays,
  dashboardKeys,
} from "../../hooks/useDashboard";
import HolidayBanner from "../../components/common/HolidayBanner";

// ═══════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════

const greetingText = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const getTeacherSalutation = (user) => {
  const firstName = user?.name?.split(" ")?.[0] || "";
  if (!firstName) return "";
  const capitalized =
    firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

  if (user?.gender === "Female") return `${capitalized} Ma'am`;
  if (user?.gender === "Male") return `${capitalized} Sir`;

  return capitalized;
};

// ═══════════════════════════════════════════════════════════════════
//  PREMIUM SAAS STAT PILL
// ═══════════════════════════════════════════════════════════════════
const StatPill = ({ label, value, icon, colorHex, isDark, isLoading }) => {
  if (isLoading) {
    return (
      <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 3 }} />
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        transition: "all 0.2s ease",
        boxShadow: isDark
          ? "0 4px 12px rgba(0,0,0,0.2)"
          : "0 2px 12px rgba(15,23,42,0.04)",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: isDark
            ? "0 8px 20px rgba(0,0,0,0.4)"
            : "0 8px 24px rgba(15,23,42,0.08)",
        },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            fontSize: "0.7rem",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "text.secondary",
          }}
        >
          {label}
        </Typography>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: alpha(colorHex, isDark ? 0.15 : 0.1),
            color: colorHex,
          }}
        >
          {icon}
        </Box>
      </Stack>
      <Typography
        variant="h4"
        fontWeight={800}
        sx={{
          color: "text.primary",
          fontSize: { xs: "1.5rem", sm: "1.8rem" },
          lineHeight: 1,
          letterSpacing: "-0.03em",
        }}
      >
        {value}
      </Typography>
    </Paper>
  );
};

// ═══════════════════════════════════════════════════════════════════
//  MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════
const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark } = useThemeMode();
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [period, setPeriod] = useState("today");
  const [refreshing, setRefreshing] = useState(false);

  // ─── Data ─────────────────────────────────────────────────
  const { data: summary, isLoading: summaryLoading } =
    useTeacherSummary(period);
  const { data: defaulters = [], isLoading: defaultersLoading } =
    useTeacherDefaulters(5, 75);
  const { data: holidays = [], isLoading: holidaysLoading } =
    useUpcomingHolidays(3, 60);

  const loading = summaryLoading;

  // ─── Refresh handler ──────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    setTimeout(() => setRefreshing(false), 600);
  }, [queryClient]);

  // ─── Computed values ──────────────────────────────────────
  const attendanceStatus = summary?.attendanceStatus;
  const hasClasses = (summary?.totalClasses || 0) > 0;
  const isNonWorking = summary?.isHoliday || summary?.isNonWorkingDay;

  const markedToday = summary?.markedClassesToday || 0;
  const totalClasses = summary?.totalClasses || 0;
  const pendingToday = summary?.pendingClassesToday || 0;

  // ─── Colors ───────────────────────────────────────────────
  const cTotal = isDark ? "#60A5FA" : "#2563EB";
  const cPresent = isDark ? "#4ADE80" : "#16A34A";
  const cAbsent = isDark ? "#F87171" : "#DC2626";
  const cPct =
    (summary?.percentage || 0) >= 75
      ? cPresent
      : (summary?.percentage || 0) >= 50
        ? isDark
          ? "#FBBF24"
          : "#D97706"
        : cAbsent;

  return (
    <Box sx={{ width: "100%" }}>
      {/* ── HEADER ── */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography
            variant="h5"
            fontWeight={800}
            sx={{ letterSpacing: "-0.02em", color: "text.primary" }}
          >
            {greetingText()}, {getTeacherSalutation(user)}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", fontWeight: 500, mt: 0.5 }}
          >
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
            {!isNonWorking &&
              hasClasses &&
              ` • ${pendingToday > 0 ? `${pendingToday} classes pending` : "All classes marked"}`}
          </Typography>
        </Box>
        <IconButton
          onClick={handleRefresh}
          disabled={refreshing}
          sx={{
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <RefreshOutlinedIcon
            sx={{
              fontSize: 20,
              color: "text.secondary",
              animation: refreshing ? "spin 0.8s linear infinite" : "none",
              "@keyframes spin": {
                from: { transform: "rotate(0deg)" },
                to: { transform: "rotate(360deg)" },
              },
            }}
          />
        </IconButton>
      </Stack>

      {/* ── STATES ── */}
      {loading ? (
        <Stack spacing={3}>
          <Skeleton
            variant="rectangular"
            height={70}
            sx={{ borderRadius: 3 }}
          />
          <Grid container spacing={2}>
            {[1, 2, 3, 4].map((i) => (
              <Grid item xs={6} sm={3} key={i}>
                <Skeleton
                  variant="rectangular"
                  height={100}
                  sx={{ borderRadius: 3 }}
                />
              </Grid>
            ))}
          </Grid>
          <Skeleton
            variant="rectangular"
            height={200}
            sx={{ borderRadius: 3 }}
          />
        </Stack>
      ) : !hasClasses ? (
        <Paper
          sx={{
            p: 3,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "warning.main",
            bgcolor: alpha(theme.palette.warning.main, 0.05),
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <WarningRoundedIcon color="warning" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="body1" fontWeight={700} color="warning.dark">
                No classes assigned to you
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Contact your administrator to assign classes to your profile.
              </Typography>
            </Box>
          </Stack>
        </Paper>
      ) : isNonWorking ? (
        <>
          <Box sx={{ mb: 3 }}>
            <HolidayBanner
              isHoliday={summary.isHoliday}
              holiday={summary.holiday}
              today={summary.today}
              nextWorkingDay={summary.nextWorkingDay}
            />
          </Box>
        </>
      ) : (
        <>
          {/* ── ALERT BANNER ── */}
          {attendanceStatus === "marked" ? (
            <Paper
              elevation={0}
              sx={{
                mb: 3,
                p: 2,
                borderRadius: 3,
                bgcolor: isDark ? alpha("#10B981", 0.05) : "#F0FDF4",
                border: "1px solid",
                borderColor: isDark ? alpha("#10B981", 0.2) : "#BBF7D0",
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <CheckCircleIcon sx={{ color: "#10B981", fontSize: 28 }} />
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body1"
                  fontWeight={700}
                  sx={{ color: isDark ? "#6EE7B7" : "#065F46" }}
                >
                  Attendance Complete
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: isDark ? "#A7F3D0" : "#047857" }}
                >
                  You have successfully marked all {totalClasses} classes for
                  today.
                </Typography>
              </Box>
            </Paper>
          ) : (
            <Paper
              elevation={0}
              sx={{
                mb: 3,
                p: 2,
                borderRadius: 3,
                bgcolor: isDark ? alpha("#EF4444", 0.05) : "#FEF2F2",
                border: "1px solid",
                borderColor: isDark ? alpha("#EF4444", 0.2) : "#FECACA",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <ErrorIcon sx={{ color: "#EF4444", fontSize: 28 }} />
                <Box>
                  <Typography
                    variant="body1"
                    fontWeight={700}
                    sx={{ color: isDark ? "#FCA5A5" : "#991B1B" }}
                  >
                    Action Required: Mark Attendance
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: isDark ? "#FECACA" : "#B91C1C" }}
                  >
                    {pendingToday} of {totalClasses} classes are waiting to be
                    marked.
                  </Typography>
                </Box>
              </Stack>
              <Button
                variant="contained"
                onClick={() => navigate("/attendance/mark")}
                sx={{
                  bgcolor: "#EF4444",
                  color: "white",
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: 2,
                  boxShadow: "none",
                  px: 3,
                  "&:hover": { bgcolor: "#DC2626", boxShadow: "none" },
                }}
              >
                Mark Now
              </Button>
            </Paper>
          )}

          {/* ── STATS TOGGLE & GRID ── */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 1.5 }}
          >
            <Typography
              variant="caption"
              fontWeight={800}
              color="text.secondary"
              sx={{
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Overview
            </Typography>
            <ToggleButtonGroup
              value={period}
              exclusive
              onChange={(_, val) => val && setPeriod(val)}
              size="small"
              sx={{
                bgcolor: "background.paper",
                p: 0.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                "& .MuiToggleButton-root": {
                  px: 2,
                  py: 0.4,
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  textTransform: "none",
                  border: "none",
                  borderRadius: 1.5,
                  color: "text.secondary",
                  "&.Mui-selected": {
                    bgcolor: isDark ? "rgba(255,255,255,0.1)" : "#F1F5F9",
                    color: "text.primary",
                    fontWeight: 700,
                  },
                },
              }}
            >
              <ToggleButton value="today">Today</ToggleButton>
              <ToggleButton value="week">Week</ToggleButton>
              <ToggleButton value="month">Month</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={6} sm={3}>
              <StatPill
                label="Total Students"
                value={summary?.totalStudents || 0}
                icon={<PeopleOutlinedIcon fontSize="small" />}
                colorHex={cTotal}
                isDark={isDark}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatPill
                label="Present"
                value={summary?.present || 0}
                icon={<CheckCircleIcon fontSize="small" />}
                colorHex={cPresent}
                isDark={isDark}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatPill
                label="Absent"
                value={summary?.absent || 0}
                icon={<ErrorIcon fontSize="small" />}
                colorHex={cAbsent}
                isDark={isDark}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatPill
                label="Attendance Rate"
                value={`${summary?.percentage || 0}%`}
                icon={<TrendingUpIcon fontSize="small" />}
                colorHex={cPct}
                isDark={isDark}
              />
            </Grid>
          </Grid>

          {/* ── MY CLASSES ── */}
          <Typography
            variant="h6"
            fontWeight={800}
            sx={{ mb: 2, fontSize: "1.1rem" }}
          >
            My Classes
          </Typography>
          <Stack spacing={1.5} sx={{ mb: 4 }}>
            {summary?.classBreakdown?.map((cls) => (
              <Paper
                key={cls._id}
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  alignItems: { xs: "flex-start", sm: "center" },
                  justifyContent: "space-between",
                  gap: 2,
                  transition: "all 0.2s",
                  "&:hover": {
                    borderColor: theme.palette.primary.main,
                    boxShadow: isDark
                      ? "0 4px 12px rgba(0,0,0,0.3)"
                      : "0 4px 12px rgba(15,23,42,0.06)",
                  },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar
                    sx={{
                      bgcolor: isDark
                        ? alpha(theme.palette.primary.main, 0.2)
                        : "#EFF6FF",
                      color: "primary.main",
                      fontWeight: 800,
                      width: 48,
                      height: 48,
                    }}
                  >
                    {cls.name.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography
                      variant="subtitle1"
                      fontWeight={800}
                      sx={{ lineHeight: 1.2 }}
                    >
                      {cls.name} {cls.section && `- ${cls.section}`}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {cls.studentCount} enrolled students
                    </Typography>
                  </Box>
                </Stack>

                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={3}
                  sx={{ width: { xs: "100%", sm: "auto" } }}
                >
                  {cls.isMarkedToday ? (
                    <Box sx={{ flex: { xs: 1, sm: "none" }, minWidth: 150 }}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        sx={{ mb: 0.5 }}
                      >
                        <Typography
                          variant="caption"
                          fontWeight={700}
                          color="text.secondary"
                        >
                          Attendance
                        </Typography>
                        <Typography
                          variant="caption"
                          fontWeight={800}
                          color={
                            cls.percentage >= 75
                              ? "success.main"
                              : "warning.main"
                          }
                        >
                          {cls.percentage}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={cls.percentage}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: isDark
                            ? "rgba(255,255,255,0.08)"
                            : "#F1F5F9",
                          "& .MuiLinearProgress-bar": {
                            bgcolor:
                              cls.percentage >= 75
                                ? "success.main"
                                : "warning.main",
                            borderRadius: 3,
                          },
                        }}
                      />
                    </Box>
                  ) : (
                    <Chip
                      label="Not Marked"
                      size="small"
                      sx={{
                        bgcolor: isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
                        color: "text.secondary",
                        fontWeight: 600,
                        flex: { xs: 1, sm: "none" },
                      }}
                    />
                  )}

                  <Button
                    variant={cls.isMarkedToday ? "outlined" : "contained"}
                    onClick={() => navigate("/attendance/mark")}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      borderRadius: 2,
                      minWidth: 90,
                      boxShadow: "none",
                    }}
                  >
                    {cls.isMarkedToday ? "Edit" : "Mark"}
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Stack>

          {/* ── BOTTOM CARDS ── */}
          <Grid container spacing={3}>
            {/* DEFAULTERS */}
            <Grid item xs={12} md={6}>
              <Typography
                variant="h6"
                fontWeight={800}
                sx={{ mb: 2, fontSize: "1.1rem" }}
              >
                Needs Attention
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  overflow: "hidden",
                  height: "100%",
                }}
              >
                {defaultersLoading ? (
                  <Box sx={{ p: 2 }}>
                    {[1, 2, 3].map((i) => (
                      <Skeleton
                        key={i}
                        variant="rectangular"
                        height={50}
                        sx={{ mb: 1, borderRadius: 2 }}
                      />
                    ))}
                  </Box>
                ) : defaulters.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: "center" }}>
                    <CheckCircleIcon
                      sx={{ fontSize: 40, color: "success.main", mb: 1 }}
                    />
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color="text.secondary"
                    >
                      All students are attending well! 🎉
                    </Typography>
                  </Box>
                ) : (
                  <Stack divider={<Divider />}>
                    {defaulters.map((s) => (
                      <Stack
                        key={s._id}
                        direction="row"
                        alignItems="center"
                        spacing={2}
                        sx={{
                          px: 2.5,
                          py: 2,
                          cursor: "pointer",
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                        onClick={() => navigate("/students")}
                      >
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            bgcolor: alpha(theme.palette.error.main, 0.1),
                            color: "error.main",
                            fontSize: "0.85rem",
                            fontWeight: 700,
                          }}
                        >
                          {s.name?.[0]?.toUpperCase() || "S"}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>
                            {s.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ display: "block" }}
                          >
                            {s.className}-{s.section} • Scholar{" "}
                            {s.scholarNumber || "—"}
                          </Typography>
                        </Box>
                        <Typography
                          variant="body2"
                          fontWeight={800}
                          color="error.main"
                        >
                          {s.percentage || 0}%
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Grid>

            {/* HOLIDAYS */}
            <Grid item xs={12} md={6}>
              <Typography
                variant="h6"
                fontWeight={800}
                sx={{ mb: 2, fontSize: "1.1rem" }}
              >
                Upcoming Holidays
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 4,
                  border: "1px solid",
                  borderColor: "divider",
                  overflow: "hidden",
                  height: "100%",
                }}
              >
                {holidaysLoading ? (
                  <Box sx={{ p: 2 }}>
                    {[1, 2].map((i) => (
                      <Skeleton
                        key={i}
                        variant="rectangular"
                        height={50}
                        sx={{ mb: 1, borderRadius: 2 }}
                      />
                    ))}
                  </Box>
                ) : holidays.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: "center" }}>
                    <CalendarMonthOutlinedIcon
                      sx={{ fontSize: 40, color: "text.disabled", mb: 1 }}
                    />
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color="text.secondary"
                    >
                      No holidays in next 60 days
                    </Typography>
                  </Box>
                ) : (
                  <Stack divider={<Divider />}>
                    {holidays.map((h) => (
                      <Stack
                        key={h._id || h.name}
                        direction="row"
                        alignItems="center"
                        spacing={2}
                        sx={{ px: 2.5, py: 2 }}
                      >
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 2,
                            bgcolor: alpha(theme.palette.info.main, 0.1),
                            color: "info.main",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.6rem",
                              fontWeight: 800,
                              textTransform: "uppercase",
                            }}
                          >
                            {h.dayName}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "1.1rem",
                              fontWeight: 900,
                              lineHeight: 1,
                            }}
                          >
                            {h.date ? new Date(h.date).getDate() : ""}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>
                            {h.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block" }}
                          >
                            {h.type} •{" "}
                            {h.daysUntil === 0
                              ? "Today"
                              : h.daysUntil === 1
                                ? "Tomorrow"
                                : `In ${h.daysUntil} days`}
                          </Typography>
                        </Box>
                        <MoreHorizIcon sx={{ color: "text.disabled" }} />
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default TeacherDashboard;
