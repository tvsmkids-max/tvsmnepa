import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Grid,
  Typography,
  Paper,
  Stack,
  Chip,
  CircularProgress,
  Button,
  Divider,
  LinearProgress,
  Avatar,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import BeachAccessOutlinedIcon from "@mui/icons-material/BeachAccessOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import HourglassEmptyOutlinedIcon from "@mui/icons-material/HourglassEmptyOutlined";
import useAuth from "../../hooks/useAuth";
import useSettings from "../../hooks/useSettings";
import sessionApi from "../../api/sessionApi";
import classApi from "../../api/classApi";
import teacherApi from "../../api/teacherApi";
import studentApi from "../../api/studentApi";
import attendanceApi from "../../api/attendanceApi";

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

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setTodayLoading(true);
      try {
        const res = await attendanceApi.getTodayStats();
        if (!cancelled) {
          setTodayStats(res.data?.data || null);
          setTodayLoading(false);
        }
      } catch {
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

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  };

  const sessionName = stats.activeSession?.name || null;
  const showData =
    todayStats && (todayStats.totalClasses > 0 || todayStats.totalStudents > 0);

  return (
    <Box sx={{ pb: { xs: 10, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          fontWeight={800}
          sx={{ color: "#1A1D21", mb: 0.3 }}
        >
          {greeting()}, {user?.name?.split(" ")[0]}
        </Typography>
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          flexWrap="wrap"
        >
          <Typography variant="body2" sx={{ color: "#8E99A4" }}>
            {today}
          </Typography>
          {sessionName && (
            <Chip
              label={sessionName}
              size="small"
              sx={{
                height: 22,
                fontSize: "0.7rem",
                fontWeight: 700,
                bgcolor: "#F0F1F3",
                color: "#5F6B7A",
                border: "1px solid #E5E7EB",
              }}
            />
          )}
        </Stack>
      </Box>

      {/* Stats Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: "Students",
            value: stats.students,
            icon: <PeopleOutlinedIcon />,
            path: "/students",
          },
          {
            label: "Classes",
            value: stats.classes,
            icon: <SchoolOutlinedIcon />,
            path: "/classes",
          },
          {
            label: "Teachers",
            value: stats.teachers,
            icon: <PersonOutlinedIcon />,
            path: "/teachers",
          },
          {
            label: "Sessions",
            value: stats.sessions,
            icon: <CalendarTodayOutlinedIcon />,
            path: "/sessions",
          },
        ].map((item) => (
          <Grid item xs={6} sm={3} key={item.label}>
            <Paper
              onClick={() => navigate(item.path)}
              sx={{
                p: 2.5,
                borderRadius: 3,
                cursor: "pointer",
                border: "1px solid",
                borderColor: "rgba(0,0,0,0.06)",
                boxShadow: "none",
                transition: "all 0.15s",
                "&:hover": {
                  borderColor: "#0D1B3E",
                  boxShadow: "0 4px 12px rgba(13,27,62,0.08)",
                },
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
              >
                <Box>
                  <Typography
                    variant="h4"
                    fontWeight={800}
                    sx={{ color: "#1A1D21", lineHeight: 1, mb: 0.5 }}
                  >
                    {stats.loading ? "–" : item.value}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#8E99A4",
                      fontWeight: 600,
                      fontSize: "0.72rem",
                    }}
                  >
                    {item.label}
                  </Typography>
                </Box>
                {React.cloneElement(item.icon, {
                  sx: { color: "#C5CAD0", fontSize: 22 },
                })}
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Today's Attendance */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: "1px solid rgba(0,0,0,0.06)",
              boxShadow: "none",
              height: "100%",
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 2.5 }}
            >
              <Box>
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
                  sx={{ color: "#1A1D21" }}
                >
                  Today's Attendance
                </Typography>
                <Typography variant="caption" sx={{ color: "#8E99A4" }}>
                  {today}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  startIcon={<RefreshOutlinedIcon sx={{ fontSize: 16 }} />}
                  onClick={handleRefresh}
                  disabled={todayLoading}
                  sx={{
                    color: "#5F6B7A",
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  Refresh
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => navigate("/attendance/mark")}
                  sx={{
                    bgcolor: "#0D1B3E",
                    textTransform: "none",
                    fontWeight: 600,
                    boxShadow: "none",
                    "&:hover": { bgcolor: "#1A3060", boxShadow: "none" },
                  }}
                >
                  Mark Now
                </Button>
              </Stack>
            </Stack>

            {todayLoading ? (
              <Box sx={{ py: 5, textAlign: "center" }}>
                <CircularProgress size={28} sx={{ color: "#C5CAD0" }} />
              </Box>
            ) : todayStats?.isHoliday ? (
              <Box sx={{ py: 4, textAlign: "center" }}>
                <Typography
                  variant="body2"
                  sx={{ color: "#D4A017", fontWeight: 700 }}
                >
                  🏖️ {todayStats.holiday?.name} — Holiday
                </Typography>
              </Box>
            ) : showData ? (
              <>
                {/* Stats row */}
                <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
                  {[
                    {
                      label: "Present",
                      value: todayStats.present,
                      color: "#16A34A",
                    },
                    {
                      label: "Absent",
                      value: todayStats.absent,
                      color: "#DC2626",
                    },
                    {
                      label: "Unmarked",
                      value: todayStats.unmarked,
                      color: "#D97706",
                    },
                    {
                      label: "Total",
                      value: todayStats.totalStudents,
                      color: "#1A1D21",
                    },
                  ].map((s) => (
                    <Grid item xs={3} key={s.label}>
                      <Box sx={{ textAlign: "center" }}>
                        <Typography
                          variant="h5"
                          fontWeight={800}
                          sx={{ color: s.color, lineHeight: 1, mb: 0.3 }}
                        >
                          {s.value}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#8E99A4",
                            fontWeight: 600,
                            fontSize: "0.65rem",
                            textTransform: "uppercase",
                          }}
                        >
                          {s.label}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                {/* Progress bar */}
                <Box sx={{ mb: 2 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    sx={{ mb: 0.5 }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: "#8E99A4", fontWeight: 600 }}
                    >
                      Attendance Rate
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        color:
                          todayStats.percentage >= 75 ? "#16A34A" : "#DC2626",
                      }}
                    >
                      {todayStats.percentage}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={todayStats.percentage}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: "#F0F1F3",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 3,
                        bgcolor:
                          todayStats.percentage >= 75
                            ? "#16A34A"
                            : todayStats.percentage >= 50
                              ? "#D97706"
                              : "#DC2626",
                      },
                    }}
                  />
                </Box>

                {/* Class chips */}
                <Stack
                  direction="row"
                  spacing={1}
                  flexWrap="wrap"
                  useFlexGap
                  sx={{ mb: 2 }}
                >
                  <Chip
                    label={`${todayStats.markedClasses} marked`}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      bgcolor: "#ECFDF5",
                      color: "#16A34A",
                      border: "1px solid #BBF7D0",
                    }}
                  />
                  <Chip
                    label={`${todayStats.pendingClasses} pending`}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      bgcolor: "#FFFBEB",
                      color: "#D97706",
                      border: "1px solid #FDE68A",
                    }}
                  />
                </Stack>

                {/* Class breakdown */}
                {todayStats.classBreakdown?.length > 0 && (
                  <>
                    <Divider sx={{ mb: 1.5 }} />
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#8E99A4",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        fontSize: "0.65rem",
                        display: "block",
                        mb: 1,
                      }}
                    >
                      Class Breakdown
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell
                              sx={{
                                fontWeight: 700,
                                color: "#8E99A4",
                                fontSize: "0.7rem",
                                py: 1,
                                border: "none",
                              }}
                            >
                              Class
                            </TableCell>
                            <TableCell
                              sx={{
                                fontWeight: 700,
                                color: "#8E99A4",
                                fontSize: "0.7rem",
                                py: 1,
                                border: "none",
                              }}
                            >
                              Status
                            </TableCell>
                            <TableCell
                              align="center"
                              sx={{
                                fontWeight: 700,
                                color: "#8E99A4",
                                fontSize: "0.7rem",
                                py: 1,
                                border: "none",
                              }}
                            >
                              P / A
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                fontWeight: 700,
                                color: "#8E99A4",
                                fontSize: "0.7rem",
                                py: 1,
                                border: "none",
                              }}
                            >
                              %
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {todayStats.classBreakdown.map((cls) => (
                            <TableRow
                              key={cls._id}
                              sx={{ "&:last-child td": { border: "none" } }}
                            >
                              <TableCell sx={{ py: 1, border: "none" }}>
                                <Typography
                                  variant="body2"
                                  fontWeight={700}
                                  sx={{ fontSize: "0.82rem" }}
                                >
                                  {cls.name}-{cls.section}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: "#8E99A4", fontSize: "0.68rem" }}
                                >
                                  {cls.totalStudents} students
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 1, border: "none" }}>
                                <Chip
                                  label={cls.isMarked ? "Done" : "Pending"}
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: "0.65rem",
                                    fontWeight: 700,
                                    bgcolor: cls.isMarked
                                      ? "#ECFDF5"
                                      : "#FFFBEB",
                                    color: cls.isMarked ? "#16A34A" : "#D97706",
                                    border: "1px solid",
                                    borderColor: cls.isMarked
                                      ? "#BBF7D0"
                                      : "#FDE68A",
                                  }}
                                />
                              </TableCell>
                              <TableCell
                                align="center"
                                sx={{
                                  py: 1,
                                  border: "none",
                                  fontFamily: "monospace",
                                  fontSize: "0.82rem",
                                }}
                              >
                                <Typography
                                  component="span"
                                  sx={{ color: "#16A34A", fontWeight: 700 }}
                                >
                                  {cls.present}
                                </Typography>
                                <Typography
                                  component="span"
                                  sx={{ color: "#C5CAD0", mx: 0.5 }}
                                >
                                  /
                                </Typography>
                                <Typography
                                  component="span"
                                  sx={{ color: "#DC2626", fontWeight: 700 }}
                                >
                                  {cls.absent}
                                </Typography>
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{ py: 1, border: "none" }}
                              >
                                <Typography
                                  variant="body2"
                                  fontWeight={800}
                                  sx={{
                                    color: cls.isMarked
                                      ? cls.percentage >= 75
                                        ? "#16A34A"
                                        : "#D97706"
                                      : "#C5CAD0",
                                  }}
                                >
                                  {cls.isMarked ? `${cls.percentage}%` : "—"}
                                </Typography>
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
              <Box sx={{ py: 5, textAlign: "center" }}>
                <Typography variant="body2" sx={{ color: "#8E99A4" }}>
                  No attendance data yet
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* School Info */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: "1px solid rgba(0,0,0,0.06)",
              boxShadow: "none",
              height: "100%",
            }}
          >
            <Typography
              variant="subtitle1"
              fontWeight={800}
              sx={{ color: "#1A1D21", mb: 2 }}
            >
              School Info
            </Typography>
            <Stack spacing={2}>
              {[
                { label: "Name", value: settings?.schoolName || "—" },
                { label: "Session", value: sessionName || "—" },
                {
                  label: "Hours",
                  value: `${settings?.attendanceOpenTime || "—"} to ${settings?.attendanceLockTime || "—"}`,
                },
                {
                  label: "Threshold",
                  value: `Below ${settings?.warningPercentage || 75}%`,
                },
              ].map((item) => (
                <Box key={item.label}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#8E99A4",
                      fontWeight: 600,
                      fontSize: "0.68rem",
                      textTransform: "uppercase",
                    }}
                  >
                    {item.label}
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{ color: "#1A1D21", fontSize: "0.85rem" }}
                    noWrap
                  >
                    {item.value}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Quick Links */}
      <Paper
        sx={{
          p: 2.5,
          borderRadius: 3,
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "none",
        }}
      >
        <Typography
          variant="subtitle1"
          fontWeight={800}
          sx={{ color: "#1A1D21", mb: 2 }}
        >
          Quick Actions
        </Typography>
        <Grid container spacing={1.5}>
          {[
            {
              label: "Mark Attendance",
              icon: <EventNoteOutlinedIcon />,
              path: "/attendance/mark",
            },
            {
              label: "History",
              icon: <HistoryOutlinedIcon />,
              path: "/attendance/history",
            },
            {
              label: "Students",
              icon: <PeopleOutlinedIcon />,
              path: "/students",
            },
            {
              label: "Classes",
              icon: <SchoolOutlinedIcon />,
              path: "/classes",
            },
            {
              label: "Holidays",
              icon: <BeachAccessOutlinedIcon />,
              path: "/holidays",
            },
            {
              label: "Reports",
              icon: <AssessmentOutlinedIcon />,
              path: "/reports",
            },
          ].map((item) => (
            <Grid item xs={4} sm={2} key={item.label}>
              <Box
                onClick={() => navigate(item.path)}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0.8,
                  py: 2,
                  px: 1,
                  borderRadius: 2,
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: "transparent",
                  transition: "all 0.15s",
                  "&:hover": {
                    borderColor: "#E5E7EB",
                    bgcolor: "#FAFBFC",
                  },
                  "&:active": {
                    bgcolor: "#F0F1F3",
                  },
                }}
              >
                {React.cloneElement(item.icon, {
                  sx: { color: "#5F6B7A", fontSize: 22 },
                })}
                <Typography
                  variant="caption"
                  sx={{
                    color: "#5F6B7A",
                    fontWeight: 600,
                    fontSize: "0.7rem",
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  {item.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default AdminDashboard;
