import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Paper,
  Stack,
  Avatar,
  LinearProgress,
  CircularProgress,
  Button,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Alert,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import PeopleIcon from "@mui/icons-material/People";
import ClassIcon from "@mui/icons-material/Class";
import PersonIcon from "@mui/icons-material/Person";
import SchoolIcon from "@mui/icons-material/School";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EventNoteIcon from "@mui/icons-material/EventNote";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import HistoryIcon from "@mui/icons-material/History";
import AssessmentIcon from "@mui/icons-material/Assessment";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import RefreshIcon from "@mui/icons-material/Refresh";
import WavingHandIcon from "@mui/icons-material/WavingHand";
import useAuth from "../../hooks/useAuth";
import useSettings from "../../hooks/useSettings";
import sessionApi from "../../api/sessionApi";
import classApi from "../../api/classApi";
import teacherApi from "../../api/teacherApi";
import studentApi from "../../api/studentApi";
import attendanceApi from "../../api/attendanceApi";
import WeeklyBackupBanner from "../../components/common/WeeklyBackupBanner";

const StatCard = ({ title, value, subtitle, icon, color, onClick }) => (
  <Card
    sx={{
      height: "100%",
      cursor: onClick ? "pointer" : "default",
      transition: "all 0.2s ease",
      "&:hover": onClick
        ? {
            transform: "translateY(-2px)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          }
        : {},
    }}
    onClick={onClick}
  >
    <CardContent sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography
            variant="body2"
            color="text.secondary"
            fontWeight={500}
            gutterBottom
          >
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={800} color={`${color}.main`}>
            {value ?? "—"}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: 2,
            bgcolor: `${color}.light`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {React.cloneElement(icon, {
            sx: { color: `${color}.dark`, fontSize: 28 },
          })}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const QuickAction = ({ icon, label, color, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 1,
      p: 2,
      borderRadius: 2,
      cursor: "pointer",
      transition: "all 0.2s ease",
      bgcolor: "background.default",
      border: "1px solid",
      borderColor: "divider",
      "&:hover": {
        bgcolor: `${color}.50`,
        borderColor: `${color}.main`,
        transform: "translateY(-2px)",
        boxShadow: `0 6px 16px ${
          color === "primary" ? "rgba(30,77,152,0.15)" : "rgba(0,0,0,0.08)"
        }`,
      },
    }}
  >
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: 2,
        bgcolor: `${color}.light`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {React.cloneElement(icon, {
        sx: { color: `${color}.dark`, fontSize: 22 },
      })}
    </Box>
    <Typography variant="caption" fontWeight={700} textAlign="center">
      {label}
    </Typography>
  </Box>
);

const AttendanceStatBox = ({ label, value, color }) => (
  <Box
    sx={{
      flex: 1,
      textAlign: "center",
      p: 1.5,
      borderRadius: 2,
      bgcolor: `${color}.50`,
      border: "1px solid",
      borderColor: `${color}.200`,
    }}
  >
    <Typography
      variant="caption"
      sx={{ color: `${color}.dark`, fontWeight: 700, fontSize: "0.7rem" }}
    >
      {label}
    </Typography>
    <Typography variant="h5" fontWeight={800} color={`${color}.dark`}>
      {value}
    </Typography>
  </Box>
);

const AdminDashboard = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    sessions: 0,
    activeSession: null,
    classes: 0,
    teachers: 0,
    students: 0,
    loading: true,
  });

  const [todayStats, setTodayStats] = useState(null);
  const [todayLoading, setTodayLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // ─── Load general stats ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [s, c, t, st] = await Promise.all([
          sessionApi.list().catch(() => ({ data: { data: [] } })),
          classApi
            .list({ limit: 1 })
            .catch(() => ({ data: { pagination: { total: 0 } } })),
          teacherApi
            .list({ limit: 1 })
            .catch(() => ({ data: { pagination: { total: 0 } } })),
          studentApi
            .list({ limit: 1 })
            .catch(() => ({ data: { pagination: { total: 0 } } })),
        ]);

        if (!cancelled) {
          const list = s.data?.data || [];
          setStats({
            sessions: list.length,
            activeSession: list.find((x) => x.isActive) || null,
            classes: c.data?.pagination?.total || 0,
            teachers: t.data?.pagination?.total || 0,
            students: st.data?.pagination?.total || 0,
            loading: false,
          });
        }
      } catch {
        if (!cancelled) setStats((p) => ({ ...p, loading: false }));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Load today's attendance ────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setTodayLoading(true);
      try {
        const res = await attendanceApi.getTodayStats();
        const data = res?.data?.data || null;

        if (!cancelled) {
          setTodayStats(data);
          setTodayLoading(false);
        }
      } catch (err) {
        console.error("[Dashboard] Failed to load today stats:", err);
        if (!cancelled) {
          setTodayStats(null);
          setTodayLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

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

  const sessionName = stats.activeSession?.name || null;

  const hasClasses = todayStats?.totalClasses > 0;
  const hasStudents = todayStats?.totalStudents > 0;
  const showData = todayStats && (hasClasses || hasStudents);

  return (
    <Box>
      <WeeklyBackupBanner />
      {/* ─── HERO GREETING CARD ─── */}
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
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={{ xs: 2, sm: 1 }}
          >
            <Box>
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
            </Box>

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
                  alignSelf: { xs: "flex-start", sm: "center" },
                }}
              />
            )}
          </Stack>
        </Box>
      </Paper>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            title="Total Students"
            value={stats.loading ? "—" : stats.students}
            subtitle={
              stats.activeSession ? "Current session" : "No active session"
            }
            icon={<PeopleIcon />}
            color="primary"
            onClick={() => navigate("/students")}
          />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            title="Active Classes"
            value={stats.loading ? "—" : stats.classes}
            subtitle="Currently running"
            icon={<ClassIcon />}
            color="info"
            onClick={() => navigate("/classes")}
          />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            title="Teachers"
            value={stats.loading ? "—" : stats.teachers}
            subtitle="Staff members"
            icon={<PersonIcon />}
            color="success"
            onClick={() => navigate("/teachers")}
          />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            title="Sessions"
            value={stats.loading ? "—" : stats.sessions}
            subtitle="Academic years"
            icon={<SchoolIcon />}
            color="warning"
            onClick={() => navigate("/sessions")}
          />
        </Grid>
      </Grid>

      {/* Today's Attendance Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 3, height: "100%" }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 3 }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar
                  sx={{ bgcolor: "primary.light", width: 40, height: 40 }}
                >
                  <EventNoteIcon sx={{ color: "primary.dark" }} />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Today's Attendance
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {today}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                  disabled={todayLoading}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => navigate("/attendance/mark")}
                  sx={{
                    background:
                      "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
                  }}
                >
                  Mark Now
                </Button>
              </Stack>
            </Stack>

            {todayLoading ? (
              <Box sx={{ py: 5, textAlign: "center" }}>
                <CircularProgress size={36} />
              </Box>
            ) : todayStats?.isHoliday ? (
              <Alert
                severity="warning"
                icon={<BeachAccessIcon />}
                sx={{ borderRadius: 2 }}
              >
                <Typography variant="body2" fontWeight={700}>
                  {todayStats.holiday?.name}
                </Typography>
                <Typography variant="caption">
                  Today is a {todayStats.holiday?.type} holiday. Attendance is
                  blocked.
                </Typography>
              </Alert>
            ) : showData ? (
              <>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.5}
                  sx={{ mb: 3 }}
                >
                  <AttendanceStatBox
                    label="Present"
                    value={todayStats.present}
                    color="success"
                  />
                  <AttendanceStatBox
                    label="Absent"
                    value={todayStats.absent}
                    color="error"
                  />
                  <AttendanceStatBox
                    label="Unmarked"
                    value={todayStats.unmarked}
                    color="warning"
                  />
                  <AttendanceStatBox
                    label="Total"
                    value={todayStats.totalStudents}
                    color="info"
                  />
                </Stack>

                <Box sx={{ mb: 3 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    sx={{ mb: 0.5 }}
                  >
                    <Typography variant="caption" fontWeight={600}>
                      Overall Attendance Rate
                    </Typography>
                    <Typography
                      variant="caption"
                      fontWeight={800}
                      color={
                        todayStats.percentage >= 75
                          ? "success.dark"
                          : todayStats.percentage >= 50
                            ? "warning.dark"
                            : "error.dark"
                      }
                    >
                      {todayStats.percentage}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={todayStats.percentage}
                    color={
                      todayStats.percentage >= 75
                        ? "success"
                        : todayStats.percentage >= 50
                          ? "warning"
                          : "error"
                    }
                    sx={{ borderRadius: 4, height: 8 }}
                  />
                </Box>

                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip
                    icon={<CheckCircleIcon />}
                    label={`${todayStats.markedClasses} Marked`}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    icon={<HourglassBottomIcon />}
                    label={`${todayStats.pendingClasses} Pending`}
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                  <Chip
                    label={`${todayStats.totalClasses} Total Classes`}
                    size="small"
                    color="info"
                    variant="outlined"
                  />
                </Stack>

                {todayStats.classBreakdown?.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      sx={{
                        display: "block",
                        mb: 1,
                        color: "text.secondary",
                        textTransform: "uppercase",
                      }}
                    >
                      Class-wise Breakdown
                    </Typography>
                    <TableContainer sx={{ maxHeight: 280 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell
                              sx={{ fontWeight: 700, bgcolor: "#F8F9FC" }}
                            >
                              Class
                            </TableCell>
                            <TableCell
                              sx={{ fontWeight: 700, bgcolor: "#F8F9FC" }}
                            >
                              Status
                            </TableCell>
                            <TableCell
                              align="center"
                              sx={{ fontWeight: 700, bgcolor: "#F8F9FC" }}
                            >
                              P / A
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{ fontWeight: 700, bgcolor: "#F8F9FC" }}
                            >
                              %
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {todayStats.classBreakdown.map((cls) => (
                            <TableRow key={cls._id} hover>
                              <TableCell>
                                <Typography variant="body2" fontWeight={600}>
                                  {cls.name} - {cls.section}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {cls.totalStudents} students
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {cls.isMarked ? (
                                  <Chip
                                    label="Marked"
                                    size="small"
                                    color="success"
                                    sx={{ height: 22, fontSize: "0.7rem" }}
                                  />
                                ) : (
                                  <Chip
                                    label="Pending"
                                    size="small"
                                    color="warning"
                                    sx={{ height: 22, fontSize: "0.7rem" }}
                                  />
                                )}
                              </TableCell>
                              <TableCell align="center">
                                <Stack
                                  direction="row"
                                  spacing={0.5}
                                  justifyContent="center"
                                >
                                  <Typography
                                    variant="body2"
                                    color="success.dark"
                                    fontWeight={700}
                                  >
                                    {cls.present}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.disabled"
                                  >
                                    /
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="error.dark"
                                    fontWeight={700}
                                  >
                                    {cls.absent}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell align="right">
                                {cls.isMarked ? (
                                  <Typography
                                    variant="body2"
                                    fontWeight={700}
                                    color={
                                      cls.percentage >= 75
                                        ? "success.dark"
                                        : cls.percentage >= 50
                                          ? "warning.dark"
                                          : "error.dark"
                                    }
                                  >
                                    {cls.percentage}%
                                  </Typography>
                                ) : (
                                  <Typography
                                    variant="body2"
                                    color="text.disabled"
                                  >
                                    —
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}
              </>
            ) : (
              <Box sx={{ py: 5, textAlign: "center", color: "text.secondary" }}>
                <EventNoteIcon
                  sx={{ fontSize: 56, color: "text.disabled", mb: 1 }}
                />
                <Typography variant="body2">No data to display yet</Typography>
                <Typography
                  variant="caption"
                  sx={{ display: "block", mt: 0.5 }}
                >
                  Start by creating classes and adding students
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  justifyContent="center"
                  sx={{ mt: 2 }}
                >
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => navigate("/classes")}
                  >
                    Manage Classes
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => navigate("/students")}
                  >
                    Manage Students
                  </Button>
                </Stack>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, height: "100%" }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.5}
              sx={{ mb: 2 }}
            >
              <Avatar sx={{ bgcolor: "success.light", width: 40, height: 40 }}>
                <SchoolIcon sx={{ color: "success.dark" }} />
              </Avatar>
              <Typography variant="h6" fontWeight={700}>
                School Info
              </Typography>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  School Name
                </Typography>
                <Typography variant="body2" fontWeight={700} noWrap>
                  {settings?.schoolName || "Not configured"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Active Session
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {sessionName || "None"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Attendance Hours
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {settings?.attendanceOpenTime || "—"} to{" "}
                  {settings?.attendanceLockTime || "—"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Warning Threshold
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  Below {settings?.warningPercentage || 75}%
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={4} md={2}>
            <QuickAction
              icon={<EventNoteIcon />}
              label="Mark Attendance"
              color="primary"
              onClick={() => navigate("/attendance/mark")}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <QuickAction
              icon={<HistoryIcon />}
              label="History"
              color="info"
              onClick={() => navigate("/attendance/history")}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <QuickAction
              icon={<PeopleIcon />}
              label="Students"
              color="success"
              onClick={() => navigate("/students")}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <QuickAction
              icon={<ClassIcon />}
              label="Classes"
              color="warning"
              onClick={() => navigate("/classes")}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <QuickAction
              icon={<BeachAccessIcon />}
              label="Holidays"
              color="error"
              onClick={() => navigate("/holidays")}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <QuickAction
              icon={<AssessmentIcon />}
              label="Reports"
              color="secondary"
              onClick={() => navigate("/reports")}
            />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default AdminDashboard;
