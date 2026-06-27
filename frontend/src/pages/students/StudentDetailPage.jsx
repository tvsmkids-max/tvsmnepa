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
import EditIcon from "@mui/icons-material/Edit";
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
      sx={{ pl: icon ? 2.5 : 0, wordBreak: "break-word" }}
    >
      {value || "—"}
    </Typography>
  </Box>
);

const StatBox = ({ icon, label, value, color, sub }) => (
  <Box
    sx={{
      p: 2,
      borderRadius: 2,
      bgcolor: color ? `${color}.50` : "background.default",
      border: "1px solid",
      borderColor: color ? `${color}.200` : "divider",
      textAlign: "center",
      height: "100%",
    }}
  >
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: 1.5,
        bgcolor: color ? `${color}.100` : "grey.100",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        mx: "auto",
        mb: 1,
      }}
    >
      {React.cloneElement(icon, {
        sx: { color: color ? `${color}.dark` : "text.secondary", fontSize: 20 },
      })}
    </Box>
    <Typography
      variant="caption"
      sx={{
        color: color ? `${color}.dark` : "text.secondary",
        fontWeight: 600,
        display: "block",
      }}
    >
      {label}
    </Typography>
    <Typography
      variant="h5"
      fontWeight={800}
      color={color ? `${color}.dark` : "text.primary"}
    >
      {value}
    </Typography>
    {sub && (
      <Typography
        variant="caption"
        sx={{ color: "text.secondary", display: "block", fontSize: "0.65rem" }}
      >
        {sub}
      </Typography>
    )}
  </Box>
);

const StudentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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

  return (
    <Box>
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
            >
              View History
            </Button>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/students")}
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
              background: "linear-gradient(135deg, #F8F9FC 0%, #FFFFFF 100%)",
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
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              }}
            >
              {student.name?.[0]?.toUpperCase()}
            </Avatar>

            <Typography variant="h6" fontWeight={700} gutterBottom>
              {student.name}
            </Typography>

            <Stack
              direction="row"
              spacing={1}
              justifyContent="center"
              alignItems="center"
              sx={{ mb: 1.5 }}
            >
              <Chip
                label={`${student.class?.name || ""}-${student.class?.section || ""}`}
                size="small"
                sx={{
                  bgcolor: "#E0EBFF",
                  color: "#1E4D98",
                  fontWeight: 700,
                }}
              />
              <Chip
                label={`Roll ${student.rollNumber}`}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 700 }}
              />
            </Stack>

            <Box sx={{ mb: 2 }}>
              <StatusChip status={student.status} />
            </Box>

            <Divider sx={{ my: 2 }} />

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
          <Paper sx={{ p: 2.5, borderRadius: 3, mt: 2 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 2 }}
            >
              <HistoryIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={700}>
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
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <StatBox
                      icon={<EventAvailableIcon />}
                      label="Present"
                      value={stats.Present}
                      color="success"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <StatBox
                      icon={<EventBusyIcon />}
                      label="Absent"
                      value={stats.Absent}
                      color="error"
                    />
                  </Grid>
                </Grid>

                <Box>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    sx={{ mb: 0.5 }}
                  >
                    <Typography variant="caption" fontWeight={600}>
                      Attendance Rate
                    </Typography>
                    <Typography
                      variant="caption"
                      fontWeight={800}
                      color={
                        stats.percentage >= 75
                          ? "success.dark"
                          : stats.percentage >= 50
                            ? "warning.dark"
                            : "error.dark"
                      }
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
                    sx={{ borderRadius: 4, height: 8 }}
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
          <Paper sx={{ p: 3, borderRadius: 3, mb: 2 }}>
            <Typography
              variant="caption"
              color="primary"
              fontWeight={700}
              sx={{
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "block",
                mb: 2,
              }}
            >
              Personal Details
            </Typography>
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
          <Paper sx={{ p: 3, borderRadius: 3, mb: 2 }}>
            <Typography
              variant="caption"
              color="primary"
              fontWeight={700}
              sx={{
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "block",
                mb: 2,
              }}
            >
              Contact Information
            </Typography>
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
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography
              variant="caption"
              color="primary"
              fontWeight={700}
              sx={{
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "block",
                mb: 2,
              }}
            >
              Academic Information
            </Typography>
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
