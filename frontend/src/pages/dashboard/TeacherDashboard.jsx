import React, { useState, useCallback, useMemo } from "react";
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
  useMediaQuery,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import ScheduleIcon from "@mui/icons-material/Schedule";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarningRoundedIcon from "@mui/icons-material/WarningRounded";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import EditIcon from "@mui/icons-material/Edit";

import useAuth from "../../hooks/useAuth";
import useThemeMode from "../../hooks/useThemeMode";
import {
  useTeacherSummary,
  useTeacherDefaulters,
  useUpcomingHolidays,
  dashboardKeys,
} from "../../hooks/useDashboard";
import HolidayBanner from "../../components/common/HolidayBanner";

// ✅ Correct function import
import { getDailyQuoteForUser } from "../../utils/quoteUtils";

const greetingText = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const getClassAccountLabel = (user) => {
  const lc = user?.linkedClass;
  if (lc && typeof lc === "object" && lc.name) {
    const section = lc.section ? `-${lc.section}` : "";
    return `${lc.name}${section}`.toUpperCase();
  }
  if (user?.name) {
    return String(user.name).toUpperCase();
  }
  return "CLASS ACCOUNT";
};

const getTeacherLabel = (user, summary) => {
  const lc = user?.linkedClass;
  if (lc && typeof lc === "object" && lc.teacherLabel) {
    return String(lc.teacherLabel).trim().toUpperCase();
  }
  const fromBreakdown = summary?.classBreakdown?.[0]?.teacherLabel;
  if (fromBreakdown) return String(fromBreakdown).trim().toUpperCase();
  return null;
};

const StatPill = ({ label, value, icon, colorHex, isDark, isLoading }) => {
  if (isLoading)
    return (
      <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 3 }} />
    );
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
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            fontSize: "0.7rem",
            textTransform: "uppercase",
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
        }}
      >
        {value}
      </Typography>
    </Paper>
  );
};

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark } = useThemeMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const queryClient = useQueryClient();

  const [period, setPeriod] = useState("today");
  const [refreshing, setRefreshing] = useState(false);

  const { data: summary, isLoading: summaryLoading } =
    useTeacherSummary(period);
  const { data: defaulters = [], isLoading: defaultersLoading } =
    useTeacherDefaulters(5, 75);
  const { data: holidays = [], isLoading: holidaysLoading } =
    useUpcomingHolidays(3, 60);

  const loading = summaryLoading;

  const classLabel = useMemo(() => getClassAccountLabel(user), [user]);
  const teacherLabel = useMemo(
    () => getTeacherLabel(user, summary),
    [user, summary],
  );

  const todayDateLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    [],
  );

  // ✅ Read quote using getDailyQuoteForUser and property .quote
  const dailyQuoteText = useMemo(() => {
    try {
      const q = getDailyQuoteForUser ? getDailyQuoteForUser(user) : null;
      return (
        q?.quote ||
        "Education is the most powerful weapon which you can use to change the world."
      );
    } catch {
      return "Education is the most powerful weapon which you can use to change the world.";
    }
  }, [user]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    setTimeout(() => setRefreshing(false), 600);
  }, [queryClient]);

  const linkedId = user?.linkedClass?._id || user?.linkedClass || null;
  const hasLinkedClass = Boolean(linkedId);
  const hasClasses = (summary?.totalClasses || 0) > 0;
  const isNonWorking = summary?.isHoliday || summary?.isNonWorkingDay;

  const markedToday = summary?.markedClassesToday || 0;
  const totalClasses = summary?.totalClasses || 0;
  const pendingToday = summary?.pendingClassesToday || 0;

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
            {greetingText()}, {classLabel}
          </Typography>

          <Stack
            direction="row"
            alignItems="center"
            flexWrap="wrap"
            gap={1}
            sx={{ mt: 0.75 }}
          >
            {teacherLabel && (
              <Chip
                size="small"
                label={teacherLabel}
                sx={{
                  height: 22,
                  fontWeight: 800,
                  fontSize: "0.68rem",
                  textTransform: "uppercase",
                  bgcolor: isDark
                    ? alpha("#3B82F6", 0.15)
                    : alpha("#2563EB", 0.08),
                  color: isDark ? "#93C5FD" : "#1D4ED8",
                }}
              />
            )}
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", fontWeight: 500 }}
            >
              {todayDateLabel}
              {!isNonWorking &&
                hasClasses &&
                ` • ${pendingToday > 0 ? `${pendingToday} class${pendingToday !== 1 ? "es" : ""} pending` : "All classes marked"}`}
            </Typography>
          </Stack>

          {/* MOBILE QUOTE: Blockquote under date */}
          {isMobile && (
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mt: 1.5,
                pl: 1.25,
                borderLeft: "3px solid",
                borderColor: "primary.main",
                fontStyle: "italic",
                color: "text.secondary",
                fontWeight: 600,
                fontSize: "0.75rem",
                lineHeight: 1.4,
              }}
            >
              "{dailyQuoteText}"
            </Typography>
          )}
        </Box>
        <IconButton
          onClick={handleRefresh}
          disabled={refreshing}
          sx={{
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
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

      {/* ── CONDITIONAL RENDERING FOR EMPTY / LOADING / NON-WORKING ── */}
      {loading ? (
        <Stack spacing={3}>
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
      ) : !hasLinkedClass ? (
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
                No class linked to this account
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Contact your administrator to link a class login account.
              </Typography>
            </Box>
          </Stack>
        </Paper>
      ) : !hasClasses && !loading ? (
        <Paper
          sx={{
            p: 3,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            textAlign: "center",
          }}
        >
          <Typography variant="body1" fontWeight={700} sx={{ mb: 1 }}>
            Class data could not be loaded
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Your class might be archived or temporarily unavailable. Please try
            refreshing.
          </Typography>
          <Button variant="outlined" onClick={handleRefresh}>
            Refresh Dashboard
          </Button>
        </Paper>
      ) : isNonWorking ? (
        <Box sx={{ mb: 3 }}>
          <HolidayBanner
            isHoliday={summary.isHoliday}
            holiday={summary.holiday}
            today={summary.today}
            nextWorkingDay={summary.nextWorkingDay}
          />
        </Box>
      ) : (
        <>
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
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 2 }}
          >
            <Typography
              variant="h6"
              fontWeight={800}
              sx={{ fontSize: "1.1rem" }}
            >
              My Classes
            </Typography>
            <Chip
              label={`${markedToday}/${totalClasses} Marked Today`}
              size="small"
              sx={{
                height: 24,
                fontSize: "0.7rem",
                fontWeight: 800,
                bgcolor:
                  markedToday === totalClasses
                    ? alpha(cPresent, 0.1)
                    : alpha(cAbsent, 0.1),
                color: markedToday === totalClasses ? cPresent : cAbsent,
              }}
            />
          </Stack>

          <Stack spacing={1.5} sx={{ mb: 4 }}>
            {summary?.classBreakdown?.map((cls) => {
              const isMarked = cls.isMarkedToday;
              const cardTeacher =
                (cls.teacherLabel && String(cls.teacherLabel).toUpperCase()) ||
                teacherLabel ||
                null;
              return (
                <Paper
                  key={cls._id}
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: isMarked ? "divider" : alpha(cAbsent, 0.3),
                    bgcolor: "background.paper",
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "flex-start", sm: "center" },
                    justifyContent: "space-between",
                    gap: 2,
                    transition: "all 0.2s",
                    "&:hover": {
                      borderColor: isMarked
                        ? theme.palette.primary.main
                        : cAbsent,
                      boxShadow: isDark
                        ? "0 4px 12px rgba(0,0,0,0.3)"
                        : "0 4px 12px rgba(15,23,42,0.06)",
                    },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar
                      sx={{
                        bgcolor: isMarked
                          ? isDark
                            ? alpha(cPresent, 0.15)
                            : alpha(cPresent, 0.1)
                          : isDark
                            ? alpha(cAbsent, 0.15)
                            : alpha(cAbsent, 0.1),
                        color: isMarked ? cPresent : cAbsent,
                        fontWeight: 800,
                        width: 48,
                        height: 48,
                      }}
                    >
                      {cls.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography
                          variant="subtitle1"
                          fontWeight={800}
                          sx={{ lineHeight: 1.2 }}
                        >
                          {cls.name} {cls.section && `- ${cls.section}`}
                        </Typography>
                        {isMarked ? (
                          <Chip
                            icon={
                              <CheckCircleIcon
                                sx={{ fontSize: "12px !important" }}
                              />
                            }
                            label="Marked"
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              bgcolor: alpha(cPresent, 0.12),
                              color: cPresent,
                              "& .MuiChip-icon": { color: cPresent },
                            }}
                          />
                        ) : (
                          <Chip
                            icon={
                              <ScheduleIcon
                                sx={{ fontSize: "12px !important" }}
                              />
                            }
                            label="Pending"
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              bgcolor: alpha(cAbsent, 0.12),
                              color: cAbsent,
                              "& .MuiChip-icon": { color: cAbsent },
                            }}
                          />
                        )}
                      </Stack>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        {cls.studentCount} enrolled students
                        {isMarked &&
                          ` • ${cls.present} present • ${cls.absent} absent`}
                        {cardTeacher && (
                          <Box
                            component="span"
                            sx={{
                              display: "block",
                              mt: 0.25,
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              letterSpacing: "0.03em",
                              textTransform: "uppercase",
                              color: "text.secondary",
                            }}
                          >
                            {cardTeacher}
                          </Box>
                        )}
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={2}
                    sx={{ width: { xs: "100%", sm: "auto" } }}
                  >
                    {isMarked && (
                      <Box sx={{ flex: { xs: 1, sm: "none" }, minWidth: 140 }}>
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
                            Rate
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
                    )}
                    <Button
                      variant={isMarked ? "outlined" : "contained"}
                      onClick={() => navigate("/attendance/mark")}
                      startIcon={
                        isMarked ? <EditIcon sx={{ fontSize: 16 }} /> : null
                      }
                      endIcon={
                        !isMarked ? (
                          <ArrowForwardIcon sx={{ fontSize: 16 }} />
                        ) : null
                      }
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        borderRadius: 2,
                        minWidth: 130,
                        boxShadow: "none",
                        bgcolor: !isMarked ? cAbsent : undefined,
                        color: !isMarked ? "white" : undefined,
                        borderColor: isMarked ? "divider" : undefined,
                        "&:hover": {
                          boxShadow: "none",
                          bgcolor: !isMarked ? "#DC2626" : undefined,
                        },
                      }}
                    >
                      {isMarked ? "Edit Attendance" : "Mark Attendance"}
                    </Button>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>

          {/* ── BOTTOM CARDS ── */}
          <Grid container spacing={3}>
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
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            noWrap
                            sx={{ textTransform: "uppercase" }}
                          >
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
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  overflow: "hidden",
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
