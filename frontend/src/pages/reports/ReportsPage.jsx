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
  CircularProgress,
  Card,
  CardContent,
  Tabs,
  Tab,
  Divider,
  IconButton,
  Avatar,
  LinearProgress,
  Alert,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useSnackbar } from "notistack";
import AssessmentIcon from "@mui/icons-material/Assessment";
import TodayIcon from "@mui/icons-material/Today";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import WarningIcon from "@mui/icons-material/Warning";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import reportApi from "../../api/reportApi";
import classApi from "../../api/classApi";
import { exportToExcel } from "../../utils/exportUtils";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import {
  generateDailyAttendancePdf,
  generateMonthlyReportPdf,
  generateDefaulterPdf,
  downloadPdf,
} from "../../utils/pdfGenerator";
import useSettings from "../../hooks/useSettings";
import useAuth from "../../hooks/useAuth";

const formatDate = (d) => {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const ReportsPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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

  // Load report based on tab
  useEffect(() => {
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

  const months = [
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

  return (
    <Box sx={{ pb: { xs: 8, md: 3 } }}>
      <PageHeader
        title="Reports"
        subtitle="View and export attendance reports"
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Reports" },
        ]}
      />

      <Paper sx={{ borderRadius: 3, mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          variant={isMobile ? "fullWidth" : "standard"}
          sx={{
            borderBottom: "1px solid",
            borderColor: "divider",
            "& .MuiTab-root": { fontWeight: 700, py: 2 },
          }}
        >
          <Tab icon={<TodayIcon />} iconPosition="start" label="Daily" />
          <Tab
            icon={<CalendarMonthIcon />}
            iconPosition="start"
            label="Monthly"
          />
          <Tab icon={<WarningIcon />} iconPosition="start" label="Defaulters" />
        </Tabs>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
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
          </Grid>

          {tabValue === 0 && (
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                type="date"
                label="Date"
                size="small"
                fullWidth
                value={date}
                onChange={(e) => setDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          )}

          {tabValue === 1 && (
            <>
              <Grid item xs={6} sm={3} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Month</InputLabel>
                  <Select
                    value={month}
                    label="Month"
                    onChange={(e) => setMonth(e.target.value)}
                  >
                    {months.map((m, i) => (
                      <MenuItem key={m} value={i + 1}>
                        {m}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <FormControl fullWidth size="small">
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
              </Grid>
            </>
          )}

          {tabValue === 2 && (
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                type="number"
                label="Threshold %"
                size="small"
                fullWidth
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value) || 75)}
                inputProps={{ min: 1, max: 100 }}
                helperText="Students below this % shown"
              />
            </Grid>
          )}
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<RefreshIcon />}
                onClick={triggerRefresh}
                size="small"
                sx={{ py: 1 }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                fullWidth
                startIcon={<FileDownloadIcon />}
                onClick={
                  tabValue === 0
                    ? handleExportDaily
                    : tabValue === 1
                      ? handleExportMonthly
                      : handleExportDefaulters
                }
                size="small"
                disabled={loading}
                sx={{
                  py: 1,
                  background:
                    "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
                }}
              >
                Excel
              </Button>
              <Button
                variant="contained"
                fullWidth
                startIcon={<PictureAsPdfIcon />}
                onClick={
                  tabValue === 0
                    ? handlePdfDaily
                    : tabValue === 1
                      ? handlePdfMonthly
                      : handlePdfDefaulters
                }
                size="small"
                disabled={loading}
                color="error"
                sx={{ py: 1 }}
              >
                PDF
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Report Display */}
      {loading ? (
        <Paper sx={{ p: 6, textAlign: "center", borderRadius: 3 }}>
          <CircularProgress />
        </Paper>
      ) : (
        <>
          {/* DAILY REPORT */}
          {tabValue === 0 && dailyReport && (
            <>
              {dailyReport.holiday && (
                <Alert severity="warning" sx={{ mb: 2, borderRadius: 3 }}>
                  🏖️ {dailyReport.holiday.name} ({dailyReport.holiday.type})
                </Alert>
              )}

              {/* Summary */}
              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ borderRadius: 2.5 }}>
                    <CardContent
                      sx={{
                        p: 2,
                        textAlign: "center",
                        "&:last-child": { pb: 2 },
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={700}
                      >
                        TOTAL
                      </Typography>
                      <Typography variant="h5" fontWeight={900}>
                        {dailyReport.summary.totalStudents}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ borderRadius: 2.5, bgcolor: "#E6F4EA" }}>
                    <CardContent
                      sx={{
                        p: 2,
                        textAlign: "center",
                        "&:last-child": { pb: 2 },
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="success.dark"
                        fontWeight={700}
                      >
                        PRESENT
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight={900}
                        color="success.dark"
                      >
                        {dailyReport.summary.totalPresent}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ borderRadius: 2.5, bgcolor: "#FEE2E2" }}>
                    <CardContent
                      sx={{
                        p: 2,
                        textAlign: "center",
                        "&:last-child": { pb: 2 },
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="error.dark"
                        fontWeight={700}
                      >
                        ABSENT
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight={900}
                        color="error.dark"
                      >
                        {dailyReport.summary.totalAbsent}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ borderRadius: 2.5, bgcolor: "#F0F4FF" }}>
                    <CardContent
                      sx={{
                        p: 2,
                        textAlign: "center",
                        "&:last-child": { pb: 2 },
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="primary.dark"
                        fontWeight={700}
                      >
                        RATE
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight={900}
                        color="primary.dark"
                      >
                        {dailyReport.summary.overallPercentage}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Class-wise */}
              {dailyReport.classes.length === 0 ? (
                <EmptyState
                  icon={<AssessmentIcon sx={{ fontSize: 64 }} />}
                  title="No data"
                  message="No classes to display."
                />
              ) : (
                <Stack spacing={1.5}>
                  {dailyReport.classes.map((cls) => (
                    <Card key={cls._id} sx={{ borderRadius: 2.5 }}>
                      <CardContent sx={{ p: 2 }}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          sx={{ mb: 1.5 }}
                        >
                          <Box>
                            <Typography
                              variant="h6"
                              fontWeight={800}
                              sx={{ fontSize: "1rem" }}
                            >
                              Class {cls.name} - {cls.section}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {cls.total} students
                            </Typography>
                          </Box>
                          <Chip
                            label={
                              cls.isMarked ? `${cls.percentage}%` : "Pending"
                            }
                            color={
                              cls.isMarked
                                ? cls.percentage >= 75
                                  ? "success"
                                  : "warning"
                                : "default"
                            }
                            sx={{ fontWeight: 800 }}
                          />
                        </Stack>

                        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                          <Chip
                            icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                            label={`${cls.present} Present`}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                          <Chip
                            icon={<CancelIcon sx={{ fontSize: 14 }} />}
                            label={`${cls.absent} Absent`}
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                          {cls.unmarked > 0 && (
                            <Chip
                              label={`${cls.unmarked} Unmarked`}
                              size="small"
                              color="warning"
                              variant="outlined"
                            />
                          )}
                        </Stack>

                        {cls.isMarked && (
                          <LinearProgress
                            variant="determinate"
                            value={cls.percentage}
                            color={cls.percentage >= 75 ? "success" : "warning"}
                            sx={{ borderRadius: 4, height: 6, mt: 1 }}
                          />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </>
          )}

          {/* MONTHLY REPORT */}
          {tabValue === 1 && monthlyReport && (
            <>
              <Paper sx={{ p: 2, mb: 2, borderRadius: 3, bgcolor: "#F0F4FF" }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  flexWrap="wrap"
                  gap={1}
                >
                  <Box>
                    <Typography variant="h6" fontWeight={800}>
                      {monthlyReport.monthName} {monthlyReport.year}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Working Days:{" "}
                      <strong>{monthlyReport.summary.workingDays}</strong>
                      {" • "}
                      Holidays:{" "}
                      <strong>{monthlyReport.summary.holidays}</strong>
                    </Typography>
                  </Box>
                  <Chip
                    label={`${monthlyReport.summary.overallPercentage}% Overall`}
                    color={
                      monthlyReport.summary.overallPercentage >= 75
                        ? "success"
                        : "warning"
                    }
                    sx={{ fontWeight: 800 }}
                  />
                </Stack>
              </Paper>

              <Stack spacing={1.5}>
                {monthlyReport.classes.map((cls) => (
                  <Card key={cls._id} sx={{ borderRadius: 2.5 }}>
                    <CardContent sx={{ p: 2 }}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 1.5 }}
                      >
                        <Box>
                          <Typography
                            variant="h6"
                            fontWeight={800}
                            sx={{ fontSize: "1rem" }}
                          >
                            Class {cls.name} - {cls.section}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {cls.totalStudents} students • {cls.workingDays}{" "}
                            working days
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography
                            variant="h5"
                            fontWeight={900}
                            color={
                              cls.percentage >= 75
                                ? "success.dark"
                                : "warning.dark"
                            }
                          >
                            {cls.percentage}%
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {cls.present}/{cls.totalMarks}
                          </Typography>
                        </Box>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={cls.percentage}
                        color={cls.percentage >= 75 ? "success" : "warning"}
                        sx={{ borderRadius: 4, height: 6 }}
                      />
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </>
          )}

          {/* DEFAULTERS REPORT */}
          {tabValue === 2 && defaulterReport && (
            <>
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 3 }}>
                <Typography variant="body2" fontWeight={700}>
                  {defaulterReport.total} students below {threshold}%
                </Typography>
              </Alert>

              {defaulterReport.defaulters.length === 0 ? (
                <EmptyState
                  icon={
                    <CheckCircleIcon
                      sx={{ fontSize: 64, color: "success.main" }}
                    />
                  }
                  title="All clear!"
                  message="No students below the threshold."
                />
              ) : (
                <Stack spacing={1.5}>
                  {defaulterReport.defaulters.map((s) => (
                    <Card
                      key={s._id}
                      sx={{
                        borderRadius: 2.5,
                        borderLeft: "4px solid",
                        borderLeftColor: "error.main",
                      }}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={2}
                          sx={{ mb: 1 }}
                        >
                          <Avatar sx={{ bgcolor: "error.light" }}>
                            {s.name?.[0]?.toUpperCase()}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body1" fontWeight={800} noWrap>
                              {s.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {s.fatherName} • {s.mobile}
                            </Typography>
                          </Box>
                          <Typography
                            variant="h5"
                            fontWeight={900}
                            color="error.dark"
                          >
                            {s.percentage}%
                          </Typography>
                        </Stack>
                        <Stack
                          direction="row"
                          spacing={1}
                          flexWrap="wrap"
                          useFlexGap
                        >
                          <Chip label={`Roll ${s.rollNumber}`} size="small" />
                          <Chip
                            label={s.scholarNumber}
                            size="small"
                            sx={{ fontFamily: "monospace" }}
                          />
                          {s.class && (
                            <Chip
                              label={`${s.class.name}-${s.class.section}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          )}
                          <Chip
                            label={`P: ${s.present}`}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                          <Chip
                            label={`A: ${s.absent}`}
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </>
          )}
        </>
      )}
    </Box>
  );
};

export default ReportsPage;
