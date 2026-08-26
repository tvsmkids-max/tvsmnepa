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
  Grid,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
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
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined";
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
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

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

  const isInvalidRange = dateRangeDays < 1;
  const isLargeRange = dateRangeDays > 90;

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

  return (
    <Box>
      {/* ─── FILTERS BAR ─── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: 2.5,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <FormControl
            size="small"
            sx={{ minWidth: 160 }}
            disabled={classesLoading}
          >
            <InputLabel>{classesLoading ? "Loading..." : "Class"}</InputLabel>
            <Select
              value={selectedClass}
              label={classesLoading ? "Loading..." : "Class"}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              {classesLoading ? (
                <MenuItem value="">
                  <em>Loading...</em>
                </MenuItem>
              ) : classes.length === 0 ? (
                <MenuItem value="" disabled>
                  <em>No classes</em>
                </MenuItem>
              ) : (
                classes.map((c) => (
                  <MenuItem key={c._id} value={c._id}>
                    {c.name} - {c.section}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          <Stack
            direction="row"
            spacing={1.5}
            sx={{ flex: { xs: 1, md: "none" } }}
          >
            <TextField
              type="date"
              label="From Date"
              size="small"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1, minWidth: 130 }}
            />
            <TextField
              type="date"
              label="To Date"
              size="small"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1, minWidth: 130 }}
              error={isInvalidRange}
            />
          </Stack>

          {/* Action Row (Right aligned on desktop) */}
          <Stack
            direction="row"
            spacing={1}
            sx={{ ml: { md: "auto" }, pt: { xs: 0.5, md: 0 } }}
          >
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
              disabled={!register || loading || isInvalidRange}
              size="small"
              sx={{
                fontWeight: 700,
                px: 2,
                boxShadow: "none",
                textTransform: "none",
                "&:hover": { boxShadow: "none", filter: "brightness(0.95)" },
              }}
            >
              Excel
            </Button>

            <Button
              variant="contained"
              color="error"
              startIcon={<PictureAsPdfOutlinedIcon sx={{ fontSize: 18 }} />}
              onClick={handleExportPdf}
              disabled={!register || loading || isInvalidRange}
              size="small"
              sx={{
                fontWeight: 700,
                px: 2,
                boxShadow: "none",
                textTransform: "none",
                "&:hover": { boxShadow: "none", filter: "brightness(0.95)" },
              }}
            >
              PDF
            </Button>
          </Stack>
        </Stack>

        {/* Info Feedback Row */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          sx={{ mt: 1.5 }}
        >
          <Chip
            icon={<CalendarTodayOutlinedIcon sx={{ fontSize: 14 }} />}
            label={`${dateRangeDays} day${dateRangeDays !== 1 ? "s" : ""}`}
            size="small"
            color={isInvalidRange ? "error" : "primary"}
            variant="outlined"
            sx={{
              fontWeight: 700,
              height: 24,
              fontSize: "0.72rem",
              borderWidth: "1px",
            }}
          />
          {isInvalidRange && (
            <Typography variant="caption" color="error.main" fontWeight={700}>
              ⚠️ End date must be after start date
            </Typography>
          )}
          {isLargeRange && !isInvalidRange && (
            <Chip
              icon={<InfoOutlinedIcon sx={{ fontSize: 14 }} />}
              label="Large exports may take longer to download."
              size="small"
              color="info"
              sx={{
                fontWeight: 600,
                height: 24,
                fontSize: "0.72rem",
                border: "none",
                bgcolor: isDark
                  ? alpha(theme.palette.info.main, 0.15)
                  : alpha(theme.palette.info.main, 0.1),
              }}
            />
          )}
        </Stack>
      </Paper>

      {/* ─── MAIN CONTENT ─── */}
      {classesLoading ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: "center",
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <CircularProgress />
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 2, fontWeight: 600 }}
          >
            Loading classes...
          </Typography>
        </Paper>
      ) : classes.length === 0 ? (
        <Paper
          elevation={0}
          sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}
        >
          <EmptyState
            icon={<EventNoteOutlinedIcon sx={{ fontSize: 64 }} />}
            title="No classes available"
            message="Please create classes first or check if you're assigned to any class"
          />
        </Paper>
      ) : loading ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: "center",
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <CircularProgress />
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 2, fontWeight: 600 }}
          >
            Loading register data...
          </Typography>
        </Paper>
      ) : !selectedClass ? (
        <Paper
          elevation={0}
          sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}
        >
          <EmptyState
            icon={<EventNoteOutlinedIcon sx={{ fontSize: 64 }} />}
            title="Select a class"
            message="Choose a class from the dropdown above to load register data"
          />
        </Paper>
      ) : !register || register.students.length === 0 ? (
        <Paper
          elevation={0}
          sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}
        >
          <EmptyState
            icon={<PeopleOutlinedIcon sx={{ fontSize: 64 }} />}
            title="No students found"
            message="This class has no active students for the selected period"
          />
        </Paper>
      ) : (
        <RegisterSummaryCard
          register={register}
          dateFrom={dateFrom}
          dateTo={dateTo}
          isDark={isDark}
        />
      )}
    </Box>
  );
};

// ─── SUMMARY CARD COMPONENT (Redesigned) ───
const RegisterSummaryCard = ({ register, dateFrom, dateTo, isDark }) => {
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
    return { totalPresent, totalAbsent, totalMarked, avgPercentage };
  }, [register]);

  return (
    <Stack spacing={2.5}>
      {/* ── CLASS HERO HEADER ── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            p: { xs: 2.5, sm: 3 },
            bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#FAFBFC",
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Attendance Register Report
            </Typography>
            <Typography
              variant="h4"
              fontWeight={900}
              sx={{ mt: 0.5, letterSpacing: "-0.02em" }}
            >
              {register.class.name} - {register.class.section}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", mt: 0.5, fontWeight: 500 }}
            >
              Teacher: {register.class.classTeacher || "Unassigned"}
            </Typography>
          </Box>
          <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Selected Period
            </Typography>
            <Typography
              variant="h6"
              fontWeight={800}
              sx={{ mt: 0.5, color: "primary.main" }}
            >
              {fromStr} → {toStr}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* ── STATS GRID (6 Columns on Desktop) ── */}
      <Grid container spacing={1.5}>
        <Grid item xs={6} sm={4} md={2}>
          <StatBox
            label="STUDENTS"
            value={register.summary.totalStudents}
            icon={<PeopleOutlinedIcon />}
            colorKey="info"
            isDark={isDark}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatBox
            label="WORKING DAYS"
            value={register.summary.workingDays}
            icon={<CalendarTodayOutlinedIcon />}
            colorKey="warning"
            isDark={isDark}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatBox
            label="HOLIDAYS"
            value={register.summary.holidays}
            icon={<BeachAccessOutlinedIcon />}
            colorKey="error"
            isDark={isDark}
          />
        </Grid>

        {aggregateStats && (
          <>
            <Grid item xs={6} sm={4} md={2}>
              <StatBox
                label="PRESENT"
                value={aggregateStats.totalPresent}
                icon={<CheckCircleOutlinedIcon />}
                colorKey="success"
                isDark={isDark}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <StatBox
                label="ABSENT"
                value={aggregateStats.totalAbsent}
                icon={<CancelOutlinedIcon />}
                colorKey="error"
                isDark={isDark}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <StatBox
                label="AVERAGE"
                value={`${aggregateStats.avgPercentage}%`}
                icon={<PercentOutlinedIcon />}
                colorKey={
                  aggregateStats.avgPercentage >= 75
                    ? "success"
                    : aggregateStats.avgPercentage >= 50
                      ? "warning"
                      : "error"
                }
                isDark={isDark}
              />
            </Grid>
          </>
        )}
      </Grid>

      {/* ── DOWNLOAD CTA CARD ── */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 4,
          textAlign: "center",
          bgcolor: isDark ? alpha("#3B82F6", 0.05) : alpha("#3B82F6", 0.04),
          border: "1px solid",
          borderColor: isDark ? alpha("#3B82F6", 0.2) : alpha("#3B82F6", 0.2),
        }}
      >
        <FileDownloadOutlinedIcon
          sx={{ fontSize: 40, color: "primary.main", mb: 1 }}
        />
        <Typography
          variant="h6"
          fontWeight={800}
          sx={{ mb: 0.5, letterSpacing: "-0.01em" }}
        >
          Report Ready to Export
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontWeight: 500 }}
        >
          Data for <strong>{register.summary.totalStudents} students</strong>{" "}
          across <strong>{register.summary.totalDays} days</strong> is
          processed.
        </Typography>
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mt: 1,
            color: "text.disabled",
            fontWeight: 600,
          }}
        >
          Use the Excel or PDF buttons in the top filter bar to download.
        </Typography>
      </Paper>
    </Stack>
  );
};

// ─── PREMIUM STAT BOX COMPONENT ───
const StatBox = ({ label, value, icon, colorKey, isDark }) => {
  const theme = useTheme();
  const color = theme.palette[colorKey];
  const bgColor = alpha(color.main, isDark ? 0.12 : 0.06);

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        textAlign: "center",
        transition: "all 0.2s ease",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        "&:hover": {
          borderColor: color.main,
          transform: "translateY(-2px)",
          boxShadow: isDark
            ? `0 8px 16px ${alpha(color.main, 0.15)}`
            : `0 8px 16px ${alpha(color.main, 0.1)}`,
        },
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: 1.5,
          bgcolor: bgColor,
          color: color.main,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mx: "auto",
          mb: 1.25,
        }}
      >
        {React.cloneElement(icon, { sx: { fontSize: 18 } })}
      </Box>
      <Typography
        variant="h5"
        fontWeight={900}
        sx={{
          color: "text.primary",
          lineHeight: 1,
          mb: 0.5,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          display: "block",
          color: "text.secondary",
          fontWeight: 700,
          fontSize: "0.65rem",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </Typography>
    </Paper>
  );
};

export default AttendanceRegisterTab;
