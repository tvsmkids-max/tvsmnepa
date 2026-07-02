import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Paper,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Typography,
  Chip,
  CircularProgress,
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
  Tooltip,
  useMediaQuery,
  useTheme,
  alpha,
} from "@mui/material";
import { useSnackbar } from "notistack";
import EventNoteIcon from "@mui/icons-material/EventNote";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import SaveIcon from "@mui/icons-material/Save";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import ClassOutlinedIcon from "@mui/icons-material/ClassOutlined";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import attendanceApi from "../../api/attendanceApi";
import classApi from "../../api/classApi";
import useAuth from "../../hooks/useAuth";
import useSettings from "../../hooks/useSettings";
import useThemeMode from "../../hooks/useThemeMode";

// ═══════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════

const formatDate = (d) => {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const formatRoll = (n) => String(n ?? "").padStart(2, "0");

// ═══════════════════════════════════════════════════════════════════
//  SEGMENTED P|A TOGGLE
// ═══════════════════════════════════════════════════════════════════

const StatusToggle = React.memo(function StatusToggle({
  status,
  disabled,
  onChange,
  isDark,
  size = "md",
}) {
  const dims =
    size === "lg"
      ? { width: 44, height: 38, fs: "0.85rem" }
      : size === "sm"
        ? { width: 36, height: 30, fs: "0.75rem" }
        : { width: 40, height: 34, fs: "0.8rem" };

  const baseBtn = {
    width: dims.width,
    height: dims.height,
    border: "1.5px solid",
    fontWeight: 800,
    fontSize: dims.fs,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.15s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    userSelect: "none",
    "&:active": disabled ? {} : { transform: "scale(0.95)" },
  };

  const presentActive = status === "Present";
  const absentActive = status === "Absent";

  return (
    <Stack direction="row" sx={{ flexShrink: 0 }}>
      <Box
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onChange(presentActive ? null : "Present");
        }}
        sx={{
          ...baseBtn,
          borderRadius: "8px 0 0 8px",
          borderRight: 0,
          bgcolor: presentActive
            ? "#16A34A"
            : isDark
              ? alpha("#16A34A", 0.08)
              : "#F0FDF4",
          color: presentActive ? "#fff" : isDark ? "#86EFAC" : "#15803D",
          borderColor: presentActive
            ? "#16A34A"
            : isDark
              ? alpha("#16A34A", 0.3)
              : "#BBF7D0",
          "&:hover": disabled
            ? {}
            : {
                bgcolor: presentActive
                  ? "#15803D"
                  : isDark
                    ? alpha("#16A34A", 0.16)
                    : "#DCFCE7",
              },
        }}
      >
        P
      </Box>

      <Box
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onChange(absentActive ? null : "Absent");
        }}
        sx={{
          ...baseBtn,
          borderRadius: "0 8px 8px 0",
          bgcolor: absentActive
            ? "#DC2626"
            : isDark
              ? alpha("#DC2626", 0.08)
              : "#FEF2F2",
          color: absentActive ? "#fff" : isDark ? "#FCA5A5" : "#B91C1C",
          borderColor: absentActive
            ? "#DC2626"
            : isDark
              ? alpha("#DC2626", 0.3)
              : "#FECACA",
          "&:hover": disabled
            ? {}
            : {
                bgcolor: absentActive
                  ? "#B91C1C"
                  : isDark
                    ? alpha("#DC2626", 0.16)
                    : "#FEE2E2",
              },
        }}
      >
        A
      </Box>
    </Stack>
  );
});

// ═══════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════

const MarkAttendancePage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { isAdmin, user } = useAuth();
  const { settings } = useSettings();
  const { isDark } = useThemeMode();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));

  const isTeacher = user?.role === "teacher";

  // ─── State ────────────────────────────────────────────────────
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

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("rollNumber");
  const [sortOrder, setSortOrder] = useState("asc");

  // ─── Load classes ─────────────────────────────────────────────
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
          // ✅ AUTO-SELECT if teacher has only 1 class
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

  // ─── Load attendance sheet ────────────────────────────────────
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

  // ─── Handlers ─────────────────────────────────────────────────
  const markAll = useCallback(
    (status) => {
      if (!sheet?.students) return;
      const next = {};
      sheet.students.forEach((item) => {
        next[item.student._id] = status;
      });
      setAttendance(next);
    },
    [sheet],
  );

  const resetAll = useCallback(() => setAttendance({}), []);

  const setStudentStatus = useCallback((id, status) => {
    setAttendance((p) => {
      const next = { ...p };
      if (status === null) {
        delete next[id];
      } else {
        next[id] = status;
      }
      return next;
    });
  }, []);

  // ─── Stats ────────────────────────────────────────────────────
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

  // ─── Filtered + Sorted students ───────────────────────────────
  const displayStudents = useMemo(() => {
    if (!sheet?.students) return [];
    let list = [...sheet.students];

    if (filter === "present") {
      list = list.filter((item) => attendance[item.student._id] === "Present");
    } else if (filter === "absent") {
      list = list.filter((item) => attendance[item.student._id] === "Absent");
    } else if (filter === "pending") {
      list = list.filter((item) => !attendance[item.student._id]);
    }

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

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // ─── Save ─────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedClass || !date) return;
    if (
      stats.unmarked > 0 &&
      !window.confirm(`${stats.unmarked} students unmarked. Save anyway?`)
    ) {
      return;
    }
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
        `✅ Saved: ${stats.Present}P / ${stats.Absent}A of ${stats.total}`,
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

  // ─── Lock/Unlock ──────────────────────────────────────────────
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

  // ─── Computed flags ───────────────────────────────────────────
  const isLockedForMe = sheet?.isLocked && !isAdmin;
  const hasRows = displayStudents.length > 0;

  // ✅ SMART: Determine if we should show dropdown or fixed badge
  // - Teacher with 1 class → show as badge (auto-selected)
  // - Teacher with 2+ classes → show dropdown
  // - Admin/Principal → always show dropdown
  const showClassAsBadge = isTeacher && classes.length === 1;
  const singleClass = showClassAsBadge ? classes[0] : null;

  // ═══════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <Box
      sx={{
        pb:
          sheet && !sheet.isHoliday && stats.total > 0 ? { xs: 12, md: 11 } : 2,
      }}
    >
      <PageHeader
        title="Mark Attendance"
        breadcrumbs={[
          {
            label: "Dashboard",
            path: isTeacher ? "/teacher/dashboard" : "/dashboard",
          },
          { label: "Attendance" },
        ]}
      />

      {/* ═══════════════════════════════════════════════════════════
          CONTROL STRIP — Class, Date, Stats, Progress, Actions
      ═══════════════════════════════════════════════════════════ */}
      <Paper
        sx={{
          p: { xs: 1.25, sm: 1.5 },
          mb: 1.5,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          position: { xs: "sticky", md: "relative" },
          top: { xs: 50, md: "auto" },
          zIndex: { xs: 5, md: 1 },
          bgcolor: "background.paper",
        }}
      >
        {/* ── Row 1: Class + Date ── */}
        <Stack
          direction="row"
          spacing={1}
          sx={{ mb: sheet && !sheet.isHoliday && stats.total > 0 ? 1 : 0 }}
          alignItems="center"
        >
          {showClassAsBadge ? (
            // ═══ TEACHER WITH 1 CLASS — Read-only badge ═══
            <Box
              sx={{
                flex: 2,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1.5,
                py: 1,
                borderRadius: 1.5,
                border: "1px solid",
                borderColor: isDark
                  ? alpha("#1E4D98", 0.4)
                  : alpha("#1E4D98", 0.2),
                bgcolor: isDark
                  ? alpha("#1E4D98", 0.12)
                  : alpha("#1E4D98", 0.06),
                minHeight: 40,
              }}
            >
              <ClassOutlinedIcon
                sx={{
                  fontSize: 20,
                  color: isDark ? "#93C5FD" : "#1E4D98",
                  flexShrink: 0,
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  fontWeight={800}
                  sx={{
                    fontSize: "0.9rem",
                    color: isDark ? "#93C5FD" : "#1E4D98",
                    lineHeight: 1.1,
                  }}
                  noWrap
                >
                  Class {singleClass.name} - {singleClass.section}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "0.68rem",
                    color: isDark
                      ? alpha("#93C5FD", 0.7)
                      : alpha("#1E4D98", 0.7),
                    fontWeight: 600,
                  }}
                >
                  {singleClass.studentCount ?? sheet?.students?.length ?? 0}{" "}
                  students · Your assigned class
                </Typography>
              </Box>
            </Box>
          ) : (
            // ═══ ADMIN/PRINCIPAL/MULTI-CLASS TEACHER — Dropdown ═══
            <FormControl size="small" sx={{ flex: 2, minWidth: 0 }}>
              <InputLabel>Class</InputLabel>
              <Select
                value={selectedClass}
                label="Class"
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={classesLoading}
                sx={{
                  "& .MuiSelect-select": {
                    fontWeight: 700,
                    fontSize: "0.85rem",
                  },
                }}
              >
                {classesLoading ? (
                  <MenuItem disabled>Loading…</MenuItem>
                ) : classes.length === 0 ? (
                  <MenuItem disabled>No classes available</MenuItem>
                ) : (
                  classes.map((c) => (
                    <MenuItem key={c._id} value={c._id}>
                      {c.name} - {c.section}
                      {c.studentCount !== undefined && ` (${c.studentCount})`}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          )}

          <TextField
            type="date"
            label="Date"
            size="small"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: formatDate(new Date()) }}
            sx={{
              flex: 1,
              minWidth: 130,
              "& input": { fontWeight: 700, fontSize: "0.82rem" },
            }}
          />
        </Stack>

        {/* ── Row 2: Stats pills + Lock chip ── */}
        {sheet && !sheet.isHoliday && stats.total > 0 && (
          <>
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
              sx={{ mb: 1 }}
            >
              <Chip
                size="small"
                label={`Total ${stats.total}`}
                sx={{
                  fontWeight: 800,
                  fontSize: "0.7rem",
                  height: 24,
                  bgcolor: isDark ? alpha("#fff", 0.06) : "#F1F5F9",
                  color: "text.primary",
                }}
              />
              <Chip
                size="small"
                label={`✓ ${stats.Present}`}
                sx={{
                  fontWeight: 800,
                  fontSize: "0.7rem",
                  height: 24,
                  bgcolor: isDark ? alpha("#16A34A", 0.18) : "#DCFCE7",
                  color: isDark ? "#86EFAC" : "#15803D",
                }}
              />
              <Chip
                size="small"
                label={`✗ ${stats.Absent}`}
                sx={{
                  fontWeight: 800,
                  fontSize: "0.7rem",
                  height: 24,
                  bgcolor: isDark ? alpha("#DC2626", 0.18) : "#FEE2E2",
                  color: isDark ? "#FCA5A5" : "#B91C1C",
                }}
              />
              <Chip
                size="small"
                label={`⏸ ${stats.unmarked}`}
                sx={{
                  fontWeight: 800,
                  fontSize: "0.7rem",
                  height: 24,
                  bgcolor: isDark ? alpha("#F59E0B", 0.18) : "#FEF3C7",
                  color: isDark ? "#FCD34D" : "#B45309",
                }}
              />

              <Box sx={{ flex: 1 }} />

              {sheet.isLocked && (
                <Chip
                  icon={<LockIcon sx={{ fontSize: 12 }} />}
                  label="Locked"
                  size="small"
                  color="error"
                  sx={{ fontWeight: 700, fontSize: "0.65rem", height: 22 }}
                />
              )}
              {isAdmin && sheet.isMarked && (
                <Tooltip title={sheet.isLocked ? "Unlock" : "Lock"}>
                  <IconButton
                    size="small"
                    onClick={() =>
                      setConfirmLock(sheet.isLocked ? "unlock" : "lock")
                    }
                    sx={{ width: 24, height: 24 }}
                  >
                    {sheet.isLocked ? (
                      <LockOpenIcon sx={{ fontSize: 14 }} />
                    ) : (
                      <LockIcon sx={{ fontSize: 14 }} />
                    )}
                  </IconButton>
                </Tooltip>
              )}
            </Stack>

            {/* ── Row 3: Progress Bar ── */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 1,
              }}
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
                  height: 4,
                  borderRadius: 2,
                  bgcolor: isDark ? alpha("#fff", 0.08) : alpha("#000", 0.06),
                }}
              />
              <Typography
                variant="caption"
                fontWeight={800}
                sx={{
                  fontSize: "0.68rem",
                  color: "text.secondary",
                  minWidth: 38,
                  textAlign: "right",
                }}
              >
                {stats.marked}/{stats.total}
              </Typography>
            </Box>

            {/* ── Row 4: Search + Bulk Actions ── */}
            <Stack direction="row" spacing={0.75} alignItems="center">
              <TextField
                placeholder="Search name, roll, scholar…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                sx={{
                  flex: 1,
                  "& .MuiInputBase-root": {
                    height: 34,
                    fontSize: "0.82rem",
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon
                        sx={{ fontSize: 16, color: "text.disabled" }}
                      />
                    </InputAdornment>
                  ),
                  endAdornment: search && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setSearch("")}
                        sx={{ p: 0.25 }}
                      >
                        <ClearIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Tooltip title="Mark All Present">
                <span>
                  <IconButton
                    size="small"
                    disabled={isLockedForMe}
                    onClick={() => markAll("Present")}
                    sx={{
                      width: 34,
                      height: 34,
                      bgcolor: isDark ? alpha("#16A34A", 0.15) : "#DCFCE7",
                      color: isDark ? "#86EFAC" : "#15803D",
                      borderRadius: 1.5,
                      "&:hover": {
                        bgcolor: isDark ? alpha("#16A34A", 0.25) : "#BBF7D0",
                      },
                    }}
                  >
                    <DoneAllIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Mark All Absent">
                <span>
                  <IconButton
                    size="small"
                    disabled={isLockedForMe}
                    onClick={() => markAll("Absent")}
                    sx={{
                      width: 34,
                      height: 34,
                      bgcolor: isDark ? alpha("#DC2626", 0.15) : "#FEE2E2",
                      color: isDark ? "#FCA5A5" : "#B91C1C",
                      borderRadius: 1.5,
                      "&:hover": {
                        bgcolor: isDark ? alpha("#DC2626", 0.25) : "#FECACA",
                      },
                    }}
                  >
                    <ClearAllIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Reset All">
                <span>
                  <IconButton
                    size="small"
                    disabled={isLockedForMe}
                    onClick={resetAll}
                    sx={{
                      width: 34,
                      height: 34,
                      bgcolor: isDark ? alpha("#fff", 0.06) : "#F1F5F9",
                      color: "text.secondary",
                      borderRadius: 1.5,
                      "&:hover": {
                        bgcolor: isDark ? alpha("#fff", 0.1) : "#E2E8F0",
                      },
                    }}
                  >
                    <RestartAltIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>

            {/* ── Row 5: Filter chips ── */}
            <Stack
              direction="row"
              spacing={0.5}
              sx={{
                mt: 1,
                overflowX: "auto",
                pb: 0.25,
                "&::-webkit-scrollbar": { display: "none" },
                scrollbarWidth: "none",
              }}
            >
              {[
                { value: "all", label: `All ${stats.total}` },
                {
                  value: "present",
                  label: `Present ${stats.Present}`,
                  color: "success",
                },
                {
                  value: "absent",
                  label: `Absent ${stats.Absent}`,
                  color: "error",
                },
                {
                  value: "pending",
                  label: `Pending ${stats.unmarked}`,
                  color: "warning",
                },
              ].map((f) => (
                <Chip
                  key={f.value}
                  label={f.label}
                  size="small"
                  onClick={() => setFilter(f.value)}
                  color={filter === f.value ? f.color || "primary" : "default"}
                  variant={filter === f.value ? "filled" : "outlined"}
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.68rem",
                    height: 24,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                />
              ))}
            </Stack>
          </>
        )}
      </Paper>

      {/* ═══ EMPTY/LOADING STATES ═══ */}
      {!selectedClass &&
        !classesLoading &&
        classes.length > 0 &&
        !isTeacher && (
          <Paper sx={{ borderRadius: 2 }}>
            <EmptyState
              icon={<EventNoteIcon sx={{ fontSize: 64 }} />}
              title="Select a class"
              message="Choose a class above to begin marking attendance."
            />
          </Paper>
        )}

      {!classesLoading && classes.length === 0 && (
        <Paper sx={{ borderRadius: 2 }}>
          <EmptyState
            icon={<EventNoteIcon sx={{ fontSize: 64 }} />}
            title="No classes assigned"
            message={
              isTeacher
                ? "Contact admin to assign classes to you."
                : "No classes found. Create one first."
            }
          />
        </Paper>
      )}

      {selectedClass && loading && (
        <Paper sx={{ p: 6, textAlign: "center", borderRadius: 2 }}>
          <CircularProgress />
        </Paper>
      )}

      {/* ═══ HOLIDAY BANNER ═══ */}
      {sheet?.isHoliday && (
        <Paper
          sx={{
            p: 3,
            borderRadius: 2,
            textAlign: "center",
            border: "1px solid",
            borderColor: "warning.light",
            bgcolor: isDark ? alpha("#F59E0B", 0.05) : "#FFFBEB",
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

      {/* ═══ STUDENT LIST ═══ */}
      {sheet && !sheet.isHoliday && !loading && (
        <>
          {stats.total === 0 ? (
            <Paper sx={{ borderRadius: 2, p: 4, textAlign: "center" }}>
              <EventNoteIcon
                sx={{ fontSize: 64, color: "text.disabled", mb: 2 }}
              />
              <Typography variant="h6" fontWeight={700}>
                No students in this class
              </Typography>
            </Paper>
          ) : !hasRows ? (
            <Paper sx={{ borderRadius: 2, p: 4, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                No students match your search/filter
              </Typography>
            </Paper>
          ) : isMobile ? (
            /* ═══════════════════════════════════════════════════════
                MOBILE LIST
            ═══════════════════════════════════════════════════════ */
            <Paper
              sx={{
                borderRadius: 2,
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
                    ? isDark
                      ? alpha("#16A34A", 0.06)
                      : "#F0FDF4"
                    : status === "Absent"
                      ? isDark
                        ? alpha("#DC2626", 0.06)
                        : "#FEF2F2"
                      : "transparent";

                return (
                  <Box
                    key={item.student._id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.25,
                      px: 1.5,
                      py: 1.1,
                      borderBottom: isLast ? "none" : "1px solid",
                      borderColor: "divider",
                      bgcolor: rowBg,
                      transition: "background-color 0.15s",
                    }}
                  >
                    <Typography
                      sx={{
                        minWidth: 26,
                        fontWeight: 800,
                        fontSize: "0.78rem",
                        color: isDark ? "#93C5FD" : "#1E4D98",
                        fontFamily: "monospace",
                        textAlign: "center",
                        flexShrink: 0,
                      }}
                    >
                      {formatRoll(item.student.rollNumber)}
                    </Typography>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        noWrap
                        sx={{
                          fontSize: "0.85rem",
                          color: "text.primary",
                          textTransform: "uppercase",
                          lineHeight: 1.2,
                        }}
                      >
                        {item.student.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        sx={{
                          fontSize: "0.68rem",
                          display: "block",
                          lineHeight: 1.3,
                          mt: 0.1,
                        }}
                      >
                        {item.student.fatherName || "—"}
                        <Box component="span" sx={{ mx: 0.5, opacity: 0.5 }}>
                          ·
                        </Box>
                        <Box component="span" sx={{ fontFamily: "monospace" }}>
                          #{item.student.scholarNumber}
                        </Box>
                      </Typography>
                    </Box>

                    <StatusToggle
                      status={status}
                      disabled={isLockedForMe}
                      onChange={(s) => setStudentStatus(item.student._id, s)}
                      isDark={isDark}
                      size="md"
                    />
                  </Box>
                );
              })}
            </Paper>
          ) : (
            /* ═══════════════════════════════════════════════════════
                DESKTOP TABLE
            ═══════════════════════════════════════════════════════ */
            <Paper
              sx={{
                borderRadius: 2,
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
                          fontSize: "0.7rem",
                          bgcolor: isDark ? alpha("#fff", 0.04) : "#F8FAFC",
                          width: 60,
                          textTransform: "uppercase",
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
                          fontSize: "0.7rem",
                          bgcolor: isDark ? alpha("#fff", 0.04) : "#F8FAFC",
                          textTransform: "uppercase",
                        }}
                      >
                        <TableSortLabel
                          active={sortBy === "name"}
                          direction={sortBy === "name" ? sortOrder : "asc"}
                          onClick={() => handleSort("name")}
                        >
                          Student
                        </TableSortLabel>
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.7rem",
                          bgcolor: isDark ? alpha("#fff", 0.04) : "#F8FAFC",
                          width: 110,
                          textTransform: "uppercase",
                        }}
                      >
                        <TableSortLabel
                          active={sortBy === "scholarNumber"}
                          direction={
                            sortBy === "scholarNumber" ? sortOrder : "asc"
                          }
                          onClick={() => handleSort("scholarNumber")}
                        >
                          Scholar #
                        </TableSortLabel>
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.7rem",
                          bgcolor: isDark ? alpha("#fff", 0.04) : "#F8FAFC",
                          width: 110,
                          textTransform: "uppercase",
                        }}
                      >
                        Status
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayStudents.map((item) => {
                      const status = attendance[item.student._id];
                      const rowBg =
                        status === "Present"
                          ? isDark
                            ? alpha("#16A34A", 0.06)
                            : "#F0FDF4"
                          : status === "Absent"
                            ? isDark
                              ? alpha("#DC2626", 0.06)
                              : "#FEF2F2"
                            : "transparent";

                      return (
                        <TableRow
                          key={item.student._id}
                          hover
                          sx={{
                            bgcolor: rowBg,
                            "& td": { py: 1, borderColor: "divider" },
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
                              {formatRoll(item.student.rollNumber)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              sx={{
                                fontSize: "0.85rem",
                                textTransform: "uppercase",
                                lineHeight: 1.2,
                              }}
                            >
                              {item.student.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontSize: "0.7rem" }}
                            >
                              {item.student.fatherName || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="caption"
                              sx={{
                                fontFamily: "monospace",
                                fontSize: "0.75rem",
                                color: "text.secondary",
                              }}
                            >
                              {item.student.scholarNumber}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "center",
                              }}
                            >
                              <StatusToggle
                                status={status}
                                disabled={isLockedForMe}
                                onChange={(s) =>
                                  setStudentStatus(item.student._id, s)
                                }
                                isDark={isDark}
                                size="sm"
                              />
                            </Box>
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
                bottom: { xs: 60, md: 0 },
                left: { xs: 0, md: 220 },
                right: 0,
                p: { xs: 1, sm: 1.25 },
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
                disabled={saving || isLockedForMe || stats.marked === 0}
                sx={{
                  py: 1.25,
                  fontSize: { xs: "0.9rem", sm: "0.95rem" },
                  fontWeight: 800,
                  borderRadius: 2,
                  textTransform: "none",
                  background:
                    stats.marked === 0
                      ? undefined
                      : "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
                  boxShadow:
                    stats.marked === 0
                      ? "none"
                      : "0 4px 14px rgba(13,27,62,0.35)",
                  "&:active": { transform: "scale(0.98)" },
                }}
              >
                {saving
                  ? "Saving…"
                  : stats.marked === 0
                    ? "Mark students to save"
                    : `Save Attendance · ${stats.marked}/${stats.total}`}
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
