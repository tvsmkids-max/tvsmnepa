import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import {
  Box,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  Stack,
  Chip,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  IconButton,
  Tooltip,
  InputAdornment,
  TextField,
  Menu,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useSnackbar } from "notistack";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import ClearIcon from "@mui/icons-material/Clear";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined";
import TrendingFlatOutlinedIcon from "@mui/icons-material/TrendingFlatOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import MonthlyClassDialog from "./MonthlyClassDialog";
import reportApi from "../../api/reportApi";
import classApi from "../../api/classApi";
import { exportToExcel } from "../../utils/exportUtils";
import {
  generateMonthlyReportPdf,
  downloadPdf,
} from "../../utils/pdfGenerator";
import useSettings from "../../hooks/useSettings";
import useAuth from "../../hooks/useAuth";

// ═══════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════

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

const SORT_OPTIONS = [
  { value: "class", label: "Class (Nursery → 10th)" },
  { value: "rank", label: "Rank (Best → Worst)" },
  { value: "percentage-desc", label: "Attendance % (High → Low)" },
  { value: "percentage-asc", label: "Attendance % (Low → High)" },
  { value: "students-desc", label: "Most Students" },
  { value: "absent-desc", label: "Most Absent" },
];

// ═══════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════

const MonthlyReportPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("class");
  const [hideEmpty, setHideEmpty] = useState(true);
  const [exportAnchor, setExportAnchor] = useState(null);
  const exportOpen = Boolean(exportAnchor);

  // Dialog state
  const [selectedClassDetail, setSelectedClassDetail] = useState(null);

  const { settings } = useSettings();
  const { user } = useAuth();

  // ─── Load classes ───
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

  // ─── Load report ───
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await reportApi.getMonthly({
          year,
          month,
          class: selectedClass,
        });
        if (!cancelled) {
          setMonthlyReport(res.data?.data);
          setLoading(false);
        }
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
  }, [year, month, selectedClass, refreshKey, enqueueSnackbar]);

  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // ─── Filtered + Sorted ───
  const filteredClasses = useMemo(() => {
    if (!monthlyReport?.classes) return [];
    let list = [...monthlyReport.classes];

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

    list.sort((a, b) => {
      switch (sortBy) {
        case "class":
          if ((a.sortRank || 999) !== (b.sortRank || 999))
            return (a.sortRank || 999) - (b.sortRank || 999);
          return (a.section || "").localeCompare(b.section || "");
        case "rank":
          return (a.rank || 999) - (b.rank || 999);
        case "percentage-desc":
          return (b.percentage || 0) - (a.percentage || 0);
        case "percentage-asc":
          return (a.percentage || 0) - (b.percentage || 0);
        case "students-desc":
          return (b.totalStudents || 0) - (a.totalStudents || 0);
        case "absent-desc":
          return (b.absent || 0) - (a.absent || 0);
        default:
          return 0;
      }
    });

    return list;
  }, [monthlyReport, search, sortBy, hideEmpty]);

  // ─── Export ───
  const handleExportExcel = () => {
    if (!monthlyReport) return;
    const data = monthlyReport.classes.map((c) => ({
      Rank: c.rank || "—",
      Class: `${c.name}-${c.section}`,
      Teacher: c.classTeacher || "—",
      "Total Students": c.totalStudents,
      "Working Days": c.workingDays,
      "Present Marks": c.present,
      "Absent Marks": c.absent,
      "Avg Present/Student": c.avgPresentDays,
      "Avg Absent/Student": c.avgAbsentDays,
      "Attendance %": `${c.percentage}%`,
      Trend:
        c.trend === "up"
          ? "↑ Improved"
          : c.trend === "down"
            ? "↓ Decreased"
            : "→ Stable",
    }));
    exportToExcel(
      data,
      `monthly-${monthlyReport.monthName}-${year}`,
      "Monthly Summary",
    );
    enqueueSnackbar("Excel exported", { variant: "success" });
    setExportAnchor(null);
  };

  const handleExportPdf = () => {
    if (!monthlyReport) return;
    const doc = generateMonthlyReportPdf(monthlyReport, settings, user?.name);
    downloadPdf(doc, `monthly-${monthlyReport.monthName}-${year}`);
    enqueueSnackbar("PDF downloaded", { variant: "success" });
    setExportAnchor(null);
  };

  const summary = monthlyReport?.summary || {};

  return (
    <Box sx={{ pb: { xs: 10, md: 3 } }}>
      <PageHeader
        title="Monthly Report"
        subtitle="Class-wise monthly attendance summary with trends"
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Reports" },
          { label: "Monthly" },
        ]}
      />

      {/* ── STICKY FILTER BAR ── */}
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
          {/* Row 1: Class + Month + Year */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
            <FormControl size="small" sx={{ flex: { sm: 1 } }}>
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

          {/* Row 2: Search + Sort + Actions */}
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
              sx={{
                minWidth: { xs: 90, sm: 160 },
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
              disabled={loading || !monthlyReport}
              startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 16 }} />}
              sx={{
                height: 36,
                fontWeight: 700,
                fontSize: "0.78rem",
                textTransform: "none",
                background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
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
                onClick={handleExportExcel}
                sx={{ fontSize: "0.85rem", fontWeight: 600 }}
              >
                <FileDownloadOutlinedIcon
                  sx={{ mr: 1.5, fontSize: 18, color: "success.main" }}
                />
                Export Excel
              </MenuItem>
              <MenuItem
                onClick={handleExportPdf}
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

      {/* ── CONTENT ── */}
      {loading ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Box
            component="img"
            src="/loader.svg"
            alt="Loading"
            sx={{ width: 140, height: 140, mb: 2 }}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            Loading...
          </Typography>
        </Box>
      ) : !monthlyReport ? null : (
        <>
          {/* ── MONTH HEADER ── */}
          <Paper
            sx={{
              p: { xs: 1.5, sm: 2 },
              mb: 2,
              borderRadius: 3,
              bgcolor: isDark
                ? alpha(theme.palette.primary.main, 0.1)
                : alpha(theme.palette.primary.main, 0.05),
              border: "1px solid",
              borderColor: alpha(theme.palette.primary.main, 0.2),
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
                  <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>
                    🗓️ Working: <strong>{summary.workingDays}</strong>
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>
                    🏖️ Holidays: <strong>{summary.holidays}</strong>
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>
                    👥 Students: <strong>{summary.totalStudents}</strong>
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>
                    📚 Classes: <strong>{summary.totalClasses}</strong>
                  </Typography>
                </Stack>
              </Box>
              <Stack alignItems={{ xs: "flex-start", sm: "flex-end" }}>
                <Typography
                  variant="h4"
                  fontWeight={900}
                  sx={{
                    fontSize: { xs: "1.8rem", sm: "2rem" },
                    lineHeight: 1,
                    color:
                      summary.overallPercentage >= 75
                        ? "success.main"
                        : summary.overallPercentage >= 50
                          ? "warning.main"
                          : "error.main",
                  }}
                >
                  {summary.overallPercentage}%
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
              </Stack>
            </Stack>
          </Paper>

          {/* ── SUMMARY STRIP ── */}
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
                label="Students"
                color="text.primary"
              />
              <SummaryPill
                icon={CheckCircleOutlinedIcon}
                value={summary.totalPresent || 0}
                label="Present"
                color="#16A34A"
              />
              <SummaryPill
                icon={CancelOutlinedIcon}
                value={summary.totalAbsent || 0}
                label="Absent"
                color="#DC2626"
              />
              {summary.lowAttendanceClasses > 0 && (
                <SummaryPill
                  icon={WarningAmberOutlinedIcon}
                  value={summary.lowAttendanceClasses}
                  label="Low (<80%)"
                  color="#F59E0B"
                />
              )}
            </Stack>
          </Paper>

          {/* ── CLASS CARDS ── */}
          {filteredClasses.length === 0 ? (
            <Paper sx={{ borderRadius: 3 }}>
              <EmptyState
                icon={<CalendarMonthOutlinedIcon sx={{ fontSize: 64 }} />}
                title="No classes match"
                message={
                  search
                    ? "Try adjusting your search"
                    : "No data for this month."
                }
              />
            </Paper>
          ) : (
            <>
              <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                {filteredClasses.map((cls) => (
                  <Grid item xs={12} sm={6} lg={4} key={cls._id}>
                    <MonthlyClassCard
                      cls={cls}
                      isDark={isDark}
                      onClick={() => setSelectedClassDetail(cls)}
                    />
                  </Grid>
                ))}
              </Grid>

              <Box sx={{ textAlign: "center", mt: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  Showing <strong>{filteredClasses.length}</strong> of{" "}
                  <strong>{monthlyReport.classes?.length || 0}</strong> classes
                  {hideEmpty && summary.emptyClasses > 0 && (
                    <> · {summary.emptyClasses} empty hidden</>
                  )}
                </Typography>
              </Box>
            </>
          )}
        </>
      )}

      {/* ── MONTHLY CLASS DIALOG ── */}
      <MonthlyClassDialog
        open={!!selectedClassDetail}
        onClose={() => setSelectedClassDetail(null)}
        classData={selectedClassDetail}
        year={year}
        month={month}
      />
    </Box>
  );
};

// ═══════════════════════════
//  MONTHLY CLASS CARD
// ═══════════════════════════

const MonthlyClassCard = memo(({ cls, isDark, onClick }) => {
  const pctColor =
    cls.percentage >= 90
      ? "#16A34A"
      : cls.percentage >= 75
        ? "#F59E0B"
        : cls.percentage >= 50
          ? "#F97316"
          : "#DC2626";

  const TrendIcon =
    cls.trend === "up"
      ? TrendingUpOutlinedIcon
      : cls.trend === "down"
        ? TrendingDownOutlinedIcon
        : TrendingFlatOutlinedIcon;
  const trendColor =
    cls.trend === "up"
      ? "#16A34A"
      : cls.trend === "down"
        ? "#DC2626"
        : "#6B7280";
  const trendLabel =
    cls.trend === "up"
      ? "Improved"
      : cls.trend === "down"
        ? "Decreased"
        : "Stable";

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
      {/* Low attendance strip */}
      {cls.isLowAttendance && (
        <Box sx={{ height: 3, bgcolor: "#DC2626", width: "100%" }} />
      )}

      {/* Badges */}
      {(cls.isHighest || cls.isLowest) && (
        <Box sx={{ position: "absolute", top: 8, right: 8, zIndex: 1 }}>
          {cls.isHighest && (
            <Chip
              icon={<EmojiEventsOutlinedIcon sx={{ fontSize: 12 }} />}
              label="Best"
              size="small"
              sx={{
                height: 20,
                fontSize: "0.62rem",
                fontWeight: 800,
                bgcolor: "#F5A623",
                color: "white",
                "& .MuiChip-icon": { color: "white" },
              }}
            />
          )}
          {cls.isLowest && (
            <Chip
              icon={<WarningAmberOutlinedIcon sx={{ fontSize: 12 }} />}
              label="Lowest"
              size="small"
              sx={{
                height: 20,
                fontSize: "0.62rem",
                fontWeight: 800,
                bgcolor: "#DC2626",
                color: "white",
                "& .MuiChip-icon": { color: "white" },
              }}
            />
          )}
        </Box>
      )}

      <CardContent
        sx={{
          p: { xs: 2, sm: 2.5 },
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Row 1: Class + Teacher + Rank */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          sx={{ mb: 1, pr: cls.isHighest || cls.isLowest ? 6 : 0 }}
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
          {cls.rank && (
            <Chip
              label={`#${cls.rank}`}
              size="small"
              sx={{
                fontWeight: 900,
                height: 24,
                fontSize: "0.75rem",
                ml: 1,
                flexShrink: 0,
                bgcolor:
                  cls.rank <= 3
                    ? alpha("#F5A623", isDark ? 0.2 : 0.15)
                    : isDark
                      ? alpha("#fff", 0.06)
                      : "#F1F5F9",
                color: cls.rank <= 3 ? "#B45309" : "text.secondary",
              }}
            />
          )}
        </Stack>

        {/* Row 2: Big percentage + trend */}
        <Box sx={{ textAlign: "center", my: 1.5 }}>
          {cls.totalStudents === 0 ? (
            <Typography
              variant="body2"
              color="text.disabled"
              sx={{ fontStyle: "italic", py: 2 }}
            >
              No Students Enrolled
            </Typography>
          ) : (
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

              {/* Tooltip-style calculation */}
              <Tooltip
                title={`${cls.present} present days out of ${cls.totalMarks} total attendance records`}
                placement="top"
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontSize: "0.72rem",
                    cursor: "help",
                    borderBottom: "1px dashed",
                    borderColor: "text.disabled",
                  }}
                >
                  {cls.present}/{cls.totalMarks} marks
                </Typography>
              </Tooltip>

              {/* Progress bar with animation */}
              <LinearProgress
                variant="determinate"
                value={cls.percentage}
                sx={{
                  mt: 1,
                  height: 7,
                  borderRadius: 4,
                  bgcolor: isDark ? alpha("#fff", 0.06) : alpha("#000", 0.06),
                  "& .MuiLinearProgress-bar": {
                    bgcolor: pctColor,
                    borderRadius: 4,
                    transition: "transform 0.8s ease-in-out",
                  },
                }}
              />

              {/* Trend indicator */}
              {cls.trend && cls.trend !== "stable" && (
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="center"
                  spacing={0.5}
                  sx={{ mt: 0.75 }}
                >
                  <TrendIcon sx={{ fontSize: 14, color: trendColor }} />
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: trendColor,
                    }}
                  >
                    {trendLabel} ({cls.trendDiff > 0 ? "+" : ""}
                    {cls.trendDiff}% vs prev month)
                  </Typography>
                </Stack>
              )}
            </>
          )}
        </Box>

        {/* Row 3: Stats */}
        {cls.totalStudents > 0 && (
          <Stack spacing={0.5} sx={{ mb: 1 }}>
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.75rem",
                color: "text.secondary",
                fontWeight: 700,
                textAlign: "center",
                display: "block",
              }}
            >
              <Box
                component="span"
                sx={{ color: "text.primary", fontWeight: 800 }}
              >
                {cls.totalStudents}
              </Box>{" "}
              Students ·{" "}
              <Box component="span" sx={{ fontWeight: 800 }}>
                {cls.workingDays}
              </Box>{" "}
              Days
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.72rem",
                color: "text.secondary",
                textAlign: "center",
                display: "block",
              }}
            >
              Avg:{" "}
              <Box component="span" sx={{ color: "#16A34A", fontWeight: 700 }}>
                {cls.avgPresentDays}P
              </Box>{" "}
              ·{" "}
              <Box component="span" sx={{ color: "#DC2626", fontWeight: 700 }}>
                {cls.avgAbsentDays}A
              </Box>{" "}
              per student
            </Typography>
          </Stack>
        )}

        {/* Row 4: Modified by */}
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
              sx={{ fontSize: "0.68rem" }}
            >
              ✏️ Last by:{" "}
              <Box
                component="span"
                sx={{ fontWeight: 700, color: "text.primary" }}
              >
                {cls.markedBy}
              </Box>
              {cls.editedBy && (
                <>
                  {" "}
                  · Edited:{" "}
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
              No attendance data
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
});
MonthlyClassCard.displayName = "MonthlyClassCard";

// ═══════════════════════════════════════════════════════════════════
//  SUMMARY PILL
// ═══════════════════════════════════════════════════════════════════

const SummaryPill = ({ icon: Icon, value, label, color }) => (
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

export default MonthlyReportPage;
