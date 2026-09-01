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
  Skeleton,
  useMediaQuery,
  useTheme,
  alpha,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined";
import TrendingFlatOutlinedIcon from "@mui/icons-material/TrendingFlatOutlined";
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import HourglassBottomOutlinedIcon from "@mui/icons-material/HourglassBottomOutlined";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import TodayOutlinedIcon from "@mui/icons-material/TodayOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import ClassOutlinedIcon from "@mui/icons-material/ClassOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
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

// trendInverse: true = lower is better (Absent, Pending)
const KpiCard = ({
  label,
  value,
  suffix = "",
  trend,
  trendInverse = false,
  icon,
  loading,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const isGood =
    trend === null || trend === undefined || trend === 0
      ? null
      : trendInverse
        ? trend < 0
        : trend > 0;

  const trendColor =
    isGood === null
      ? theme.palette.text.disabled
      : isGood
        ? theme.palette.success.main
        : theme.palette.error.main;

  const TrendIcon =
    trend > 0
      ? TrendingUpOutlinedIcon
      : trend < 0
        ? TrendingDownOutlinedIcon
        : TrendingFlatOutlinedIcon;

  if (loading) {
    return (
      <Paper
        sx={{
          p: 2,
          borderRadius: 3,
          height: "100%",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Skeleton width={80} height={14} />
        <Skeleton width={60} height={36} sx={{ mt: 1 }} />
        <Skeleton width={100} height={20} sx={{ mt: 1 }} />
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        p: { xs: 1.75, sm: 2 },
        borderRadius: 3,
        height: "100%",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        transition: "box-shadow 0.2s, transform 0.15s",
        "&:hover": {
          boxShadow: isDark
            ? "0 8px 24px rgba(0,0,0,0.35)"
            : "0 8px 24px rgba(15,23,42,0.08)",
          transform: "translateY(-2px)",
        },
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        sx={{ mb: 1 }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            fontSize: "0.65rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "text.secondary",
          }}
        >
          {label}
        </Typography>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: isDark ? alpha("#fff", 0.06) : "#F1F5F9",
            color: "text.secondary",
          }}
        >
          {icon}
        </Box>
      </Stack>

      <Typography
        sx={{
          fontSize: { xs: "1.75rem", sm: "2rem" },
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          color: "text.primary",
        }}
      >
        {value}
        {suffix && (
          <Box
            component="span"
            sx={{ fontSize: "1rem", color: "text.secondary", ml: 0.25 }}
          >
            {suffix}
          </Box>
        )}
      </Typography>

      {trend !== null && trend !== undefined && (
        <Chip
          size="small"
          icon={<TrendIcon sx={{ fontSize: "14px !important" }} />}
          label={`${trend > 0 ? "+" : ""}${trend}${suffix === "%" ? "%" : ""} vs yesterday`}
          sx={{
            mt: 1.25,
            height: 24,
            fontWeight: 700,
            fontSize: "0.68rem",
            bgcolor: alpha(trendColor, isDark ? 0.15 : 0.1),
            color: trendColor,
            border: "none",
            "& .MuiChip-icon": { color: "inherit" },
          }}
        />
      )}
    </Paper>
  );
};

const ClassMobileCard = ({ cls }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const pct = cls.percentage ?? 0;
  const pctColor = !cls.isMarked
    ? theme.palette.text.disabled
    : pct >= 75
      ? theme.palette.success.main
      : pct >= 50
        ? theme.palette.warning.main
        : theme.palette.error.main;

  return (
    <Paper
      sx={{
        p: 1.75,
        borderRadius: 2.5,
        border: "1px solid",
        borderColor: "divider",
        mb: 1,
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            fontWeight={800}
            sx={{ fontSize: "0.95rem", letterSpacing: "-0.02em" }}
          >
            {cls.name}-{cls.section}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: "0.72rem", textTransform: "uppercase" }}
          >
            {cls.classTeacher || "No teacher assigned"}
          </Typography>
        </Box>
        <Chip
          size="small"
          icon={
            cls.isMarked ? (
              <CheckCircleOutlineIcon sx={{ fontSize: "14px !important" }} />
            ) : (
              <ScheduleOutlinedIcon sx={{ fontSize: "14px !important" }} />
            )
          }
          label={cls.isMarked ? "Marked" : "Pending"}
          sx={{
            height: 24,
            fontWeight: 700,
            fontSize: "0.68rem",
            bgcolor: cls.isMarked
              ? alpha(theme.palette.success.main, isDark ? 0.15 : 0.1)
              : alpha(theme.palette.warning.main, isDark ? 0.15 : 0.1),
            color: cls.isMarked
              ? theme.palette.success.main
              : theme.palette.warning.main,
            "& .MuiChip-icon": { color: "inherit" },
          }}
        />
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mt: 1.5 }} alignItems="center">
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, color: "text.secondary" }}
        >
          Total {cls.totalStudents}
        </Typography>
        <Typography
          variant="caption"
          sx={{ fontWeight: 800, color: "success.main" }}
        >
          P {cls.present}
        </Typography>
        <Typography
          variant="caption"
          sx={{ fontWeight: 800, color: "error.main" }}
        >
          A {cls.absent}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography
          fontWeight={800}
          sx={{ fontSize: "0.95rem", color: pctColor }}
        >
          {cls.isMarked ? `${pct}%` : "—"}
        </Typography>
      </Stack>

      {cls.isMarked && (
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            mt: 1,
            height: 4,
            borderRadius: 2,
            bgcolor: isDark ? alpha("#fff", 0.08) : "#F1F5F9",
            "& .MuiLinearProgress-bar": {
              bgcolor: pctColor,
              borderRadius: 2,
            },
          }}
        />
      )}
      {!cls.isMarked && (
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{
            display: "block",
            mt: 1,
            fontStyle: "italic",
            fontSize: "0.7rem",
          }}
        >
          Not marked yet
        </Typography>
      )}
    </Paper>
  );
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { isDark } = useThemeMode();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs();
  const { data: alertsData, isLoading: alertsLoading } = useDashboardAlerts();
  const { data: activityData, isLoading: activityLoading } =
    useRecentActivity(8);
  const { data: todayStats, isLoading: todayLoading } = useTodayStats();

  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    setTimeout(() => setRefreshing(false), 600);
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
    },
    {
      icon: <TodayOutlinedIcon />,
      label: "Reports",
      path: "/reports/daily",
    },
    {
      icon: <PeopleOutlinedIcon />,
      label: "Students",
      path: "/students",
    },
    {
      icon: <ClassOutlinedIcon />,
      label: "Classes",
      path: "/classes",
    },
  ];

  return (
    <Box sx={{ pb: { xs: 10, md: 3 } }}>
      <WeeklyBackupBanner />

      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2.5 }}
        flexWrap="wrap"
        gap={1}
      >
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: { xs: "1.05rem", sm: "1.15rem" },
              letterSpacing: "-0.02em",
            }}
          >
            {greeting()}, {user?.name?.split(" ")[0]} 👋
          </Typography>
          {sessionName && (
            <Chip
              label={sessionName}
              size="small"
              sx={{
                height: 24,
                fontWeight: 700,
                fontSize: "0.7rem",
                bgcolor: isDark ? alpha("#F59E0B", 0.12) : "#FFF7ED",
                color: isDark ? "#FCD34D" : "#B45309",
                border: "1px solid",
                borderColor: isDark ? alpha("#F59E0B", 0.25) : "#FED7AA",
              }}
            />
          )}
          <Chip
            label={new Date().toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            size="small"
            sx={{
              height: 24,
              fontWeight: 700,
              fontSize: "0.7rem",
              bgcolor: isDark ? alpha("#3B82F6", 0.12) : "#EFF6FF",
              color: isDark ? "#93C5FD" : "#1D4ED8",
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

      {todayLoading && !todayStats ? (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <CircularProgress size={32} />
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
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Grid container spacing={1}>
              {quickActions.map((a) => (
                <Grid item xs={3} key={a.path}>
                  <Box
                    onClick={() => navigate(a.path)}
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      textAlign: "center",
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    {React.cloneElement(a.icon, {
                      sx: { fontSize: 22, color: "text.primary", mb: 0.5 },
                    })}
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      display="block"
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
          {/* KPI Cards */}
          <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
            <Grid item xs={6} sm={3}>
              <KpiCard
                label="Attendance"
                value={kpis?.attendancePercentage ?? 0}
                suffix="%"
                trend={kpis?.attendanceTrend}
                trendInverse={false}
                icon={<PercentOutlinedIcon sx={{ fontSize: 18 }} />}
                loading={kpisLoading}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard
                label="Absent"
                value={kpis?.totalAbsent ?? 0}
                trend={kpis?.absentTrend}
                trendInverse
                icon={<EventBusyOutlinedIcon sx={{ fontSize: 18 }} />}
                loading={kpisLoading}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard
                label="Pending"
                value={kpis?.pendingClasses ?? 0}
                trendInverse
                icon={<HourglassBottomOutlinedIcon sx={{ fontSize: 18 }} />}
                loading={kpisLoading}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard
                label="New Admits"
                value={kpis?.newAdmissions24h ?? 0}
                icon={<PersonAddOutlinedIcon sx={{ fontSize: 18 }} />}
                loading={kpisLoading}
              />
            </Grid>
          </Grid>

          {/* Class-wise section */}
          <Paper
            sx={{
              borderRadius: 3,
              mb: 2.5,
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                px: 2,
                py: 1.5,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                fontWeight={800}
                sx={{ fontSize: "0.95rem", letterSpacing: "-0.02em" }}
              >
                Class-wise Attendance
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowForwardOutlinedIcon sx={{ fontSize: 14 }} />}
                onClick={() => navigate("/attendance/mark")}
                sx={{
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  textTransform: "none",
                }}
              >
                Mark Now
              </Button>
            </Box>

            {classBreakdown.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography color="text.secondary">No classes found</Typography>
              </Box>
            ) : isMobile ? (
              <Box sx={{ p: 1.5 }}>
                {classBreakdown.map((cls) => (
                  <ClassMobileCard key={cls._id} cls={cls} />
                ))}
              </Box>
            ) : (
              <TableContainer sx={{ maxHeight: 440 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {[
                        "Class",
                        "Teacher",
                        "Total",
                        "P",
                        "A",
                        "%",
                        "Status",
                      ].map((h) => (
                        <TableCell
                          key={h}
                          align={
                            ["Total", "P", "A", "%", "Status"].includes(h)
                              ? "center"
                              : "left"
                          }
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.7rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            color: "text.secondary",
                            bgcolor: isDark ? "#111827" : "#F8FAFC",
                            borderColor: "divider",
                          }}
                        >
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {classBreakdown.map((cls, i) => (
                      <TableRow
                        key={cls._id}
                        hover
                        sx={{
                          bgcolor:
                            i % 2 === 1
                              ? isDark
                                ? alpha("#fff", 0.02)
                                : alpha("#0F172A", 0.02)
                              : "transparent",
                        }}
                      >
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            borderColor: "divider",
                          }}
                        >
                          {cls.name}-{cls.section}
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: "0.8rem",
                            textTransform: "uppercase",
                            color: "text.secondary",
                            borderColor: "divider",
                          }}
                        >
                          {cls.classTeacher || "—"}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{ fontWeight: 700, borderColor: "divider" }}
                        >
                          {cls.totalStudents}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            fontWeight: 700,
                            color: "success.main",
                            borderColor: "divider",
                          }}
                        >
                          {cls.present}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            fontWeight: 700,
                            color: "error.main",
                            borderColor: "divider",
                          }}
                        >
                          {cls.absent}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{ borderColor: "divider", minWidth: 90 }}
                        >
                          {cls.isMarked ? (
                            <Stack alignItems="center" spacing={0.5}>
                              <Typography fontWeight={800} fontSize="0.85rem">
                                {cls.percentage}%
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={cls.percentage}
                                sx={{
                                  width: 48,
                                  height: 4,
                                  borderRadius: 2,
                                  bgcolor: isDark
                                    ? alpha("#fff", 0.08)
                                    : "#F1F5F9",
                                  "& .MuiLinearProgress-bar": {
                                    bgcolor:
                                      cls.percentage >= 75
                                        ? "success.main"
                                        : cls.percentage >= 50
                                          ? "warning.main"
                                          : "error.main",
                                  },
                                }}
                              />
                            </Stack>
                          ) : (
                            <Typography
                              variant="caption"
                              color="text.disabled"
                              fontStyle="italic"
                            >
                              Not marked yet
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{ borderColor: "divider" }}
                        >
                          <Chip
                            size="small"
                            label={cls.isMarked ? "Marked" : "Pending"}
                            sx={{
                              height: 22,
                              fontWeight: 700,
                              fontSize: "0.65rem",
                              bgcolor: cls.isMarked
                                ? alpha(theme.palette.success.main, 0.12)
                                : alpha(theme.palette.warning.main, 0.12),
                              color: cls.isMarked
                                ? theme.palette.success.main
                                : theme.palette.warning.main,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow
                      sx={{
                        bgcolor: isDark ? alpha("#3B82F6", 0.08) : "#F0F4FF",
                        "& td": { borderBottom: "none", fontWeight: 800 },
                      }}
                    >
                      <TableCell>TOTAL</TableCell>
                      <TableCell />
                      <TableCell align="center">
                        {todayStats?.totalStudents || 0}
                      </TableCell>
                      <TableCell align="center" sx={{ color: "success.main" }}>
                        {todayStats?.present || 0}
                      </TableCell>
                      <TableCell align="center" sx={{ color: "error.main" }}>
                        {todayStats?.absent || 0}
                      </TableCell>
                      <TableCell align="center">
                        {todayStats?.percentage || 0}%
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={`${todayStats?.markedClasses || 0}/${todayStats?.totalClasses || 0}`}
                          color="primary"
                          sx={{
                            height: 22,
                            fontWeight: 800,
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

          <Paper
            sx={{
              p: 1.5,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Grid container spacing={1}>
              {quickActions.map((a) => (
                <Grid item xs={3} key={a.path}>
                  <Box
                    onClick={() => navigate(a.path)}
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      "&:hover": {
                        bgcolor: "action.hover",
                        transform: "translateY(-1px)",
                      },
                    }}
                  >
                    {React.cloneElement(a.icon, {
                      sx: { fontSize: 22, color: "text.primary", mb: 0.5 },
                    })}
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      display="block"
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

export default AdminDashboard;
