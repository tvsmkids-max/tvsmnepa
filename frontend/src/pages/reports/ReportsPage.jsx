import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
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
  InputAdornment,
  Menu,
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
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import HourglassBottomOutlinedIcon from "@mui/icons-material/HourglassBottomOutlined";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import ClearIcon from "@mui/icons-material/Clear";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import HolidayBanner from "../../components/common/HolidayBanner";
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
import ClassAttendanceDialog from "./ClassAttendanceDialog";

// ═══════════════════════════════════════════════════════════════════
//  HELPERS & CONSTANTS
// ═══════════════════════════════════════════════════════════════════

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

const STATUS_CONFIG = {
  completed: {
    label: "Completed",
    color: "#16A34A",
    bg: "#DCFCE7",
    darkBg: "rgba(22,163,74,0.15)",
    icon: "🟢",
  },
  partial: {
    label: "Partial",
    color: "#F59E0B",
    bg: "#FEF3C7",
    darkBg: "rgba(245,158,11,0.15)",
    icon: "🟡",
  },
  pending: {
    label: "Pending",
    color: "#DC2626",
    bg: "#FEE2E2",
    darkBg: "rgba(220,38,38,0.15)",
    icon: "🔴",
  },
  empty: {
    label: "Empty",
    color: "#6B7280",
    bg: "#F3F4F6",
    darkBg: "rgba(107,114,128,0.15)",
    icon: "⚪",
  },
};

const SORT_OPTIONS = [
  { value: "class", label: "Class (Nursery → 10th)" },
  { value: "percentage-desc", label: "Attendance % (High → Low)" },
  { value: "percentage-asc", label: "Attendance % (Low → High)" },
  { value: "absent-desc", label: "Most Absentees" },
  { value: "unmarked-desc", label: "Most Unmarked" },
  { value: "status", label: "Status" },
];

// ═══════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

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

  // ✅ NEW: Daily tab enhancements
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("class");
  const [statusFilter, setStatusFilter] = useState("all");
  const [hideEmpty, setHideEmpty] = useState(true);
  const [exportAnchor, setExportAnchor] = useState(null);
  const exportOpen = Boolean(exportAnchor);

  // ✅ Phase 4: Class detail dialog
  const [selectedClassDetail, setSelectedClassDetail] = useState(null);

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
    if (tabValue === 3) return; // Register tab handles its own data
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        if (tabValue === 0) {
          const res = await reportApi.getDaily({ date, class: selectedClass });
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

  // ── Filtered + Sorted daily classes ──
  const filteredClasses = useMemo(() => {
    if (!dailyReport?.classes) return [];
    let list = [...dailyReport.classes];

    if (hideEmpty) list = list.filter((c) => !c.isEmpty);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.section?.toLowerCase().includes(q) ||
          `${c.name}-${c.section}`.toLowerCase().includes(q) ||
          c.classTeacher?.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all")
      list = list.filter((c) => c.status === statusFilter);

    list.sort((a, b) => {
      switch (sortBy) {
        case "class":
          if ((a.sortRank || 999) !== (b.sortRank || 999))
            return (a.sortRank || 999) - (b.sortRank || 999);
          return (a.section || "").localeCompare(b.section || "");
        case "percentage-desc":
          return (b.percentage || 0) - (a.percentage || 0);
        case "percentage-asc":
          return (a.percentage || 0) - (b.percentage || 0);
        case "absent-desc":
          return (b.absent || 0) - (a.absent || 0);
        case "unmarked-desc":
          return (b.unmarked || 0) - (a.unmarked || 0);
        case "status": {
          const order = { pending: 0, partial: 1, completed: 2, empty: 3 };
          return (order[a.status] || 4) - (order[b.status] || 4);
        }
        default:
          return 0;
      }
    });
    return list;
  }, [dailyReport, search, sortBy, statusFilter, hideEmpty]);

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
          "Father Name": s.fatherName,
          Status: s.status,
        });
      });
    });
    exportToExcel(data, `daily-report-${date}`, "Daily Attendance");
    enqueueSnackbar("Excel exported", { variant: "success" });
    setExportAnchor(null);
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
    setExportAnchor(null);
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

  // ── Computed ──
  const summary = dailyReport?.summary || {};
  const isNonWorking = dailyReport?.isHoliday || dailyReport?.isNonWorkingDay;
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

      {/* ═══ TABS ═══ */}
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

      {/* ═══ REGISTER TAB ═══ */}
      {tabValue === 3 && <AttendanceRegisterTab />}

      {/* ═══ DAILY TAB (Redesigned) ═══ */}
      {tabValue === 0 && (
        <>
          {/* Sticky filter bar */}
          <Paper
            sx={{
              p: { xs: 1.5, sm: 2 },
              mb: 2,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              position: "sticky",
              top: { xs: 50, md: 55 },
              zIndex: 5,
              bgcolor: "background.paper",
            }}
          >
            <Stack spacing={1.2}>
              <Stack direction="row" spacing={1.2}>
                <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
                  <InputLabel>Class</InputLabel>
                  <Select
                    value={selectedClass}
                    label="Class"
                    onChange={(e) => setSelectedClass(e.target.value)}
                  >
                    <MenuItem value="">All Classes</MenuItem>
                    {classes.map((c) => (
                      <MenuItem key={c._id} value={c._id}>
                        {c.name} - {c.section}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  type="date"
                  label="Date"
                  size="small"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: 1, minWidth: 0 }}
                />
              </Stack>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <TextField
                  placeholder="Search class..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  size="small"
                  sx={{
                    flex: 1,
                    "& .MuiInputBase-root": { height: 36, fontSize: "0.82rem" },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchOutlinedIcon
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
                <FormControl
                  size="small"
                  sx={{ minWidth: { xs: 90, sm: 120 } }}
                >
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    displayEmpty
                    sx={{ height: 36, fontSize: "0.78rem", fontWeight: 700 }}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="completed">🟢 Completed</MenuItem>
                    <MenuItem value="partial">🟡 Partial</MenuItem>
                    <MenuItem value="pending">🔴 Pending</MenuItem>
                  </Select>
                </FormControl>
                <FormControl
                  size="small"
                  sx={{
                    minWidth: { xs: 90, sm: 140 },
                    display: { xs: "none", sm: "flex" },
                  }}
                >
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    sx={{ height: 36, fontSize: "0.78rem", fontWeight: 700 }}
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Tooltip title="Refresh">
                  <IconButton
                    onClick={triggerRefresh}
                    disabled={loading}
                    size="small"
                    sx={{
                      width: 36,
                      height: 36,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1.5,
                    }}
                  >
                    <RefreshOutlinedIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
                <Button
                  variant="contained"
                  size="small"
                  onClick={(e) => setExportAnchor(e.currentTarget)}
                  disabled={loading || !dailyReport}
                  startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    height: 36,
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    textTransform: "none",
                    background:
                      "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
                    minWidth: { xs: 36, sm: "auto" },
                    px: { xs: 1, sm: 2 },
                  }}
                >
                  {!isXs && "Export"}
                </Button>
                <Menu
                  anchorEl={exportAnchor}
                  open={exportOpen}
                  onClose={() => setExportAnchor(null)}
                  PaperProps={{
                    sx: {
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      minWidth: 180,
                    },
                  }}
                >
                  <MenuItem
                    onClick={handleExportDaily}
                    sx={{ fontSize: "0.85rem", fontWeight: 600 }}
                  >
                    <FileDownloadOutlinedIcon
                      sx={{ mr: 1.5, fontSize: 18, color: "success.main" }}
                    />
                    Export Excel
                  </MenuItem>
                  <MenuItem
                    onClick={handlePdfDaily}
                    sx={{ fontSize: "0.85rem", fontWeight: 600 }}
                  >
                    <PictureAsPdfOutlinedIcon
                      sx={{ mr: 1.5, fontSize: 18, color: "error.main" }}
                    />
                    Export PDF
                  </MenuItem>
                  <Divider />
                  <MenuItem
                    onClick={() => {
                      window.print();
                      setExportAnchor(null);
                    }}
                    sx={{ fontSize: "0.85rem", fontWeight: 600 }}
                  >
                    <PrintOutlinedIcon
                      sx={{ mr: 1.5, fontSize: 18, color: "text.secondary" }}
                    />
                    Print Report
                  </MenuItem>
                </Menu>
              </Stack>
            </Stack>
          </Paper>

          {/* Daily content */}
          {loading ? (
            <Paper sx={{ p: 6, textAlign: "center", borderRadius: 3 }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Loading report...
              </Typography>
            </Paper>
          ) : !dailyReport ? null : isNonWorking ? (
            <HolidayBanner
              isHoliday={dailyReport.isHoliday}
              holiday={dailyReport.holiday}
              today={dailyReport.today}
              nextWorkingDay={null}
            />
          ) : (
            <>
              {/* Summary strip */}
              <Paper
                sx={{
                  p: { xs: 1.25, sm: 1.5 },
                  mb: 2,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Stack
                  direction="row"
                  spacing={{ xs: 1, sm: 2 }}
                  justifyContent="space-around"
                  alignItems="center"
                  divider={<Divider orientation="vertical" flexItem />}
                >
                  <SummaryPill
                    icon={PeopleOutlinedIcon}
                    value={summary.totalStudents || 0}
                    label="Total"
                    color="text.primary"
                    isDark={isDark}
                  />
                  <SummaryPill
                    icon={CheckCircleOutlinedIcon}
                    value={summary.totalPresent || 0}
                    label="Present"
                    color="#16A34A"
                    isDark={isDark}
                  />
                  <SummaryPill
                    icon={CancelOutlinedIcon}
                    value={summary.totalAbsent || 0}
                    label="Absent"
                    color="#DC2626"
                    isDark={isDark}
                  />
                  <SummaryPill
                    icon={TrendingUpOutlinedIcon}
                    value={`${summary.overallPercentage || 0}%`}
                    label="Rate"
                    color={
                      (summary.overallPercentage || 0) >= 80
                        ? "#16A34A"
                        : (summary.overallPercentage || 0) >= 60
                          ? "#F59E0B"
                          : "#DC2626"
                    }
                    isDark={isDark}
                  />
                </Stack>
              </Paper>

              {/* Status chips */}
              <Stack
                direction="row"
                spacing={0.75}
                sx={{ mb: 2 }}
                flexWrap="wrap"
                useFlexGap
              >
                <Chip
                  label={`🟢 ${summary.markedClasses || 0} Completed`}
                  size="small"
                  onClick={() =>
                    setStatusFilter(
                      statusFilter === "completed" ? "all" : "completed",
                    )
                  }
                  variant={statusFilter === "completed" ? "filled" : "outlined"}
                  color={statusFilter === "completed" ? "success" : "default"}
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    cursor: "pointer",
                  }}
                />
                <Chip
                  label={`🟡 ${summary.partialClasses || 0} Partial`}
                  size="small"
                  onClick={() =>
                    setStatusFilter(
                      statusFilter === "partial" ? "all" : "partial",
                    )
                  }
                  variant={statusFilter === "partial" ? "filled" : "outlined"}
                  color={statusFilter === "partial" ? "warning" : "default"}
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    cursor: "pointer",
                  }}
                />
                <Chip
                  label={`🔴 ${summary.pendingClasses || 0} Pending`}
                  size="small"
                  onClick={() =>
                    setStatusFilter(
                      statusFilter === "pending" ? "all" : "pending",
                    )
                  }
                  variant={statusFilter === "pending" ? "filled" : "outlined"}
                  color={statusFilter === "pending" ? "error" : "default"}
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    cursor: "pointer",
                  }}
                />
                {summary.lowAttendanceClasses > 0 && (
                  <Chip
                    icon={<WarningAmberOutlinedIcon sx={{ fontSize: 14 }} />}
                    label={`${summary.lowAttendanceClasses} Low (<80%)`}
                    size="small"
                    color="warning"
                    sx={{ fontWeight: 700, fontSize: "0.7rem" }}
                  />
                )}
              </Stack>

              {/* Class cards grid */}
              {filteredClasses.length === 0 ? (
                <Paper sx={{ borderRadius: 3 }}>
                  <EmptyState
                    icon={<TodayOutlinedIcon sx={{ fontSize: 64 }} />}
                    title="No classes match"
                    message={
                      search || statusFilter !== "all"
                        ? "Try adjusting your search or filter"
                        : "No attendance data for this date"
                    }
                  />
                </Paper>
              ) : (
                <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                  {filteredClasses.map((cls) => (
                    <Grid item xs={12} sm={6} lg={4} key={cls._id}>
                      <ClassCard
                        cls={cls}
                        isDark={isDark}
                        onClick={() => setSelectedClassDetail(cls)}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}

              <Box sx={{ textAlign: "center", mt: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  Showing <strong>{filteredClasses.length}</strong> of{" "}
                  <strong>{dailyReport.classes?.length || 0}</strong> classes
                  {hideEmpty && summary.emptyClasses > 0 && (
                    <> · {summary.emptyClasses} empty hidden</>
                  )}
                </Typography>
              </Box>
            </>
          )}
        </>
      )}

      {/* ═══ MONTHLY TAB (kept from original) ═══ */}
      {tabValue === 1 && (
        <>
          {/* Monthly filters */}
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
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
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
                  onClick={handleExportMonthly}
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
                  onClick={handlePdfMonthly}
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

          {loading ? (
            <Paper sx={{ p: 6, textAlign: "center", borderRadius: 3 }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Loading report...
              </Typography>
            </Paper>
          ) : (
            monthlyReport && (
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
                      icon={<CalendarMonthOutlinedIcon sx={{ fontSize: 64 }} />}
                      title="No data"
                      message="No classes to display for this month."
                    />
                  </Paper>
                ) : (
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
                                  fontSize: { xs: "0.95rem", sm: "1.05rem" },
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
                                  fontSize: { xs: "1.4rem", sm: "1.6rem" },
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
                )}
              </>
            )
          )}
        </>
      )}

      {/* ═══ DEFAULTERS TAB (kept from original) ═══ */}
      {tabValue === 2 && (
        <>
          {/* Defaulter filters */}
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
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
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
                <TextField
                  type="number"
                  label="Threshold %"
                  size="small"
                  value={threshold}
                  onChange={(e) => setThreshold(parseInt(e.target.value) || 75)}
                  inputProps={{ min: 1, max: 100 }}
                  sx={{ flex: { sm: 1 } }}
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
                  fullWidth
                  startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 18 }} />}
                  onClick={handleExportDefaulters}
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
                  onClick={handlePdfDefaulters}
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

          {loading ? (
            <Paper sx={{ p: 6, textAlign: "center", borderRadius: 3 }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Loading report...
              </Typography>
            </Paper>
          ) : (
            defaulterReport && (
              <>
                <Alert
                  severity={defaulterReport.total === 0 ? "success" : "warning"}
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
                        sx={{ display: "block", fontSize: "0.75rem" }}
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
                                bgcolor: alpha(theme.palette.error.main, 0.12),
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
                                  fontSize: { xs: "0.9rem", sm: "1rem" },
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
                                📞 {s.mobile === "0000000000" ? "—" : s.mobile}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: "right" }}>
                              <Typography
                                variant="h4"
                                fontWeight={900}
                                color="error.main"
                                sx={{
                                  fontSize: { xs: "1.5rem", sm: "1.8rem" },
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
                )}
              </>
            )
          )}
        </>
      )}

      {/* ═══ CLASS DETAIL DIALOG (Phase 4) ═══ */}
      <ClassAttendanceDialog
        open={!!selectedClassDetail}
        onClose={() => setSelectedClassDetail(null)}
        classData={selectedClassDetail}
        date={date}
      />
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════════
//  CLASS CARD COMPONENT (for Daily tab)
// ═══════════════════════════════════════════════════════════════════

const ClassCard = memo(({ cls, isDark, onClick }) => {
  const statusConfig = STATUS_CONFIG[cls.status] || STATUS_CONFIG.pending;
  const pctColor =
    cls.percentage >= 90
      ? "#16A34A"
      : cls.percentage >= 75
        ? "#F59E0B"
        : cls.percentage >= 50
          ? "#F97316"
          : "#DC2626";

  return (
    <Card
      onClick={onClick}
      sx={{
        borderRadius: 2.5,
        border: "1.5px solid",
        borderColor: cls.isLowAttendance ? alpha("#DC2626", 0.4) : "divider",
        boxShadow: "none",
        cursor: "pointer",
        transition: "all 0.2s",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        opacity: cls.isEmpty ? 0.5 : 1,
        "&:hover": {
          borderColor: cls.isLowAttendance ? "#DC2626" : "primary.main",
          transform: "translateY(-2px)",
          boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
        },
      }}
    >
      {cls.isLowAttendance && (
        <Box sx={{ height: 3, bgcolor: "#DC2626", width: "100%" }} />
      )}
      <CardContent
        sx={{
          p: { xs: 2, sm: 2.5 },
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          sx={{ mb: 1.5 }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              fontWeight={900}
              sx={{ fontSize: "1.05rem", lineHeight: 1.2 }}
              noWrap
            >
              {cls.name}-{cls.section}
            </Typography>
            {cls.classTeacher && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: "0.72rem", display: "block", mt: 0.2 }}
              >
                {cls.classTeacher}
              </Typography>
            )}
          </Box>
          <Chip
            label={statusConfig.label}
            size="small"
            sx={{
              fontWeight: 800,
              height: 22,
              fontSize: "0.68rem",
              bgcolor: isDark ? statusConfig.darkBg : statusConfig.bg,
              color: statusConfig.color,
              flexShrink: 0,
              ml: 1,
            }}
          />
        </Stack>

        <Box sx={{ textAlign: "center", my: 1.5 }}>
          {cls.isMarked ? (
            <>
              <Typography
                variant="h3"
                fontWeight={900}
                sx={{
                  fontSize: { xs: "2.2rem", sm: "2.5rem" },
                  color: pctColor,
                  lineHeight: 1,
                }}
              >
                {cls.percentage}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={cls.percentage}
                sx={{
                  mt: 1,
                  height: 5,
                  borderRadius: 3,
                  bgcolor: isDark ? alpha("#fff", 0.06) : alpha("#000", 0.06),
                  "& .MuiLinearProgress-bar": {
                    bgcolor: pctColor,
                    borderRadius: 3,
                  },
                }}
              />
            </>
          ) : (
            <Stack alignItems="center" spacing={0.5} sx={{ py: 1 }}>
              <HourglassBottomOutlinedIcon
                sx={{ fontSize: 32, color: statusConfig.color, opacity: 0.6 }}
              />
              <Typography
                variant="body2"
                fontWeight={700}
                sx={{ color: statusConfig.color, fontSize: "0.85rem" }}
              >
                Not Marked
              </Typography>
            </Stack>
          )}
        </Box>

        <Typography
          variant="caption"
          sx={{
            fontSize: "0.75rem",
            color: "text.secondary",
            fontWeight: 700,
            textAlign: "center",
            display: "block",
            mb: 1,
          }}
        >
          <Box component="span" sx={{ color: "text.primary", fontWeight: 800 }}>
            {cls.total}
          </Box>{" "}
          Students
          {cls.isMarked && (
            <>
              {" "}
              ·{" "}
              <Box component="span" sx={{ color: "#16A34A", fontWeight: 800 }}>
                {cls.present}
              </Box>{" "}
              P ·{" "}
              <Box component="span" sx={{ color: "#DC2626", fontWeight: 800 }}>
                {cls.absent}
              </Box>{" "}
              A
              {cls.unmarked > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <Box
                    component="span"
                    sx={{ color: "#F59E0B", fontWeight: 800 }}
                  >
                    {cls.unmarked}
                  </Box>{" "}
                  Unmarked
                </>
              )}
            </>
          )}
        </Typography>

        <Box
          sx={{
            mt: "auto",
            pt: 1.5,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          {cls.markedBy ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: "0.68rem", display: "block" }}
            >
              ✏️ Marked by:{" "}
              <Box
                component="span"
                sx={{ fontWeight: 700, color: "text.primary" }}
              >
                {cls.markedBy}
              </Box>
              {cls.hasEdits && cls.editedBy && (
                <>
                  {" "}
                  · Edited by:{" "}
                  <Box
                    component="span"
                    sx={{ fontWeight: 700, color: "warning.main" }}
                  >
                    {cls.editedBy}
                  </Box>
                </>
              )}
            </Typography>
          ) : (
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ fontSize: "0.68rem", fontStyle: "italic" }}
            >
              Not yet marked
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
});
ClassCard.displayName = "ClassCard";

const SummaryPill = ({ icon: Icon, value, label, color, isDark }) => (
  <Stack alignItems="center" sx={{ flex: 1, py: 0.5 }}>
    <Icon sx={{ fontSize: 16, color, mb: 0.3 }} />
    <Typography
      variant="body2"
      fontWeight={900}
      sx={{ fontSize: "1.1rem", color, lineHeight: 1 }}
    >
      {value}
    </Typography>
    <Typography
      variant="caption"
      sx={{
        fontSize: "0.6rem",
        fontWeight: 800,
        color: "text.secondary",
        textTransform: "uppercase",
        letterSpacing: "0.03em",
      }}
    >
      {label}
    </Typography>
  </Stack>
);

export default ReportsPage;
