import React, { useCallback, useMemo } from "react";
import {
  Box,
  Grid,
  Typography,
  Chip,
  Paper,
  Stack,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  LinearProgress,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import WavingHandIcon from "@mui/icons-material/WavingHand";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import HourglassBottomOutlinedIcon from "@mui/icons-material/HourglassBottomOutlined";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import ClassOutlinedIcon from "@mui/icons-material/ClassOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
import TodayOutlinedIcon from "@mui/icons-material/TodayOutlined";
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
import WeeklyBackupBanner from "../../components/common/WeeklyBackupBanner";
import HolidayBanner from "../../components/common/HolidayBanner";
import AlertsCard from "./components/AlertsCard";
import ActivityTimeline from "./components/ActivityTimeline";
import { sortClasses } from "../../utils/classSort";

const KpiCard = ({
  label,
  value,
  suffix,
  trend,
  trendInverse,
  icon,
  isDark,
  onClick,
}) => {
  const trendColor =
    trend === null || trend === undefined || trend === 0
      ? "text.disabled"
      : (trendInverse ? trend < 0 : trend > 0)
        ? isDark
          ? "#4ADE80"
          : "success.dark"
        : isDark
          ? "#F87171"
          : "error.dark";

  return (
    <Paper
      onClick={onClick}
      sx={{
        p: { xs: 1.2, sm: 1.5 },
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.15s",
        "&:hover": onClick
          ? {
              borderColor: "primary.main",
              transform: "translateY(-1px)",
            }
          : {},
        height: "100%",
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
      >
        <Box>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 700,
              fontSize: "0.62rem",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              display: "block",
              mb: 0.3,
            }}
          >
            {label}
          </Typography>
          <Typography
            variant="h5"
            fontWeight={900}
            sx={{
              fontSize: { xs: "1.3rem", sm: "1.5rem" },
              lineHeight: 1,
              color: "text.primary",
            }}
          >
            {value}
            {suffix && (
              <Typography
                component="span"
                sx={{ fontSize: "0.85rem", color: "text.secondary", ml: 0.2 }}
              >
                {suffix}
              </Typography>
            )}
          </Typography>
          {trend !== null && trend !== undefined && (
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.2}
              sx={{ mt: 0.3 }}
            >
              {trend > 0 ? (
                <TrendingUpOutlinedIcon
                  sx={{ fontSize: 12, color: trendColor }}
                />
              ) : trend < 0 ? (
                <TrendingDownOutlinedIcon
                  sx={{ fontSize: 12, color: trendColor }}
                />
              ) : null}
              <Typography
                variant="caption"
                sx={{ color: trendColor, fontWeight: 700, fontSize: "0.62rem" }}
              >
                {trend > 0 ? "+" : ""}
                {trend}
                {suffix === "%" ? "%" : ""} vs yesterday
              </Typography>
            </Stack>
          )}
        </Box>
        {icon &&
          React.cloneElement(icon, {
            sx: { color: "text.disabled", fontSize: 20 },
          })}
      </Stack>
    </Paper>
  );
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { isDark } = useThemeMode();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: kpis } = useDashboardKPIs();
  const { data: alertsData, isLoading: alertsLoading } = useDashboardAlerts();
  const { data: activityData, isLoading: activityLoading } =
    useRecentActivity(8);
  const { data: todayStats, isLoading: todayLoading } = useTodayStats();

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  }, [queryClient]);

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

  // Smart Sort: Nursery -> LKG -> UKG -> 1st -> ... -> 10th -> 12th
  const classBreakdown = useMemo(() => {
    const raw = todayStats?.classBreakdown || [];
    return sortClasses(raw);
  }, [todayStats?.classBreakdown]);

  const isNonWorking = todayStats?.isHoliday || todayStats?.isNonWorkingDay;

  const quickActions = [
    {
      icon: <EventNoteOutlinedIcon />,
      label: "Mark",
      path: "/attendance/mark",
      color: isDark ? "#60A5FA" : "#1E4D98",
    },
    {
      icon: <TodayOutlinedIcon />,
      label: "Reports",
      path: "/reports/daily",
      color: isDark ? "#38BDF8" : "#0369A1",
    },
    {
      icon: <PeopleOutlinedIcon />,
      label: "Students",
      path: "/students",
      color: isDark ? "#4ADE80" : "#15803D",
    },
    {
      icon: <ClassOutlinedIcon />,
      label: "Classes",
      path: "/classes",
      color: isDark ? "#FBBF24" : "#92400E",
    },
  ];

  return (
    <Box sx={{ pb: { xs: 10, md: 3 } }}>
      <WeeklyBackupBanner />

      {/* Greeting Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
        flexWrap="wrap"
        gap={1}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography
            variant="body1"
            fontWeight={800}
            sx={{ color: "text.primary" }}
          >
            {greeting()}, {user?.name?.split(" ")[0]}{" "}
            <WavingHandIcon
              sx={{ fontSize: 16, color: "#F5A623", verticalAlign: "middle" }}
            />
          </Typography>
          {sessionName && (
            <Chip
              label={sessionName}
              size="small"
              sx={{
                height: 22,
                fontSize: "0.68rem",
                fontWeight: 700,
                bgcolor: isDark ? "rgba(245,166,35,0.15)" : "#FFF4E5",
                color: isDark ? "#FCD34D" : "#92400E",
                border: "1px solid",
                borderColor: isDark ? "rgba(245,166,35,0.3)" : "#FED7AA",
              }}
            />
          )}
        </Stack>
        <Button
          size="small"
          startIcon={<RefreshOutlinedIcon sx={{ fontSize: 16 }} />}
          onClick={handleRefresh}
          sx={{
            fontWeight: 700,
            fontSize: "0.72rem",
            textTransform: "none",
            color: "text.secondary",
          }}
        >
          Refresh
        </Button>
      </Stack>

      {todayLoading ? (
        <Box sx={{ p: 3, textAlign: "center" }}>
          <CircularProgress size={28} />
        </Box>
      ) : isNonWorking ? (
        <>
          <Box sx={{ mb: 2 }}>
            <HolidayBanner
              isHoliday={todayStats.isHoliday}
              holiday={todayStats.holiday}
              today={todayStats.today}
              nextWorkingDay={todayStats.nextWorkingDay}
            />
          </Box>

          <Paper
            sx={{
              p: 1.5,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Grid container spacing={1}>
              {quickActions.map((action) => (
                <Grid item xs={3} key={action.path}>
                  <Box
                    onClick={() => navigate(action.path)}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 0.5,
                      py: 1.2,
                      borderRadius: 1.5,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      "&:hover": {
                        bgcolor: "action.hover",
                        transform: "translateY(-1px)",
                      },
                    }}
                  >
                    {React.cloneElement(action.icon, {
                      sx: { fontSize: 22, color: action.color },
                    })}
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      sx={{
                        fontSize: "0.68rem",
                        textAlign: "center",
                        color: "text.primary",
                      }}
                    >
                      {action.label}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </>
      ) : (
        <>
          {/* KPI Cards */}
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={3}>
              <KpiCard
                label="Attendance"
                value={kpis?.attendancePercentage ?? 0}
                suffix="%"
                trend={kpis?.attendanceTrend}
                icon={<PercentOutlinedIcon />}
                isDark={isDark}
                onClick={() => navigate("/reports/daily")}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard
                label="Absent"
                value={kpis?.totalAbsent ?? 0}
                trend={kpis?.absentTrend}
                trendInverse
                icon={<EventBusyOutlinedIcon />}
                isDark={isDark}
                onClick={() => navigate("/reports/daily")}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard
                label="Pending"
                value={kpis?.pendingClasses ?? 0}
                icon={<HourglassBottomOutlinedIcon />}
                isDark={isDark}
                onClick={() => navigate("/attendance/mark")}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard
                label="New Admits"
                value={kpis?.newAdmissions24h ?? 0}
                icon={<PersonAddOutlinedIcon />}
                isDark={isDark}
                onClick={() => navigate("/students")}
              />
            </Grid>
          </Grid>

          {/* Class-wise Table (Sorted Nursery -> 10th/12th) */}
          <Paper
            sx={{
              borderRadius: 2,
              mb: 2,
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box
              sx={{
                px: 2,
                py: 1.2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid",
                borderColor: "divider",
                bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#FAFBFC",
              }}
            >
              <Typography
                variant="body2"
                fontWeight={800}
                sx={{ fontSize: "0.85rem" }}
              >
                Class-wise Attendance
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowForwardOutlinedIcon sx={{ fontSize: 14 }} />}
                onClick={() => navigate("/attendance/mark")}
                sx={{
                  fontWeight: 700,
                  fontSize: "0.72rem",
                  textTransform: "none",
                }}
              >
                Mark Now
              </Button>
            </Box>

            {classBreakdown.length === 0 ? (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  No classes found
                </Typography>
              </Box>
            ) : (
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.72rem",
                          bgcolor: isDark ? "#1E293B" : "#F1F5F9",
                        }}
                      >
                        Class
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.72rem",
                          bgcolor: isDark ? "#1E293B" : "#F1F5F9",
                        }}
                      >
                        Teacher
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.72rem",
                          bgcolor: isDark ? "#1E293B" : "#F1F5F9",
                        }}
                      >
                        Total
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.72rem",
                          bgcolor: isDark ? "#1E293B" : "#F1F5F9",
                          color: isDark ? "#86EFAC" : "success.dark",
                        }}
                      >
                        P
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.72rem",
                          bgcolor: isDark ? "#1E293B" : "#F1F5F9",
                          color: isDark ? "#FCA5A5" : "error.dark",
                        }}
                      >
                        A
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.72rem",
                          bgcolor: isDark ? "#1E293B" : "#F1F5F9",
                        }}
                      >
                        %
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.72rem",
                          bgcolor: isDark ? "#1E293B" : "#F1F5F9",
                        }}
                      >
                        Status
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {classBreakdown.map((cls) => (
                      <TableRow key={cls._id} hover>
                        <TableCell>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{ fontSize: "0.82rem" }}
                          >
                            {cls.name}-{cls.section}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: "0.72rem",
                              color: cls.classTeacher
                                ? "text.primary"
                                : "text.disabled",
                            }}
                          >
                            {cls.classTeacher || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{ fontSize: "0.82rem" }}
                          >
                            {cls.totalStudents}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{
                              fontSize: "0.82rem",
                              color: isDark ? "#86EFAC" : "success.dark",
                            }}
                          >
                            {cls.present}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{
                              fontSize: "0.82rem",
                              color: isDark ? "#FCA5A5" : "error.dark",
                            }}
                          >
                            {cls.absent}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {cls.isMarked ? (
                            <Stack alignItems="center" spacing={0.2}>
                              <Typography
                                variant="body2"
                                fontWeight={800}
                                sx={{
                                  fontSize: "0.82rem",
                                  color:
                                    cls.percentage >= 75
                                      ? isDark
                                        ? "#4ADE80"
                                        : "success.dark"
                                      : cls.percentage >= 50
                                        ? isDark
                                          ? "#FBBF24"
                                          : "warning.dark"
                                        : isDark
                                          ? "#F87171"
                                          : "error.dark",
                                }}
                              >
                                {cls.percentage}%
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={cls.percentage}
                                color={
                                  cls.percentage >= 75
                                    ? "success"
                                    : cls.percentage >= 50
                                      ? "warning"
                                      : "error"
                                }
                                sx={{
                                  width: 40,
                                  height: 3,
                                  borderRadius: 2,
                                  bgcolor: isDark
                                    ? "rgba(255,255,255,0.06)"
                                    : "rgba(0,0,0,0.04)",
                                }}
                              />
                            </Stack>
                          ) : (
                            <Typography variant="caption" color="text.disabled">
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={cls.isMarked ? "✓" : "⏳"}
                            size="small"
                            color={cls.isMarked ? "success" : "warning"}
                            sx={{
                              height: 20,
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              minWidth: 32,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Grand Total Row */}
                    <TableRow
                      sx={{
                        bgcolor: isDark ? "rgba(59,130,246,0.08)" : "#F0F4FF",
                        "& td": { borderBottom: "none" },
                      }}
                    >
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={900}
                          sx={{ fontSize: "0.82rem" }}
                        >
                          TOTAL
                        </Typography>
                      </TableCell>
                      <TableCell />
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={900}>
                          {todayStats?.totalStudents || 0}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          fontWeight={900}
                          sx={{ color: isDark ? "#86EFAC" : "success.dark" }}
                        >
                          {todayStats?.present || 0}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          fontWeight={900}
                          sx={{ color: isDark ? "#FCA5A5" : "error.dark" }}
                        >
                          {todayStats?.absent || 0}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          fontWeight={900}
                          sx={{ color: isDark ? "#4ADE80" : "success.dark" }}
                        >
                          {todayStats?.percentage || 0}%
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${todayStats?.markedClasses || 0}/${todayStats?.totalClasses || 0}`}
                          size="small"
                          color="primary"
                          sx={{
                            fontWeight: 800,
                            height: 20,
                            fontSize: "0.65rem",
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* Alerts + Activity */}
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid item xs={12} md={5}>
              <AlertsCard data={alertsData} isLoading={alertsLoading} />
            </Grid>
            <Grid item xs={12} md={7}>
              <ActivityTimeline
                data={activityData?.slice(0, 6)}
                isLoading={activityLoading}
              />
            </Grid>
          </Grid>

          {/* Quick Actions */}
          <Paper
            sx={{
              p: 1.5,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Grid container spacing={1}>
              {quickActions.map((action) => (
                <Grid item xs={3} key={action.path}>
                  <Box
                    onClick={() => navigate(action.path)}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 0.5,
                      py: 1.2,
                      borderRadius: 1.5,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      "&:hover": {
                        bgcolor: "action.hover",
                        transform: "translateY(-1px)",
                      },
                    }}
                  >
                    {React.cloneElement(action.icon, {
                      sx: { fontSize: 22, color: action.color },
                    })}
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      sx={{
                        fontSize: "0.68rem",
                        textAlign: "center",
                        color: "text.primary",
                      }}
                    >
                      {action.label}
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

export default AdminDashboard;
