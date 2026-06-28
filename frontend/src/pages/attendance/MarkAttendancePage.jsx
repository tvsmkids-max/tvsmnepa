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
  Divider,
  useTheme,
} from "@mui/material";
import { useSnackbar } from "notistack";
import EventNoteIcon from "@mui/icons-material/EventNote";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import SaveIcon from "@mui/icons-material/Save";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
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
  const theme = useTheme();

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

  const markAll = (status) => {
    if (!sheet?.students) return;
    const next = {};
    sheet.students.forEach((item) => {
      next[item.student._id] = status;
    });
    setAttendance(next);
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

  const stats = useMemo(() => {
    if (!sheet?.students)
      return { Present: 0, Absent: 0, total: 0, unmarked: 0 };
    const total = sheet.students.length;
    let p = 0,
      a = 0;
    sheet.students.forEach((item) => {
      const s = attendance[item.student._id];
      if (s === "Present") p++;
      else if (s === "Absent") a++;
    });
    return { Present: p, Absent: a, total, unmarked: total - p - a };
  }, [sheet, attendance]);

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
      enqueueSnackbar("Attendance saved ✓", { variant: "success" });
      triggerRefresh();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Failed", {
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

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

  // ─── THEME-AWARE COLORS ───
  const colors = {
    presentBg: isDark ? "rgba(34,197,94,0.15)" : "#E6F4EA",
    presentText: isDark ? "#86EFAC" : "#1B5E20",
    presentBorder: isDark ? "rgba(34,197,94,0.3)" : "#A7F3D0",
    absentBg: isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2",
    absentText: isDark ? "#FCA5A5" : "#991B1B",
    absentBorder: isDark ? "rgba(239,68,68,0.3)" : "#FECACA",
    warningBg: isDark ? "rgba(245,158,11,0.15)" : "#FFF4E5",
    warningText: isDark ? "#FCD34D" : "#92400E",
    classChipBg: isDark ? "rgba(59,130,246,0.2)" : "#E0EBFF",
    classChipText: isDark ? "#93C5FD" : "#1E4D98",
    rowHoverBg: isDark ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.04)",
    headerBg: isDark ? "rgba(255,255,255,0.03)" : "#F8F9FC",
  };

  return (
    <Box sx={{ pb: stats.total > 0 ? 10 : 2 }}>
      <PageHeader
        title="Mark Attendance"
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Attendance" },
        ]}
      />

      {/* Class + Date Selector */}
      <Paper
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack spacing={2}>
          <FormControl fullWidth size="small">
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
                    Class {c.name} - Section {c.section}
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
            fullWidth
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: formatDate(new Date()) }}
          />

          {sheet && !sheet.isHoliday && (
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              alignItems="center"
              useFlexGap
            >
              {sheet.isLocked ? (
                <Chip
                  icon={<LockIcon sx={{ fontSize: 14 }} />}
                  label="Locked"
                  color="error"
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              ) : (
                <Chip
                  icon={<LockOpenIcon sx={{ fontSize: 14 }} />}
                  label="Open"
                  color="success"
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              )}
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

      {sheet?.isHoliday && (
        <Paper
          sx={{
            p: 3,
            borderRadius: 3,
            textAlign: "center",
            border: "1px solid",
            borderColor: "warning.light",
            bgcolor: colors.warningBg,
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

      {sheet && !sheet.isHoliday && !loading && (
        <>
          {/* Compact Stats Row */}
          <Grid container spacing={1} sx={{ mb: 2 }}>
            <Grid item xs={3}>
              <Box
                sx={{
                  p: 1.2,
                  borderRadius: 2,
                  bgcolor: "background.paper",
                  textAlign: "center",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography variant="h6" fontWeight={900}>
                  {stats.total}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    color: "text.secondary",
                  }}
                >
                  TOTAL
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box
                sx={{
                  p: 1.2,
                  borderRadius: 2,
                  bgcolor: colors.presentBg,
                  textAlign: "center",
                  border: "1px solid",
                  borderColor: colors.presentBorder,
                }}
              >
                <Typography
                  variant="h6"
                  fontWeight={900}
                  sx={{ color: colors.presentText }}
                >
                  {stats.Present}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: colors.presentText,
                  }}
                >
                  PRESENT
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box
                sx={{
                  p: 1.2,
                  borderRadius: 2,
                  bgcolor: colors.absentBg,
                  textAlign: "center",
                  border: "1px solid",
                  borderColor: colors.absentBorder,
                }}
              >
                <Typography
                  variant="h6"
                  fontWeight={900}
                  sx={{ color: colors.absentText }}
                >
                  {stats.Absent}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: colors.absentText,
                  }}
                >
                  ABSENT
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box
                sx={{
                  p: 1.2,
                  borderRadius: 2,
                  bgcolor: colors.warningBg,
                  textAlign: "center",
                  border: "1px solid",
                  borderColor: "warning.light",
                }}
              >
                <Typography
                  variant="h6"
                  fontWeight={900}
                  sx={{ color: colors.warningText }}
                >
                  {stats.unmarked}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: colors.warningText,
                  }}
                >
                  PENDING
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Bulk Action Buttons */}
          {stats.total > 0 && (
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Button
                variant="contained"
                fullWidth
                color="success"
                size="large"
                startIcon={<DoneAllIcon />}
                disabled={sheet.isLocked && !isAdmin}
                onClick={() => markAll("Present")}
                sx={{
                  py: 1.4,
                  fontWeight: 700,
                  borderRadius: 2,
                  textTransform: "none",
                }}
              >
                All Present
              </Button>
              <Button
                variant="outlined"
                fullWidth
                color="error"
                size="large"
                startIcon={<ClearAllIcon />}
                disabled={sheet.isLocked && !isAdmin}
                onClick={() => markAll("Absent")}
                sx={{
                  py: 1.4,
                  fontWeight: 700,
                  borderRadius: 2,
                  textTransform: "none",
                }}
              >
                All Absent
              </Button>
            </Stack>
          )}

          {stats.total === 0 ? (
            <Paper sx={{ borderRadius: 3, p: 4, textAlign: "center" }}>
              <EventNoteIcon
                sx={{ fontSize: 64, color: "text.disabled", mb: 2 }}
              />
              <Typography variant="h6" fontWeight={700} gutterBottom>
                No students in this class
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add students to this class first.
              </Typography>
            </Paper>
          ) : (
            <Paper
              sx={{
                borderRadius: 3,
                overflow: "hidden",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              {/* Header */}
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: colors.headerBg,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight={800}
                  sx={{
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "text.secondary",
                  }}
                >
                  Students ({stats.total}) • Tap to mark
                </Typography>
              </Box>

              {sheet.students.map((item, idx) => {
                const status = attendance[item.student._id];
                const isLast = idx === sheet.students.length - 1;
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
                      !sheet.isLocked && toggleStudent(item.student._id)
                    }
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      px: 2,
                      py: 1.5,
                      borderBottom: isLast ? "none" : "1px solid",
                      borderColor: "divider",
                      bgcolor: rowBg,
                      cursor:
                        sheet.isLocked && !isAdmin ? "not-allowed" : "pointer",
                      transition: "background-color 0.15s",
                      "&:hover": {
                        bgcolor:
                          status === "Present"
                            ? colors.presentBg
                            : status === "Absent"
                              ? colors.absentBg
                              : colors.rowHoverBg,
                      },
                      "&:active": { transform: "scale(0.995)" },
                    }}
                  >
                    <Chip
                      label={item.student.rollNumber}
                      size="small"
                      sx={{
                        minWidth: 38,
                        bgcolor: colors.classChipBg,
                        color: colors.classChipText,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    />
                    <Avatar
                      sx={{
                        bgcolor:
                          item.student.gender === "Female"
                            ? "#EC4899"
                            : "#1E4D98",
                        width: 36,
                        height: 36,
                        fontSize: "0.85rem",
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
                        sx={{ fontSize: "0.92rem", color: "text.primary" }}
                      >
                        {item.student.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: "0.7rem" }}
                      >
                        {item.student.scholarNumber}
                      </Typography>
                    </Box>

                    {/* Big Tap Buttons */}
                    <Stack direction="row" spacing={0.5}>
                      <IconButton
                        disabled={sheet.isLocked && !isAdmin}
                        onClick={(e) => {
                          e.stopPropagation();
                          setStudentStatus(item.student._id, "Present");
                        }}
                        sx={{
                          width: 44,
                          height: 44,
                          bgcolor:
                            status === "Present"
                              ? "success.main"
                              : isDark
                                ? "rgba(34,197,94,0.15)"
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
                          "&:hover": {
                            bgcolor:
                              status === "Present"
                                ? "success.dark"
                                : isDark
                                  ? "rgba(34,197,94,0.25)"
                                  : "success.100",
                          },
                          "&:active": { transform: "scale(0.95)" },
                        }}
                      >
                        <CheckCircleIcon />
                      </IconButton>
                      <IconButton
                        disabled={sheet.isLocked && !isAdmin}
                        onClick={(e) => {
                          e.stopPropagation();
                          setStudentStatus(item.student._id, "Absent");
                        }}
                        sx={{
                          width: 44,
                          height: 44,
                          bgcolor:
                            status === "Absent"
                              ? "error.main"
                              : isDark
                                ? "rgba(239,68,68,0.15)"
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
                          "&:hover": {
                            bgcolor:
                              status === "Absent"
                                ? "error.dark"
                                : isDark
                                  ? "rgba(239,68,68,0.25)"
                                  : "error.100",
                          },
                          "&:active": { transform: "scale(0.95)" },
                        }}
                      >
                        <CancelIcon />
                      </IconButton>
                    </Stack>
                  </Box>
                );
              })}
            </Paper>
          )}

          {/* Fixed Save Bar at Bottom */}
          {stats.total > 0 && (
            <Paper
              sx={{
                position: "fixed",
                bottom: { xs: 64, md: 0 },
                left: 0,
                right: 0,
                p: 2,
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
                    <CircularProgress size={20} sx={{ color: "white" }} />
                  ) : (
                    <SaveIcon />
                  )
                }
                onClick={handleSave}
                disabled={saving || (sheet.isLocked && !isAdmin)}
                sx={{
                  py: 1.8,
                  fontSize: "1rem",
                  fontWeight: 800,
                  borderRadius: 3,
                  textTransform: "none",
                  background:
                    "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
                  boxShadow: "0 4px 14px rgba(13,27,62,0.35)",
                  "&:active": { transform: "scale(0.98)" },
                  "&:hover": {
                    boxShadow: "0 6px 20px rgba(13,27,62,0.45)",
                  },
                }}
              >
                {saving
                  ? "Saving..."
                  : `Save Attendance (${stats.Present + stats.Absent}/${stats.total})`}
              </Button>
            </Paper>
          )}
        </>
      )}

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
