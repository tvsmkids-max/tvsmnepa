import React, { useState, useMemo, useCallback, useEffect } from "react";
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
  Alert,
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
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import BeachAccessOutlinedIcon from "@mui/icons-material/BeachAccessOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";

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
//  HELPERS & SALUTATIONS ("Khushboo Ma'am" / "Abhishek Sir")
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

  // Safe Fallback: Never says "Teacher", just the name
  return capitalized;
};

// ═══════════════════════════════════════════════════════════════════
//  INLINE SPLASH SCREEN (2.5s Timer + "Sir/Ma'am" Salutation)
// ═══════════════════════════════════════════════════════════════════
const InlineSplashScreen = ({ user, onComplete }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // 2.5 Seconds Display Timer for a smooth, premium feel
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => onComplete?.(), 600);
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: isDark
          ? "linear-gradient(135deg, #020617 0%, #0F172A 100%)"
          : "linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)",
        opacity: isFadingOut ? 0 : 1,
        transition: "opacity 0.6s ease-in-out",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          animation: "scaleIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
          "@keyframes scaleIn": {
            "0%": { opacity: 0, transform: "scale(0.9)" },
            "100%": { opacity: 1, transform: "scale(1)" },
          },
        }}
      >
        <Avatar
          src="/logo.png"
          sx={{
            width: 84,
            height: 84,
            bgcolor: isDark ? "rgba(255,255,255,0.05)" : "white",
            boxShadow: isDark
              ? "0 12px 32px rgba(0,0,0,0.5)"
              : "0 12px 32px rgba(15,23,42,0.08)",
            p: 1.5,
            mb: 2.5,
            "& img": { objectFit: "contain" },
          }}
        />

        <Typography
          variant="h5"
          fontWeight={900}
          sx={{
            color: "text.primary",
            mb: 0.5,
            letterSpacing: "-0.02em",
          }}
        >
          {greetingText()}, {getTeacherSalutation(user)}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            fontWeight: 500,
            letterSpacing: "0.02em",
          }}
        >
          Preparing your dashboard...
        </Typography>

        <Box sx={{ display: "flex", gap: 1, mt: 3 }}>
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                bgcolor: "primary.main",
                animation: "pulse 1.2s infinite ease-in-out both",
                animationDelay: `${i * 0.16}s`,
                "@keyframes pulse": {
                  "0%, 80%, 100%": { transform: "scale(0)", opacity: 0.3 },
                  "40%": { transform: "scale(1)", opacity: 1 },
                },
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════════
//  STAT PILL
// ═══════════════════════════════════════════════════════════════════
const StatPill = ({
  label,
  value,
  color,
  bg,
  borderColor,
  isDark,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Skeleton
        variant="rectangular"
        height={80}
        sx={{ borderRadius: "16px" }}
      />
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: "16px",
        border: "1px solid",
        borderColor: borderColor || "divider",
        bgcolor: bg || "background.paper",
        textAlign: "center",
        transition: "all 0.2s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: isDark
            ? "0 8px 16px rgba(0,0,0,0.4)"
            : "0 8px 16px rgba(15,23,42,0.06)",
        },
      }}
    >
      <Typography
        variant="h4"
        fontWeight={900}
        sx={{
          color: color || "text.primary",
          fontSize: { xs: "1.4rem", sm: "1.75rem" },
          lineHeight: 1.1,
          letterSpacing: "-0.03em",
        }}
      >
        {value ?? 0}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          fontSize: "0.65rem",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: color || "text.secondary",
          display: "block",
          mt: 0.5,
        }}
      >
        {label}
      </Typography>
    </Paper>
  );
};

// ═══════════════════════════════════════════════════════════════════
//  MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════
const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { user, showSplash, dismissSplash } = useAuth();
  const { isDark } = useThemeMode();
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
  const colors = {
    success: isDark ? "#4ADE80" : "#10B981",
    successBg: isDark ? alpha("#10B981", 0.12) : "#D1FAE5",
    successBorder: isDark ? alpha("#10B981", 0.3) : "#A7F3D0",
    error: isDark ? "#F87171" : "#EF4444",
    errorBg: isDark ? alpha("#EF4444", 0.12) : "#FEE2E2",
    errorBorder: isDark ? alpha("#EF4444", 0.3) : "#FECACA",
    warning: isDark ? "#FBBF24" : "#F59E0B",
    warningBg: isDark ? alpha("#F59E0B", 0.12) : "#FEF3C7",
    warningBorder: isDark ? alpha("#F59E0B", 0.3) : "#FDE68A",
    info: isDark ? "#60A5FA" : "#3B82F6",
    infoBg: isDark ? alpha("#3B82F6", 0.12) : "#DBEAFE",
    infoBorder: isDark ? alpha("#3B82F6", 0.3) : "#BFDBFE",
  };

  // ═══════════════════════════════════════════════════════════
  //  SPLASH INTERCEPT
  // ═══════════════════════════════════════════════════════════
  if (showSplash) {
    return <InlineSplashScreen user={user} onComplete={dismissSplash} />;
  }

  return (
    <Box sx={{ pb: { xs: 8, md: 3 } }}>
      {/* ── HEADER ── */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography
            variant="h5"
            fontWeight={900}
            sx={{ letterSpacing: "-0.02em", color: "text.primary" }}
          >
            {greetingText()}, {getTeacherSalutation(user)}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 500,
              display: "block",
              mt: 0.3,
            }}
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
          }}
        >
          <RefreshOutlinedIcon
            sx={{
              fontSize: 18,
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
        <Stack spacing={2}>
          <Skeleton
            variant="rectangular"
            height={60}
            sx={{ borderRadius: 3 }}
          />
          <Grid container spacing={1.5}>
            {[1, 2, 3, 4].map((i) => (
              <Grid item xs={6} sm={3} key={i}>
                <Skeleton
                  variant="rectangular"
                  height={80}
                  sx={{ borderRadius: "16px" }}
                />
              </Grid>
            ))}
          </Grid>
          <Skeleton
            variant="rectangular"
            height={160}
            sx={{ borderRadius: 3 }}
          />
        </Stack>
      ) : !hasClasses ? (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 3 }}>
          <Typography variant="body2" fontWeight={800}>
            No classes assigned to you
          </Typography>
          <Typography variant="caption">
            Contact admin to assign classes
          </Typography>
        </Alert>
      ) : isNonWorking ? (
        <>
          <Box sx={{ mb: 2.5 }}>
            <HolidayBanner
              isHoliday={summary.isHoliday}
              holiday={summary.holiday}
              today={summary.today}
              nextWorkingDay={summary.nextWorkingDay}
            />
          </Box>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Grid container spacing={1.5}>
              {[
                {
                  icon: <EventNoteOutlinedIcon />,
                  label: "Mark",
                  path: "/attendance/mark",
                },
                {
                  icon: <CalendarMonthOutlinedIcon />,
                  label: "Monthly",
                  path: "/reports/monthly",
                },
                {
                  icon: <PeopleOutlinedIcon />,
                  label: "Students",
                  path: "/students",
                },
                {
                  icon: <PersonOutlineIcon />,
                  label: "Profile",
                  path: "/profile",
                },
              ].map((a) => (
                <Grid item xs={3} key={a.path}>
                  <Box
                    onClick={() => navigate(a.path)}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 0.5,
                      py: 1.5,
                      borderRadius: 2,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      "&:hover": {
                        bgcolor: "action.hover",
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    {React.cloneElement(a.icon, {
                      sx: {
                        fontSize: 24,
                        color: isDark ? "#F8FAFC" : "#0F172A",
                      },
                    })}
                    <Typography
                      variant="caption"
                      fontWeight={800}
                      sx={{ fontSize: "0.7rem", mt: 0.5 }}
                    >
                      {a.label}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </>
      ) : (
        <>
          {/* ALERT BANNER */}
          {attendanceStatus === "marked" ? (
            <Paper
              sx={{
                mb: 2.5,
                p: 2,
                borderRadius: 3,
                bgcolor: colors.successBg,
                border: "1px solid",
                borderColor: colors.successBorder,
                display: "flex",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  bgcolor: colors.success,
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckCircleOutlineIcon fontSize="small" />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body2"
                  fontWeight={800}
                  color={colors.success}
                >
                  All classes marked! ✅
                </Typography>
                <Typography
                  variant="caption"
                  color={colors.success}
                  sx={{ opacity: 0.8, fontWeight: 600 }}
                >
                  Great job today.
                </Typography>
              </Box>
            </Paper>
          ) : (
            <Paper
              sx={{
                mb: 2.5,
                p: 2,
                borderRadius: 3,
                bgcolor:
                  attendanceStatus === "partial"
                    ? colors.warningBg
                    : colors.errorBg,
                border: "1px solid",
                borderColor:
                  attendanceStatus === "partial"
                    ? colors.warningBorder
                    : colors.errorBorder,
                display: "flex",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  bgcolor:
                    attendanceStatus === "partial"
                      ? colors.warning
                      : colors.error,
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ErrorOutlineIcon fontSize="small" />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body2"
                  fontWeight={800}
                  color={
                    attendanceStatus === "partial"
                      ? colors.warning
                      : colors.error
                  }
                >
                  {pendingToday} class{pendingToday > 1 ? "es" : ""} pending
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color:
                      attendanceStatus === "partial"
                        ? colors.warning
                        : colors.error,
                    opacity: 0.8,
                    fontWeight: 600,
                  }}
                >
                  {markedToday} of {totalClasses} marked today
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="small"
                onClick={() => navigate("/attendance/mark")}
                sx={{
                  bgcolor:
                    attendanceStatus === "partial"
                      ? colors.warning
                      : colors.error,
                  color: "white",
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: 2,
                  boxShadow: "none",
                  "&:hover": { boxShadow: "none", filter: "brightness(0.9)" },
                }}
              >
                Mark Now
              </Button>
            </Paper>
          )}

          {/* STATS TOGGLE */}
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
                fontSize: "0.68rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Attendance Metrics
            </Typography>
            <ToggleButtonGroup
              value={period}
              exclusive
              onChange={(_, val) => val && setPeriod(val)}
              size="small"
              sx={{
                bgcolor: "background.paper",
                p: 0.5,
                borderRadius: 8,
                "& .MuiToggleButton-root": {
                  px: 1.5,
                  py: 0.3,
                  fontWeight: 700,
                  fontSize: "0.65rem",
                  textTransform: "none",
                  border: "none",
                  borderRadius: 8,
                  color: "text.secondary",
                  "&.Mui-selected": {
                    bgcolor: isDark ? "rgba(255,255,255,0.1)" : "#F1F5F9",
                    color: "text.primary",
                  },
                },
              }}
            >
              <ToggleButton value="today">Today</ToggleButton>
              <ToggleButton value="week">Week</ToggleButton>
              <ToggleButton value="month">Month</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {/* STATS GRID */}
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <StatPill
                label="Total"
                value={summary?.totalStudents || 0}
                isDark={isDark}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatPill
                label="Present"
                value={summary?.present || 0}
                color={colors.success}
                bg={colors.successBg}
                borderColor={colors.successBorder}
                isDark={isDark}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatPill
                label="Absent"
                value={summary?.absent || 0}
                color={colors.error}
                bg={colors.errorBg}
                borderColor={colors.errorBorder}
                isDark={isDark}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatPill
                label="Att. %"
                value={`${summary?.percentage || 0}%`}
                color={
                  (summary?.percentage || 0) >= 75
                    ? colors.success
                    : colors.warning
                }
                bg={
                  (summary?.percentage || 0) >= 75
                    ? colors.successBg
                    : colors.warningBg
                }
                borderColor={
                  (summary?.percentage || 0) >= 75
                    ? colors.successBorder
                    : colors.warningBorder
                }
                isDark={isDark}
              />
            </Grid>
          </Grid>

          {/* MY CLASSES */}
          {hasClasses && (
            <Paper
              elevation={0}
              sx={{
                mb: 3,
                borderRadius: 4,
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#FAFBFC",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography
                  variant="body2"
                  fontWeight={800}
                  sx={{
                    fontSize: "0.85rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: "text.secondary",
                  }}
                >
                  My Classes
                </Typography>
                <Chip
                  label={`${markedToday}/${totalClasses} Marked`}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: "0.68rem",
                    fontWeight: 800,
                    bgcolor:
                      markedToday === totalClasses
                        ? colors.successBg
                        : colors.warningBg,
                    color:
                      markedToday === totalClasses
                        ? colors.success
                        : colors.warning,
                  }}
                />
              </Box>

              <Stack divider={<Divider />} spacing={0}>
                {summary?.classBreakdown?.map((cls) => (
                  <Box
                    key={cls._id}
                    sx={{
                      px: 2.5,
                      py: 2,
                      transition: "background-color 0.2s",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mb: cls.isMarkedToday ? 1.5 : 0 }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body1"
                          fontWeight={800}
                          sx={{ fontSize: "1rem", letterSpacing: "-0.01em" }}
                        >
                          {cls.name} - {cls.section}
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={{ mt: 0.3 }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: "0.75rem", fontWeight: 600 }}
                          >
                            {cls.studentCount} Students
                          </Typography>
                          {cls.isMarkedToday && (
                            <>
                              <Box
                                sx={{
                                  width: 4,
                                  height: 4,
                                  borderRadius: "50%",
                                  bgcolor: "text.disabled",
                                }}
                              />
                              <Typography
                                variant="caption"
                                sx={{
                                  fontSize: "0.7rem",
                                  color: colors.success,
                                  fontWeight: 800,
                                }}
                              >
                                ✓ Marked
                              </Typography>
                            </>
                          )}
                        </Stack>
                      </Box>
                      {cls.isMarkedToday ? (
                        <Typography
                          variant="h5"
                          fontWeight={900}
                          sx={{
                            color:
                              cls.percentage >= 75
                                ? colors.success
                                : colors.warning,
                          }}
                        >
                          {cls.percentage}%
                        </Typography>
                      ) : (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => navigate("/attendance/mark")}
                          sx={{
                            fontWeight: 800,
                            fontSize: "0.75rem",
                            borderRadius: 2,
                            textTransform: "none",
                            px: 2,
                            boxShadow: "none",
                          }}
                        >
                          Mark
                        </Button>
                      )}
                    </Stack>
                    {cls.isMarkedToday && (
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <LinearProgress
                          variant="determinate"
                          value={cls.percentage}
                          color={cls.percentage >= 75 ? "success" : "warning"}
                          sx={{
                            flex: 1,
                            height: 6,
                            borderRadius: 3,
                            bgcolor: isDark
                              ? alpha("#fff", 0.08)
                              : alpha("#000", 0.06),
                            "& .MuiLinearProgress-bar": {
                              bgcolor:
                                cls.percentage >= 75
                                  ? colors.success
                                  : colors.warning,
                              borderRadius: 3,
                            },
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: "0.7rem",
                            fontWeight: 800,
                            minWidth: 50,
                            textAlign: "right",
                          }}
                        >
                          <Box component="span" sx={{ color: colors.success }}>
                            {cls.present}P
                          </Box>{" "}
                          ·{" "}
                          <Box component="span" sx={{ color: colors.error }}>
                            {cls.absent}A
                          </Box>
                        </Typography>
                      </Stack>
                    )}
                  </Box>
                ))}
              </Stack>
            </Paper>
          )}

          {/* TOP DEFAULTERS + HOLIDAYS */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
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
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    bgcolor: isDark ? alpha("#fff", 0.02) : "#FAFBFC",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="body2"
                    fontWeight={800}
                    sx={{
                      fontSize: "0.85rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      color: "text.secondary",
                      flex: 1,
                    }}
                  >
                    Needs Attention
                  </Typography>
                  <Chip
                    label="< 75%"
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      bgcolor: colors.errorBg,
                      color: colors.error,
                    }}
                  />
                </Box>

                {defaultersLoading ? (
                  <Box sx={{ p: 2 }}>
                    {[1, 2, 3].map((i) => (
                      <Skeleton
                        key={i}
                        variant="rectangular"
                        height={48}
                        sx={{ mb: 1, borderRadius: 2 }}
                      />
                    ))}
                  </Box>
                ) : defaulters.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: "center" }}>
                    <CheckCircleOutlineIcon
                      sx={{ fontSize: 40, color: colors.success, mb: 1 }}
                    />
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      color="text.secondary"
                    >
                      All students are attending well! 🎉
                    </Typography>
                  </Box>
                ) : (
                  <Stack divider={<Divider />}>
                    {defaulters.map((s, idx) => (
                      <Stack
                        key={s._id || idx}
                        direction="row"
                        alignItems="center"
                        spacing={1.5}
                        sx={{
                          px: 2,
                          py: 1.5,
                          cursor: "pointer",
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                        onClick={() => navigate("/students")}
                      >
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: colors.errorBg,
                            color: colors.error,
                            fontSize: "0.75rem",
                            fontWeight: 900,
                          }}
                        >
                          {s.name?.[0]?.toUpperCase() || "S"}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            fontWeight={800}
                            noWrap
                            sx={{ fontSize: "0.85rem" }}
                          >
                            {s.name || "Student"}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ fontSize: "0.7rem", fontWeight: 600 }}
                          >
                            Class {s.className}-{s.section} · Scholar{" "}
                            {s.scholarNumber || "—"}
                          </Typography>
                        </Box>
                        <Chip
                          label={`${s.percentage || 0}%`}
                          size="small"
                          sx={{
                            height: 24,
                            fontSize: "0.75rem",
                            fontWeight: 900,
                            bgcolor: colors.errorBg,
                            color: colors.error,
                          }}
                        />
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
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
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    bgcolor: isDark ? alpha("#fff", 0.02) : "#FAFBFC",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="body2"
                    fontWeight={800}
                    sx={{
                      fontSize: "0.85rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      color: "text.secondary",
                      flex: 1,
                    }}
                  >
                    Upcoming Holidays
                  </Typography>
                </Box>

                {holidaysLoading ? (
                  <Box sx={{ p: 2 }}>
                    {[1, 2].map((i) => (
                      <Skeleton
                        key={i}
                        variant="rectangular"
                        height={48}
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
                        spacing={1.5}
                        sx={{
                          px: 2,
                          py: 1.5,
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      >
                        <Box
                          sx={{
                            width: 46,
                            height: 46,
                            borderRadius: 2,
                            bgcolor: colors.infoBg,
                            color: colors.info,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.65rem",
                              fontWeight: 800,
                              lineHeight: 1,
                            }}
                          >
                            {h.dayName?.toUpperCase()}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "1.1rem",
                              fontWeight: 900,
                              lineHeight: 1.1,
                            }}
                          >
                            {h.date ? new Date(h.date).getDate() : ""}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            fontWeight={800}
                            noWrap
                            sx={{ fontSize: "0.85rem" }}
                          >
                            {h.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: "0.7rem", fontWeight: 600 }}
                          >
                            {h.type} ·{" "}
                            {h.daysUntil === 0
                              ? "Today"
                              : h.daysUntil === 1
                                ? "Tomorrow"
                                : `In ${h.daysUntil} days`}
                          </Typography>
                        </Box>
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
