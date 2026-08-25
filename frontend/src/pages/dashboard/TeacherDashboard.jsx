import React, { useState, useMemo, useCallback } from "react";
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
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import WavingHandOutlinedIcon from "@mui/icons-material/WavingHandOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import BeachAccessOutlinedIcon from "@mui/icons-material/BeachAccessOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
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
//  HELPERS
// ═══════════════════════════════════════════════════════════════════

const greetingText = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

// ═══════════════════════════════════════════════════════════════════
//  PREMIUM STAT PILL
// ═══════════════════════════════════════════════════════════════════
const StatPill = ({ label, value, color, bg, borderColor, isDark }) => (
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
        fontSize: { xs: "1.5rem", sm: "1.75rem" },
        lineHeight: 1.1,
        letterSpacing: "-0.03em",
      }}
    >
      {value}
    </Typography>
    <Typography
      variant="caption"
      sx={{
        fontSize: "0.68rem",
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

// ═══════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark } = useThemeMode();
  const muiTheme = useTheme();
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

  // Progress marking status
  const markedToday = summary?.markedClassesToday || 0;
  const totalClasses = summary?.totalClasses || 0;
  const pendingToday = summary?.pendingClassesToday || 0;

  // ─── Premium Colors ───────────────────────────────────────
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

  return (
    <Box sx={{ pb: { xs: 8, md: 3 } }}>
      {/* HEADER */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography
            variant="body1"
            fontWeight={800}
            sx={{
              fontSize: { xs: "1rem", sm: "1.1rem" },
              letterSpacing: "-0.02em",
            }}
          >
            {greetingText()}, {user?.name?.split(" ")[0] || "Teacher"}
          </Typography>
          <WavingHandOutlinedIcon
            sx={{
              fontSize: 18,
              color: "#F59E0B",
              transform: "rotate(-15deg)",
            }}
          />
        </Stack>
        <Button
          size="small"
          startIcon={
            <RefreshOutlinedIcon
              sx={{
                fontSize: 16,
                animation: refreshing ? "spin 0.8s linear infinite" : "none",
                "@keyframes spin": {
                  from: { transform: "rotate(0deg)" },
                  to: { transform: "rotate(360deg)" },
                },
              }}
            />
          }
          onClick={handleRefresh}
          disabled={refreshing}
          sx={{
            fontWeight: 700,
            fontSize: "0.75rem",
            textTransform: "none",
            color: "text.secondary",
          }}
        >
          Refresh
        </Button>
      </Stack>

      {/* LOADING STATE */}
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
                  sx={{ borderRadius: 3 }}
                />
              </Grid>
            ))}
          </Grid>
          <Skeleton
            variant="rectangular"
            height={240}
            sx={{ borderRadius: 3 }}
          />
        </Stack>
      ) : !hasClasses ? (
        /* NO CLASSES ASSIGNED */
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 3 }}>
          <Typography variant="body2" fontWeight={800}>
            No classes assigned to you
          </Typography>
          <Typography variant="caption">
            Contact admin to assign classes
          </Typography>
        </Alert>
      ) : isNonWorking ? (
        /* HOLIDAY / NON-WORKING DAY */
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
        /* NORMAL WORKING DAY */
        <>
          {/* Alert Bar */}
          {attendanceStatus === "marked" ? (
            <Alert
              severity="success"
              icon={<CheckCircleOutlineIcon sx={{ mt: 0.5 }} />}
              sx={{ mb: 2, borderRadius: 3, alignItems: "center" }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ width: "100%" }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={800}>
                    All done for today! ✅
                  </Typography>
                  <Typography variant="caption">
                    {markedToday}/{totalClasses} classes marked
                  </Typography>
                </Box>
              </Stack>
            </Alert>
          ) : attendanceStatus === "partial" ? (
            <Alert
              severity="warning"
              icon={<ErrorOutlineIcon sx={{ mt: 0.5 }} />}
              sx={{ mb: 2, borderRadius: 3, alignItems: "center" }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ width: "100%" }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={800}>
                    {pendingToday} classes pending
                  </Typography>
                  <Typography variant="caption">
                    {markedToday} of {totalClasses} marked
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => navigate("/attendance/mark")}
                  sx={{
                    textTransform: "none",
                    fontWeight: 800,
                    fontSize: "0.75rem",
                    borderRadius: 2,
                  }}
                >
                  Mark Now
                </Button>
              </Stack>
            </Alert>
          ) : (
            <Alert
              severity="error"
              icon={<ErrorOutlineIcon sx={{ mt: 0.5 }} />}
              sx={{ mb: 2, borderRadius: 3, alignItems: "center" }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ width: "100%" }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={800}>
                    Attendance pending for today
                  </Typography>
                  <Typography variant="caption">
                    {totalClasses} classes not marked
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  onClick={() => navigate("/attendance/mark")}
                  sx={{
                    textTransform: "none",
                    fontWeight: 800,
                    fontSize: "0.75rem",
                    borderRadius: 2,
                  }}
                >
                  Mark Now
                </Button>
              </Stack>
            </Alert>
          )}

          {/* Period Toggle */}
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
              Stats · {summary?.periodLabel || "Today"}
            </Typography>
            <ToggleButtonGroup
              value={period}
              exclusive
              onChange={(_, val) => val && setPeriod(val)}
              size="small"
              sx={{
                "& .MuiToggleButton-root": {
                  px: 1.5,
                  py: 0.4,
                  fontWeight: 800,
                  fontSize: "0.7rem",
                  textTransform: "none",
                  borderRadius: 2,
                },
              }}
            >
              <ToggleButton value="today">Today</ToggleButton>
              <ToggleButton value="week">Week</ToggleButton>
              <ToggleButton value="month">Month</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {/* Stats 4-Column */}
          <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
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

          {/* My Classes (Card-Row Pattern) */}
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
                  bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#F8FAFC",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography
                  variant="body2"
                  fontWeight={800}
                  sx={{ fontSize: "0.9rem" }}
                >
                  My Classes ({summary?.totalClasses || 0})
                </Typography>
                <Chip
                  label={`${markedToday}/${totalClasses} marked today`}
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
                      sx={{ mb: cls.isMarkedToday ? 1.5 : 0.5 }}
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
                                  fontSize: "0.75rem",
                                  color: colors.success,
                                  fontWeight: 700,
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
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: "0.7rem",
                            color: "text.secondary",
                            fontWeight: 800,
                            minWidth: 60,
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

          {/* Top Defaulters + Upcoming Holidays */}
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
                    bgcolor: isDark ? alpha("#fff", 0.02) : "#F8FAFC",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <TrendingDownOutlinedIcon
                    sx={{ fontSize: 18, color: colors.error }}
                  />
                  <Typography
                    variant="body2"
                    fontWeight={800}
                    sx={{ fontSize: "0.85rem", flex: 1 }}
                  >
                    Top Defaulters
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
                        height={44}
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
                      fontWeight={600}
                      color="text.secondary"
                    >
                      No defaulters — great work! 🎉
                    </Typography>
                  </Box>
                ) : (
                  <Stack divider={<Divider />}>
                    {defaulters.map((s, idx) => (
                      <Stack
                        key={s._id}
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
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            bgcolor: colors.errorBg,
                            color: colors.error,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.7rem",
                            fontWeight: 900,
                            flexShrink: 0,
                          }}
                        >
                          {idx + 1}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            fontWeight={800}
                            noWrap
                            sx={{ fontSize: "0.85rem" }}
                          >
                            {s.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ fontSize: "0.7rem", fontWeight: 600 }}
                          >
                            Class {s.className}-{s.section} · Scholar{" "}
                            {s.scholarNumber}
                          </Typography>
                        </Box>
                        <Chip
                          label={`${s.percentage}%`}
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
                    bgcolor: isDark ? alpha("#fff", 0.02) : "#F8FAFC",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <BeachAccessOutlinedIcon
                    sx={{ fontSize: 18, color: colors.info }}
                  />
                  <Typography
                    variant="body2"
                    fontWeight={800}
                    sx={{ fontSize: "0.85rem", flex: 1 }}
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
                        key={h._id}
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
                            {new Date(h.date).getDate()}
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
