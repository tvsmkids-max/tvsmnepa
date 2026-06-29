import React, { useState, useEffect, useCallback, memo } from "react";
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
  Card,
  CardContent,
  Tabs,
  Tab,
  Divider,
  Avatar,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useSnackbar } from "notistack";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import TodayOutlinedIcon from "@mui/icons-material/TodayOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import reportApi from "../../api/reportApi";
import classApi from "../../api/classApi";
import { exportToExcel } from "../../utils/exportUtils";
import {
  generateDailyAttendancePdf,
  generateMonthlyReportPdf,
  generateDefaulterPdf,
  downloadPdf,
} from "../../utils/pdfGenerator";
import useSettings from "../../hooks/useSettings";
import useAuth from "../../hooks/useAuth";
import AttendanceRegisterTab from "./AttendanceRegisterTab";

// ── Helpers (outside component) ──
const formatDate = (d) => {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ── StatCard (memoized, outside component) ──
const StatCard = memo(({ label, value, colorKey, icon: Icon }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const color = theme.palette[colorKey];
  const bgColor = alpha(
    color?.main || theme.palette.primary.main,
    isDark ? 0.15 : 0.08,
  );
  const textColor = color?.main || theme.palette.primary.main;

  return (
    <Card
      sx={{
        borderRadius: 2.5,
        bgcolor: bgColor,
        border: "1px solid",
        borderColor: alpha(textColor, isDark ? 0.3 : 0.2),
        height: "100%",
        boxShadow: "none",
      }}
    >
      <CardContent
        sx={{
          p: { xs: 1.2, sm: 1.8 },
          textAlign: "center",
          "&:last-child": { pb: { xs: 1.2, sm: 1.8 } },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 0.4,
            gap: 0.4,
          }}
        >
          {Icon && <Icon sx={{ fontSize: 14, color: textColor }} />}
          <Typography
            variant="caption"
            sx={{
              color: textColor,
              fontWeight: 700,
              fontSize: { xs: "0.62rem", sm: "0.7rem" },
              letterSpacing: "0.05em",
            }}
          >
            {label}
          </Typography>
        </Box>
        <Typography
          variant="h5"
          fontWeight={900}
          sx={{
            color: textColor,
            fontSize: { xs: "1.4rem", sm: "1.6rem" },
            lineHeight: 1.1,
          }}
        >
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
});
StatCard.displayName = "StatCard";

// ── SectionHeader (memoized, outside component) ──
const SectionHeader = memo(({ icon: Icon, title, count }) => (
  <Stack
    direction="row"
    alignItems="center"
    spacing={1}
    sx={{ mb: 1.5, mt: 1 }}
  >
    {Icon && <Icon sx={{ fontSize: 18, color: "primary.main" }} />}
    <Typography
      variant="caption"
      fontWeight={800}
      sx={{
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "text.secondary",
        fontSize: "0.72rem",
      }}
    >
      {title}
    </Typography>
    {count !== undefined && (
      <Chip
        label={count}
        size="small"
        sx={{
          height: 18,
          fontSize: "0.65rem",
          fontWeight: 800,
          bgcolor: "primary.main",
          color: "white",
        }}
      />
    )}
    <Box sx={{ flex: 1, height: 1, bgcolor: "divider", ml: 1 }} />
  </Stack>
));
SectionHeader.displayName = "SectionHeader";

// ── Main Component ──
const ReportsPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const [tabValue, setTabValue] = useState(0);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [date, setDate] = useState(formatDate(new Date()));
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [threshold, setThreshold] = useState(75);

  const [dailyReport, setDailyReport] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [defaulterReport, setDefaulterReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { settings } = useSettings();
  const { user } = useAuth();

  // ── Load classes ──
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

  // ── Load report data ──
  useEffect(() => {
    if (tabValue === 3) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        if (tabValue === 0) {
          const res = await reportApi.getDaily({
            date,
            class: selectedClass,
          });
          if (!cancelled) setDailyReport(res.data?.data);
        } else if (tabValue === 1) {
          const res = await reportApi.getMonthly({
            year,
            month,
            class: selectedClass,
          });
          if (!cancelled) setMonthlyReport(res.data?.data);
        } else if (tabValue === 2) {
          const res = await reportApi.getDefaulters({
            class: selectedClass,
            threshold,
          });
          if (!cancelled) setDefaulterReport(res.data?.data);
        }
        if (!cancelled) setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setLoading(false);
          enqueueSnackbar(err.response?.data?.message || "Failed to load", {
            variant: "error",
          });
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [
    tabValue,
    date,
    year,
    month,
    selectedClass,
    threshold,
    refreshKey,
    enqueueSnackbar,
  ]);

  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // ── Export Handlers ──
  const handleExportDaily = () => {
    if (!dailyReport) return;
    const data = [];
    dailyReport.classes.forEach((cls) => {
      cls.students.forEach((s) => {
        data.push({
          Date: new Date(dailyReport.date).toLocaleDateString("en-IN"),
          Class: `${cls.name}-${cls.section}`,
          "Roll No": s.rollNumber,
          "Scholar No": s.scholarNumber,
          Name: s.name,
          Status: s.status,
        });
      });
    });
    exportToExcel(data, `daily-report-${date}`, "Daily Attendance");
    enqueueSnackbar("Excel exported", { variant: "success" });
  };

  const handleExportMonthly = () => {
    if (!monthlyReport) return;
    const data = monthlyReport.classes.map((c) => ({
      Class: `${c.name}-${c.section}`,
      "Total Students": c.totalStudents,
      "Working Days": c.workingDays,
      "Present Marks": c.present,
      "Absent Marks": c.absent,
      "Attendance %": `${c.percentage}%`,
    }));
    exportToExcel(
      data,
      `monthly-${monthlyReport.monthName}-${year}`,
      "Monthly Summary",
    );
    enqueueSnackbar("Excel exported", { variant: "success" });
  };

  const handleExportDefaulters = () => {
    if (!defaulterReport) return;
    const data = defaulterReport.defaulters.map((s) => ({
      "Scholar No": s.scholarNumber,
      "Roll No": s.rollNumber,
      Name: s.name,
      Father: s.fatherName,
      Class: s.class ? `${s.class.name}-${s.class.section}` : "—",
      Mobile: s.mobile,
      Present: s.present,
      Absent: s.absent,
      "Total Marks": s.total,
      "Attendance %": `${s.percentage}%`,
    }));
    exportToExcel(data, `defaulters-below-${threshold}`, "Defaulters");
    enqueueSnackbar("Excel exported", { variant: "success" });
  };

  const handlePdfDaily = () => {
    if (!dailyReport) return;
    const doc = generateDailyAttendancePdf(dailyReport, settings, user?.name);
    downloadPdf(doc, `daily-attendance-${date}`);
    enqueueSnackbar("PDF downloaded", { variant: "success" });
  };

  const handlePdfMonthly = () => {
    if (!monthlyReport) return;
    const doc = generateMonthlyReportPdf(monthlyReport, settings, user?.name);
    downloadPdf(doc, `monthly-${monthlyReport.monthName}-${year}`);
    enqueueSnackbar("PDF downloaded", { variant: "success" });
  };

  const handlePdfDefaulters = () => {
    if (!defaulterReport) return;
    const doc = generateDefaulterPdf(defaulterReport, settings, user?.name);
    downloadPdf(doc, `defaulters-below-${threshold}`);
    enqueueSnackbar("PDF downloaded", { variant: "success" });
  };

  const handleExport = () => {
    if (tabValue === 0) return handleExportDaily();
    if (tabValue === 1) return handleExportMonthly();
    if (tabValue === 2) return handleExportDefaulters();
  };

  const handlePdf = () => {
    if (tabValue === 0) return handlePdfDaily();
    if (tabValue === 1) return handlePdfMonthly();
    if (tabValue === 2) return handlePdfDefaulters();
  };

  // ── Theme-aware colors ──
  const monthlyHeaderBg = isDark
    ? alpha(theme.palette.primary.main, 0.1)
    : alpha(theme.palette.primary.main, 0.05);
  const monthlyHeaderBorder = alpha(theme.palette.primary.main, 0.2);

  const presentChipBg = alpha(theme.palette.success.main, isDark ? 0.2 : 0.1);
  const presentChipColor = theme.palette.success.main;
  const absentChipBg = alpha(theme.palette.error.main, isDark ? 0.2 : 0.1);
  const absentChipColor = theme.palette.error.main;

  const showCommonFilters = tabValue !== 3;

  return (
    <Box sx={{ pb: { xs: 10, md: 3 } }}>
      <PageHeader
        title="Reports"
        subtitle={
          isXs ? "Attendance data" : "View and export attendance reports"
        }
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Reports" },
        ]}
      />

      {/* ─── TABS ─── */}
      <Paper
        sx={{
          borderRadius: 3,
          mb: 2,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          variant={isXs ? "fullWidth" : "standard"}
          centered={!isXs}
          sx={{
            minHeight: { xs: 52, sm: 56 },
            "& .MuiTab-root": {
              fontWeight: 700,
              minHeight: { xs: 52, sm: 56 },
              py: { xs: 0.8, sm: 1.5 },
              minWidth: { xs: 0, sm: 110 },
              fontSize: { xs: "0.7rem", sm: "0.85rem" },
              textTransform: "none",
              flexDirection: { xs: "column", sm: "row" },
              gap: { xs: 0.2, sm: 0.5 },
            },
            "& .MuiTab-iconWrapper": {
              marginBottom: { xs: "2px !important", sm: "0 !important" },
              marginRight: { sm: "6px" },
            },
          }}
        >
          <Tab
            icon={<TodayOutlinedIcon sx={{ fontSize: 18 }} />}
            label="Daily"
          />
          <Tab
            icon={<CalendarMonthOutlinedIcon sx={{ fontSize: 18 }} />}
            label="Monthly"
          />
          <Tab
            icon={<WarningAmberOutlinedIcon sx={{ fontSize: 18 }} />}
            label="Defaulters"
          />
          <Tab
            icon={<EventNoteOutlinedIcon sx={{ fontSize: 18 }} />}
            label="Register"
          />
        </Tabs>
      </Paper>

      {/* ─── COMMON FILTERS ─── */}
      {showCommonFilters && (
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
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.2}
              alignItems="stretch"
            >
              <FormControl size="small" sx={{ flex: { sm: 1 } }}>
                <InputLabel>Class</InputLabel>
                <Select
                  value={selectedClass}
                  label="Class"
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

              {tabValue === 0 && (
                <TextField
                  type="date"
                  label="Date"
                  size="small"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: { sm: 1 } }}
                />
              )}

              {tabValue === 1 && (
                <Stack direction="row" spacing={1} sx={{ flex: { sm: 1 } }}>
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>Month</InputLabel>
                    <Select
                      value={month}
                      label="Month"
                      onChange={(e) => setMonth(e.target.value)}
                    >
                      {MONTHS.map((m, i) => (
                        <MenuItem key={m} value={i + 1}>
                          {isXs ? m.slice(0, 3) : m}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>Year</InputLabel>
                    <Select
                      value={year}
                      label="Year"
                      onChange={(e) => setYear(e.target.value)}
                    >
                      {[2024, 2025, 2026, 2027, 2028].map((y) => (
                        <MenuItem key={y} value={y}>
                          {y}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              )}

              {tabValue === 2 && (
                <TextField
                  type="number"
                  label="Threshold %"
                  size="small"
                  value={threshold}
                  onChange={(e) => setThreshold(parseInt(e.target.value) || 75)}
                  inputProps={{ min: 1, max: 100 }}
                  sx={{ flex: { sm: 1 } }}
                />
              )}
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
                fullWidth
                startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 18 }} />}
                onClick={handleExport}
                size="small"
                disabled={loading}
                sx={{
                  py: 1,
                  fontWeight: 700,
                  fontSize: { xs: "0.78rem", sm: "0.85rem" },
                  background: (t) =>
                    `linear-gradient(135deg, ${t.palette.primary.dark} 0%, ${t.palette.primary.main} 100%)`,
                  textTransform: "none",
                }}
              >
                Excel
              </Button>

              <Button
                variant="contained"
                fullWidth
                startIcon={<PictureAsPdfOutlinedIcon sx={{ fontSize: 18 }} />}
                onClick={handlePdf}
                size="small"
                disabled={loading}
                color="error"
                sx={{
                  py: 1,
                  fontWeight: 700,
                  fontSize: { xs: "0.78rem", sm: "0.85rem" },
                  textTransform: "none",
                }}
              >
                PDF
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* ─── REGISTER TAB ─── */}
      {tabValue === 3 && <AttendanceRegisterTab />}

      {/* ─── OTHER TAB CONTENT ─── */}
      {tabValue !== 3 && (
        <>
          {loading ? (
            <Paper sx={{ p: 6, textAlign: "center", borderRadius: 3 }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Loading report...
              </Typography>
            </Paper>
          ) : (
            <>
              {/* ══ DAILY REPORT ══ */}
              {tabValue === 0 && dailyReport && (
                <>
                  {dailyReport.holiday && (
                    <Alert
                      severity="warning"
                      sx={{ mb: 2, borderRadius: 3 }}
                      icon={false}
                    >
                      <Typography variant="body2" fontWeight={700}>
                        🏖️ {dailyReport.holiday.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ display: "block", mt: 0.3 }}
                      >
                        {dailyReport.holiday.type} — Attendance is blocked
                      </Typography>
                    </Alert>
                  )}

                  <SectionHeader
                    icon={AssessmentOutlinedIcon}
                    title="Overall Summary"
                  />
                  <Grid container spacing={1.2} sx={{ mb: 1 }}>
                    <Grid item xs={6} sm={3}>
                      <StatCard
                        label="TOTAL"
                        value={dailyReport.summary.totalStudents}
                        icon={PeopleOutlinedIcon}
                        colorKey="primary"
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <StatCard
                        label="PRESENT"
                        value={dailyReport.summary.totalPresent}
                        icon={CheckCircleOutlinedIcon}
                        colorKey="success"
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <StatCard
                        label="ABSENT"
                        value={dailyReport.summary.totalAbsent}
                        icon={CancelOutlinedIcon}
                        colorKey="error"
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <StatCard
                        label="RATE"
                        value={`${dailyReport.summary.overallPercentage}%`}
                        icon={TrendingUpOutlinedIcon}
                        colorKey="info"
                      />
                    </Grid>
                  </Grid>

                  {dailyReport.classes.length === 0 ? (
                    <Paper sx={{ borderRadius: 3, mt: 2 }}>
                      <EmptyState
                        icon={<AssessmentOutlinedIcon sx={{ fontSize: 64 }} />}
                        title="No data"
                        message="No classes to display."
                      />
                    </Paper>
                  ) : (
                    <>
                      <SectionHeader
                        icon={CalendarMonthOutlinedIcon}
                        title="Class-wise Breakdown"
                        count={dailyReport.classes.length}
                      />
                      <Stack spacing={1.2}>
                        {dailyReport.classes.map((cls) => (
                          <Card
                            key={cls._id}
                            sx={{
                              borderRadius: 2.5,
                              border: "1px solid",
                              borderColor: "divider",
                              boxShadow: "none",
                            }}
                          >
                            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                sx={{ mb: 1 }}
                              >
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography
                                    variant="h6"
                                    fontWeight={800}
                                    sx={{
                                      fontSize: {
                                        xs: "0.95rem",
                                        sm: "1.05rem",
                                      },
                                      lineHeight: 1.2,
                                    }}
                                    noWrap
                                  >
                                    Class {cls.name} - {cls.section}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontSize: "0.72rem" }}
                                  >
                                    {cls.total} student
                                    {cls.total !== 1 ? "s" : ""}
                                  </Typography>
                                </Box>
                                <Chip
                                  label={
                                    cls.isMarked
                                      ? `${cls.percentage}%`
                                      : "Pending"
                                  }
                                  size="small"
                                  color={
                                    cls.isMarked
                                      ? cls.percentage >= 75
                                        ? "success"
                                        : "warning"
                                      : "default"
                                  }
                                  sx={{
                                    fontWeight: 800,
                                    height: 26,
                                    fontSize: "0.78rem",
                                  }}
                                />
                              </Stack>

                              <Stack
                                direction="row"
                                spacing={0.6}
                                sx={{ mb: 1.2 }}
                                flexWrap="wrap"
                                useFlexGap
                              >
                                <Chip
                                  icon={
                                    <CheckCircleOutlinedIcon
                                      sx={{ fontSize: 12 }}
                                    />
                                  }
                                  label={`${cls.present} P`}
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                  sx={{
                                    fontSize: "0.7rem",
                                    height: 22,
                                    fontWeight: 700,
                                    "& .MuiChip-icon": { ml: 0.5 },
                                  }}
                                />
                                <Chip
                                  icon={
                                    <CancelOutlinedIcon sx={{ fontSize: 12 }} />
                                  }
                                  label={`${cls.absent} A`}
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                  sx={{
                                    fontSize: "0.7rem",
                                    height: 22,
                                    fontWeight: 700,
                                    "& .MuiChip-icon": { ml: 0.5 },
                                  }}
                                />
                                {cls.unmarked > 0 && (
                                  <Chip
                                    label={`${cls.unmarked} Unmarked`}
                                    size="small"
                                    color="warning"
                                    variant="outlined"
                                    sx={{
                                      fontSize: "0.7rem",
                                      height: 22,
                                      fontWeight: 700,
                                    }}
                                  />
                                )}
                              </Stack>

                              {cls.isMarked && (
                                <LinearProgress
                                  variant="determinate"
                                  value={cls.percentage}
                                  color={
                                    cls.percentage >= 75
                                      ? "success"
                                      : cls.percentage >= 50
                                        ? "warning"
                                        : "error"
                                  }
                                  sx={{ borderRadius: 4, height: 6 }}
                                />
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    </>
                  )}
                </>
              )}

              {/* ══ MONTHLY REPORT ══ */}
              {tabValue === 1 && monthlyReport && (
                <>
                  <Paper
                    sx={{
                      p: { xs: 1.5, sm: 2 },
                      mb: 2,
                      borderRadius: 3,
                      bgcolor: monthlyHeaderBg,
                      border: "1px solid",
                      borderColor: monthlyHeaderBorder,
                    }}
                  >
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", sm: "center" }}
                      spacing={1.2}
                    >
                      <Box>
                        <Typography
                          variant="h6"
                          fontWeight={900}
                          sx={{
                            fontSize: { xs: "1.05rem", sm: "1.2rem" },
                            color: "primary.main",
                          }}
                        >
                          {monthlyReport.monthName} {monthlyReport.year}
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={1.5}
                          sx={{ mt: 0.5 }}
                          flexWrap="wrap"
                        >
                          <Typography
                            variant="caption"
                            sx={{ fontSize: "0.75rem" }}
                          >
                            🗓️ Working:{" "}
                            <strong>{monthlyReport.summary.workingDays}</strong>
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ fontSize: "0.75rem" }}
                          >
                            🏖️ Holidays:{" "}
                            <strong>{monthlyReport.summary.holidays}</strong>
                          </Typography>
                        </Stack>
                      </Box>
                      <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
                        <Typography
                          variant="h4"
                          fontWeight={900}
                          sx={{
                            fontSize: { xs: "1.8rem", sm: "2rem" },
                            lineHeight: 1,
                            color:
                              monthlyReport.summary.overallPercentage >= 75
                                ? "success.main"
                                : "warning.main",
                          }}
                        >
                          {monthlyReport.summary.overallPercentage}%
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          Overall Rate
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>

                  {monthlyReport.classes.length === 0 ? (
                    <Paper sx={{ borderRadius: 3 }}>
                      <EmptyState
                        icon={
                          <CalendarMonthOutlinedIcon sx={{ fontSize: 64 }} />
                        }
                        title="No data"
                        message="No classes to display for this month."
                      />
                    </Paper>
                  ) : (
                    <>
                      <SectionHeader
                        icon={CalendarMonthOutlinedIcon}
                        title="Class-wise Performance"
                        count={monthlyReport.classes.length}
                      />
                      <Stack spacing={1.2}>
                        {monthlyReport.classes.map((cls) => (
                          <Card
                            key={cls._id}
                            sx={{
                              borderRadius: 2.5,
                              border: "1px solid",
                              borderColor: "divider",
                              boxShadow: "none",
                            }}
                          >
                            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                sx={{ mb: 1 }}
                              >
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography
                                    variant="h6"
                                    fontWeight={800}
                                    sx={{
                                      fontSize: {
                                        xs: "0.95rem",
                                        sm: "1.05rem",
                                      },
                                      lineHeight: 1.2,
                                    }}
                                    noWrap
                                  >
                                    Class {cls.name} - {cls.section}
                                  </Typography>
                                  <Stack
                                    direction="row"
                                    spacing={0.5}
                                    alignItems="center"
                                    flexWrap="wrap"
                                  >
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ fontSize: "0.72rem" }}
                                    >
                                      👥 {cls.totalStudents}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ fontSize: "0.72rem" }}
                                    >
                                      • 🗓️ {cls.workingDays} days
                                    </Typography>
                                  </Stack>
                                </Box>
                                <Box sx={{ textAlign: "right", ml: 1 }}>
                                  <Typography
                                    variant="h5"
                                    fontWeight={900}
                                    sx={{
                                      fontSize: {
                                        xs: "1.4rem",
                                        sm: "1.6rem",
                                      },
                                      lineHeight: 1,
                                      color:
                                        cls.percentage >= 75
                                          ? "success.main"
                                          : cls.percentage >= 50
                                            ? "warning.main"
                                            : "error.main",
                                    }}
                                  >
                                    {cls.percentage}%
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontSize: "0.68rem" }}
                                  >
                                    {cls.present}/{cls.totalMarks}
                                  </Typography>
                                </Box>
                              </Stack>
                              <LinearProgress
                                variant="determinate"
                                value={cls.percentage}
                                color={
                                  cls.percentage >= 75
                                    ? "success"
                                    : cls.percentage >= 50
                                      ? "warning"
                                      : "error"
                                }
                                sx={{ borderRadius: 4, height: 6 }}
                              />
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    </>
                  )}
                </>
              )}

              {/* ══ DEFAULTERS REPORT ══ */}
              {tabValue === 2 && defaulterReport && (
                <>
                  <Alert
                    severity={
                      defaulterReport.total === 0 ? "success" : "warning"
                    }
                    sx={{ mb: 2, borderRadius: 3 }}
                    icon={false}
                  >
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <WarningAmberOutlinedIcon
                        sx={{
                          fontSize: 32,
                          color:
                            defaulterReport.total === 0
                              ? "success.main"
                              : "warning.main",
                        }}
                      />
                      <Box>
                        <Typography variant="body1" fontWeight={800}>
                          {defaulterReport.total} student
                          {defaulterReport.total !== 1 ? "s" : ""} below{" "}
                          {threshold}%
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            display: "block",
                            fontSize: "0.75rem",
                          }}
                        >
                          {defaulterReport.total === 0
                            ? "All students are in good standing!"
                            : "Consider follow-up actions"}
                        </Typography>
                      </Box>
                    </Stack>
                  </Alert>

                  {defaulterReport.defaulters.length === 0 ? (
                    <Paper sx={{ borderRadius: 3 }}>
                      <EmptyState
                        icon={
                          <CheckCircleOutlinedIcon
                            sx={{ fontSize: 64, color: "success.main" }}
                          />
                        }
                        title="All clear!"
                        message="No students below the threshold."
                      />
                    </Paper>
                  ) : (
                    <>
                      <SectionHeader
                        icon={WarningAmberOutlinedIcon}
                        title="Defaulter List"
                        count={defaulterReport.defaulters.length}
                      />
                      <Stack spacing={1.2}>
                        {defaulterReport.defaulters.map((s) => (
                          <Card
                            key={s._id}
                            sx={{
                              borderRadius: 2.5,
                              borderLeft: "4px solid",
                              borderLeftColor: "error.main",
                              border: "1px solid",
                              borderColor: "divider",
                              boxShadow: "none",
                            }}
                          >
                            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1.5}
                                sx={{ mb: 1.2 }}
                              >
                                <Avatar
                                  sx={{
                                    bgcolor: alpha(
                                      theme.palette.error.main,
                                      0.12,
                                    ),
                                    color: "error.main",
                                    width: { xs: 40, sm: 44 },
                                    height: { xs: 40, sm: 44 },
                                    fontSize: { xs: "1rem", sm: "1.1rem" },
                                    fontWeight: 800,
                                  }}
                                >
                                  {s.name?.[0]?.toUpperCase()}
                                </Avatar>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography
                                    variant="body1"
                                    fontWeight={800}
                                    noWrap
                                    sx={{
                                      fontSize: {
                                        xs: "0.9rem",
                                        sm: "1rem",
                                      },
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    {s.name}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontSize: "0.72rem" }}
                                    noWrap
                                    display="block"
                                  >
                                    F: {s.fatherName}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                      fontSize: "0.72rem",
                                      fontFamily: "monospace",
                                    }}
                                  >
                                    📞{" "}
                                    {s.mobile === "0000000000" ? "—" : s.mobile}
                                  </Typography>
                                </Box>
                                <Box sx={{ textAlign: "right" }}>
                                  <Typography
                                    variant="h4"
                                    fontWeight={900}
                                    color="error.main"
                                    sx={{
                                      fontSize: {
                                        xs: "1.5rem",
                                        sm: "1.8rem",
                                      },
                                      lineHeight: 1,
                                    }}
                                  >
                                    {s.percentage}%
                                  </Typography>
                                </Box>
                              </Stack>

                              <Divider sx={{ mb: 1 }} />

                              <Stack
                                direction="row"
                                spacing={0.6}
                                flexWrap="wrap"
                                useFlexGap
                              >
                                <Chip
                                  label={`Roll ${s.rollNumber}`}
                                  size="small"
                                  sx={{
                                    height: 22,
                                    fontSize: "0.7rem",
                                    fontWeight: 700,
                                  }}
                                />
                                <Chip
                                  label={s.scholarNumber}
                                  size="small"
                                  sx={{
                                    fontFamily: "monospace",
                                    height: 22,
                                    fontSize: "0.7rem",
                                    fontWeight: 700,
                                  }}
                                />
                                {s.class && (
                                  <Chip
                                    label={`${s.class.name}-${s.class.section}`}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                    sx={{
                                      height: 22,
                                      fontSize: "0.7rem",
                                      fontWeight: 700,
                                    }}
                                  />
                                )}
                                <Chip
                                  label={`✓ ${s.present}`}
                                  size="small"
                                  sx={{
                                    height: 22,
                                    fontSize: "0.7rem",
                                    bgcolor: presentChipBg,
                                    color: presentChipColor,
                                    fontWeight: 700,
                                  }}
                                />
                                <Chip
                                  label={`✗ ${s.absent}`}
                                  size="small"
                                  sx={{
                                    height: 22,
                                    fontSize: "0.7rem",
                                    bgcolor: absentChipBg,
                                    color: absentChipColor,
                                    fontWeight: 700,
                                  }}
                                />
                              </Stack>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </Box>
  );
};

export default ReportsPage;
