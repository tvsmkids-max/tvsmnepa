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
  Card,
  CardContent,
  Divider,
  LinearProgress,
  CircularProgress,
  IconButton,
  Tooltip,
  InputAdornment,
  Menu,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useSnackbar } from "notistack";
import TodayOutlinedIcon from "@mui/icons-material/TodayOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import HourglassBottomOutlinedIcon from "@mui/icons-material/HourglassBottomOutlined";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import ClearIcon from "@mui/icons-material/Clear";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import HolidayBanner from "../../components/common/HolidayBanner";
import ClassAttendanceDialog from "./ClassAttendanceDialog";
import reportApi from "../../api/reportApi";
import classApi from "../../api/classApi";
import { exportToExcel } from "../../utils/exportUtils";
import {
  generateDailyAttendancePdf,
  downloadPdf,
} from "../../utils/pdfGenerator";
import useSettings from "../../hooks/useSettings";
import useAuth from "../../hooks/useAuth";

const formatDate = (d) => {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const STATUS_CONFIG = {
  completed: {
    label: "Marked", // Cleaner label
    color: "#16A34A",
    bg: "#DCFCE7",
    darkBg: "rgba(22,163,74,0.15)",
  },
  partial: {
    label: "Partial",
    color: "#F59E0B",
    bg: "#FEF3C7",
    darkBg: "rgba(245,158,11,0.15)",
  },
  pending: {
    label: "Pending",
    color: "#DC2626",
    bg: "#FEE2E2",
    darkBg: "rgba(220,38,38,0.15)",
  },
  empty: {
    label: "Empty",
    color: "#6B7280",
    bg: "#F3F4F6",
    darkBg: "rgba(107,114,128,0.15)",
  },
};

const SORT_OPTIONS = [
  { value: "class", label: "Class (Nursery → 12th)" },
  { value: "percentage-desc", label: "Attendance % (High → Low)" },
  { value: "percentage-asc", label: "Attendance % (Low → High)" },
  { value: "absent-desc", label: "Most Absentees" },
  { value: "unmarked-desc", label: "Most Unmarked" },
  { value: "status", label: "Status" },
];

const STUDENT_STATUS_COLORS = {
  Present: {
    color: "#16A34A",
    bg: "#DCFCE7",
    darkBg: "rgba(22,163,74,0.15)",
    label: "Present",
    icon: "✅",
  },
  Absent: {
    color: "#DC2626",
    bg: "#FEE2E2",
    darkBg: "rgba(220,38,38,0.15)",
    label: "Absent",
    icon: "❌",
  },
  Unmarked: {
    color: "#F59E0B",
    bg: "#FEF3C7",
    darkBg: "rgba(245,158,11,0.15)",
    label: "Unmarked",
    icon: "⏳",
  },
};

const DailyReportPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const { user, isAdmin, isTeacher } = useAuth();
  const { settings } = useSettings();

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [date, setDate] = useState(formatDate(new Date()));
  const [dailyReport, setDailyReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("class");
  const [statusFilter, setStatusFilter] = useState("all");
  const [hideEmpty, setHideEmpty] = useState(true);
  const [exportAnchor, setExportAnchor] = useState(null);
  const exportOpen = Boolean(exportAnchor);
  const [selectedClassDetail, setSelectedClassDetail] = useState(null);

  const [studentStatusFilter, setStudentStatusFilter] = useState("all");

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

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await reportApi.getDaily({ date, class: selectedClass });
        if (!cancelled) {
          setDailyReport(res.data?.data);
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
  }, [date, selectedClass, refreshKey, enqueueSnackbar]);

  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const teacherClassData = useMemo(() => {
    if (!isTeacher || !dailyReport?.classes?.length) return null;
    return dailyReport.classes[0];
  }, [isTeacher, dailyReport]);

  const filteredStudents = useMemo(() => {
    if (!teacherClassData?.students) return [];
    if (studentStatusFilter === "all") return teacherClassData.students;
    return teacherClassData.students.filter(
      (s) => s.status === studentStatusFilter,
    );
  }, [teacherClassData, studentStatusFilter]);

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

  const handleExportExcel = () => {
    if (!dailyReport) return;
    const data = [];
    const exportClasses =
      isTeacher && teacherClassData ? [teacherClassData] : dailyReport.classes;

    exportClasses.forEach((cls) => {
      cls.students.forEach((s, idx) => {
        data.push({
          Date: new Date(dailyReport.date).toLocaleDateString("en-IN"),
          Class: `${cls.name}-${cls.section}`,
          "S.No": idx + 1,
          Scholar: s.scholarNumber || "—",
          Name: s.name,
          "Father Name": s.fatherName || "—",
          Status: s.status,
        });
      });
    });
    exportToExcel(data, `daily-report-${date}`, "Daily Attendance");
    enqueueSnackbar("Excel exported successfully", { variant: "success" });
    setExportAnchor(null);
  };

  const handleExportPdf = () => {
    if (!dailyReport) return;
    const doc = generateDailyAttendancePdf(dailyReport, settings, user?.name);
    downloadPdf(doc, `daily-attendance-${date}`);
    enqueueSnackbar("PDF downloaded successfully", { variant: "success" });
    setExportAnchor(null);
  };

  const summary = dailyReport?.summary || {};
  const isNonWorking = dailyReport?.isHoliday || dailyReport?.isNonWorkingDay;

  return (
    <Box sx={{ pb: { xs: 10, md: 3 } }}>
      <PageHeader
        title="Daily Report"
        subtitle={
          isTeacher && teacherClassData
            ? `Class ${teacherClassData.name}-${teacherClassData.section} · ${teacherClassData.total} students`
            : "Class-wise daily attendance overview"
        }
        breadcrumbs={[
          {
            label: "Dashboard",
            path: isTeacher ? "/teacher/dashboard" : "/dashboard",
          },
          { label: "Reports" },
          { label: "Daily" },
        ]}
      />

      {isTeacher ? (
        // ── TEACHER VIEW ──
        <>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 1.5, sm: 2 },
              mb: 2,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              position: "sticky",
              top: { xs: 50, md: 64 },
              zIndex: 5,
              bgcolor: "background.paper",
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                type="date"
                label="Date"
                size="small"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1, minWidth: 0, "& input": { fontWeight: 700 } }}
              />
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
                    borderRadius: 2,
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
                  fontWeight: 800,
                  fontSize: "0.78rem",
                  px: 2,
                }}
              >
                Export
              </Button>
              <Menu
                anchorEl={exportAnchor}
                open={exportOpen}
                onClose={() => setExportAnchor(null)}
                slotProps={{
                  paper: { sx: { borderRadius: 2, minWidth: 180, mt: 1 } },
                }}
              >
                <MenuItem onClick={handleExportExcel} sx={{ fontWeight: 600 }}>
                  <FileDownloadOutlinedIcon
                    sx={{ mr: 1.5, fontSize: 18, color: "success.main" }}
                  />
                  Excel
                </MenuItem>
                <MenuItem onClick={handleExportPdf} sx={{ fontWeight: 600 }}>
                  <PictureAsPdfOutlinedIcon
                    sx={{ mr: 1.5, fontSize: 18, color: "error.main" }}
                  />
                  PDF
                </MenuItem>
              </Menu>
            </Stack>
          </Paper>

          {loading ? (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          ) : !dailyReport ? null : isNonWorking ? (
            <HolidayBanner
              isHoliday={dailyReport.isHoliday}
              holiday={dailyReport.holiday}
              today={dailyReport.today}
              nextWorkingDay={null}
            />
          ) : !teacherClassData ? (
            <Paper sx={{ borderRadius: 3 }}>
              <EmptyState
                icon={<TodayOutlinedIcon sx={{ fontSize: 64 }} />}
                title="No data"
                message="No attendance data available for this date."
              />
            </Paper>
          ) : (
            <>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  mb: 2,
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Stack
                  direction="row"
                  spacing={2}
                  justifyContent="space-around"
                  alignItems="center"
                  divider={<Divider orientation="vertical" flexItem />}
                >
                  <SummaryPill
                    icon={PeopleOutlinedIcon}
                    value={teacherClassData.total}
                    label="Total"
                    color="text.primary"
                  />
                  <SummaryPill
                    icon={CheckCircleOutlinedIcon}
                    value={teacherClassData.present}
                    label="Present"
                    color="#16A34A"
                  />
                  <SummaryPill
                    icon={CancelOutlinedIcon}
                    value={teacherClassData.absent}
                    label="Absent"
                    color="#DC2626"
                  />
                  <SummaryPill
                    icon={TrendingUpOutlinedIcon}
                    value={`${teacherClassData.percentage}%`}
                    label="Rate"
                    color={
                      teacherClassData.percentage >= 80
                        ? "#16A34A"
                        : teacherClassData.percentage >= 60
                          ? "#F59E0B"
                          : "#DC2626"
                    }
                  />
                </Stack>
              </Paper>

              <Stack
                direction="row"
                spacing={0.75}
                sx={{ mb: 2 }}
                flexWrap="wrap"
                useFlexGap
              >
                {[
                  { value: "all", label: `All ${teacherClassData.total}` },
                  {
                    value: "Present",
                    label: `✅ Present ${teacherClassData.present}`,
                    chipColor: "success",
                  },
                  {
                    value: "Absent",
                    label: `❌ Absent ${teacherClassData.absent}`,
                    chipColor: "error",
                  },
                  {
                    value: "Unmarked",
                    label: `⏳ Unmarked ${teacherClassData.unmarked}`,
                    chipColor: "warning",
                  },
                ].map((f) => (
                  <Chip
                    key={f.value}
                    label={f.label}
                    size="small"
                    onClick={() => setStudentStatusFilter(f.value)}
                    variant={
                      studentStatusFilter === f.value ? "filled" : "outlined"
                    }
                    color={
                      studentStatusFilter === f.value
                        ? f.chipColor || "primary"
                        : "default"
                    }
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.7rem",
                      cursor: "pointer",
                      height: 26,
                    }}
                  />
                ))}
              </Stack>

              {filteredStudents.length === 0 ? (
                <Paper sx={{ borderRadius: 3 }}>
                  <EmptyState
                    icon={<PeopleOutlinedIcon sx={{ fontSize: 64 }} />}
                    title="No students match"
                    message="Try changing the status filter."
                  />
                </Paper>
              ) : isMobile ? (
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    overflow: "hidden",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Stack divider={<Divider />}>
                    {filteredStudents.map((s, idx) => {
                      const statusConfig =
                        STUDENT_STATUS_COLORS[s.status] ||
                        STUDENT_STATUS_COLORS.Unmarked;
                      return (
                        <Box
                          key={s._id}
                          sx={{
                            px: 2,
                            py: 1.25,
                            bgcolor: isDark
                              ? statusConfig.darkBg
                              : alpha(statusConfig.color, 0.03),
                            "&:hover": { bgcolor: "action.hover" },
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1.5}
                          >
                            <Typography
                              sx={{
                                minWidth: 26,
                                fontWeight: 800,
                                fontSize: "0.8rem",
                                color: isDark ? "#93C5FD" : "#1E4D98",
                                fontFamily: "monospace",
                                textAlign: "center",
                                flexShrink: 0,
                              }}
                            >
                              {String(idx + 1).padStart(2, "0")}
                            </Typography>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                variant="body2"
                                fontWeight={800}
                                noWrap
                                sx={{
                                  fontSize: "0.9rem",
                                  textTransform: "uppercase",
                                }}
                              >
                                {s.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                noWrap
                                sx={{ fontSize: "0.7rem" }}
                              >
                                F: {s.fatherName || "—"}
                              </Typography>
                            </Box>
                            <Chip
                              label={statusConfig.label}
                              size="small"
                              sx={{
                                fontWeight: 800,
                                height: 24,
                                fontSize: "0.7rem",
                                bgcolor: isDark
                                  ? statusConfig.darkBg
                                  : statusConfig.bg,
                                color: statusConfig.color,
                                minWidth: 70,
                              }}
                            />
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                </Paper>
              ) : (
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    overflow: "hidden",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell
                            sx={{
                              fontWeight: 800,
                              fontSize: "0.7rem",
                              textTransform: "uppercase",
                              bgcolor: isDark ? "#1E293B" : "#F8FAFC",
                              width: 65,
                              py: 1.2,
                            }}
                          >
                            S.NO.
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: 800,
                              fontSize: "0.7rem",
                              textTransform: "uppercase",
                              bgcolor: isDark ? "#1E293B" : "#F8FAFC",
                              py: 1.2,
                            }}
                          >
                            Name
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: 800,
                              fontSize: "0.7rem",
                              textTransform: "uppercase",
                              bgcolor: isDark ? "#1E293B" : "#F8FAFC",
                              py: 1.2,
                            }}
                          >
                            Father
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              fontWeight: 800,
                              fontSize: "0.7rem",
                              textTransform: "uppercase",
                              bgcolor: isDark ? "#1E293B" : "#F8FAFC",
                              py: 1.2,
                              width: 100,
                            }}
                          >
                            Status
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredStudents.map((s, idx) => {
                          const statusConfig =
                            STUDENT_STATUS_COLORS[s.status] ||
                            STUDENT_STATUS_COLORS.Unmarked;
                          return (
                            <TableRow
                              key={s._id}
                              hover
                              sx={{
                                bgcolor: isDark
                                  ? statusConfig.darkBg
                                  : alpha(statusConfig.color, 0.02),
                              }}
                            >
                              <TableCell sx={{ py: 1 }}>
                                <Typography
                                  variant="body2"
                                  fontWeight={800}
                                  sx={{
                                    fontFamily: "monospace",
                                    fontSize: "0.85rem",
                                    color: isDark ? "#93C5FD" : "#1E4D98",
                                  }}
                                >
                                  {String(idx + 1).padStart(2, "0")}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 1 }}>
                                <Typography
                                  variant="body2"
                                  fontWeight={800}
                                  sx={{
                                    fontSize: "0.88rem",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {s.name}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 1 }}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontSize: "0.8rem",
                                    color: "text.secondary",
                                  }}
                                >
                                  {s.fatherName || "—"}
                                </Typography>
                              </TableCell>
                              <TableCell align="center" sx={{ py: 1 }}>
                                <Chip
                                  label={statusConfig.label}
                                  size="small"
                                  sx={{
                                    fontWeight: 800,
                                    height: 26,
                                    fontSize: "0.75rem",
                                    bgcolor: isDark
                                      ? statusConfig.darkBg
                                      : statusConfig.bg,
                                    color: statusConfig.color,
                                    minWidth: 80,
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}
            </>
          )}
        </>
      ) : (
        /* ══════════════════════════════════════════════════════════════
            ADMIN VIEW
        ══════════════════════════════════════════════════════════════ */
        <>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 1.5, sm: 2 },
              mb: 2,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              position: "sticky",
              top: { xs: 50, md: 64 },
              zIndex: 5,
              bgcolor: "background.paper",
            }}
          >
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1.5}>
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
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  placeholder="Search class..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  size="small"
                  sx={{ flex: 1, "& .MuiInputBase-root": { height: 38 } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchOutlinedIcon
                          sx={{ fontSize: 18, color: "text.disabled" }}
                        />
                      </InputAdornment>
                    ),
                    endAdornment: search && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearch("")}>
                          <ClearIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl
                  size="small"
                  sx={{ minWidth: { xs: 100, sm: 130 } }}
                >
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    displayEmpty
                    sx={{ height: 38, fontWeight: 700 }}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="completed">🟢 Marked</MenuItem>
                    <MenuItem value="partial">🟡 Partial</MenuItem>
                    <MenuItem value="pending">🔴 Pending</MenuItem>
                  </Select>
                </FormControl>
                <Tooltip title="Refresh">
                  <IconButton
                    onClick={triggerRefresh}
                    disabled={loading}
                    size="small"
                    sx={{
                      width: 38,
                      height: 38,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
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
                  startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 18 }} />}
                  sx={{ height: 38, fontWeight: 800, px: { xs: 1, sm: 2 } }}
                >
                  {!isXs && "Export"}
                </Button>
                <Menu
                  anchorEl={exportAnchor}
                  open={exportOpen}
                  onClose={() => setExportAnchor(null)}
                  slotProps={{
                    paper: { sx: { borderRadius: 2, mt: 1, minWidth: 180 } },
                  }}
                >
                  <MenuItem
                    onClick={handleExportExcel}
                    sx={{ fontWeight: 700 }}
                  >
                    <FileDownloadOutlinedIcon
                      sx={{ mr: 1.5, fontSize: 18, color: "success.main" }}
                    />{" "}
                    Excel
                  </MenuItem>
                  <MenuItem onClick={handleExportPdf} sx={{ fontWeight: 700 }}>
                    <PictureAsPdfOutlinedIcon
                      sx={{ mr: 1.5, fontSize: 18, color: "error.main" }}
                    />{" "}
                    PDF
                  </MenuItem>
                </Menu>
              </Stack>
            </Stack>
          </Paper>

          {loading ? (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          ) : !dailyReport ? null : isNonWorking ? (
            <HolidayBanner
              isHoliday={dailyReport.isHoliday}
              holiday={dailyReport.holiday}
              today={dailyReport.today}
              nextWorkingDay={null}
            />
          ) : (
            <>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  mb: 2.5,
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Stack
                  direction="row"
                  spacing={2}
                  justifyContent="space-around"
                  alignItems="center"
                  divider={<Divider orientation="vertical" flexItem />}
                >
                  <SummaryPill
                    icon={PeopleOutlinedIcon}
                    value={summary.totalStudents || 0}
                    label="Total"
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
                  />
                </Stack>
              </Paper>

              {filteredClasses.length === 0 ? (
                <Paper sx={{ borderRadius: 3 }}>
                  <EmptyState
                    icon={<TodayOutlinedIcon sx={{ fontSize: 64 }} />}
                    title="No classes match"
                    message="Try adjusting your search or filter"
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
            </>
          )}

          <ClassAttendanceDialog
            open={!!selectedClassDetail}
            onClose={() => setSelectedClassDetail(null)}
            classData={selectedClassDetail}
            date={date}
          />
        </>
      )}
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════════
//  PREMIUM CLASS CARD (Admin only)
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
      elevation={0}
      onClick={onClick}
      sx={{
        borderRadius: 4,
        border: "1px solid",
        borderColor: cls.isLowAttendance ? alpha("#DC2626", 0.4) : "divider",
        cursor: "pointer",
        transition: "all 0.2s ease",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        opacity: cls.isEmpty ? 0.6 : 1,
        "&:hover": {
          borderColor: cls.isLowAttendance ? "#DC2626" : "primary.main",
          transform: "translateY(-4px)",
          boxShadow: isDark
            ? "0 12px 24px rgba(0,0,0,0.4)"
            : "0 12px 24px rgba(15,23,42,0.06)",
        },
      }}
    >
      {cls.isLowAttendance && (
        <Box sx={{ height: 4, bgcolor: "#DC2626", width: "100%" }} />
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
          sx={{ mb: 2 }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              fontWeight={900}
              sx={{
                fontSize: "1.1rem",
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
              }}
              noWrap
            >
              {cls.name}-{cls.section}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontSize: "0.75rem",
                display: "block",
                mt: 0.2,
                fontWeight: 600,
              }}
            >
              {cls.classTeacher || "No Teacher"}
            </Typography>
          </Box>
          <Chip
            label={statusConfig.label}
            size="small"
            sx={{
              fontWeight: 800,
              height: 24,
              fontSize: "0.68rem",
              bgcolor: isDark ? statusConfig.darkBg : statusConfig.bg,
              color: statusConfig.color,
              ml: 1,
            }}
          />
        </Stack>

        <Box sx={{ textAlign: "center", my: 2 }}>
          {cls.isMarked ? (
            <>
              <Typography
                variant="h3"
                fontWeight={900}
                sx={{
                  fontSize: "2.5rem",
                  color: pctColor,
                  lineHeight: 1,
                  letterSpacing: "-0.04em",
                }}
              >
                {cls.percentage}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={cls.percentage}
                sx={{
                  mt: 1.5,
                  height: 6,
                  borderRadius: 3,
                  bgcolor: isDark ? alpha("#fff", 0.08) : alpha("#000", 0.05),
                  "& .MuiLinearProgress-bar": {
                    bgcolor: pctColor,
                    borderRadius: 3,
                  },
                }}
              />
            </>
          ) : (
            <Stack alignItems="center" spacing={0.5} sx={{ py: 2 }}>
              <HourglassBottomOutlinedIcon
                sx={{ fontSize: 32, color: statusConfig.color, opacity: 0.6 }}
              />
              <Typography
                variant="body2"
                fontWeight={800}
                sx={{ color: statusConfig.color, fontSize: "0.85rem" }}
              >
                Not Marked Yet
              </Typography>
            </Stack>
          )}
        </Box>

        <Box
          sx={{
            mt: "auto",
            pt: 2,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
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
              sx={{ color: "text.primary", fontWeight: 900 }}
            >
              {cls.total}
            </Box>{" "}
            Students
            {cls.isMarked && (
              <>
                {" "}
                ·{" "}
                <Box
                  component="span"
                  sx={{ color: "#16A34A", fontWeight: 900 }}
                >
                  {cls.present}
                </Box>{" "}
                P ·{" "}
                <Box
                  component="span"
                  sx={{ color: "#DC2626", fontWeight: 900 }}
                >
                  {cls.absent}
                </Box>{" "}
                A
              </>
            )}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
});
ClassCard.displayName = "ClassCard";

const SummaryPill = ({ icon: Icon, value, label, color }) => (
  <Stack alignItems="center" sx={{ flex: 1, py: 0.5 }}>
    <Icon sx={{ fontSize: 18, color, mb: 0.5 }} />
    <Typography
      variant="body2"
      fontWeight={900}
      sx={{ fontSize: "1.2rem", color, lineHeight: 1 }}
    >
      {value}
    </Typography>
    <Typography
      variant="caption"
      sx={{
        fontSize: "0.65rem",
        fontWeight: 800,
        color: "text.secondary",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        mt: 0.3,
      }}
    >
      {label}
    </Typography>
  </Stack>
);

export default DailyReportPage;
