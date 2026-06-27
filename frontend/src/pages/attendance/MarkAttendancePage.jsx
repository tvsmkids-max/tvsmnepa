import React, { useState, useEffect, useCallback } from "react";
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
  Alert,
  CircularProgress,
  Avatar,
  Tooltip,
  IconButton,
  Card,
  CardContent,
  Divider,
  Fab,
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

const formatDate = (d) => {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const MarkAttendancePage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { isAdmin } = useAuth();
  const { settings } = useSettings();

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
          // Auto-select first class if only one (typical for teachers)
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
      // Toggle: nothing → Present → Absent → nothing
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

  const stats = React.useMemo(() => {
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

  const selectedClassObj = classes.find((c) => c._id === selectedClass);

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
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
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
            <Stack direction="row" spacing={1} flexWrap="wrap">
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
        <Paper sx={{ p: 3, borderRadius: 3, textAlign: "center" }}>
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
                  bgcolor: "#E6F4EA",
                  textAlign: "center",
                }}
              >
                <Typography variant="h6" fontWeight={900} color="success.dark">
                  {stats.Present}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: "success.dark",
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
                  bgcolor: "#FEE2E2",
                  textAlign: "center",
                }}
              >
                <Typography variant="h6" fontWeight={900} color="error.dark">
                  {stats.Absent}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: "error.dark",
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
                  bgcolor: "#FFF4E5",
                  textAlign: "center",
                }}
              >
                <Typography variant="h6" fontWeight={900} color="warning.dark">
                  {stats.unmarked}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: "warning.dark",
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
                sx={{ py: 1.4, fontWeight: 700, borderRadius: 2 }}
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
                sx={{ py: 1.4, fontWeight: 700, borderRadius: 2 }}
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
            <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
              {/* Header */}
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: "#F8F9FC",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight={800}
                  sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
                >
                  Students ({stats.total}) • Tap to mark
                </Typography>
              </Box>

              {sheet.students.map((item, idx) => {
                const status = attendance[item.student._id];
                const isLast = idx === sheet.students.length - 1;
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
                      bgcolor:
                        status === "Present"
                          ? "#F0FDF4"
                          : status === "Absent"
                            ? "#FEF2F2"
                            : "transparent",
                      cursor:
                        sheet.isLocked && !isAdmin ? "not-allowed" : "pointer",
                      transition: "background-color 0.15s",
                      "&:active": { transform: "scale(0.995)" },
                    }}
                  >
                    <Chip
                      label={item.student.rollNumber}
                      size="small"
                      sx={{
                        minWidth: 38,
                        bgcolor: "#E0EBFF",
                        color: "#1E4D98",
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
                        sx={{ fontSize: "0.92rem" }}
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
                              : "success.50",
                          color:
                            status === "Present" ? "white" : "success.dark",
                          border: "2px solid",
                          borderColor:
                            status === "Present"
                              ? "success.main"
                              : "success.light",
                          "&:hover": {
                            bgcolor:
                              status === "Present"
                                ? "success.dark"
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
                            status === "Absent" ? "error.main" : "error.50",
                          color: status === "Absent" ? "white" : "error.dark",
                          border: "2px solid",
                          borderColor:
                            status === "Absent" ? "error.main" : "error.light",
                          "&:hover": {
                            bgcolor:
                              status === "Absent" ? "error.dark" : "error.100",
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
                bottom: { xs: 64, md: 0 }, // Above bottom nav on mobile
                left: 0,
                right: 0,
                p: 2,
                zIndex: 100,
                borderRadius: 0,
                borderTop: "1px solid",
                borderColor: "divider",
                boxShadow: "0 -4px 12px rgba(0,0,0,0.08)",
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
                  background:
                    "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
                  boxShadow: "0 4px 14px rgba(13,27,62,0.35)",
                  "&:active": { transform: "scale(0.98)" },
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
