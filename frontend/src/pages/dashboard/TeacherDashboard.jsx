import React, { useState, useMemo } from "react";
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
  Tooltip,
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
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
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
//  COMPONENT: Stat Pill
// ═══════════════════════════════════════════════════════════════════

const StatPill = ({ label, value, color, bg, borderColor, isDark }) => (
  <Paper
    sx={{
      p: { xs: 1, sm: 1.25 },
      borderRadius: 2,
      border: "1px solid",
      borderColor: borderColor || "divider",
      bgcolor: bg || "background.paper",
      textAlign: "center",
      transition: "transform 0.15s",
      "&:hover": { transform: "translateY(-2px)" },
    }}
  >
    <Typography
      variant="h5"
      fontWeight={900}
      sx={{
        color: color || "text.primary",
        fontSize: { xs: "1.15rem", sm: "1.4rem" },
        lineHeight: 1,
      }}
    >
      {value}
    </Typography>
    <Typography
      variant="caption"
      sx={{
        fontSize: "0.6rem",
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: color || "text.secondary",
        display: "block",
        mt: 0.3,
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

  // ─── Data ─────────────────────────────────────────────────
  const {
    data: summary,
    isLoading: summaryLoading,
    isFetching: summaryFetching,
  } = useTeacherSummary(period);
  const { data: defaulters = [], isLoading: defaultersLoading } =
    useTeacherDefaulters(5, 75);
  const { data: holidays = [], isLoading: holidaysLoading } =
    useUpcomingHolidays(3, 60);

  const loading = summaryLoading;

  // ─── Refresh handler ──────────────────────────────────────
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  };

  // ─── Computed values ──────────────────────────────────────
  const attendanceStatus = summary?.attendanceStatus;
  const hasClasses = (summary?.totalClasses || 0) > 0;

  // ✅ NEW: Check if today is holiday or non-working day
  const isNonWorking = summary?.isHoliday || summary?.isNonWorkingDay;

  // Progress marking status
  const markedToday = summary?.markedClassesToday || 0;
  const totalClasses = summary?.totalClasses || 0;
  const pendingToday = summary?.pendingClassesToday || 0;

  // ─── Colors ───────────────────────────────────────────────
  const colors = {
    success: isDark ? "#4ADE80" : "#15803D",
    successBg: isDark ? alpha("#16A34A", 0.12) : "#DCFCE7",
    successBorder: isDark ? alpha("#16A34A", 0.3) : "#BBF7D0",

    error: isDark ? "#FCA5A5" : "#B91C1C",
    errorBg: isDark ? alpha("#DC2626", 0.12) : "#FEE2E2",
    errorBorder: isDark ? alpha("#DC2626", 0.3) : "#FECACA",

    warning: isDark ? "#FCD34D" : "#B45309",
    warningBg: isDark ? alpha("#F59E0B", 0.12) : "#FEF3C7",
    warningBorder: isDark ? alpha("#F59E0B", 0.3) : "#FDE68A",

    info: isDark ? "#93C5FD" : "#1E4D98",
    infoBg: isDark ? alpha("#3B82F6", 0.12) : "#DBEAFE",
    infoBorder: isDark ? alpha("#3B82F6", 0.3) : "#BFDBFE",
  };

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <Box sx={{ pb: { xs: 8, md: 3 } }}>
      {/* ══════════════════════════════════════════════════════
          COMPACT GREETING HEADER
      ══════════════════════════════════════════════════════ */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 1.5 }}
      >
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Typography
            variant="body1"
            fontWeight={800}
            sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
          >
            {greetingText()}, {user?.name?.split(" ")[0] || "Teacher"}
          </Typography>
          <WavingHandOutlinedIcon
            sx={{
              fontSize: 16,
              color: "#F5A623",
              transform: "rotate(-15deg)",
            }}
          />
        </Stack>
        <IconButton
          size="small"
          onClick={handleRefresh}
          disabled={summaryFetching}
        >
          <RefreshOutlinedIcon
            sx={{
              fontSize: 18,
              animation: summaryFetching ? "spin 1s linear infinite" : "none",
              "@keyframes spin": {
                from: { transform: "rotate(0deg)" },
                to: { transform: "rotate(360deg)" },
              },
            }}
          />
        </IconButton>
      </Stack>

      {/* ══════════════════════════════════════════════════════
          LOADING STATE
      ══════════════════════════════════════════════════════ */}
      {loading ? (
        <Stack spacing={1.5}>
          <Skeleton
            variant="rectangular"
            height={54}
            sx={{ borderRadius: 2 }}
          />
          <Grid container spacing={1}>
            {[1, 2, 3, 4].map((i) => (
              <Grid item xs={3} key={i}>
                <Skeleton
                  variant="rectangular"
                  height={62}
                  sx={{ borderRadius: 2 }}
                />
              </Grid>
            ))}
          </Grid>
          <Skeleton
            variant="rectangular"
            height={200}
            sx={{ borderRadius: 2 }}
          />
        </Stack>
      ) : !hasClasses ? (
        /* ══════════════════════════════════════════════════════
            NO CLASSES ASSIGNED
        ══════════════════════════════════════════════════════ */
        <Alert severity="warning" sx={{ mb: 1.5, borderRadius: 2 }}>
          <Typography variant="body2" fontWeight={700}>
            No classes assigned to you
          </Typography>
          <Typography variant="caption">
            Contact admin to assign classes
          </Typography>
        </Alert>
      ) : isNonWorking ? (
        /* ══════════════════════════════════════════════════════
            ✅ HOLIDAY / NON-WORKING DAY — Beautiful Banner
        ══════════════════════════════════════════════════════ */
        <>
          <Box sx={{ mb: 2 }}>
            <HolidayBanner
              isHoliday={summary.isHoliday}
              holiday={summary.holiday}
              today={summary.today}
              nextWorkingDay={summary.nextWorkingDay}
            />
          </Box>

          {/* Quick Actions (still useful on holidays) */}
          <Paper
            sx={{
              p: 1.5,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Grid container spacing={1}>
              {[
                {
                  icon: <EventNoteOutlinedIcon />,
                  label: "Mark",
                  path: "/attendance/mark",
                },
                {
                  icon: <HistoryOutlinedIcon />,
                  label: "History",
                  path: "/attendance/history",
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
                      gap: 0.4,
                      py: 1,
                      borderRadius: 1.5,
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
                        fontSize: 22,
                        color: isDark ? "#F1F5F9" : "#334155",
                      },
                    })}
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      sx={{ fontSize: "0.7rem" }}
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
        /* ══════════════════════════════════════════════════════
            ✅ NORMAL WORKING DAY — Show all stats
        ══════════════════════════════════════════════════════ */
        <>
          {/* ── Alert Bar ── */}
          {attendanceStatus === "marked" ? (
            <Alert
              severity="success"
              icon={<CheckCircleOutlineIcon />}
              sx={{
                mb: 1.5,
                borderRadius: 2,
                "& .MuiAlert-icon": { alignItems: "center" },
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ width: "100%" }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={700}>
                    All done for today! ✅
                  </Typography>
                  <Typography variant="caption">
                    {markedToday}/{totalClasses} classes marked
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="text"
                  endIcon={<ArrowForwardOutlinedIcon sx={{ fontSize: 14 }} />}
                  onClick={() => navigate("/attendance/history")}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                  }}
                >
                  View
                </Button>
              </Stack>
            </Alert>
          ) : attendanceStatus === "partial" ? (
            <Alert
              severity="warning"
              icon={<ErrorOutlineIcon />}
              sx={{ mb: 1.5, borderRadius: 2 }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ width: "100%" }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={700}>
                    {pendingToday} class{pendingToday !== 1 ? "es" : ""} still
                    pending
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
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    background:
                      "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
                  }}
                >
                  Mark Now
                </Button>
              </Stack>
            </Alert>
          ) : (
            <Alert
              severity="error"
              icon={<ErrorOutlineIcon />}
              sx={{ mb: 1.5, borderRadius: 2 }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ width: "100%" }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={700}>
                    Attendance pending for today
                  </Typography>
                  <Typography variant="caption">
                    {totalClasses} class{totalClasses !== 1 ? "es" : ""} not
                    marked
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  onClick={() => navigate("/attendance/mark")}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                  }}
                >
                  Mark Now
                </Button>
              </Stack>
            </Alert>
          )}

          {/* ── Period Toggle ── */}
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
                  py: 0.3,
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  textTransform: "none",
                  border: "1px solid",
                  borderColor: "divider",
                },
              }}
            >
              <ToggleButton value="today">Today</ToggleButton>
              <ToggleButton value="week">Week</ToggleButton>
              <ToggleButton value="month">Month</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {/* ── Stats 4-Column ── */}
          <Grid container spacing={1} sx={{ mb: 2 }}>
            <Grid item xs={3}>
              <StatPill
                label="Total"
                value={summary?.totalStudents || 0}
                color="text.primary"
                isDark={isDark}
              />
            </Grid>
            <Grid item xs={3}>
              <StatPill
                label="Present"
                value={summary?.present || 0}
                color={colors.success}
                bg={colors.successBg}
                borderColor={colors.successBorder}
                isDark={isDark}
              />
            </Grid>
            <Grid item xs={3}>
              <StatPill
                label="Absent"
                value={summary?.absent || 0}
                color={colors.error}
                bg={colors.errorBg}
                borderColor={colors.errorBorder}
                isDark={isDark}
              />
            </Grid>
            <Grid item xs={3}>
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

          {/* ── My Classes ── */}
          {hasClasses && (
            <Paper
              sx={{
                mb: 2,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  bgcolor: isDark ? alpha("#fff", 0.02) : "#FAFBFC",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography
                  variant="body2"
                  fontWeight={800}
                  sx={{ fontSize: "0.85rem" }}
                >
                  My Classes ({summary?.totalClasses || 0})
                </Typography>
                <Chip
                  label={`${markedToday}/${totalClasses} marked today`}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "0.65rem",
                    fontWeight: 700,
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
                      px: 2,
                      py: 1.25,
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mb: cls.isMarkedToday ? 1 : 0.5 }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          fontWeight={800}
                          sx={{ fontSize: "0.9rem" }}
                        >
                          Class {cls.name} - {cls.section}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: "0.68rem" }}
                          >
                            {cls.studentCount} students
                          </Typography>
                          {cls.isMarkedToday && (
                            <>
                              <Box
                                sx={{
                                  width: 3,
                                  height: 3,
                                  borderRadius: "50%",
                                  bgcolor: "text.disabled",
                                }}
                              />
                              <Typography
                                variant="caption"
                                sx={{
                                  fontSize: "0.68rem",
                                  color: colors.success,
                                  fontWeight: 700,
                                }}
                              >
                                ✓ Marked today
                              </Typography>
                            </>
                          )}
                        </Stack>
                      </Box>
                      {cls.isMarkedToday ? (
                        <Chip
                          label={`${cls.percentage}%`}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            height: 24,
                            fontSize: "0.75rem",
                            bgcolor:
                              cls.percentage >= 75
                                ? colors.successBg
                                : colors.warningBg,
                            color:
                              cls.percentage >= 75
                                ? colors.success
                                : colors.warning,
                          }}
                        />
                      ) : (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => navigate("/attendance/mark")}
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.7rem",
                            textTransform: "none",
                            py: 0.4,
                            px: 1.5,
                            background:
                              "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
                          }}
                        >
                          Mark
                        </Button>
                      )}
                    </Stack>

                    {cls.isMarkedToday && (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <LinearProgress
                          variant="determinate"
                          value={cls.percentage}
                          color={cls.percentage >= 75 ? "success" : "warning"}
                          sx={{
                            flex: 1,
                            height: 4,
                            borderRadius: 2,
                            bgcolor: isDark
                              ? alpha("#fff", 0.06)
                              : alpha("#000", 0.05),
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: "0.65rem",
                            color: "text.secondary",
                            fontWeight: 700,
                            minWidth: 60,
                            textAlign: "right",
                          }}
                        >
                          {cls.present}P · {cls.absent}A
                        </Typography>
                      </Stack>
                    )}
                  </Box>
                ))}
              </Stack>
            </Paper>
          )}

          {/* ── Top Defaulters + Upcoming Holidays ── */}
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={6}>
              <Paper
                sx={{
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  overflow: "hidden",
                  height: "100%",
                }}
              >
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    bgcolor: isDark ? alpha("#fff", 0.02) : "#FAFBFC",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <TrendingDownOutlinedIcon
                    sx={{ fontSize: 16, color: colors.error }}
                  />
                  <Typography
                    variant="body2"
                    fontWeight={800}
                    sx={{ fontSize: "0.82rem", flex: 1 }}
                  >
                    Top Defaulters
                  </Typography>
                  <Chip
                    label="< 75%"
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.62rem",
                      fontWeight: 700,
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
                        height={36}
                        sx={{ mb: 0.75, borderRadius: 1 }}
                      />
                    ))}
                  </Box>
                ) : defaulters.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: "center" }}>
                    <CheckCircleOutlineIcon
                      sx={{ fontSize: 32, color: colors.success, mb: 0.5 }}
                    />
                    <Typography variant="caption" color="text.secondary">
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
                        spacing={1}
                        sx={{
                          px: 2,
                          py: 1,
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      >
                        <Box
                          sx={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            bgcolor: colors.errorBg,
                            color: colors.error,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.65rem",
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {idx + 1}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            noWrap
                            sx={{
                              fontSize: "0.8rem",
                              textTransform: "uppercase",
                            }}
                          >
                            {s.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ fontSize: "0.65rem" }}
                          >
                            Class {s.className}-{s.section} · Roll{" "}
                            {s.rollNumber}
                          </Typography>
                        </Box>
                        <Chip
                          label={`${s.percentage}%`}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: "0.7rem",
                            fontWeight: 800,
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
                sx={{
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  overflow: "hidden",
                  height: "100%",
                }}
              >
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    bgcolor: isDark ? alpha("#fff", 0.02) : "#FAFBFC",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <BeachAccessOutlinedIcon
                    sx={{ fontSize: 16, color: colors.info }}
                  />
                  <Typography
                    variant="body2"
                    fontWeight={800}
                    sx={{ fontSize: "0.82rem", flex: 1 }}
                  >
                    Upcoming Holidays
                  </Typography>
                  <Chip
                    label={`Next ${holidays.length}`}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      bgcolor: colors.infoBg,
                      color: colors.info,
                    }}
                  />
                </Box>

                {holidaysLoading ? (
                  <Box sx={{ p: 2 }}>
                    {[1, 2, 3].map((i) => (
                      <Skeleton
                        key={i}
                        variant="rectangular"
                        height={36}
                        sx={{ mb: 0.75, borderRadius: 1 }}
                      />
                    ))}
                  </Box>
                ) : holidays.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: "center" }}>
                    <CalendarMonthOutlinedIcon
                      sx={{ fontSize: 32, color: "text.disabled", mb: 0.5 }}
                    />
                    <Typography variant="caption" color="text.secondary">
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
                          py: 1.2,
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      >
                        <Box
                          sx={{
                            width: 42,
                            height: 42,
                            borderRadius: 1.5,
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
                              fontSize: "0.62rem",
                              fontWeight: 700,
                              lineHeight: 1,
                            }}
                          >
                            {h.dayName?.toUpperCase()}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "1rem",
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
                            fontWeight={700}
                            noWrap
                            sx={{ fontSize: "0.82rem" }}
                          >
                            {h.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: "0.68rem" }}
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

          {/* ── Quick Actions ── */}
          <Paper
            sx={{
              p: 1.5,
              mt: 2,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Grid container spacing={1}>
              {[
                {
                  icon: <EventNoteOutlinedIcon />,
                  label: "Mark",
                  path: "/attendance/mark",
                },
                {
                  icon: <HistoryOutlinedIcon />,
                  label: "History",
                  path: "/attendance/history",
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
                      gap: 0.4,
                      py: 1,
                      borderRadius: 1.5,
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
                        fontSize: 22,
                        color: isDark ? "#F1F5F9" : "#334155",
                      },
                    })}
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      sx={{ fontSize: "0.7rem" }}
                    >
                      {a.label}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default TeacherDashboard;
