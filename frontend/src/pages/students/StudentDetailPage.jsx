import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Avatar,
  Divider,
  CircularProgress,
  Button,
  Stack,
  Chip,
  LinearProgress,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import HistoryIcon from "@mui/icons-material/History";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import PercentIcon from "@mui/icons-material/Percent";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PhoneIcon from "@mui/icons-material/Phone";
import HomeIcon from "@mui/icons-material/Home";
import CakeIcon from "@mui/icons-material/Cake";
import BadgeIcon from "@mui/icons-material/Badge";
import PageHeader from "../../components/common/PageHeader";
import StatusChip from "../../components/common/StatusChip";
import studentApi from "../../api/studentApi";
import attendanceApi from "../../api/attendanceApi";
import useThemeMode from "../../hooks/useThemeMode";

const InfoRow = ({ icon, label, value }) => (
  <Box sx={{ mb: 2 }}>
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.3 }}>
      {icon &&
        React.cloneElement(icon, {
          sx: { fontSize: 14, color: "text.secondary" },
        })}
      <Typography
        variant="caption"
        sx={{
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          fontWeight: 600,
          fontSize: "0.68rem",
          color: "text.secondary",
        }}
      >
        {label}
      </Typography>
    </Stack>
    <Typography
      variant="body2"
      fontWeight={500}
      sx={{
        pl: icon ? 2.5 : 0,
        wordBreak: "break-word",
        color: "text.primary",
      }}
    >
      {value || "—"}
    </Typography>
  </Box>
);

// Theme-aware StatBox
const StatBox = ({ icon, label, value, color, sub, isDark }) => {
  // Color mappings
  const colorMap = {
    success: {
      bg: isDark ? "rgba(34,197,94,0.15)" : "#E6F4EA",
      border: isDark ? "rgba(34,197,94,0.3)" : "#A7F3D0",
      iconBg: isDark ? "rgba(34,197,94,0.25)" : "#C6F6D5",
      text: isDark ? "#86EFAC" : "#1B5E20",
      iconColor: isDark ? "#4ADE80" : "#1B5E20",
    },
    error: {
      bg: isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2",
      border: isDark ? "rgba(239,68,68,0.3)" : "#FECACA",
      iconBg: isDark ? "rgba(239,68,68,0.25)" : "#FECACA",
      text: isDark ? "#FCA5A5" : "#991B1B",
      iconColor: isDark ? "#F87171" : "#991B1B",
    },
    primary: {
      bg: isDark ? "rgba(59,130,246,0.15)" : "#F0F4FF",
      border: isDark ? "rgba(59,130,246,0.3)" : "#BFDBFE",
      iconBg: isDark ? "rgba(59,130,246,0.25)" : "#DBEAFE",
      text: isDark ? "#93C5FD" : "#1E4D98",
      iconColor: isDark ? "#60A5FA" : "#1E4D98",
    },
    default: {
      bg: isDark ? "rgba(255,255,255,0.05)" : "background.default",
      border: "divider",
      iconBg: isDark ? "rgba(255,255,255,0.08)" : "grey.100",
      text: "text.primary",
      iconColor: "text.secondary",
    },
  };

  const styles = colorMap[color] || colorMap.default;

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: styles.bg,
        border: "1px solid",
        borderColor: styles.border,
        textAlign: "center",
        height: "100%",
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 1.5,
          bgcolor: styles.iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mx: "auto",
          mb: 1,
        }}
      >
        {React.cloneElement(icon, {
          sx: { color: styles.iconColor, fontSize: 20 },
        })}
      </Box>
      <Typography
        variant="caption"
        sx={{
          color: styles.text,
          fontWeight: 600,
          display: "block",
        }}
      >
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={800} sx={{ color: styles.text }}>
        {value}
      </Typography>
      {sub && (
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            display: "block",
            fontSize: "0.65rem",
          }}
        >
          {sub}
        </Typography>
      )}
    </Box>
  );
};

// Section Header (used in right column cards)
const SectionHeader = ({ children }) => (
  <Typography
    variant="caption"
    fontWeight={800}
    sx={{
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      display: "block",
      mb: 2,
      color: "primary.main",
      fontSize: "0.72rem",
    }}
  >
    {children}
  </Typography>
);

const StudentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDark } = useThemeMode();

  const [student, setStudent] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const res = await studentApi.getById(id);
        if (!cancelled) {
          setStudent(res.data?.data || null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setStudent(null);
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!student?._id) return;
    let cancelled = false;

    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const today = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - 1);

        const dateFrom = start.toISOString().slice(0, 10);
        const dateTo = today.toISOString().slice(0, 10);

        const res = await attendanceApi.getStudentHistory(student._id, {
          dateFrom,
          dateTo,
        });

        if (!cancelled) {
          setStats(res.data?.data?.stats || null);
          setStatsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setStats(null);
          setStatsLoading(false);
        }
      }
    };

    loadStats();
    return () => {
      cancelled = true;
    };
  }, [student?._id]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!student) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography variant="h6" gutterBottom>
          Student not found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          The student you're looking for doesn't exist or has been deleted.
        </Typography>
        <Button variant="contained" onClick={() => navigate("/students")}>
          Back to Students
        </Button>
      </Box>
    );
  }

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const calculateAge = (dob) => {
    if (!dob) return "—";
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return `${age} years`;
  };

  // Theme-aware values
  const classChipBg = isDark ? "rgba(59,130,246,0.2)" : "#E0EBFF";
  const classChipText = isDark ? "#93C5FD" : "#1E4D98";

  return (
    <Box sx={{ pb: { xs: 10, md: 4 } }}>
      <PageHeader
        title={student.name}
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Students", path: "/students" },
          { label: student.name },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<HistoryIcon />}
              onClick={() => navigate("/attendance/history")}
              sx={{ fontWeight: 700 }}
            >
              View History
            </Button>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/students")}
              sx={{ fontWeight: 700 }}
            >
              Back
            </Button>
          </Stack>
        }
      />

      <Grid container spacing={3}>
        {/* LEFT COLUMN — Profile Card */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              textAlign: "center",
              border: "1px solid",
              borderColor: "divider",
              // Theme-aware gradient
              background: isDark
                ? "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)"
                : "linear-gradient(135deg, #F8F9FC 0%, #FFFFFF 100%)",
            }}
          >
            <Avatar
              sx={{
                width: 110,
                height: 110,
                mx: "auto",
                mb: 2,
                bgcolor: student.gender === "Female" ? "#EC4899" : "#1E4D98",
                fontSize: "2.8rem",
                fontWeight: 700,
                boxShadow: isDark
                  ? "0 8px 24px rgba(0,0,0,0.5)"
                  : "0 8px 24px rgba(0,0,0,0.15)",
              }}
            >
              {student.name?.[0]?.toUpperCase()}
            </Avatar>

            <Typography
              variant="h6"
              fontWeight={800}
              gutterBottom
              sx={{
                color: "text.primary",
                textTransform: "uppercase",
              }}
            >
              {student.name}
            </Typography>

            <Stack
              direction="row"
              spacing={1}
              justifyContent="center"
              alignItems="center"
              sx={{ mb: 1.5 }}
              flexWrap="wrap"
              useFlexGap
            >
              <Chip
                label={`${student.class?.name || ""}-${student.class?.section || ""}`}
                size="small"
                sx={{
                  bgcolor: classChipBg,
                  color: classChipText,
                  fontWeight: 700,
                }}
              />
              <Chip
                label={`Roll ${student.rollNumber}`}
                size="small"
                variant="outlined"
                sx={{
                  fontWeight: 700,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(0,0,0,0.15)",
                  color: "text.primary",
                }}
              />
            </Stack>

            <Box sx={{ mb: 2 }}>
              <StatusChip status={student.status} />
            </Box>

            <Divider sx={{ my: 2, borderColor: "divider" }} />

            <Box sx={{ textAlign: "left" }}>
              <InfoRow
                icon={<BadgeIcon />}
                label="Scholar Number"
                value={student.scholarNumber}
              />
              <InfoRow
                icon={<CakeIcon />}
                label="Admission Date"
                value={formatDate(student.admissionDate)}
              />
              {student.statusRemark && (
                <InfoRow label="Status Remark" value={student.statusRemark} />
              )}
            </Box>
          </Paper>

          {/* Attendance Stats */}
          <Paper
            sx={{
              p: 2.5,
              borderRadius: 3,
              mt: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 2 }}
            >
              <HistoryIcon color="primary" fontSize="small" />
              <Typography
                variant="subtitle2"
                fontWeight={800}
                sx={{ color: "text.primary" }}
              >
                Last 30 Days Attendance
              </Typography>
            </Stack>

            {statsLoading ? (
              <Box sx={{ textAlign: "center", py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : stats && stats.total > 0 ? (
              <>
                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <StatBox
                      icon={<CalendarTodayIcon />}
                      label="Total"
                      value={stats.total}
                      isDark={isDark}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <StatBox
                      icon={<EventAvailableIcon />}
                      label="Present"
                      value={stats.Present}
                      color="success"
                      isDark={isDark}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <StatBox
                      icon={<EventBusyIcon />}
                      label="Absent"
                      value={stats.Absent}
                      color="error"
                      isDark={isDark}
                    />
                  </Grid>
                </Grid>

                <Box>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    sx={{ mb: 0.5 }}
                  >
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      sx={{ color: "text.primary" }}
                    >
                      Attendance Rate
                    </Typography>
                    <Typography
                      variant="caption"
                      fontWeight={800}
                      sx={{
                        color:
                          stats.percentage >= 75
                            ? isDark
                              ? "#86EFAC"
                              : "success.dark"
                            : stats.percentage >= 50
                              ? isDark
                                ? "#FCD34D"
                                : "warning.dark"
                              : isDark
                                ? "#FCA5A5"
                                : "error.dark",
                      }}
                    >
                      {stats.percentage}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={stats.percentage}
                    color={
                      stats.percentage >= 75
                        ? "success"
                        : stats.percentage >= 50
                          ? "warning"
                          : "error"
                    }
                    sx={{
                      borderRadius: 4,
                      height: 8,
                      bgcolor: isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.06)",
                    }}
                  />
                </Box>
              </>
            ) : (
              <Box sx={{ textAlign: "center", py: 3 }}>
                <PercentIcon
                  sx={{ fontSize: 40, color: "text.disabled", mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  No attendance records yet
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* RIGHT COLUMN — Details */}
        <Grid item xs={12} md={8}>
          {/* Personal Information */}
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              mb: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <SectionHeader>Personal Details</SectionHeader>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <InfoRow label="Father's Name" value={student.fatherName} />
                <InfoRow label="Mother's Name" value={student.motherName} />
                <InfoRow
                  label="Date of Birth"
                  value={`${formatDate(student.dob)} (${calculateAge(student.dob)})`}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <InfoRow label="Gender" value={student.gender} />
                <InfoRow label="Blood Group" value={student.bloodGroup} />
                <InfoRow label="Category" value={student.category} />
              </Grid>
            </Grid>
          </Paper>

          {/* Contact Information */}
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              mb: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <SectionHeader>Contact Information</SectionHeader>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <InfoRow
                  icon={<PhoneIcon />}
                  label="Primary Mobile"
                  value={student.mobile}
                />
                <InfoRow
                  icon={<PhoneIcon />}
                  label="Alternate Mobile"
                  value={student.alternateMobile}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <InfoRow label="Religion" value={student.religion} />
                <InfoRow label="Aadhar Number" value={student.aadharNumber} />
              </Grid>
              <Grid item xs={12}>
                <InfoRow
                  icon={<HomeIcon />}
                  label="Address"
                  value={student.address}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Academic Information */}
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <SectionHeader>Academic Information</SectionHeader>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <InfoRow
                  label="Class"
                  value={
                    student.class
                      ? `${student.class.name} - ${student.class.section}`
                      : "—"
                  }
                />
                <InfoRow
                  label="Academic Session"
                  value={student.session?.name}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <InfoRow label="Roll Number" value={student.rollNumber} />
                <InfoRow
                  label="Section"
                  value={student.section || student.class?.section}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StudentDetailPage;
