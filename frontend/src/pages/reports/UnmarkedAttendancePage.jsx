import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Alert,
  FormControlLabel,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  LinearProgress,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useSnackbar } from "notistack";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import reportApi from "../../api/reportApi";
import { exportToExcel } from "../../utils/exportUtils";

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

const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));

// "2026-10-03" → "03 Oct"   (string maths only — no timezone surprises)
const fmtDay = (key) => {
  const [, m, d] = key.split("-");
  return `${d} ${MONTHS_SHORT[parseInt(m, 10) - 1]}`;
};

const STATUS_LABEL = {
  complete: { label: "All marked", color: "success" },
  partial: { label: "Some missed", color: "warning" },
  none: { label: "Never marked", color: "error" },
  "no-students": { label: "No students", color: "default" },
  "no-working-days": { label: "No working days", color: "default" },
};

const UnmarkedAttendancePage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [onlyMissed, setOnlyMissed] = useState(false);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 3, y - 2, y - 1, y, y + 1];
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await reportApi.getUnmarked({ year, month });
        if (!cancelled) setReport(res.data?.data || null);
      } catch (err) {
        if (!cancelled) {
          setReport(null);
          enqueueSnackbar(err.response?.data?.message || "Failed to load report", {
            variant: "error",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [year, month, refreshKey, enqueueSnackbar]);

  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const dayNameByKey = useMemo(() => {
    const map = {};
    (report?.days || []).forEach((d) => {
      map[d.date] = d.dayName;
    });
    return map;
  }, [report]);

  const dayLabel = useCallback(
    (key) => `${fmtDay(key)} (${(dayNameByKey[key] || "").slice(0, 3)})`,
    [dayNameByKey],
  );

  const rows = useMemo(() => {
    const all = report?.classes || [];
    return onlyMissed ? all.filter((c) => c.missedDays > 0) : all;
  }, [report, onlyMissed]);

  const holidays = useMemo(
    () => (report?.days || []).filter((d) => d.type === "holiday"),
    [report],
  );

  const handleExport = () => {
    if (!report?.classes?.length) return;
    const data = report.classes.map((c) => ({
      Class: c.fullName,
      Teacher: c.teacherLabel || "",
      Students: c.totalStudents,
      "Expected Days": c.expectedDays,
      "Marked Days": c.markedDays,
      "Missed Days": c.missedDays,
      "Completion %": c.completion ?? "",
      Status: STATUS_LABEL[c.status]?.label || c.status,
      "Missed Dates": c.missedDates.map(dayLabel).join(", "),
    }));
    exportToExcel(
      data,
      `unmarked-attendance-${year}-${String(month).padStart(2, "0")}`,
      "Unmarked Attendance",
    );
  };

  const missedChips = (c) =>
    c.missedDates.length === 0 ? (
      <Typography variant="caption" color="text.secondary">
        —
      </Typography>
    ) : (
      <Stack direction="row" flexWrap="wrap" gap={0.5}>
        {c.missedDates.map((k) => (
          <Chip
            key={k}
            size="small"
            label={dayLabel(k)}
            sx={{
              height: 22,
              fontSize: "0.7rem",
              fontWeight: 600,
              bgcolor: alpha(theme.palette.error.main, isDark ? 0.2 : 0.1),
              color: theme.palette.error.main,
            }}
          />
        ))}
      </Stack>
    );

  const statusChip = (c) => {
    const s = STATUS_LABEL[c.status] || STATUS_LABEL.complete;
    return (
      <Chip
        size="small"
        color={s.color}
        variant={s.color === "default" ? "outlined" : "filled"}
        label={s.label}
        sx={{ fontWeight: 600, fontSize: "0.7rem" }}
      />
    );
  };

  const summaryCards = report
    ? [
        {
          label: "Working days so far",
          value: report.expectedDays,
          color: theme.palette.primary.main,
        },
        {
          label: "Classes fully marked",
          value: report.summary.classesFullyMarked,
          color: theme.palette.success.main,
        },
        {
          label: "Classes with missed days",
          value: report.summary.classesWithMisses,
          color: theme.palette.warning.main,
        },
        {
          label: "Total missed days",
          value: report.summary.totalMissedDays,
          color: theme.palette.error.main,
        },
      ]
    : [];

  return (
    <Box>
      <PageHeader
        title="Unmarked Attendance"
        subtitle="School days on which a class teacher did not mark attendance"
        breadcrumbs={[
          { label: "Reports", path: "/reports/daily" },
          { label: "Unmarked Attendance" },
        ]}
      />

      <Paper
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: 2,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          alignItems={{ md: "center" }}
        >
          <Stack direction="row" spacing={1} sx={{ flex: { md: "0 0 360px" } }}>
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
                {yearOptions.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <FormControlLabel
            sx={{ m: 0 }}
            control={
              <Switch
                size="small"
                checked={onlyMissed}
                onChange={(e) => setOnlyMissed(e.target.checked)}
              />
            }
            label={
              <Typography variant="body2">Only classes with missed days</Typography>
            }
          />

          <Box sx={{ flex: 1 }} />

          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshOutlinedIcon />}
              onClick={triggerRefresh}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<FileDownloadOutlinedIcon />}
              onClick={handleExport}
              disabled={loading || !report?.classes?.length}
            >
              Excel
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {report && (
        <>
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            {summaryCards.map((s) => (
              <Grid item xs={6} md={3} key={s.label}>
                <Paper
                  sx={{
                    p: 1.5,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    borderLeft: `4px solid ${s.color}`,
                  }}
                >
                  <Typography variant="h5" fontWeight={700} sx={{ color: s.color }}>
                    {s.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {s.label}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Alert severity="info" variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
            Counts working days from the 1st of {MONTHS[month - 1]} up to
            yesterday. Sundays/non-working days and holidays are skipped, and
            today is not counted because attendance can still be marked.
            {holidays.length > 0 && (
              <>
                {" "}
                Holidays skipped:{" "}
                {holidays
                  .map((h) => `${fmtDay(h.date)} (${h.holidayName})`)
                  .join(", ")}
                .
              </>
            )}
          </Alert>

          {rows.length === 0 ? (
            <Paper sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
              <EmptyState
                icon={<CheckCircleOutlinedIcon sx={{ fontSize: 64 }} />}
                title={onlyMissed ? "No missed days" : "No classes found"}
                message={
                  onlyMissed
                    ? "Every class has marked attendance on all counted days."
                    : "There are no classes in the active session."
                }
              />
            </Paper>
          ) : isMobile ? (
            <Stack spacing={1.5}>
              {rows.map((c) => (
                <Paper
                  key={c.classId}
                  sx={{
                    p: 1.5,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    sx={{ mb: 0.5 }}
                  >
                    <Box>
                      <Typography fontWeight={700}>{c.fullName}</Typography>
                      {c.teacherLabel && (
                        <Typography variant="caption" color="text.secondary">
                          {c.teacherLabel}
                        </Typography>
                      )}
                    </Box>
                    {statusChip(c)}
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Marked {c.markedDays} of {c.expectedDays} days
                    {c.completion !== null ? ` (${c.completion}%)` : ""} ·{" "}
                    {c.totalStudents} students
                  </Typography>
                  {missedChips(c)}
                  {c.todayPending && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 0.75 }}
                    >
                      Today not marked yet
                    </Typography>
                  )}
                </Paper>
              ))}
            </Stack>
          ) : (
            <TableContainer
              component={Paper}
              sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Class</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Teacher</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      Students
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      Marked / Expected
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      Missed
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, minWidth: 280 }}>
                      Days not marked
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((c) => (
                    <TableRow key={c.classId} hover>
                      <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                        {c.fullName}
                      </TableCell>
                      <TableCell>{c.teacherLabel || "—"}</TableCell>
                      <TableCell align="center">{c.totalStudents}</TableCell>
                      <TableCell align="center">
                        <Tooltip
                          title={
                            c.lastMarkedDate
                              ? `Last marked: ${fmtDay(c.lastMarkedDate)}`
                              : "Not marked this month"
                          }
                        >
                          <span>
                            {c.markedDays} / {c.expectedDays}
                            {c.completion !== null ? ` (${c.completion}%)` : ""}
                          </span>
                        </Tooltip>
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 700,
                          color:
                            c.missedDays > 0
                              ? theme.palette.error.main
                              : theme.palette.success.main,
                        }}
                      >
                        {c.missedDays}
                      </TableCell>
                      <TableCell>{statusChip(c)}</TableCell>
                      <TableCell>
                        {missedChips(c)}
                        {c.todayPending && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mt: 0.5 }}
                          >
                            Today not marked yet
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </Box>
  );
};

export default UnmarkedAttendancePage;
