import React, { useMemo, useState } from "react";
import {
  Box,
  Paper,
  Grid,
  Stack,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
  LinearProgress,
  Skeleton,
  useTheme,
  useMediaQuery,
  alpha,
} from "@mui/material";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import HourglassBottomOutlinedIcon from "@mui/icons-material/HourglassBottomOutlined";

import { useTodayOverview, useClassDetail } from "../../../hooks/useManagement";
import { sortClasses } from "../../../utils/classSort";
import HolidayBanner from "../../../components/common/HolidayBanner";
import ClassAttendanceDialog from "../../reports/ClassAttendanceDialog";

// ═══════════════════════════════════════════════════════════════════
//  Status color config
// ═══════════════════════════════════════════════════════════════════
const STATUS_CONFIG = {
  excellent: { dot: "#16A34A", label: "Excellent" },
  good: { dot: "#F59E0B", label: "Good" },
  low: { dot: "#DC2626", label: "Low" },
  notMarked: { dot: "#94A3B8", label: "Pending" },
};

const TodayPage = ({ secretKey }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { data, isLoading } = useTodayOverview(secretKey);

  // ─── Dialog state ───
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: classDetail } = useClassDetail(
    secretKey,
    selectedClassId,
    data?.date,
    dialogOpen,
  );

  const handleClassClick = (classId) => {
    setSelectedClassId(classId);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setTimeout(() => setSelectedClassId(null), 300);
  };

  // ─── Sorted class list ───
  const sortedClasses = useMemo(() => {
    if (!data?.classWise) return [];
    return sortClasses(data.classWise);
  }, [data]);

  // ─── Chart data with stacked bars ───
  const chartData = useMemo(() => {
    if (!sortedClasses.length) return [];
    return sortedClasses.map((c) => {
      const marked = c.present + c.absent;
      const pending = Math.max(0, c.totalStudents - marked);
      return {
        name: c.label,
        present: c.isMarked ? c.present : 0,
        absent: c.isMarked ? c.absent : 0,
        pending: c.isMarked ? pending : c.totalStudents,
        total: c.totalStudents,
        percentage: c.isMarked ? c.percentage : 0,
        isMarked: c.isMarked,
        status: c.status,
        color: STATUS_CONFIG[c.status]?.dot || STATUS_CONFIG.notMarked.dot,
      };
    });
  }, [sortedClasses]);

  // ─── Pie chart data ───
  const pieData = useMemo(() => {
    if (!data?.distribution) return [];
    const { present, absent, pending } = data.distribution;
    const items = [
      { name: "Present", value: present, color: "#16A34A" },
      { name: "Absent", value: absent, color: "#DC2626" },
      { name: "Pending", value: pending, color: "#F59E0B" },
    ];
    return items.filter((i) => i.value > 0);
  }, [data]);

  // ═══════════════════════════════════════════════════════════════
  //  LOADING STATE
  // ═══════════════════════════════════════════════════════════════
  if (isLoading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={500} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
      </Stack>
    );
  }

  if (!data) return null;

  // ═══════════════════════════════════════════════════════════════
  //  HOLIDAY / NON-WORKING DAY
  // ═══════════════════════════════════════════════════════════════
  if (data.isHoliday || data.isNonWorkingDay) {
    return (
      <Stack spacing={2}>
        <HolidayBanner
          isHoliday={data.isHoliday}
          holiday={data.holiday}
          today={data.today}
          nextWorkingDay={data.nextWorkingDay}
        />
      </Stack>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  NORMAL WORKING DAY
  // ═══════════════════════════════════════════════════════════════

  const stats = data.stats || {};
  const overallPct = stats.overallPercentage || 0;
  const totalPending = Math.max(
    0,
    (stats.totalStudents || 0) - (stats.totalMarked || 0),
  );

  const pctColor =
    overallPct >= 90 ? "#16A34A" : overallPct >= 75 ? "#F59E0B" : "#DC2626";

  return (
    <Stack spacing={2}>
      {/* ══════════════════════════════════════════════════════
          🎯 HERO: SIMPLIFIED SCHOOL SUMMARY
      ══════════════════════════════════════════════════════ */}
      <Paper
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: 2.5,
          border: "1px solid",
          borderColor: "divider",
          background: `linear-gradient(135deg, ${alpha(pctColor, isDark ? 0.15 : 0.08)} 0%, ${alpha(pctColor, isDark ? 0.05 : 0.02)} 100%)`,
        }}
      >
        {/* Top row: Label + marked badge ok */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 1.5 }}
        >
          <Typography
            variant="caption"
            fontWeight={800}
            sx={{
              fontSize: "0.75rem",
              letterSpacing: "0.05em",
              color: "text.secondary",
            }}
          >
            {new Date().toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Typography>
          <Chip
            label={`${stats.markedClasses}/${stats.totalClasses} classes marked`}
            size="small"
            sx={{
              fontWeight: 800,
              height: 22,
              fontSize: "0.65rem",
              bgcolor:
                stats.markedClasses === stats.totalClasses
                  ? isDark
                    ? alpha("#16A34A", 0.2)
                    : "#DCFCE7"
                  : isDark
                    ? alpha("#F59E0B", 0.2)
                    : "#FEF3C7",
              color:
                stats.markedClasses === stats.totalClasses
                  ? isDark
                    ? "#86EFAC"
                    : "#15803D"
                  : isDark
                    ? "#FCD34D"
                    : "#B45309",
            }}
          />
        </Stack>

        {/* Big percentage */}
        <Typography
          sx={{
            fontSize: { xs: "3.2rem", sm: "4rem" },
            fontWeight: 900,
            color: pctColor,
            lineHeight: 1,
            mb: 1.5,
          }}
        >
          {overallPct}%
        </Typography>

        {/* Merged stats row: Present · Absent · Pending */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-around"
          sx={{
            p: 1.25,
            borderRadius: 2,
            bgcolor: isDark ? alpha("#fff", 0.04) : alpha("#fff", 0.6),
            border: "1px solid",
            borderColor: "divider",
            mb: 1.25,
          }}
          divider={
            <Box
              sx={{
                borderLeft: "1px solid",
                borderColor: "divider",
                height: 32,
              }}
            />
          }
        >
          <MergedStat
            icon={CheckCircleOutlineIcon}
            value={stats.totalPresent || 0}
            label="Present"
            color="#16A34A"
          />
          <MergedStat
            icon={CancelOutlinedIcon}
            value={stats.totalAbsent || 0}
            label="Absent"
            color="#DC2626"
          />
          <MergedStat
            icon={HourglassBottomOutlinedIcon}
            value={totalPending}
            label="Pending"
            color="#F59E0B"
          />
        </Stack>

        {/* Bottom bar: Total | Classes */}
        <Stack
          direction="row"
          justifyContent="space-around"
          alignItems="center"
          sx={{
            p: 1,
            borderRadius: 1.5,
            bgcolor: isDark ? alpha("#fff", 0.03) : "#FAFBFC",
            border: "1px solid",
            borderColor: "divider",
          }}
          divider={
            <Box
              sx={{
                borderLeft: "1px solid",
                borderColor: "divider",
                height: 22,
              }}
            />
          }
        >
          <Stack alignItems="center" sx={{ flex: 1 }}>
            <Typography
              variant="body2"
              fontWeight={900}
              sx={{ fontSize: "0.9rem" }}
            >
              {stats.totalStudents || 0}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.6rem",
                color: "text.secondary",
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              TOTAL
            </Typography>
          </Stack>
          <Stack alignItems="center" sx={{ flex: 1 }}>
            <Typography
              variant="body2"
              fontWeight={900}
              sx={{ fontSize: "0.9rem" }}
            >
              {stats.totalClasses || 0}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.6rem",
                color: "text.secondary",
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              CLASSES
            </Typography>
          </Stack>
        </Stack>
      </Paper>

      {/* ══════════════════════════════════════════════════════
          📋 CLASS-WISE TABLE + CHART
      ══════════════════════════════════════════════════════ */}
      <Grid container spacing={2} sx={{ width: "100%", m: 0 }}>
        <Grid
          item
          xs={12}
          md={6}
          sx={{ width: "100%", pl: { xs: "0 !important", md: undefined } }}
        >
          <Paper
            sx={{
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
              height: { md: 500 },
              display: "flex",
              flexDirection: "column",
              width: "100%",
            }}
          >
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderBottom: "1px solid",
                borderColor: "divider",
                bgcolor: isDark ? alpha("#fff", 0.02) : "#FAFBFC",
                flexShrink: 0,
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="subtitle2" fontWeight={800}>
                  📋 Class-wise Attendance
                </Typography>
                <Chip
                  label={`${sortedClasses.length} classes`}
                  size="small"
                  sx={{ fontWeight: 700, height: 20, fontSize: "0.65rem" }}
                />
              </Stack>
            </Box>

            {sortedClasses.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  No classes found
                </Typography>
              </Box>
            ) : isSmallMobile ? (
              /* ═══ MOBILE: Tabular list ═══ */
              <Box
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Sticky header */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1.6fr 0.7fr 0.6fr 0.6fr 1.3fr",
                    alignItems: "center",
                    px: 1.5,
                    py: 1,
                    bgcolor: isDark ? "#1E293B" : "#F1F5F9",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                  }}
                >
                  <Typography sx={mobileHeaderStyle}>Class</Typography>
                  <Typography align="center" sx={mobileHeaderStyle}>
                    Total
                  </Typography>
                  <Typography
                    align="center"
                    sx={{ ...mobileHeaderStyle, color: "#16A34A" }}
                  >
                    P
                  </Typography>
                  <Typography
                    align="center"
                    sx={{ ...mobileHeaderStyle, color: "#DC2626" }}
                  >
                    A
                  </Typography>
                  <Typography align="center" sx={mobileHeaderStyle}>
                    %
                  </Typography>
                </Box>

                {/* Data rows */}
                <Box sx={{ flex: 1, overflowY: "auto" }}>
                  {sortedClasses.map((cls) => {
                    const config =
                      STATUS_CONFIG[cls.status] || STATUS_CONFIG.notMarked;
                    return (
                      <Box
                        key={cls._id}
                        onClick={() => handleClassClick(cls._id)}
                        sx={{
                          px: 1.5,
                          py: 1,
                          borderLeft: "3px solid",
                          borderLeftColor: config.dot,
                          borderBottom: "1px solid",
                          borderColor: "divider",
                          cursor: "pointer",
                          "&:hover": { bgcolor: "action.hover" },
                          "&:active": { bgcolor: "action.selected" },
                        }}
                      >
                        {/* Row: Class | Total | P | A | % */}
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns:
                              "1.6fr 0.7fr 0.6fr 0.6fr 1.3fr",
                            alignItems: "center",
                          }}
                        >
                          <Typography
                            fontWeight={800}
                            sx={{ fontSize: "0.82rem" }}
                          >
                            {cls.label}
                          </Typography>
                          <Typography
                            align="center"
                            fontWeight={700}
                            sx={{
                              fontSize: "0.85rem",
                              fontFamily: "monospace",
                            }}
                          >
                            {cls.totalStudents}
                          </Typography>
                          <Typography
                            align="center"
                            fontWeight={800}
                            sx={{
                              fontSize: "0.85rem",
                              fontFamily: "monospace",
                              color: cls.isMarked ? "#16A34A" : "text.disabled",
                            }}
                          >
                            {cls.isMarked ? cls.present : "—"}
                          </Typography>
                          <Typography
                            align="center"
                            fontWeight={800}
                            sx={{
                              fontSize: "0.85rem",
                              fontFamily: "monospace",
                              color: cls.isMarked ? "#DC2626" : "text.disabled",
                            }}
                          >
                            {cls.isMarked ? cls.absent : "—"}
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "center",
                            }}
                          >
                            {cls.isMarked ? (
                              <Typography
                                fontWeight={900}
                                sx={{
                                  fontSize: "0.88rem",
                                  color: config.dot,
                                  fontFamily: "monospace",
                                }}
                              >
                                {cls.percentage}%
                              </Typography>
                            ) : (
                              <Chip
                                label="Pending"
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: "0.6rem",
                                  fontWeight: 700,
                                  bgcolor: isDark
                                    ? alpha("#F59E0B", 0.15)
                                    : "#FEF3C7",
                                  color: isDark ? "#FCD34D" : "#B45309",
                                  "& .MuiChip-label": { px: 0.6 },
                                }}
                              />
                            )}
                          </Box>
                        </Box>

                        {/* Teacher name below class (UPPERCASE) */}
                        <Typography
                          sx={{
                            fontSize: "0.68rem",
                            color: cls.classTeacher
                              ? "text.secondary"
                              : "text.disabled",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.02em",
                            mt: 0.2,
                            mb: cls.isMarked ? 0.5 : 0,
                          }}
                        >
                          {cls.classTeacher
                            ? cls.classTeacher.toUpperCase()
                            : "NO TEACHER ASSIGNED"}
                        </Typography>

                        {/* Progress bar */}
                        {cls.isMarked && (
                          <LinearProgress
                            variant="determinate"
                            value={cls.percentage}
                            sx={{
                              mt: 0.4,
                              height: 3,
                              borderRadius: 2,
                              bgcolor: isDark
                                ? alpha("#fff", 0.08)
                                : alpha("#000", 0.06),
                              "& .MuiLinearProgress-bar": {
                                bgcolor: config.dot,
                                borderRadius: 2,
                              },
                            }}
                          />
                        )}
                      </Box>
                    );
                  })}
                </Box>

                {/* Grand total footer */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1.6fr 0.7fr 0.6fr 0.6fr 1.3fr",
                    alignItems: "center",
                    px: 1.5,
                    py: 1.25,
                    bgcolor: isDark ? "#0F172A" : "#F8FAFC",
                    borderTop: "2px solid",
                    borderColor: "divider",
                    position: "sticky",
                    bottom: 0,
                    zIndex: 2,
                  }}
                >
                  <Typography
                    fontWeight={900}
                    sx={{
                      fontSize: "0.78rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Total
                  </Typography>
                  <Typography
                    align="center"
                    fontWeight={900}
                    sx={{
                      fontSize: "0.88rem",
                      fontFamily: "monospace",
                    }}
                  >
                    {stats.totalStudents || 0}
                  </Typography>
                  <Typography
                    align="center"
                    fontWeight={900}
                    sx={{
                      fontSize: "0.88rem",
                      fontFamily: "monospace",
                      color: "#16A34A",
                    }}
                  >
                    {stats.totalPresent || 0}
                  </Typography>
                  <Typography
                    align="center"
                    fontWeight={900}
                    sx={{
                      fontSize: "0.88rem",
                      fontFamily: "monospace",
                      color: "#DC2626",
                    }}
                  >
                    {stats.totalAbsent || 0}
                  </Typography>
                  <Typography
                    align="center"
                    fontWeight={900}
                    sx={{
                      fontSize: "0.92rem",
                      fontFamily: "monospace",
                      color: pctColor,
                    }}
                  >
                    {overallPct}%
                  </Typography>
                </Box>
              </Box>
            ) : (
              /* ═══ DESKTOP: Table ═══ */
              <TableContainer sx={{ flex: 1, overflowY: "auto" }}>
                <Table
                  stickyHeader
                  size="small"
                  sx={{ tableLayout: "fixed", width: "100%" }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          ...headerCellStyle(isDark),
                          width: "auto",
                          pl: 2,
                        }}
                      >
                        Class & Teacher
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ ...headerCellStyle(isDark), width: 55 }}
                      >
                        Std
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          ...headerCellStyle(isDark),
                          width: 45,
                          color: "#16A34A !important",
                        }}
                      >
                        P
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          ...headerCellStyle(isDark),
                          width: 45,
                          color: "#DC2626 !important",
                        }}
                      >
                        A
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ ...headerCellStyle(isDark), width: 140, pr: 2 }}
                      >
                        Attendance
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedClasses.map((cls) => {
                      const config =
                        STATUS_CONFIG[cls.status] || STATUS_CONFIG.notMarked;
                      return (
                        <TableRow
                          key={cls._id}
                          hover
                          onClick={() => handleClassClick(cls._id)}
                          sx={{
                            cursor: "pointer",
                            "& td": { py: 1.1, borderColor: "divider" },
                          }}
                        >
                          <TableCell
                            sx={{
                              pl: 2,
                              borderLeft: "3px solid",
                              borderLeftColor: config.dot,
                            }}
                          >
                            <Typography
                              variant="body2"
                              fontWeight={800}
                              sx={{ fontSize: "0.85rem", lineHeight: 1.2 }}
                            >
                              {cls.label}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                color: cls.classTeacher
                                  ? "text.secondary"
                                  : "text.disabled",
                                textTransform: "uppercase",
                                letterSpacing: "0.03em",
                                display: "block",
                                mt: 0.2,
                              }}
                            >
                              {cls.classTeacher
                                ? cls.classTeacher.toUpperCase()
                                : "NO TEACHER"}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              sx={{
                                fontSize: "0.85rem",
                                fontFamily: "monospace",
                              }}
                            >
                              {cls.totalStudents}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography
                              variant="body2"
                              fontWeight={800}
                              sx={{
                                fontSize: "0.85rem",
                                color: cls.isMarked
                                  ? "#16A34A"
                                  : "text.disabled",
                                fontFamily: "monospace",
                              }}
                            >
                              {cls.isMarked ? cls.present : "—"}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography
                              variant="body2"
                              fontWeight={800}
                              sx={{
                                fontSize: "0.85rem",
                                color: cls.isMarked
                                  ? "#DC2626"
                                  : "text.disabled",
                                fontFamily: "monospace",
                              }}
                            >
                              {cls.isMarked ? cls.absent : "—"}
                            </Typography>
                          </TableCell>
                          <TableCell align="center" sx={{ pr: 2 }}>
                            {cls.isMarked ? (
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1}
                                justifyContent="center"
                              >
                                <Typography
                                  variant="body2"
                                  fontWeight={900}
                                  sx={{
                                    fontSize: "0.9rem",
                                    color: config.dot,
                                    minWidth: 42,
                                    textAlign: "right",
                                  }}
                                >
                                  {cls.percentage}%
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={cls.percentage}
                                  sx={{
                                    flex: 1,
                                    height: 5,
                                    borderRadius: 2,
                                    bgcolor: isDark
                                      ? alpha("#fff", 0.08)
                                      : alpha("#000", 0.06),
                                    "& .MuiLinearProgress-bar": {
                                      bgcolor: config.dot,
                                      borderRadius: 2,
                                    },
                                  }}
                                />
                              </Stack>
                            ) : (
                              <Chip
                                label="Pending"
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: "0.62rem",
                                  fontWeight: 700,
                                  bgcolor: isDark
                                    ? alpha("#F59E0B", 0.15)
                                    : "#FEF3C7",
                                  color: isDark ? "#FCD34D" : "#B45309",
                                }}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Legend */}
            <Box
              sx={{
                px: 2,
                py: 1.25,
                borderTop: "1px solid",
                borderColor: "divider",
                bgcolor: isDark ? alpha("#fff", 0.02) : "#FAFBFC",
                flexShrink: 0,
              }}
            >
              <Stack
                direction="row"
                spacing={{ xs: 1.5, sm: 2 }}
                flexWrap="wrap"
                useFlexGap
                justifyContent="center"
              >
                <LegendItem dot="#16A34A" label="≥90%" isDark={isDark} />
                <LegendItem dot="#F59E0B" label="75-89%" isDark={isDark} />
                <LegendItem dot="#DC2626" label="<75%" isDark={isDark} />
                <LegendItem dot="#94A3B8" label="Pending" isDark={isDark} />
              </Stack>
            </Box>
          </Paper>
        </Grid>

        {/* ─── RIGHT: Stacked Bar Chart (DESKTOP ONLY) ─── */}
        {!isMobile && (
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
                height: 500,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  bgcolor: isDark ? alpha("#fff", 0.02) : "#FAFBFC",
                  flexShrink: 0,
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="subtitle2" fontWeight={800}>
                    📊 Visual Comparison
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: "0.65rem" }}
                  >
                    Hover for details
                  </Typography>
                </Stack>
              </Box>

              <Box sx={{ flex: 1, overflow: "auto", p: 1 }}>
                <Box
                  sx={{
                    width: Math.max(400, chartData.length * 40),
                    height: "100%",
                    minHeight: 400,
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 15, left: -15, bottom: 60 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDark ? "#334155" : "#E2E8F0"}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{
                          fontSize: 10,
                          fill: theme.palette.text.primary,
                          fontWeight: 600,
                        }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        interval={0}
                      />
                      <YAxis
                        tick={{
                          fontSize: 10,
                          fill: theme.palette.text.secondary,
                        }}
                        width={35}
                      />
                      <RechartsTooltip
                        content={<CustomTooltip isDark={isDark} />}
                      />
                      <Bar
                        dataKey="present"
                        stackId="a"
                        fill="#16A34A"
                        name="Present"
                        radius={[0, 0, 0, 0]}
                        maxBarSize={35}
                      />
                      <Bar
                        dataKey="absent"
                        stackId="a"
                        fill="#DC2626"
                        name="Absent"
                        radius={[0, 0, 0, 0]}
                        maxBarSize={35}
                      />
                      <Bar
                        dataKey="pending"
                        stackId="a"
                        fill="#F59E0B"
                        name="Pending"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={35}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Box>

              <Box
                sx={{
                  px: 2,
                  py: 1.25,
                  borderTop: "1px solid",
                  borderColor: "divider",
                  bgcolor: isDark ? alpha("#fff", 0.02) : "#FAFBFC",
                  flexShrink: 0,
                }}
              >
                <Stack
                  direction="row"
                  spacing={2}
                  flexWrap="wrap"
                  useFlexGap
                  justifyContent="center"
                >
                  <LegendItem dot="#16A34A" label="Present" isDark={isDark} />
                  <LegendItem dot="#DC2626" label="Absent" isDark={isDark} />
                  <LegendItem dot="#F59E0B" label="Pending" isDark={isDark} />
                </Stack>
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* ══════════════════════════════════════════════════════
          🥧 DISTRIBUTION OVERVIEW
      ══════════════════════════════════════════════════════ */}
      {pieData.length > 0 && (
        <Paper
          sx={{
            p: { xs: 1.5, sm: 2 },
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
            🥧 Distribution Overview
          </Typography>
          <Grid container spacing={1} alignItems="center">
            <Grid item xs={12} sm={5}>
              <Box sx={{ height: { xs: 160, sm: 180 } }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={isSmallMobile ? 35 : 45}
                      outerRadius={isSmallMobile ? 60 : 75}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        background: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Grid>
            <Grid item xs={12} sm={7}>
              <Stack spacing={1}>
                {pieData.map((item) => {
                  const total = pieData.reduce((s, p) => s + p.value, 0);
                  const pct =
                    total > 0 ? Math.round((item.value / total) * 100) : 0;
                  return (
                    <Stack
                      key={item.name}
                      direction="row"
                      alignItems="center"
                      spacing={1.5}
                      sx={{
                        p: 1,
                        borderRadius: 1.5,
                        bgcolor: alpha(item.color, isDark ? 0.1 : 0.05),
                        border: "1px solid",
                        borderColor: alpha(item.color, 0.2),
                      }}
                    >
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          bgcolor: item.color,
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ flex: 1, fontSize: "0.82rem" }}
                      >
                        {item.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={800}
                        sx={{
                          fontSize: "0.85rem",
                          color: item.color,
                          fontFamily: "monospace",
                        }}
                      >
                        {item.value}
                      </Typography>
                      <Chip
                        label={`${pct}%`}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.65rem",
                          fontWeight: 800,
                          bgcolor: item.color,
                          color: "white",
                          minWidth: 42,
                        }}
                      />
                    </Stack>
                  );
                })}
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* ══════════════════════════════════════════════════════
          🔍 CLASS DETAIL DIALOG
      ══════════════════════════════════════════════════════ */}
      <ClassAttendanceDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        classData={classDetail}
        date={data?.date}
        mode="management"
      />
    </Stack>
  );
};

// ═══════════════════════════════════════════════════════════════════
//  CUSTOM TOOLTIP for stacked bar chart
// ═══════════════════════════════════════════════════════════════════

const CustomTooltip = ({ active, payload, isDark }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  return (
    <Paper
      sx={{
        p: 1.25,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1.5,
        minWidth: 180,
        bgcolor: "background.paper",
      }}
    >
      <Typography
        variant="body2"
        fontWeight={800}
        sx={{ fontSize: "0.85rem", mb: 0.75 }}
      >
        {data.name}
      </Typography>
      <Stack spacing={0.5}>
        <Stack direction="row" justifyContent="space-between">
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: "0.72rem" }}
          >
            Total Students:
          </Typography>
          <Typography
            variant="caption"
            fontWeight={800}
            sx={{ fontSize: "0.75rem", fontFamily: "monospace" }}
          >
            {data.total}
          </Typography>
        </Stack>
        <Box
          sx={{ borderBottom: "1px solid", borderColor: "divider", my: 0.3 }}
        />
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "2px",
              bgcolor: "#16A34A",
              flexShrink: 0,
            }}
          />
          <Typography
            variant="caption"
            sx={{ fontSize: "0.72rem", flex: 1, color: "#16A34A" }}
          >
            Present:
          </Typography>
          <Typography
            variant="caption"
            fontWeight={800}
            sx={{
              fontSize: "0.75rem",
              color: "#16A34A",
              fontFamily: "monospace",
            }}
          >
            {data.present}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "2px",
              bgcolor: "#DC2626",
              flexShrink: 0,
            }}
          />
          <Typography
            variant="caption"
            sx={{ fontSize: "0.72rem", flex: 1, color: "#DC2626" }}
          >
            Absent:
          </Typography>
          <Typography
            variant="caption"
            fontWeight={800}
            sx={{
              fontSize: "0.75rem",
              color: "#DC2626",
              fontFamily: "monospace",
            }}
          >
            {data.absent}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "2px",
              bgcolor: "#F59E0B",
              flexShrink: 0,
            }}
          />
          <Typography
            variant="caption"
            sx={{ fontSize: "0.72rem", flex: 1, color: "#B45309" }}
          >
            Pending:
          </Typography>
          <Typography
            variant="caption"
            fontWeight={800}
            sx={{
              fontSize: "0.75rem",
              color: "#B45309",
              fontFamily: "monospace",
            }}
          >
            {data.pending}
          </Typography>
        </Stack>
        {data.isMarked && (
          <>
            <Box
              sx={{
                borderBottom: "1px solid",
                borderColor: "divider",
                my: 0.3,
              }}
            />
            <Stack direction="row" justifyContent="space-between">
              <Typography
                variant="caption"
                fontWeight={700}
                sx={{ fontSize: "0.72rem" }}
              >
                Attendance:
              </Typography>
              <Typography
                variant="caption"
                fontWeight={900}
                sx={{
                  fontSize: "0.85rem",
                  color:
                    data.percentage >= 90
                      ? "#16A34A"
                      : data.percentage >= 75
                        ? "#F59E0B"
                        : "#DC2626",
                  fontFamily: "monospace",
                }}
              >
                {data.percentage}%
              </Typography>
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  );
};

// ═══════════════════════════════════════════════════════════════════
//  SMALL COMPONENTS
// ═══════════════════════════════════════════════════════════════════

const MergedStat = ({ icon: Icon, value, label, color }) => (
  <Stack alignItems="center" sx={{ flex: 1 }}>
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Icon sx={{ fontSize: 16, color }} />
      <Typography
        fontWeight={900}
        sx={{
          fontSize: "1.1rem",
          color,
          lineHeight: 1,
          fontFamily: "monospace",
        }}
      >
        {value}
      </Typography>
    </Stack>
    <Typography
      sx={{
        fontSize: "0.62rem",
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

const LegendItem = ({ dot, label, isDark }) => (
  <Stack direction="row" alignItems="center" spacing={0.5}>
    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: dot }} />
    <Typography
      variant="caption"
      sx={{ fontSize: "0.68rem", fontWeight: 700, color: "text.secondary" }}
    >
      {label}
    </Typography>
  </Stack>
);

const mobileHeaderStyle = {
  fontSize: "0.62rem",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "text.secondary",
};

const headerCellStyle = (isDark) => ({
  fontWeight: 800,
  fontSize: "0.65rem",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  bgcolor: isDark ? "#1E293B" : "#F1F5F9",
  color: "text.secondary",
  py: 1.25,
  whiteSpace: "nowrap",
});

export default TodayPage;
