import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Chip,
  Avatar,
  Stack,
  CircularProgress,
  Button,
  Divider,
  Alert,
  LinearProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import EventNoteIcon from "@mui/icons-material/EventNote";
import PeopleIcon from "@mui/icons-material/People";
import ClassIcon from "@mui/icons-material/Class";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import SchoolIcon from "@mui/icons-material/School";
import RefreshIcon from "@mui/icons-material/Refresh";
import BadgeIcon from "@mui/icons-material/Badge";
import VisibilityIcon from "@mui/icons-material/Visibility";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import HistoryIcon from "@mui/icons-material/History";
import WavingHandIcon from "@mui/icons-material/WavingHand";
import useAuth from "../../hooks/useAuth";
import useSettings from "../../hooks/useSettings";
import useThemeMode from "../../hooks/useThemeMode";
import classApi from "../../api/classApi";
import studentApi from "../../api/studentApi";
import attendanceApi from "../../api/attendanceApi";
import teacherApi from "../../api/teacherApi";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useSettings();
  const { isDark } = useThemeMode();

  const [classes, setClasses] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [todayStats, setTodayStats] = useState(null);
  const [teacherInfo, setTeacherInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [classRes, studentRes, statsRes, teacherRes] = await Promise.all([
          classApi.list({ limit: 100 }).catch(() => ({ data: { data: [] } })),
          studentApi
            .list({ limit: 1 })
            .catch(() => ({ data: { pagination: { total: 0 } } })),
          attendanceApi.getTodayStats().catch(() => ({ data: { data: null } })),
          teacherApi.getMyProfile().catch(() => ({ data: { data: null } })),
        ]);

        if (!cancelled) {
          setClasses(classRes.data?.data || []);
          setTotalStudents(studentRes.data?.pagination?.total || 0);
          setTodayStats(statsRes.data?.data || null);
          setTeacherInfo(teacherRes.data?.data || null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

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
    <Box sx={{ pb: { xs: 10, md: 3 } }}>
      {/* ═══ 1-LINE GREETING ═══ */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
        flexWrap="wrap"
        gap={1}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body1" fontWeight={800}>
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
              }}
            />
          )}
        </Stack>
        <Button
          size="small"
          startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
          onClick={triggerRefresh}
          disabled={loading}
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

      {/* ═══ HOLIDAY ═══ */}
      {todayStats?.isHoliday && (
        <Alert
          severity="warning"
          icon={<BeachAccessIcon />}
          sx={{ mb: 2, borderRadius: 2 }}
        >
          <Typography variant="body2" fontWeight={700}>
            🏖️ {todayStats.holiday?.name}
          </Typography>
        </Alert>
      )}

      {/* ═══ STATS 2x2 ═══ */}
      <Grid container spacing={1.2} sx={{ mb: 2 }}>
        <Grid item xs={6}>
          <Paper
            sx={{
              p: 1.2,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              textAlign: "center",
              cursor: "pointer",
              "&:hover": { borderColor: "primary.main" },
            }}
            onClick={() => navigate("/students")}
          >
            <ClassIcon
              sx={{
                color: isDark ? "#60A5FA" : "primary.main",
                fontSize: 22,
                mb: 0.3,
              }}
            />
            <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1 }}>
              {loading ? "—" : classes.length}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.62rem",
                fontWeight: 700,
                textTransform: "uppercase",
                color: "text.secondary",
              }}
            >
              My Classes
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6}>
          <Paper
            sx={{
              p: 1.2,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              textAlign: "center",
              cursor: "pointer",
              "&:hover": { borderColor: "primary.main" },
            }}
            onClick={() => navigate("/students")}
          >
            <PeopleIcon
              sx={{
                color: isDark ? "#38BDF8" : "info.main",
                fontSize: 22,
                mb: 0.3,
              }}
            />
            <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1 }}>
              {loading ? "—" : totalStudents}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.62rem",
                fontWeight: 700,
                textTransform: "uppercase",
                color: "text.secondary",
              }}
            >
              Students
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6}>
          <Paper
            sx={{
              p: 1.2,
              borderRadius: 2,
              bgcolor: isDark ? "rgba(34,197,94,0.1)" : "#E6F4EA",
              border: "1px solid",
              borderColor: isDark ? "rgba(34,197,94,0.2)" : "#A7F3D0",
              textAlign: "center",
            }}
          >
            <Typography
              variant="h5"
              fontWeight={900}
              sx={{ color: isDark ? "#86EFAC" : "success.dark", lineHeight: 1 }}
            >
              {loading ? "—" : todayStats?.present || 0}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.62rem",
                fontWeight: 700,
                textTransform: "uppercase",
                color: isDark ? "#86EFAC" : "success.dark",
              }}
            >
              Present
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6}>
          <Paper
            sx={{
              p: 1.2,
              borderRadius: 2,
              bgcolor: isDark ? "rgba(239,68,68,0.1)" : "#FEE2E2",
              border: "1px solid",
              borderColor: isDark ? "rgba(239,68,68,0.2)" : "#FECACA",
              textAlign: "center",
            }}
          >
            <Typography
              variant="h5"
              fontWeight={900}
              sx={{ color: isDark ? "#FCA5A5" : "error.dark", lineHeight: 1 }}
            >
              {loading ? "—" : todayStats?.absent || 0}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.62rem",
                fontWeight: 700,
                textTransform: "uppercase",
                color: isDark ? "#FCA5A5" : "error.dark",
              }}
            >
              Absent
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* ═══ MY CLASSES ═══ */}
      <Paper
        sx={{
          borderRadius: 2,
          mb: 2,
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
            bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#FAFBFC",
          }}
        >
          <Typography
            variant="body2"
            fontWeight={800}
            sx={{ fontSize: "0.85rem" }}
          >
            My Classes
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <CircularProgress size={24} />
          </Box>
        ) : classes.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              No classes assigned
            </Typography>
          </Box>
        ) : (
          <Stack spacing={0}>
            {classes.map((cls, idx) => {
              const classStats = todayStats?.classBreakdown?.find(
                (c) => c._id === cls._id,
              );
              return (
                <Box
                  key={cls._id}
                  sx={{
                    px: 2,
                    py: 1.2,
                    borderBottom:
                      idx === classes.length - 1 ? "none" : "1px solid",
                    borderColor: "divider",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: classStats?.isMarked ? 0.8 : 0 }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        fontWeight={800}
                        sx={{ fontSize: "0.88rem" }}
                      >
                        Class {cls.name} - {cls.section}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: "0.68rem" }}
                      >
                        {cls.studentCount || 0} students
                      </Typography>
                    </Box>

                    {classStats?.isMarked ? (
                      <Chip
                        label={`${classStats.percentage}%`}
                        size="small"
                        color={
                          classStats.percentage >= 75 ? "success" : "warning"
                        }
                        sx={{
                          fontWeight: 800,
                          height: 22,
                          fontSize: "0.72rem",
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
                          py: 0.3,
                          px: 1.5,
                          background:
                            "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
                        }}
                      >
                        Mark
                      </Button>
                    )}
                  </Stack>

                  {classStats?.isMarked && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <LinearProgress
                        variant="determinate"
                        value={classStats.percentage}
                        color={
                          classStats.percentage >= 75 ? "success" : "warning"
                        }
                        sx={{ flex: 1, height: 4, borderRadius: 2 }}
                      />
                      <Typography
                        variant="caption"
                        sx={{ fontSize: "0.65rem", color: "text.secondary" }}
                      >
                        {classStats.present}P / {classStats.absent}A
                      </Typography>
                    </Stack>
                  )}
                </Box>
              );
            })}
          </Stack>
        )}
      </Paper>

      {/* ═══ QUICK ACTIONS (4 only) ═══ */}
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
              icon: <EventNoteIcon />,
              label: "Mark",
              path: "/attendance/mark",
              color: isDark ? "#60A5FA" : "#1E4D98",
            },
            {
              icon: <HistoryIcon />,
              label: "History",
              path: "/attendance/history",
              color: isDark ? "#38BDF8" : "#0369A1",
            },
            {
              icon: <PeopleIcon />,
              label: "Students",
              path: "/students",
              color: isDark ? "#4ADE80" : "#15803D",
            },
            {
              icon: <VisibilityIcon />,
              label: "Reports",
              path: "/reports",
              color: isDark ? "#C084FC" : "#7C3AED",
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
                  py: 1,
                  borderRadius: 1.5,
                  cursor: "pointer",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                {React.cloneElement(a.icon, {
                  sx: { fontSize: 22, color: a.color },
                })}
                <Typography
                  variant="caption"
                  fontWeight={700}
                  sx={{ fontSize: "0.68rem" }}
                >
                  {a.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default TeacherDashboard;
