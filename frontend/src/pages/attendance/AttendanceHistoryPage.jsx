import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  LinearProgress,
  Avatar,
  Button,
  Autocomplete,
  InputAdornment,
  Divider,
  useMediaQuery,
  useTheme,
  Tooltip,
} from "@mui/material";
import { useSnackbar } from "notistack";
import HistoryIcon from "@mui/icons-material/History";
import PersonIcon from "@mui/icons-material/Person";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import PercentIcon from "@mui/icons-material/Percent";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import SearchIcon from "@mui/icons-material/Search";
import LockIcon from "@mui/icons-material/Lock";
import EditIcon from "@mui/icons-material/Edit";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import studentApi from "../../api/studentApi";
import classApi from "../../api/classApi";
import attendanceApi from "../../api/attendanceApi";

const formatDate = (d) => {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const monthAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return formatDate(d);
};

const formatPrettyDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const AttendanceHistoryPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [dateFrom, setDateFrom] = useState(monthAgo());
  const [dateTo, setDateTo] = useState(formatDate(new Date()));

  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load classes
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await classApi.list({ limit: 500 });
        if (!cancelled) setClasses(res.data?.data || []);
      } catch {
        if (!cancelled) setClasses([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load students (Roll queries cleaned up)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setStudentsLoading(true);
      try {
        const params = { limit: 1000, status: "Active" };
        if (selectedClass) params.class = selectedClass;
        const res = await studentApi.list(params);
        if (!cancelled) {
          setStudents(res.data?.data || []);
          setStudentsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setStudents([]);
          setStudentsLoading(false);
          enqueueSnackbar(err.response?.data?.message || "Failed", {
            variant: "error",
          });
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedClass, enqueueSnackbar]);

  // Reset student if class changes
  useEffect(() => {
    if (selectedStudent && selectedClass) {
      const sid = selectedStudent.class?._id || selectedStudent.class;
      if (sid !== selectedClass) {
        setSelectedStudent(null);
        setHistory(null);
      }
    }
  }, [selectedClass, selectedStudent]);

  // Load history
  useEffect(() => {
    if (!selectedStudent?._id) {
      setHistory(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await attendanceApi.getStudentHistory(selectedStudent._id, {
          dateFrom,
          dateTo,
        });
        if (!cancelled) {
          setHistory(res.data?.data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setHistory(null);
          setLoading(false);
          enqueueSnackbar(err.response?.data?.message || "Failed", {
            variant: "error",
          });
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedStudent?._id, dateFrom, dateTo, refreshKey, enqueueSnackbar]);

  const studentOptions = useMemo(() => {
    if (!selectedClass) return students;
    return students.filter((s) => {
      const sid = s.class?._id || s.class;
      return sid === selectedClass;
    });
  }, [students, selectedClass]);

  const selectedClassInfo = classes.find((c) => c._id === selectedClass);

  return (
    <Box sx={{ pb: { xs: 10, md: 4 } }}>
      <PageHeader
        title="Attendance History"
        subtitle="Detailed attendance records by student"
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Attendance", path: "/attendance/mark" },
          { label: "History" },
        ]}
      />

      {/* ═══════ FILTERS ═══════ */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <FilterAltIcon sx={{ color: "primary.main", fontSize: 20 }} />
          <Typography
            variant="subtitle2"
            fontWeight={800}
            sx={{ color: "primary.dark" }}
          >
            Filters
          </Typography>
        </Stack>

        <Grid container spacing={1.5}>
          {/* Class Filter */}
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter by Class</InputLabel>
              <Select
                value={selectedClass}
                label="Filter by Class"
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <MenuItem value="">
                  <em>All Classes</em>
                </MenuItem>
                {classes.map((c) => (
                  <MenuItem key={c._id} value={c._id}>
                    {c.name} - {c.section}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Student Search (Cleaned up Roll references) */}
          <Grid item xs={12} md={4}>
            <Autocomplete
              size="small"
              options={studentOptions}
              loading={studentsLoading}
              value={selectedStudent}
              onChange={(e, val) => setSelectedStudent(val)}
              getOptionLabel={(o) => `${o.name} • Scholar: ${o.scholarNumber}`}
              isOptionEqualToValue={(opt, val) => opt._id === val?._id}
              filterOptions={(options, { inputValue }) => {
                const q = inputValue.toLowerCase().trim();
                if (!q) return options;
                return options.filter(
                  (o) =>
                    o.name?.toLowerCase().includes(q) ||
                    o.scholarNumber?.toLowerCase().includes(q) ||
                    o.fatherName?.toLowerCase().includes(q) ||
                    o.mobile?.includes(q),
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search Student"
                  placeholder="Name, scholar no., mobile..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon
                          sx={{ color: "text.secondary", fontSize: 18 }}
                        />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <>
                        {studentsLoading && (
                          <CircularProgress size={16} sx={{ mr: 1 }} />
                        )}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <Box
                    component="li"
                    key={key}
                    {...otherProps}
                    sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                  >
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor:
                          option.gender === "Female" ? "#EC4899" : "#1E4D98",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                      }}
                    >
                      {option.name[0]?.toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {option.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontFamily: "monospace" }}
                      >
                        Scholar: {option.scholarNumber}
                      </Typography>
                    </Box>
                    {option.class && (
                      <Chip
                        label={`${option.class.name}-${option.class.section}`}
                        size="small"
                        sx={{
                          bgcolor: "#E0EBFF",
                          color: "#1E4D98",
                          height: 22,
                          fontSize: "0.7rem",
                          fontWeight: 700,
                        }}
                      />
                    )}
                  </Box>
                );
              }}
              noOptionsText={
                studentsLoading
                  ? "Loading..."
                  : studentOptions.length === 0
                    ? selectedClass
                      ? "No students in this class"
                      : "No active students"
                    : "No match"
              }
            />
          </Grid>

          {/* Date From */}
          <Grid item xs={6} md={2.5}>
            <TextField
              type="date"
              label="From"
              size="small"
              fullWidth
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* Date To */}
          <Grid item xs={6} md={2.5}>
            <TextField
              type="date"
              label="To"
              size="small"
              fullWidth
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ max: formatDate(new Date()) }}
            />
          </Grid>
        </Grid>

        {/* Active Filter Indicators */}
        {(selectedClass || selectedStudent) && (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{
              mt: 1.5,
              pt: 1.5,
              borderTop: "1px dashed",
              borderColor: "divider",
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 700 }}
            >
              ACTIVE FILTERS:
            </Typography>
            {selectedClass && selectedClassInfo && (
              <Chip
                label={`Class: ${selectedClassInfo.name}-${selectedClassInfo.section}`}
                size="small"
                onDelete={() => setSelectedClass("")}
                color="primary"
                sx={{ fontWeight: 700 }}
              />
            )}
            {selectedStudent && (
              <Chip
                label={`Student: ${selectedStudent.name}`}
                size="small"
                onDelete={() => setSelectedStudent(null)}
                color="secondary"
                sx={{ fontWeight: 700 }}
              />
            )}
            <Box sx={{ flex: 1 }} />
            <Typography variant="caption" color="text.secondary">
              <strong>{studentOptions.length}</strong> students available
            </Typography>
          </Stack>
        )}
      </Paper>

      {/* ═══════ NO SELECTION STATES ═══════ */}
      {!studentsLoading && students.length === 0 && (
        <Paper sx={{ borderRadius: 3 }}>
          <EmptyState
            icon={<PersonIcon sx={{ fontSize: 64 }} />}
            title="No active students"
            message="Add students to view their attendance history."
            actionLabel="Go to Students"
            onAction={() => (window.location.href = "/students")}
          />
        </Paper>
      )}

      {!selectedStudent && students.length > 0 && (
        <Paper sx={{ borderRadius: 3 }}>
          <EmptyState
            icon={<HistoryIcon sx={{ fontSize: 64 }} />}
            title="Select a student"
            message="Choose a student from the search above to view their attendance records."
          />
        </Paper>
      )}

      {loading && (
        <Paper sx={{ p: 6, textAlign: "center", borderRadius: 3 }}>
          <CircularProgress />
        </Paper>
      )}

      {/* ═══════ HISTORY VIEW ═══════ */}
      {history && !loading && selectedStudent && (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {/* Student Hero Card (Removed Roll reference cleanly) */}
            <Grid item xs={12} md={5}>
              <Paper
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  height: "100%",
                  background:
                    "linear-gradient(135deg, #0D1B3E 0%, #1A3A7A 100%)",
                  color: "white",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    top: -30,
                    right: -30,
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.06)",
                  }}
                />

                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{ position: "relative", zIndex: 1 }}
                >
                  <Avatar
                    sx={{
                      width: 64,
                      height: 64,
                      bgcolor: "white",
                      color: "primary.main",
                      fontSize: "1.5rem",
                      fontWeight: 800,
                      border: "3px solid rgba(255,255,255,0.2)",
                      flexShrink: 0,
                    }}
                  >
                    {selectedStudent.name[0]?.toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="h6"
                      fontWeight={900}
                      sx={{ fontSize: "1.05rem", lineHeight: 1.2, mb: 0.5 }}
                      noWrap
                    >
                      {selectedStudent.name}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={0.8}
                      flexWrap="wrap"
                      useFlexGap
                      sx={{ mb: 0.5 }}
                    >
                      <Chip
                        label={`Scholar: ${selectedStudent.scholarNumber}`}
                        size="small"
                        sx={{
                          bgcolor: "rgba(255,255,255,0.15)",
                          color: "white",
                          fontFamily: "monospace",
                          height: 20,
                          fontSize: "0.68rem",
                          fontWeight: 700,
                        }}
                      />
                      {selectedStudent.class && (
                        <Chip
                          label={`${selectedStudent.class.name}-${selectedStudent.class.section}`}
                          size="small"
                          sx={{
                            bgcolor: "rgba(245,166,35,0.3)",
                            color: "#FFD580",
                            fontWeight: 700,
                            height: 20,
                            fontSize: "0.68rem",
                          }}
                        />
                      )}
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <CalendarTodayIcon
                        sx={{
                          fontSize: 12,
                          color: "rgba(255,255,255,0.7)",
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(255,255,255,0.85)",
                          fontWeight: 600,
                          fontSize: "0.72rem",
                        }}
                      >
                        {formatPrettyDate(dateFrom)} →{" "}
                        {formatPrettyDate(dateTo)}
                      </Typography>
                    </Stack>
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            {/* Stats 2x2 Grid */}
            <Grid item xs={12} md={7}>
              <Grid container spacing={1.5} sx={{ height: "100%" }}>
                <Grid item xs={6} sm={3}>
                  <Paper
                    sx={{
                      p: 1.5,
                      borderRadius: 2.5,
                      height: "100%",
                      textAlign: "center",
                      border: "1px solid",
                      borderColor: "divider",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <CalendarTodayIcon
                      sx={{
                        color: "text.secondary",
                        fontSize: 22,
                        mx: "auto",
                        mb: 0.5,
                      }}
                    />
                    <Typography
                      variant="h5"
                      fontWeight={900}
                      sx={{ lineHeight: 1 }}
                    >
                      {history.stats.total}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      Total Days
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Paper
                    sx={{
                      p: 1.5,
                      borderRadius: 2.5,
                      height: "100%",
                      textAlign: "center",
                      bgcolor: "#E6F4EA",
                      border: "1px solid",
                      borderColor: "success.light",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <EventAvailableIcon
                      sx={{
                        color: "success.dark",
                        fontSize: 22,
                        mx: "auto",
                        mb: 0.5,
                      }}
                    />
                    <Typography
                      variant="h5"
                      fontWeight={900}
                      color="success.dark"
                      sx={{ lineHeight: 1 }}
                    >
                      {history.stats.Present}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "success.dark",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      Present
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Paper
                    sx={{
                      p: 1.5,
                      borderRadius: 2.5,
                      height: "100%",
                      textAlign: "center",
                      bgcolor: "#FEE2E2",
                      border: "1px solid",
                      borderColor: "error.light",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <EventBusyIcon
                      sx={{
                        color: "error.dark",
                        fontSize: 22,
                        mx: "auto",
                        mb: 0.5,
                      }}
                    />
                    <Typography
                      variant="h5"
                      fontWeight={900}
                      color="error.dark"
                      sx={{ lineHeight: 1 }}
                    >
                      {history.stats.Absent}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "error.dark",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      Absent
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Paper
                    sx={{
                      p: 1.5,
                      borderRadius: 2.5,
                      height: "100%",
                      textAlign: "center",
                      bgcolor:
                        history.stats.percentage >= 75
                          ? "#E6F4EA"
                          : history.stats.percentage >= 50
                            ? "#FFF4E5"
                            : "#FEE2E2",
                      border: "1px solid",
                      borderColor:
                        history.stats.percentage >= 75
                          ? "success.light"
                          : history.stats.percentage >= 50
                            ? "warning.light"
                            : "error.light",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <PercentIcon
                      sx={{
                        color:
                          history.stats.percentage >= 75
                            ? "success.dark"
                            : history.stats.percentage >= 50
                              ? "warning.dark"
                              : "error.dark",
                        fontSize: 22,
                        mx: "auto",
                        mb: 0.5,
                      }}
                    />
                    <Typography
                      variant="h5"
                      fontWeight={900}
                      sx={{
                        lineHeight: 1,
                        color:
                          history.stats.percentage >= 75
                            ? "success.dark"
                            : history.stats.percentage >= 50
                              ? "warning.dark"
                              : "error.dark",
                      }}
                    >
                      {history.stats.percentage}%
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        color:
                          history.stats.percentage >= 75
                            ? "success.dark"
                            : history.stats.percentage >= 50
                              ? "warning.dark"
                              : "error.dark",
                      }}
                    >
                      Rate
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          {/* Attendance Rate Slider Bar */}
          {history.stats.total > 0 && (
            <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 1 }}
              >
                <Typography
                  variant="caption"
                  fontWeight={800}
                  color="text.secondary"
                  sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
                >
                  Attendance Rate
                </Typography>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Chip
                    label={`✓ ${history.stats.Present} Present`}
                    size="small"
                    sx={{
                      bgcolor: "#E6F4EA",
                      color: "success.dark",
                      fontWeight: 700,
                      height: 22,
                      fontSize: "0.7rem",
                    }}
                  />
                  <Chip
                    label={`✗ ${history.stats.Absent} Absent`}
                    size="small"
                    sx={{
                      bgcolor: "#FEE2E2",
                      color: "error.dark",
                      fontWeight: 700,
                      height: 22,
                      fontSize: "0.7rem",
                    }}
                  />
                  <Typography
                    variant="body2"
                    fontWeight={800}
                    color={
                      history.stats.percentage >= 75
                        ? "success.dark"
                        : history.stats.percentage >= 50
                          ? "warning.dark"
                          : "error.dark"
                    }
                  >
                    {history.stats.percentage}%
                  </Typography>
                </Stack>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={history.stats.percentage}
                color={
                  history.stats.percentage >= 75
                    ? "success"
                    : history.stats.percentage >= 50
                      ? "warning"
                      : "error"
                }
                sx={{ borderRadius: 4, height: 10 }}
              />
            </Paper>
          )}

          {/* Daily Records */}
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar
                  sx={{ bgcolor: "primary.light", width: 36, height: 36 }}
                >
                  <HistoryIcon sx={{ color: "primary.dark", fontSize: 20 }} />
                </Avatar>
                <Box>
                  <Typography
                    variant="subtitle1"
                    fontWeight={800}
                    sx={{ fontSize: "0.95rem" }}
                  >
                    Daily Records
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {history.records.length} record
                    {history.records.length !== 1 ? "s" : ""} found
                  </Typography>
                </Box>
              </Stack>
              {history.records.length > 0 && (
                <Chip
                  label="Newest first"
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Stack>

            <Divider sx={{ mb: 2 }} />

            {history.records.length === 0 ? (
              <Box sx={{ py: 6, textAlign: "center" }}>
                <HistoryIcon
                  sx={{ fontSize: 56, color: "text.disabled", mb: 1 }}
                />
                <Typography
                  variant="h6"
                  fontWeight={700}
                  gutterBottom
                  sx={{ fontSize: "1rem" }}
                >
                  No records found
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  No attendance marked between selected dates.
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => (window.location.href = "/attendance/mark")}
                >
                  Mark Attendance
                </Button>
              </Box>
            ) : (
              <Stack spacing={1}>
                {history.records.map((r) => {
                  const isPresent = r.status === "Present";
                  return (
                    <Paper
                      key={r._id}
                      variant="outlined"
                      sx={{
                        p: { xs: 1.5, sm: 2 },
                        borderRadius: 2,
                        borderLeft: "4px solid",
                        borderLeftColor: isPresent
                          ? "success.main"
                          : "error.main",
                        bgcolor: isPresent ? "#F0FDF4" : "#FEF2F2",
                        transition: "all 0.15s",
                        "&:hover": {
                          transform: "translateX(2px)",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                        },
                      }}
                    >
                      <Grid container spacing={1.5} alignItems="center">
                        {/* Date info Column */}
                        <Grid item xs={12} sm={3}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                          >
                            <Avatar
                              sx={{
                                width: 36,
                                height: 36,
                                bgcolor: "white",
                                color: isPresent
                                  ? "success.dark"
                                  : "error.dark",
                                border: "1px solid",
                                borderColor: isPresent
                                  ? "success.light"
                                  : "error.light",
                                fontSize: "0.95rem",
                                fontWeight: 900,
                                flexShrink: 0,
                              }}
                            >
                              {new Date(r.date).getDate()}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                variant="body2"
                                fontWeight={800}
                                sx={{ fontSize: "0.85rem", lineHeight: 1.2 }}
                                noWrap
                              >
                                {new Date(r.date).toLocaleDateString("en-IN", {
                                  weekday: "short",
                                  day: "numeric",
                                  month: "short",
                                })}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontSize: "0.7rem" }}
                              >
                                {new Date(r.date).getFullYear()}
                              </Typography>
                            </Box>
                          </Stack>
                        </Grid>

                        {/* Status Info Column */}
                        <Grid item xs={6} sm={2}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={0.5}
                          >
                            {isPresent ? (
                              <CheckCircleIcon
                                sx={{ fontSize: 20, color: "success.main" }}
                              />
                            ) : (
                              <CancelIcon
                                sx={{ fontSize: 20, color: "error.main" }}
                              />
                            )}
                            <Typography
                              variant="body2"
                              fontWeight={800}
                              color={isPresent ? "success.dark" : "error.dark"}
                              sx={{ fontSize: "0.85rem" }}
                            >
                              {r.status}
                            </Typography>
                            {r.isLocked && (
                              <Tooltip title="Locked attendance">
                                <LockIcon
                                  sx={{
                                    fontSize: 14,
                                    color: "text.disabled",
                                    ml: 0.3,
                                  }}
                                />
                              </Tooltip>
                            )}
                          </Stack>
                        </Grid>

                        {/* Created By Info Column */}
                        <Grid item xs={6} sm={4}>
                          {r.markedBy?.name ? (
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1}
                            >
                              <Avatar
                                sx={{
                                  width: 24,
                                  height: 24,
                                  fontSize: "0.7rem",
                                  bgcolor: "primary.main",
                                  fontWeight: 700,
                                  flexShrink: 0,
                                }}
                              >
                                {r.markedBy.name[0]?.toUpperCase()}
                              </Avatar>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ fontSize: "0.65rem", display: "block" }}
                                >
                                  MARKED BY
                                </Typography>
                                <Typography
                                  variant="body2"
                                  fontWeight={600}
                                  sx={{ fontSize: "0.8rem" }}
                                  noWrap
                                >
                                  {r.markedBy.name}
                                </Typography>
                              </Box>
                            </Stack>
                          ) : (
                            <Typography variant="caption" color="text.disabled">
                              —
                            </Typography>
                          )}
                        </Grid>

                        {/* Date Time Logs Column */}
                        <Grid item xs={12} sm={3}>
                          <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                fontSize: "0.65rem",
                                display: "block",
                                fontWeight: 700,
                              }}
                            >
                              {r.editedBy ? "EDITED AT" : "MARKED AT"}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: "0.75rem",
                                color: "text.secondary",
                                fontFamily: "monospace",
                              }}
                            >
                              {formatTime(r.editedAt || r.markedAt)}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>

                      {/* Editing Audits */}
                      {r.editedBy?.name && (
                        <Box
                          sx={{
                            mt: 1.5,
                            pt: 1.5,
                            borderTop: "1px dashed",
                            borderColor: "divider",
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <EditIcon
                            sx={{ fontSize: 14, color: "warning.dark" }}
                          />
                          <Typography
                            variant="caption"
                            color="warning.dark"
                            fontWeight={700}
                            sx={{ fontSize: "0.7rem" }}
                          >
                            EDITED BY {r.editedBy.name}
                          </Typography>
                          {r.editReason && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontSize: "0.7rem", fontStyle: "italic" }}
                            >
                              — "{r.editReason}"
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Paper>
        </>
      )}
    </Box>
  );
};

export default AttendanceHistoryPage;
