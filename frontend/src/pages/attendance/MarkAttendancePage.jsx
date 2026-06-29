import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  Avatar,
  IconButton,
  InputAdornment,
  LinearProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TableSortLabel,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useSnackbar } from "notistack";
import EventNoteIcon from "@mui/icons-material/EventNote";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import SaveIcon from "@mui/icons-material/Save";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import attendanceApi from "../../api/attendanceApi";
import classApi from "../../api/classApi";
import useAuth from "../../hooks/useAuth";
import useSettings from "../../hooks/useSettings";
import useThemeMode from "../../hooks/useThemeMode";

const formatDate = (d) => {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const MarkAttendancePage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { isAdmin } = useAuth();
  const { settings } = useSettings();
  const { isDark } = useThemeMode();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));

  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState("");
  const [date, setDate] = useState(formatDate(new Date()));

  const [sheet, setSheet] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmLock, setConfirmLock] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // ─── NEW: Search + Filter + Sort ───
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("rollNumber");
  const [sortOrder, setSortOrder] = useState("asc");

  // ─── Load classes ───
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setClassesLoading(true);
      try {
        const params = { limit: 500, isArchived: false };
        const sid = settings?.activeSession?._id || settings?.activeSession;
        if (sid) params.session = sid;
        const res = await classApi.list(params);
        if (!cancelled) {
          const list = res.data?.data || [];
          setClasses(list);
          if (list.length === 1 && !selectedClass) {
            setSelectedClass(list[0]._id);
          }
          setClassesLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setClasses([]);
          setClassesLoading(false);
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
  }, [settings?.activeSession, enqueueSnackbar]);

  // ─── Load sheet ───
  useEffect(() => {
    if (!selectedClass || !date) {
      setSheet(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await attendanceApi.getSheet({
          class: selectedClass,
          date,
        });
        if (!cancelled) {
          const data = res.data?.data;
          setSheet(data);
          const initial = {};
          data?.students?.forEach((item) => {
            if (item.attendance)
              initial[item.student._id] = item.attendance.status;
          });
          setAttendance(initial);
          setLoading(false);
          setSearch("");
          setFilter("all");
        }
      } catch (err) {
        if (!cancelled) {
          setSheet(null);
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
  }, [selectedClass, date, refreshKey, enqueueSnackbar]);

  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // ─── Bulk actions ───
  const markAll = (status) => {
    if (!sheet?.students) return;
    const next = {};
    sheet.students.forEach((item) => {
      next[item.student._id] = status;
    });
    setAttendance(next);
  };

  const resetAll = () => {
    setAttendance({});
  };

  const toggleStudent = (id) => {
    setAttendance((p) => {
      const current = p[id];
      const next =
        current === "Present"
          ? "Absent"
          : current === "Absent"
            ? "Present"
            : "Present";
      return { ...p, [id]: next };
    });
  };

  const setStudentStatus = (id, status) => {
    setAttendance((p) => ({ ...p, [id]: status }));
  };

  // ─── Stats ───
  const stats = useMemo(() => {
    if (!sheet?.students)
      return { Present: 0, Absent: 0, total: 0, unmarked: 0, marked: 0 };
    const total = sheet.students.length;
    let p = 0,
      a = 0;
    sheet.students.forEach((item) => {
      const s = attendance[item.student._id];
      if (s === "Present") p++;
      else if (s === "Absent") a++;
    });
    return {
      Present: p,
      Absent: a,
      total,
      unmarked: total - p - a,
      marked: p + a,
    };
  }, [sheet, attendance]);

  const progressPercent =
    stats.total > 0 ? Math.round((stats.marked / stats.total) * 100) : 0;

  // ─── Filtered + Sorted students ───
  const displayStudents = useMemo(() => {
    if (!sheet?.students) return [];

    let list = [...sheet.students];

    // Filter by status
    if (filter === "present") {
      list = list.filter((item) => attendance[item.student._id] === "Present");
    } else if (filter === "absent") {
      list = list.filter((item) => attendance[item.student._id] === "Absent");
    } else if (filter === "pending") {
      list = list.filter((item) => !attendance[item.student._id]);
    }

    // Search
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (item) =>
          item.student.name?.toLowerCase().includes(s) ||
          item.student.rollNumber?.toString().includes(s) ||
          item.student.scholarNumber?.toLowerCase().includes(s) ||
          item.student.fatherName?.toLowerCase().includes(s),
      );
    }

    // Sort
    list.sort((a, b) => {
      let aVal, bVal;
      if (sortBy === "rollNumber") {
        aVal = parseInt(a.student.rollNumber, 10) || 0;
        bVal = parseInt(b.student.rollNumber, 10) || 0;
      } else if (sortBy === "name") {
        aVal = a.student.name?.toLowerCase() || "";
        bVal = b.student.name?.toLowerCase() || "";
      } else if (sortBy === "scholarNumber") {
        aVal = a.student.scholarNumber?.toLowerCase() || "";
        bVal = b.student.scholarNumber?.toLowerCase() || "";
      } else {
        aVal = parseInt(a.student.rollNumber, 10) || 0;
        bVal = parseInt(b.student.rollNumber, 10) || 0;
      }

      if (typeof aVal === "string") {
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

    return list;
  }, [sheet, attendance, filter, search, sortBy, sortOrder]);

  // ─── Sort handler ───
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // ─── Save ───
  const handleSave = async () => {
    if (!selectedClass || !date) return;
    if (
      stats.unmarked > 0 &&
      !window.confirm(`${stats.unmarked} unmarked. Continue?`)
    )
      return;

    setSaving(true);
    try {
      const records = Object.entries(attendance).map(([student, status]) => ({
        student,
        status,
      }));
      await attendanceApi.markAttendance({
        class: selectedClass,
        date,
        records,
      });
      enqueueSnackbar(
        `✅ Attendance saved! ${stats.Present}P / ${stats.Absent}A of ${stats.total}`,
        { variant: "success" },
      );
      triggerRefresh();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Failed", {
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // ─── Lock/Unlock ───
  const handleLockToggle = async () => {
    if (!confirmLock) return;
    try {
      const action = sheet.isLocked ? "unlock" : "lock";
      await attendanceApi[action]({ class: selectedClass, date });
      enqueueSnackbar(`Attendance ${action}ed`, { variant: "success" });
      setConfirmLock(null);
      triggerRefresh();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Failed", {
        variant: "error",
      });
    }
  };

  // ─── Theme colors ───
  const colors = {
    presentBg: isDark ? "rgba(34,197,94,0.12)" : "#E6F4EA",
    absentBg: isDark ? "rgba(239,68,68,0.12)" : "#FEE2E2",
    rowHoverBg: isDark ? "rgba(59,130,246,0.06)" : "rgba(59,130,246,0.03)",
    headerBg: isDark ? "rgba(255,255,255,0.03)" : "#F8F9FC",
  };

  return (
    <Box sx={{ pb: stats.total > 0 ? 12 : 2 }}>
      <PageHeader
        title="Mark Attendance"
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Attendance" },
        ]}
      />

      {/* ═══ CLASS + DATE SELECTOR ═══ */}
      <Paper
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: 2,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <FormControl size="small" sx={{ flex: { sm: 2 } }}>
              <InputLabel>Select Class</InputLabel>
              <Select
                value={selectedClass}
                label="Select Class"
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={classesLoading}
              >
                {classesLoading ? (
                  <MenuItem disabled>Loading...</MenuItem>
                ) : classes.length === 0 ? (
                  <MenuItem disabled>No classes available</MenuItem>
                ) : (
                  classes.map((c) => (
                    <MenuItem key={c._id} value={c._id}>
                      {c.name} - {c.section}
                      {c.studentCount !== undefined &&
                        ` (${c.studentCount} students)`}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <TextField
              type="date"
              label="Date"
              size="small"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ max: formatDate(new Date()) }}
              sx={{ flex: { sm: 1 } }}
            />
          </Stack>

          {/* Status chips */}
          {sheet && !sheet.isHoliday && (
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              alignItems="center"
              useFlexGap
            >
              <Chip
                icon={
                  sheet.isLocked ? (
                    <LockIcon sx={{ fontSize: 14 }} />
                  ) : (
                    <LockOpenIcon sx={{ fontSize: 14 }} />
                  )
                }
                label={sheet.isLocked ? "Locked" : "Open"}
                color={sheet.isLocked ? "error" : "success"}
                size="small"
                sx={{ fontWeight: 700 }}
              />
              {sheet.isMarked && (
                <Chip
                  label="Already Marked"
                  color="primary"
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              )}
              {isAdmin && sheet.isMarked && (
                <IconButton
                  size="small"
                  color={sheet.isLocked ? "warning" : "default"}
                  onClick={() =>
                    setConfirmLock(sheet.isLocked ? "unlock" : "lock")
                  }
                >
                  {sheet.isLocked ? (
                    <LockOpenIcon fontSize="small" />
                  ) : (
                    <LockIcon fontSize="small" />
                  )}
                </IconButton>
              )}
            </Stack>
          )}
        </Stack>
      </Paper>

      {/* ═══ EMPTY STATES ═══ */}
      {!selectedClass && !classesLoading && classes.length > 0 && (
        <Paper sx={{ borderRadius: 3 }}>
          <EmptyState
            icon={<EventNoteIcon sx={{ fontSize: 64 }} />}
            title="Select a class"
            message="Choose a class above to begin."
          />
        </Paper>
      )}

      {!classesLoading && classes.length === 0 && (
        <Paper sx={{ borderRadius: 3 }}>
          <EmptyState
            icon={<EventNoteIcon sx={{ fontSize: 64 }} />}
            title="No classes assigned"
            message="Contact admin to assign classes to you."
          />
        </Paper>
      )}

      {selectedClass && loading && (
        <Paper sx={{ p: 6, textAlign: "center", borderRadius: 3 }}>
          <CircularProgress />
        </Paper>
      )}

      {/* ═══ HOLIDAY ═══ */}
      {sheet?.isHoliday && (
        <Paper
          sx={{
            p: 3,
            borderRadius: 3,
            textAlign: "center",
            border: "1px solid",
            borderColor: "warning.light",
          }}
        >
          <BeachAccessIcon
            sx={{ fontSize: 56, color: "warning.main", mb: 1 }}
          />
          <Typography variant="h6" fontWeight={800}>
            🏖️ {sheet.holiday?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {sheet.holiday?.type} Holiday — Attendance blocked
          </Typography>
        </Paper>
      )}

      {/* ═══ MAIN CONTENT ═══ */}
      {sheet && !sheet.isHoliday && !loading && (
        <>
          {/* ─── STATS BAR (Sticky on mobile) ─── */}
          <Paper
            sx={{
              p: { xs: 1.2, sm: 1.5 },
              mb: 1.5,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              position: { xs: "sticky", md: "relative" },
              top: { xs: 56, md: "auto" },
              zIndex: { xs: 5, md: 1 },
            }}
          >
            {/* Stat boxes */}
            <Grid container spacing={1} sx={{ mb: 1 }}>
              {[
                {
                  label: "TOTAL",
                  value: stats.total,
                  color: "text.primary",
                  bg: "background.paper",
                  border: "divider",
                },
                {
                  label: "PRESENT",
                  value: stats.Present,
                  color: isDark ? "#86EFAC" : "success.dark",
                  bg: colors.presentBg,
                  border: isDark ? "rgba(34,197,94,0.3)" : "#A7F3D0",
                },
                {
                  label: "ABSENT",
                  value: stats.Absent,
                  color: isDark ? "#FCA5A5" : "error.dark",
                  bg: colors.absentBg,
                  border: isDark ? "rgba(239,68,68,0.3)" : "#FECACA",
                },
                {
                  label: "PENDING",
                  value: stats.unmarked,
                  color: isDark ? "#FCD34D" : "warning.dark",
                  bg: isDark ? "rgba(245,158,11,0.12)" : "#FFF4E5",
                  border: isDark ? "rgba(245,158,11,0.3)" : "#FED7AA",
                },
              ].map((s) => (
                <Grid item xs={3} key={s.label}>
                  <Box
                    sx={{
                      p: { xs: 0.8, sm: 1 },
                      borderRadius: 1.5,
                      bgcolor: s.bg,
                      border: "1px solid",
                      borderColor: s.border,
                      textAlign: "center",
                    }}
                  >
                    <Typography
                      variant="h6"
                      fontWeight={900}
                      sx={{
                        color: s.color,
                        fontSize: { xs: "1.1rem", sm: "1.3rem" },
                        lineHeight: 1,
                      }}
                    >
                      {s.value}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: s.color,
                        fontWeight: 700,
                        fontSize: "0.58rem",
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
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 1 }}
            >
              <LinearProgress
                variant="determinate"
                value={progressPercent}
                color={
                  progressPercent === 100
                    ? "success"
                    : progressPercent > 50
                      ? "primary"
                      : "warning"
                }
                sx={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  bgcolor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.06)",
                }}
              />
              <Typography
                variant="caption"
                fontWeight={800}
                sx={{ fontSize: "0.72rem", color: "text.secondary" }}
              >
                {stats.marked}/{stats.total}
              </Typography>
            </Stack>

            {/* Bulk actions */}
            <Stack direction="row" spacing={0.8}>
              <Button
                variant="contained"
                color="success"
                size="small"
                fullWidth
                startIcon={<DoneAllIcon sx={{ fontSize: 16 }} />}
                disabled={sheet.isLocked && !isAdmin}
                onClick={() => markAll("Present")}
                sx={{
                  py: 0.8,
                  fontWeight: 700,
                  textTransform: "none",
                  fontSize: "0.78rem",
                }}
              >
                All Present
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                fullWidth
                startIcon={<ClearAllIcon sx={{ fontSize: 16 }} />}
                disabled={sheet.isLocked && !isAdmin}
                onClick={() => markAll("Absent")}
                sx={{
                  py: 0.8,
                  fontWeight: 700,
                  textTransform: "none",
                  fontSize: "0.78rem",
                }}
              >
                All Absent
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RestartAltIcon sx={{ fontSize: 16 }} />}
                disabled={sheet.isLocked && !isAdmin}
                onClick={resetAll}
                sx={{
                  py: 0.8,
                  fontWeight: 700,
                  textTransform: "none",
                  fontSize: "0.78rem",
                  minWidth: { xs: 40, sm: "auto" },
                }}
              >
                {isMobile ? "" : "Reset"}
              </Button>
            </Stack>
          </Paper>

          {/* ─── SEARCH + FILTER ─── */}
          {stats.total > 0 && (
            <Paper
              sx={{
                p: { xs: 1.2, sm: 1.5 },
                mb: 1.5,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Stack spacing={1}>
                <TextField
                  placeholder="Search name, roll, scholar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  size="small"
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: search && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearch("")}>
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {[
                    { value: "all", label: `All (${stats.total})` },
                    {
                      value: "present",
                      label: `Present (${stats.Present})`,
                      color: "success",
                    },
                    {
                      value: "absent",
                      label: `Absent (${stats.Absent})`,
                      color: "error",
                    },
                    {
                      value: "pending",
                      label: `Pending (${stats.unmarked})`,
                      color: "warning",
                    },
                  ].map((f) => (
                    <Chip
                      key={f.value}
                      label={f.label}
                      size="small"
                      onClick={() => setFilter(f.value)}
                      color={
                        filter === f.value ? f.color || "primary" : "default"
                      }
                      variant={filter === f.value ? "filled" : "outlined"}
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.7rem",
                        height: 26,
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </Stack>
              </Stack>
            </Paper>
          )}

          {/* ─── STUDENT LIST ─── */}
          {stats.total === 0 ? (
            <Paper sx={{ borderRadius: 3, p: 4, textAlign: "center" }}>
              <EventNoteIcon
                sx={{ fontSize: 64, color: "text.disabled", mb: 2 }}
              />
              <Typography variant="h6" fontWeight={700}>
                No students in this class
              </Typography>
            </Paper>
          ) : displayStudents.length === 0 ? (
            <Paper sx={{ borderRadius: 3, p: 4, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                No students match your search/filter
              </Typography>
            </Paper>
          ) : isMobile ? (
            /* ═══ MOBILE VIEW — Compact Cards ═══ */
            <Paper
              sx={{
                borderRadius: 3,
                overflow: "hidden",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              {displayStudents.map((item, idx) => {
                const status = attendance[item.student._id];
                const isLast = idx === displayStudents.length - 1;
                const rowBg =
                  status === "Present"
                    ? colors.presentBg
                    : status === "Absent"
                      ? colors.absentBg
                      : "transparent";

                return (
                  <Box
                    key={item.student._id}
                    onClick={() =>
                      !(sheet.isLocked && !isAdmin) &&
                      toggleStudent(item.student._id)
                    }
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: 1.5,
                      py: 1,
                      borderBottom: isLast ? "none" : "1px solid",
                      borderColor: "divider",
                      bgcolor: rowBg,
                      cursor:
                        sheet.isLocked && !isAdmin ? "not-allowed" : "pointer",
                      transition: "background-color 0.15s",
                      "&:active": { transform: "scale(0.995)" },
                    }}
                  >
                    <Typography
                      sx={{
                        minWidth: 24,
                        fontWeight: 800,
                        fontSize: "0.78rem",
                        color: isDark ? "#93C5FD" : "#1E4D98",
                        fontFamily: "monospace",
                        textAlign: "center",
                        flexShrink: 0,
                      }}
                    >
                      {item.student.rollNumber}
                    </Typography>

                    <Avatar
                      sx={{
                        bgcolor:
                          item.student.gender === "Female"
                            ? "#EC4899"
                            : "#1E4D98",
                        width: 32,
                        height: 32,
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {item.student.name[0]?.toUpperCase()}
                    </Avatar>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        noWrap
                        sx={{
                          fontSize: "0.82rem",
                          color: "text.primary",
                          textTransform: "uppercase",
                        }}
                      >
                        {item.student.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        sx={{ fontSize: "0.66rem", display: "block" }}
                      >
                        F: {item.student.fatherName || "—"}
                        {" • "}
                        <span style={{ fontFamily: "monospace" }}>
                          #{item.student.scholarNumber}
                        </span>
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={0.3} sx={{ flexShrink: 0 }}>
                      <IconButton
                        disabled={sheet.isLocked && !isAdmin}
                        onClick={(e) => {
                          e.stopPropagation();
                          setStudentStatus(item.student._id, "Present");
                        }}
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor:
                            status === "Present"
                              ? "success.main"
                              : isDark
                                ? "rgba(34,197,94,0.12)"
                                : "success.50",
                          color:
                            status === "Present"
                              ? "white"
                              : isDark
                                ? "#86EFAC"
                                : "success.dark",
                          border: "2px solid",
                          borderColor:
                            status === "Present"
                              ? "success.main"
                              : isDark
                                ? "rgba(34,197,94,0.3)"
                                : "success.light",
                          "&:active": { transform: "scale(0.95)" },
                        }}
                      >
                        <CheckCircleIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                      <IconButton
                        disabled={sheet.isLocked && !isAdmin}
                        onClick={(e) => {
                          e.stopPropagation();
                          setStudentStatus(item.student._id, "Absent");
                        }}
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor:
                            status === "Absent"
                              ? "error.main"
                              : isDark
                                ? "rgba(239,68,68,0.12)"
                                : "error.50",
                          color:
                            status === "Absent"
                              ? "white"
                              : isDark
                                ? "#FCA5A5"
                                : "error.dark",
                          border: "2px solid",
                          borderColor:
                            status === "Absent"
                              ? "error.main"
                              : isDark
                                ? "rgba(239,68,68,0.3)"
                                : "error.light",
                          "&:active": { transform: "scale(0.95)" },
                        }}
                      >
                        <CancelIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Stack>
                  </Box>
                );
              })}
            </Paper>
          ) : (
            /* ═══ DESKTOP VIEW — Table ═══ */
            <Paper
              sx={{
                borderRadius: 3,
                overflow: "hidden",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <TableContainer sx={{ maxHeight: "calc(100vh - 380px)" }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.72rem",
                          bgcolor: colors.headerBg,
                          width: 50,
                        }}
                      >
                        <TableSortLabel
                          active={sortBy === "rollNumber"}
                          direction={
                            sortBy === "rollNumber" ? sortOrder : "asc"
                          }
                          onClick={() => handleSort("rollNumber")}
                        >
                          Roll
                        </TableSortLabel>
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.72rem",
                          bgcolor: colors.headerBg,
                        }}
                      >
                        <TableSortLabel
                          active={sortBy === "name"}
                          direction={sortBy === "name" ? sortOrder : "asc"}
                          onClick={() => handleSort("name")}
                        >
                          Student Name
                        </TableSortLabel>
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.72rem",
                          bgcolor: colors.headerBg,
                        }}
                      >
                        Father Name
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.72rem",
                          bgcolor: colors.headerBg,
                          width: 90,
                        }}
                      >
                        <TableSortLabel
                          active={sortBy === "scholarNumber"}
                          direction={
                            sortBy === "scholarNumber" ? sortOrder : "asc"
                          }
                          onClick={() => handleSort("scholarNumber")}
                        >
                          Scholar#
                        </TableSortLabel>
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.72rem",
                          bgcolor: colors.headerBg,
                          width: 120,
                        }}
                      >
                        Attendance
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayStudents.map((item) => {
                      const status = attendance[item.student._id];
                      const rowBg =
                        status === "Present"
                          ? colors.presentBg
                          : status === "Absent"
                            ? colors.absentBg
                            : "transparent";

                      return (
                        <TableRow
                          key={item.student._id}
                          hover
                          onClick={() =>
                            !(sheet.isLocked && !isAdmin) &&
                            toggleStudent(item.student._id)
                          }
                          sx={{
                            cursor:
                              sheet.isLocked && !isAdmin
                                ? "not-allowed"
                                : "pointer",
                            bgcolor: rowBg,
                            "&:hover": {
                              bgcolor:
                                status === "Present"
                                  ? colors.presentBg
                                  : status === "Absent"
                                    ? colors.absentBg
                                    : colors.rowHoverBg,
                            },
                          }}
                        >
                          <TableCell>
                            <Typography
                              variant="body2"
                              fontWeight={800}
                              sx={{
                                fontFamily: "monospace",
                                color: isDark ? "#93C5FD" : "#1E4D98",
                                fontSize: "0.82rem",
                              }}
                            >
                              {item.student.rollNumber}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                            >
                              <Avatar
                                sx={{
                                  width: 28,
                                  height: 28,
                                  bgcolor:
                                    item.student.gender === "Female"
                                      ? "#EC4899"
                                      : "#1E4D98",
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                }}
                              >
                                {item.student.name[0]?.toUpperCase()}
                              </Avatar>
                              <Typography
                                variant="body2"
                                fontWeight={700}
                                sx={{
                                  fontSize: "0.85rem",
                                  textTransform: "uppercase",
                                }}
                              >
                                {item.student.name}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: "0.82rem",
                                color: "text.secondary",
                              }}
                            >
                              {item.student.fatherName || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="caption"
                              sx={{
                                fontFamily: "monospace",
                                fontSize: "0.72rem",
                                color: "text.secondary",
                              }}
                            >
                              {item.student.scholarNumber}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Stack
                              direction="row"
                              spacing={0.5}
                              justifyContent="center"
                            >
                              <IconButton
                                disabled={sheet.isLocked && !isAdmin}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStudentStatus(item.student._id, "Present");
                                }}
                                size="small"
                                sx={{
                                  width: 32,
                                  height: 32,
                                  bgcolor:
                                    status === "Present"
                                      ? "success.main"
                                      : "transparent",
                                  color:
                                    status === "Present"
                                      ? "white"
                                      : isDark
                                        ? "#86EFAC"
                                        : "success.dark",
                                  border: "2px solid",
                                  borderColor:
                                    status === "Present"
                                      ? "success.main"
                                      : isDark
                                        ? "rgba(34,197,94,0.3)"
                                        : "success.light",
                                  "&:hover": {
                                    bgcolor:
                                      status === "Present"
                                        ? "success.dark"
                                        : "success.50",
                                  },
                                }}
                              >
                                <CheckCircleIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                              <IconButton
                                disabled={sheet.isLocked && !isAdmin}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStudentStatus(item.student._id, "Absent");
                                }}
                                size="small"
                                sx={{
                                  width: 32,
                                  height: 32,
                                  bgcolor:
                                    status === "Absent"
                                      ? "error.main"
                                      : "transparent",
                                  color:
                                    status === "Absent"
                                      ? "white"
                                      : isDark
                                        ? "#FCA5A5"
                                        : "error.dark",
                                  border: "2px solid",
                                  borderColor:
                                    status === "Absent"
                                      ? "error.main"
                                      : isDark
                                        ? "rgba(239,68,68,0.3)"
                                        : "error.light",
                                  "&:hover": {
                                    bgcolor:
                                      status === "Absent"
                                        ? "error.dark"
                                        : "error.50",
                                  },
                                }}
                              >
                                <CancelIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {/* ═══ STICKY SAVE BAR ═══ */}
          {stats.total > 0 && (
            <Paper
              sx={{
                position: "fixed",
                bottom: { xs: 64, md: 0 },
                left: 0,
                right: 0,
                p: { xs: 1.5, sm: 2 },
                zIndex: 100,
                borderRadius: 0,
                borderTop: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                boxShadow: isDark
                  ? "0 -4px 20px rgba(0,0,0,0.4)"
                  : "0 -4px 12px rgba(0,0,0,0.08)",
              }}
            >
              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={
                  saving ? (
                    <CircularProgress size={18} sx={{ color: "white" }} />
                  ) : (
                    <SaveIcon />
                  )
                }
                onClick={handleSave}
                disabled={saving || (sheet.isLocked && !isAdmin)}
                sx={{
                  py: 1.5,
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                  fontWeight: 800,
                  borderRadius: 3,
                  textTransform: "none",
                  background:
                    "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
                  boxShadow: "0 4px 14px rgba(13,27,62,0.35)",
                  "&:active": { transform: "scale(0.98)" },
                }}
              >
                {saving
                  ? "Saving..."
                  : `Save Attendance (${stats.marked}/${stats.total})`}
              </Button>
            </Paper>
          )}
        </>
      )}

      {/* ═══ LOCK DIALOG ═══ */}
      <ConfirmDialog
        open={!!confirmLock}
        title={
          confirmLock === "lock" ? "Lock Attendance?" : "Unlock Attendance?"
        }
        message={
          confirmLock === "lock"
            ? "Teachers cannot edit locked attendance."
            : "Unlocking allows editing."
        }
        confirmText={confirmLock === "lock" ? "Lock" : "Unlock"}
        severity={confirmLock === "lock" ? "warning" : "info"}
        onConfirm={handleLockToggle}
        onClose={() => setConfirmLock(null)}
      />
    </Box>
  );
};

export default MarkAttendancePage;
