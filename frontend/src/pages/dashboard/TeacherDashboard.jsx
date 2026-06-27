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
  IconButton,
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
import TouchAppIcon from "@mui/icons-material/TouchApp";
import useAuth from "../../hooks/useAuth";
import useSettings from "../../hooks/useSettings";
import classApi from "../../api/classApi";
import studentApi from "../../api/studentApi";
import attendanceApi from "../../api/attendanceApi";
import teacherApi from "../../api/teacherApi";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useSettings();

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
          classApi.list({ limit: 100 }).catch((err) => {
            console.error("Class API error:", err);
            return { data: { data: [] } };
          }),
          studentApi
            .list({ limit: 1 })
            .catch(() => ({ data: { pagination: { total: 0 } } })),
          attendanceApi.getTodayStats().catch(() => ({ data: { data: null } })),
          teacherApi.getMyProfile().catch((err) => {
            console.error("Teacher API error:", err);
            return { data: { data: null } };
          }),
        ]);

        if (!cancelled) {
          const classList = classRes.data?.data || [];
          console.log("[Dashboard] Classes received:", classList.length);
          console.log("[Dashboard] Teacher info:", teacherRes.data?.data);

          setClasses(classList);
          setTotalStudents(studentRes.data?.pagination?.total || 0);
          setTodayStats(statsRes.data?.data || null);
          setTeacherInfo(teacherRes.data?.data || null);
          setLoading(false);
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
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

  return (
    <Box sx={{ pb: 2 }}>
      {/* HERO */}
      <Paper
        sx={{
          p: 2.5,
          mb: 2,
          borderRadius: 3,
          background:
            "linear-gradient(135deg, #0D1B3E 0%, #1A3A7A 50%, #1E4D98 100%)",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />

        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            sx={{ mb: 1.5 }}
          >
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: "white",
                color: "primary.main",
                fontSize: "1.5rem",
                fontWeight: 800,
                border: "3px solid rgba(255,255,255,0.2)",
              }}
            >
              {user?.name?.[0]?.toUpperCase()}
            </Avatar>
            <Box sx={{ textAlign: "right" }}>
              <Typography
                variant="caption"
                sx={{
                  color: "rgba(255,255,255,0.7)",
                  fontWeight: 600,
                  display: "block",
                }}
              >
                {today}
              </Typography>
              <Typography
                variant="h6"
                fontWeight={800}
                sx={{ color: "#FFD580" }}
              >
                {currentTime}
              </Typography>
            </Box>
          </Stack>

          <Typography
            variant="caption"
            sx={{
              color: "rgba(255,255,255,0.7)",
              letterSpacing: "0.08em",
              fontWeight: 600,
            }}
          >
            {greeting().toUpperCase()}
          </Typography>
          <Typography
            variant="h5"
            fontWeight={900}
            sx={{ color: "white", mb: 1, lineHeight: 1.2 }}
          >
            {user?.name}
          </Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {teacherInfo?.employeeId && (
              <Chip
                icon={<BadgeIcon sx={{ fontSize: 12 }} />}
                label={teacherInfo.employeeId}
                size="small"
                sx={{
                  height: 24,
                  bgcolor: "rgba(245,166,35,0.2)",
                  color: "#FFD580",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  "& .MuiChip-icon": { color: "#FFD580" },
                }}
              />
            )}
            {settings?.activeSession?.name && (
              <Chip
                icon={<SchoolIcon sx={{ fontSize: 12 }} />}
                label={settings.activeSession.name}
                size="small"
                sx={{
                  height: 24,
                  bgcolor: "rgba(255,255,255,0.15)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  "& .MuiChip-icon": { color: "white" },
                }}
              />
            )}
          </Stack>
        </Box>
      </Paper>

      {/* HOLIDAY ALERT */}
      {todayStats?.isHoliday && (
        <Alert
          severity="warning"
          icon={<BeachAccessIcon />}
          sx={{ mb: 2, borderRadius: 3 }}
        >
          <Typography variant="body2" fontWeight={800}>
            🏖️ {todayStats.holiday?.name}
          </Typography>
          <Typography variant="caption">
            {todayStats.holiday?.type} holiday — no attendance today
          </Typography>
        </Alert>
      )}

      {/* STATS 2x2 */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={6}>
          <Card
            sx={{
              cursor: "pointer",
              borderRadius: 3,
              "&:active": { transform: "scale(0.97)" },
            }}
            onClick={() => navigate("/students")}
          >
            <CardContent
              sx={{ p: 2, textAlign: "center", "&:last-child": { pb: 2 } }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: "primary.light",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 1,
                }}
              >
                <ClassIcon sx={{ color: "primary.dark", fontSize: 22 }} />
              </Box>
              <Typography
                variant="h4"
                fontWeight={900}
                color="primary.main"
                sx={{ lineHeight: 1 }}
              >
                {loading ? "—" : classes.length}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={700}
                sx={{ fontSize: "0.7rem", textTransform: "uppercase" }}
              >
                My Classes
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6}>
          <Card
            sx={{
              cursor: "pointer",
              borderRadius: 3,
              "&:active": { transform: "scale(0.97)" },
            }}
            onClick={() => navigate("/students")}
          >
            <CardContent
              sx={{ p: 2, textAlign: "center", "&:last-child": { pb: 2 } }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: "info.light",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 1,
                }}
              >
                <PeopleIcon sx={{ color: "info.dark", fontSize: 22 }} />
              </Box>
              <Typography
                variant="h4"
                fontWeight={900}
                color="info.main"
                sx={{ lineHeight: 1 }}
              >
                {loading ? "—" : totalStudents}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={700}
                sx={{ fontSize: "0.7rem", textTransform: "uppercase" }}
              >
                Students
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6}>
          <Card sx={{ borderRadius: 3, bgcolor: "#E6F4EA" }}>
            <CardContent
              sx={{ p: 2, textAlign: "center", "&:last-child": { pb: 2 } }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: "rgba(255,255,255,0.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 1,
                }}
              >
                <CheckCircleIcon sx={{ color: "success.dark", fontSize: 22 }} />
              </Box>
              <Typography
                variant="h4"
                fontWeight={900}
                color="success.dark"
                sx={{ lineHeight: 1 }}
              >
                {loading ? "—" : todayStats?.present || 0}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "success.dark",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                }}
              >
                Present
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6}>
          <Card sx={{ borderRadius: 3, bgcolor: "#FEE2E2" }}>
            <CardContent
              sx={{ p: 2, textAlign: "center", "&:last-child": { pb: 2 } }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: "rgba(255,255,255,0.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 1,
                }}
              >
                <CancelIcon sx={{ color: "error.dark", fontSize: 22 }} />
              </Box>
              <Typography
                variant="h4"
                fontWeight={900}
                color="error.dark"
                sx={{ lineHeight: 1 }}
              >
                {loading ? "—" : todayStats?.absent || 0}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "error.dark",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                }}
              >
                Absent
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* MY CLASSES */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 1.5 }}
        >
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: "1rem" }}>
            My Classes
          </Typography>
          <IconButton size="small" onClick={triggerRefresh}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Divider sx={{ mb: 1.5 }} />

        {loading ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <CircularProgress size={32} />
          </Box>
        ) : classes.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <ClassIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
            <Typography variant="body2" fontWeight={700} color="text.secondary">
              No classes assigned
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Contact admin to assign classes
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {classes.map((cls) => {
              const classStats = todayStats?.classBreakdown?.find(
                (c) => c._id === cls._id,
              );
              return (
                <Card
                  key={cls._id}
                  variant="outlined"
                  sx={{
                    borderRadius: 2.5,
                    borderColor: classStats?.isMarked
                      ? "success.light"
                      : "warning.light",
                    borderWidth: 1.5,
                    "&:active": { transform: "scale(0.99)" },
                  }}
                >
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1.5}
                      sx={{ mb: 1.5 }}
                    >
                      <Avatar
                        sx={{
                          width: 48,
                          height: 48,
                          background:
                            "linear-gradient(135deg, #1E4D98 0%, #0D1B3E 100%)",
                          color: "white",
                          fontSize: "1rem",
                          fontWeight: 800,
                        }}
                      >
                        {cls.name?.[0]}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="h6"
                          fontWeight={800}
                          sx={{ fontSize: "1rem", lineHeight: 1.2 }}
                        >
                          Class {cls.name}
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={0.5}
                          alignItems="center"
                          flexWrap="wrap"
                        >
                          <Chip
                            label={`Sec ${cls.section}`}
                            size="small"
                            sx={{
                              bgcolor: "#E0EBFF",
                              color: "#1E4D98",
                              fontWeight: 700,
                              height: 18,
                              fontSize: "0.65rem",
                            }}
                          />
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: "0.72rem" }}
                          >
                            • {cls.studentCount || 0} students
                          </Typography>
                        </Stack>
                      </Box>
                      {classStats?.isMarked ? (
                        <Chip
                          icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                          label="Done"
                          size="small"
                          color="success"
                          sx={{
                            fontWeight: 700,
                            height: 24,
                            fontSize: "0.7rem",
                          }}
                        />
                      ) : (
                        <Chip
                          icon={<HourglassBottomIcon sx={{ fontSize: 14 }} />}
                          label="Pending"
                          size="small"
                          color="warning"
                          sx={{
                            fontWeight: 700,
                            height: 24,
                            fontSize: "0.7rem",
                          }}
                        />
                      )}
                    </Stack>

                    {classStats?.isMarked && (
                      <Box sx={{ mb: 1.5 }}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          sx={{ mb: 0.3 }}
                        >
                          <Stack direction="row" spacing={1.5}>
                            <Typography
                              variant="caption"
                              fontWeight={700}
                              color="success.dark"
                            >
                              ✓ {classStats.present}
                            </Typography>
                            <Typography
                              variant="caption"
                              fontWeight={700}
                              color="error.dark"
                            >
                              ✗ {classStats.absent}
                            </Typography>
                          </Stack>
                          <Typography
                            variant="caption"
                            fontWeight={800}
                            color={
                              classStats.percentage >= 75
                                ? "success.dark"
                                : "warning.dark"
                            }
                          >
                            {classStats.percentage}%
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={classStats.percentage}
                          color={
                            classStats.percentage >= 75 ? "success" : "warning"
                          }
                          sx={{ borderRadius: 4, height: 6 }}
                        />
                      </Box>
                    )}

                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<EventNoteIcon />}
                        onClick={() => navigate("/attendance/mark")}
                        sx={{
                          py: 1.2,
                          background:
                            "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          borderRadius: 2,
                        }}
                      >
                        Mark
                      </Button>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<VisibilityIcon />}
                        onClick={() => navigate(`/students?class=${cls._id}`)}
                        sx={{
                          py: 1.2,
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          borderRadius: 2,
                        }}
                      >
                        Students
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </Paper>

      {/* QUICK ACTIONS */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <Typography
          variant="h6"
          fontWeight={800}
          sx={{ fontSize: "1rem", mb: 1.5 }}
        >
          Quick Actions
        </Typography>
        <Divider sx={{ mb: 1.5 }} />
        <Grid container spacing={1.5}>
          <Grid item xs={6}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<PeopleIcon />}
              onClick={() => navigate("/students")}
              sx={{
                py: 1.5,
                fontWeight: 700,
                borderRadius: 2,
                justifyContent: "flex-start",
                pl: 2,
              }}
            >
              Students
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<HistoryIcon />}
              onClick={() => navigate("/attendance/history")}
              sx={{
                py: 1.5,
                fontWeight: 700,
                borderRadius: 2,
                justifyContent: "flex-start",
                pl: 2,
              }}
            >
              History
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<EventNoteIcon />}
              onClick={() => navigate("/attendance/mark")}
              sx={{
                py: 1.5,
                fontWeight: 700,
                borderRadius: 2,
                justifyContent: "flex-start",
                pl: 2,
              }}
            >
              Mark Att.
            </Button>
          </Grid>
          <Grid item xs={6}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<TouchAppIcon />}
              onClick={() => navigate("/reports")}
              sx={{
                py: 1.5,
                fontWeight: 700,
                borderRadius: 2,
                justifyContent: "flex-start",
                pl: 2,
              }}
            >
              Reports
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* MY PROFILE */}
      {teacherInfo && (
        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography
            variant="h6"
            fontWeight={800}
            sx={{ fontSize: "1rem", mb: 1.5 }}
          >
            My Profile
          </Typography>
          <Divider sx={{ mb: 1.5 }} />
          <Stack spacing={1.2}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ minWidth: 90 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700, fontSize: "0.7rem" }}
                >
                  EMP ID
                </Typography>
              </Box>
              <Typography
                variant="body2"
                fontWeight={700}
                fontFamily="monospace"
              >
                {teacherInfo.employeeId}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ minWidth: 90 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700, fontSize: "0.7rem" }}
                >
                  EMAIL
                </Typography>
              </Box>
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ wordBreak: "break-all", fontSize: "0.82rem", flex: 1 }}
              >
                {teacherInfo.email}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ minWidth: 90 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700, fontSize: "0.7rem" }}
                >
                  MOBILE
                </Typography>
              </Box>
              <Typography
                variant="body2"
                fontWeight={700}
                fontFamily="monospace"
              >
                {teacherInfo.mobile}
              </Typography>
            </Stack>
            {teacherInfo.designation && (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ minWidth: 90 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 700, fontSize: "0.7rem" }}
                  >
                    ROLE
                  </Typography>
                </Box>
                <Typography variant="body2" fontWeight={700}>
                  {teacherInfo.designation}
                </Typography>
              </Stack>
            )}
            {teacherInfo.qualification && (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ minWidth: 90 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 700, fontSize: "0.7rem" }}
                  >
                    QUALIF.
                  </Typography>
                </Box>
                <Typography variant="body2" fontWeight={700}>
                  {teacherInfo.qualification}
                </Typography>
              </Stack>
            )}
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default TeacherDashboard;
