import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Paper,
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
  IconButton,
  Tooltip,
  Alert,
  Divider,
  Avatar,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useSnackbar } from "notistack";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import BeachAccessOutlinedIcon from "@mui/icons-material/BeachAccessOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import EmptyState from "../../components/common/EmptyState";
import reportApi from "../../api/reportApi";
import classApi from "../../api/classApi";
import useAuth from "../../hooks/useAuth";
import useSettings from "../../hooks/useSettings";
import { exportRegisterToExcel } from "../../utils/exportUtils";
import { generateRegisterPdf, downloadPdf } from "../../utils/pdfGenerator";

const formatDateInput = (d) => {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const getMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: formatDateInput(start), to: formatDateInput(end) };
};

const AttendanceRegisterTab = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const { settings } = useSettings();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const defaultRange = useMemo(() => getMonthRange(), []);

  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState("");
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);

  const [register, setRegister] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // ─── Load classes ───
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setClassesLoading(true);
      try {
        const res = await classApi.list({ limit: 500 });
        if (!cancelled) {
          const list =
            res.data?.data ||
            res.data?.classes ||
            (Array.isArray(res.data) ? res.data : []);
          setClasses(list);
          setClassesLoading(false);
          if (list.length > 0) {
            setSelectedClass(list[0]._id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setClasses([]);
          setClassesLoading(false);
          enqueueSnackbar(
            err.response?.data?.message || "Failed to load classes",
            { variant: "error" },
          );
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [enqueueSnackbar]);

  // ─── Load register data ───
  useEffect(() => {
    if (classesLoading) return;
    if (!selectedClass || !dateFrom || !dateTo) {
      setRegister(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await reportApi.getRegister({
          class: selectedClass,
          dateFrom,
          dateTo,
        });
        if (!cancelled) {
          setRegister(res.data?.data || null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setRegister(null);
          setLoading(false);
          enqueueSnackbar(
            err.response?.data?.message || "Failed to load register",
            { variant: "error" },
          );
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [
    classesLoading,
    selectedClass,
    dateFrom,
    dateTo,
    refreshKey,
    enqueueSnackbar,
  ]);

  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const dateRangeDays = useMemo(() => {
    if (!dateFrom || !dateTo) return 0;
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    return Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
  }, [dateFrom, dateTo]);

  const rangeError =
    dateRangeDays > 90
      ? `Range too long (${dateRangeDays} days). Max 90 days.`
      : dateRangeDays < 1
        ? "End date must be after start date"
        : null;

  const handleExportExcel = () => {
    if (!register) return;
    try {
      const filename = `register_${register.class.name}-${register.class.section}_${dateFrom}_to_${dateTo}`;
      exportRegisterToExcel(register, filename);
      enqueueSnackbar("Excel downloaded successfully", { variant: "success" });
    } catch (err) {
      enqueueSnackbar(`Export failed: ${err.message}`, { variant: "error" });
    }
  };

  const handleExportPdf = () => {
    if (!register) return;
    try {
      const doc = generateRegisterPdf(register, settings, user?.name);
      const filename = `register_${register.class.name}-${register.class.section}_${dateFrom}_to_${dateTo}`;
      downloadPdf(doc, filename);
      enqueueSnackbar("PDF downloaded successfully", { variant: "success" });
    } catch (err) {
      enqueueSnackbar(`PDF export failed: ${err.message}`, {
        variant: "error",
      });
    }
  };

  const selectedClassObj = classes.find((c) => c._id === selectedClass);

  return (
    <Box>
      {/* ─── INFO BANNER ─── */}
      <Alert
        severity="info"
        sx={{
          mb: 2,
          borderRadius: 3,
          "& .MuiAlert-icon": { alignItems: "center" },
        }}
        icon={<InfoOutlinedIcon />}
      >
        <Typography variant="body2" fontWeight={700}>
          Date-wise Attendance Register
        </Typography>
        <Typography variant="caption" sx={{ display: "block", mt: 0.3 }}>
          Select a class and date range, then download as Excel or PDF for the
          register-style view.
        </Typography>
      </Alert>

      {/* ─── FILTERS ─── */}
      <Paper
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: 2,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack spacing={1.2}>
          <FormControl fullWidth size="small" disabled={classesLoading}>
            <InputLabel>
              {classesLoading ? "Loading classes..." : "Class *"}
            </InputLabel>
            <Select
              value={selectedClass}
              label={classesLoading ? "Loading classes..." : "Class *"}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              {classesLoading ? (
                <MenuItem value="">
                  <em>Loading...</em>
                </MenuItem>
              ) : classes.length === 0 ? (
                <MenuItem value="" disabled>
                  <em>No classes available</em>
                </MenuItem>
              ) : (
                [
                  <MenuItem key="empty" value="">
                    <em>Select Class</em>
                  </MenuItem>,
                  ...classes.map((c) => (
                    <MenuItem key={c._id} value={c._id}>
                      {c.name} - {c.section}
                    </MenuItem>
                  )),
                ]
              )}
            </Select>
          </FormControl>

          <Stack direction="row" spacing={1}>
            <TextField
              type="date"
              label="From"
              size="small"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1, minWidth: 0 }}
            />

            <TextField
              type="date"
              label="To"
              size="small"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1, minWidth: 0 }}
            />
          </Stack>

          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh">
              <IconButton
                onClick={triggerRefresh}
                disabled={loading}
                size="small"
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                }}
              >
                <RefreshOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Button
              variant="contained"
              color="success"
              startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 18 }} />}
              onClick={handleExportExcel}
              disabled={!register || loading || rangeError}
              sx={{
                fontWeight: 700,
                py: 1,
                flex: 1,
                minWidth: 0,
                fontSize: { xs: "0.78rem", sm: "0.85rem" },
                textTransform: "none",
              }}
              size="small"
            >
              Excel
            </Button>

            <Button
              variant="contained"
              color="error"
              startIcon={<PictureAsPdfOutlinedIcon sx={{ fontSize: 18 }} />}
              onClick={handleExportPdf}
              disabled={!register || loading || rangeError}
              sx={{
                fontWeight: 700,
                py: 1,
                flex: 1,
                minWidth: 0,
                fontSize: { xs: "0.78rem", sm: "0.85rem" },
                textTransform: "none",
              }}
              size="small"
            >
              PDF
            </Button>
          </Stack>

          {/* Info chips */}
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
          >
            <Chip
              icon={<CalendarTodayOutlinedIcon sx={{ fontSize: 14 }} />}
              label={`${dateRangeDays} day${dateRangeDays !== 1 ? "s" : ""}`}
              size="small"
              color={rangeError ? "error" : "info"}
              sx={{ fontWeight: 700, height: 22, fontSize: "0.7rem" }}
            />
            {rangeError ? (
              <Typography
                variant="caption"
                color="error.dark"
                fontWeight={700}
                sx={{ fontSize: "0.7rem" }}
              >
                ⚠️ {rangeError}
              </Typography>
            ) : !classesLoading && classes.length > 0 ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: "0.7rem" }}
              >
                {classes.length} class{classes.length !== 1 ? "es" : ""}{" "}
                available
              </Typography>
            ) : null}
          </Stack>
        </Stack>
      </Paper>

      {/* ─── SUMMARY CARD ─── */}
      {classesLoading ? (
        <Paper sx={{ p: 6, textAlign: "center", borderRadius: 3 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading classes...
          </Typography>
        </Paper>
      ) : classes.length === 0 ? (
        <Paper sx={{ borderRadius: 3 }}>
          <EmptyState
            icon={<EventNoteOutlinedIcon sx={{ fontSize: 64 }} />}
            title="No classes available"
            message="Please create classes first or check if you're assigned to any class"
          />
        </Paper>
      ) : loading ? (
        <Paper sx={{ p: 6, textAlign: "center", borderRadius: 3 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading register data...
          </Typography>
        </Paper>
      ) : !selectedClass ? (
        <Paper sx={{ borderRadius: 3 }}>
          <EmptyState
            icon={<EventNoteOutlinedIcon sx={{ fontSize: 64 }} />}
            title="Select a class"
            message="Choose a class from the dropdown above to load register data"
          />
        </Paper>
      ) : !register || register.students.length === 0 ? (
        <Paper sx={{ borderRadius: 3 }}>
          <EmptyState
            icon={<EventNoteOutlinedIcon sx={{ fontSize: 64 }} />}
            title="No students found"
            message="This class has no active students for the selected period"
          />
        </Paper>
      ) : (
        <RegisterSummaryCard
          register={register}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
      )}
    </Box>
  );
};

// ─── SUMMARY CARD COMPONENT ───
const RegisterSummaryCard = ({ register, dateFrom, dateTo }) => {
  const fromStr = new Date(dateFrom).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const toStr = new Date(dateTo).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Calculate aggregate stats
  const aggregateStats = useMemo(() => {
    if (!register?.students) return null;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalMarked = 0;

    register.students.forEach((s) => {
      totalPresent += s.totals.present;
      totalAbsent += s.totals.absent;
      totalMarked += s.totals.marked;
    });

    const avgPercentage =
      totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;

    return {
      totalPresent,
      totalAbsent,
      totalMarked,
      avgPercentage,
    };
  }, [register]);

  return (
    <Stack spacing={2}>
      {/* CLASS HEADER */}
      <Paper
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            p: { xs: 2, sm: 2.5 },
            background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
            color: "white",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative blob */}
          <Box
            sx={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 140,
              height: 140,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(245,166,35,0.18) 0%, transparent 70%)",
            }}
          />

          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{ position: "relative", zIndex: 1 }}
          >
            <Avatar
              sx={{
                width: { xs: 48, sm: 56 },
                height: { xs: 48, sm: 56 },
                bgcolor: "white",
                color: "primary.main",
                fontSize: { xs: "1.2rem", sm: "1.4rem" },
                fontWeight: 900,
              }}
            >
              {register.class.name?.[0]}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="caption"
                sx={{
                  color: "rgba(255,255,255,0.7)",
                  letterSpacing: "0.08em",
                  fontWeight: 700,
                  fontSize: "0.65rem",
                  textTransform: "uppercase",
                }}
              >
                Attendance Register
              </Typography>
              <Typography
                variant="h6"
                fontWeight={900}
                sx={{
                  fontSize: { xs: "1.05rem", sm: "1.25rem" },
                  color: "white",
                  lineHeight: 1.2,
                  mt: 0.3,
                }}
              >
                Class {register.class.name} - {register.class.section}
              </Typography>
              {register.class.classTeacher && (
                <Typography
                  variant="caption"
                  sx={{
                    color: "rgba(255,255,255,0.8)",
                    fontSize: "0.72rem",
                    display: "block",
                    mt: 0.2,
                  }}
                >
                  Teacher: {register.class.classTeacher}
                </Typography>
              )}
            </Box>
          </Stack>

          <Box
            sx={{
              mt: 2,
              p: 1.2,
              borderRadius: 2,
              bgcolor: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "0.65rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "block",
              }}
            >
              Period
            </Typography>
            <Typography
              variant="body2"
              fontWeight={800}
              sx={{ color: "white", mt: 0.2 }}
            >
              {fromStr} → {toStr}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* STATS GRID */}
      <Stack spacing={1.5}>
        {/* Class Stats */}
        <Stack direction="row" spacing={1.2}>
          <StatBox
            label="STUDENTS"
            value={register.summary.totalStudents}
            icon={<PeopleOutlinedIcon />}
            color={{ bg: "#F0F4FF", text: "#1E4D98", border: "#BFDBFE" }}
          />
          <StatBox
            label="WORKING DAYS"
            value={register.summary.workingDays}
            icon={<CalendarTodayOutlinedIcon />}
            color={{ bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" }}
          />
          <StatBox
            label="HOLIDAYS"
            value={register.summary.holidays}
            icon={<BeachAccessOutlinedIcon />}
            color={{ bg: "#FCE7F3", text: "#9F1239", border: "#FBCFE8" }}
          />
        </Stack>

        {/* Attendance Stats */}
        {aggregateStats && (
          <Stack direction="row" spacing={1.2}>
            <StatBox
              label="PRESENT MARKS"
              value={aggregateStats.totalPresent}
              icon={<CheckCircleOutlinedIcon />}
              color={{ bg: "#E6F4EA", text: "#065F46", border: "#A7F3D0" }}
            />
            <StatBox
              label="ABSENT MARKS"
              value={aggregateStats.totalAbsent}
              icon={<CancelOutlinedIcon />}
              color={{ bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" }}
            />
            <StatBox
              label="AVG ATTENDANCE"
              value={`${aggregateStats.avgPercentage}%`}
              icon={<InfoOutlinedIcon />}
              color={
                aggregateStats.avgPercentage >= 75
                  ? { bg: "#E6F4EA", text: "#065F46", border: "#A7F3D0" }
                  : aggregateStats.avgPercentage >= 50
                    ? { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" }
                    : { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" }
              }
            />
          </Stack>
        )}
      </Stack>

      {/* DOWNLOAD CTA CARD */}
      <Paper
        sx={{
          p: 2.5,
          borderRadius: 3,
          textAlign: "center",
          background: "linear-gradient(135deg, #F8FAFF 0%, #E8F0FF 100%)",
          border: "1px dashed",
          borderColor: "primary.light",
        }}
      >
        <FileDownloadOutlinedIcon
          sx={{ fontSize: 40, color: "primary.main", mb: 1 }}
        />
        <Typography variant="body1" fontWeight={800} sx={{ mb: 0.5 }}>
          Ready to Download
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 1 }}
        >
          Register data for{" "}
          <strong>
            {register.summary.totalStudents} students ×{" "}
            {register.summary.totalDays} days
          </strong>{" "}
          is ready
        </Typography>
        <Typography
          variant="caption"
          sx={{
            display: "block",
            fontSize: "0.7rem",
            color: "text.disabled",
          }}
        >
          Use the Excel or PDF buttons above to download the full register
        </Typography>
      </Paper>

      {/* HOLIDAYS LIST (if any) */}
      {register.summary.holidays > 0 && (
        <Paper
          sx={{
            p: 2,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "warning.light",
            bgcolor: "#FFFBEB",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <BeachAccessOutlinedIcon
              sx={{ fontSize: 18, color: "warning.dark" }}
            />
            <Typography variant="body2" fontWeight={800} color="warning.dark">
              Holidays in this period
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
            {register.dates
              .filter((d) => d.isHoliday)
              .map((d) => (
                <Chip
                  key={d.dateKey}
                  label={`${d.day} ${d.monthShort}: ${d.holidayName}`}
                  size="small"
                  sx={{
                    height: 24,
                    fontSize: "0.7rem",
                    bgcolor: "white",
                    border: "1px solid",
                    borderColor: "warning.light",
                    fontWeight: 600,
                  }}
                />
              ))}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
};

// ─── STAT BOX COMPONENT ───
const StatBox = ({ label, value, icon, color }) => (
  <Paper
    sx={{
      flex: 1,
      p: 1.5,
      borderRadius: 2.5,
      bgcolor: color.bg,
      border: "1px solid",
      borderColor: color.border,
      textAlign: "center",
      boxShadow: "none",
      minWidth: 0,
    }}
  >
    {icon &&
      React.cloneElement(icon, {
        sx: { fontSize: 18, color: color.text, mb: 0.5 },
      })}
    <Typography
      variant="caption"
      sx={{
        display: "block",
        color: color.text,
        fontWeight: 700,
        fontSize: "0.6rem",
        letterSpacing: "0.04em",
        lineHeight: 1.2,
        mb: 0.3,
      }}
    >
      {label}
    </Typography>
    <Typography
      variant="h6"
      fontWeight={900}
      sx={{
        color: color.text,
        fontSize: { xs: "1.05rem", sm: "1.2rem" },
        lineHeight: 1,
      }}
    >
      {value}
    </Typography>
  </Paper>
);

export default AttendanceRegisterTab;
