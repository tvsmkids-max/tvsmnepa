import React, { useMemo } from "react";
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
import BeachAccessOutlinedIcon from "@mui/icons-material/BeachAccessOutlined";

import { useTodayOverview } from "../../../hooks/useManagement";
import { sortClasses } from "../../../utils/classSort";

// ═══════════════════════════════════════════════════════════════════
//  Status color config
// ═══════════════════════════════════════════════════════════════════
const STATUS_CONFIG = {
  excellent: { dot: "#16A34A", label: "Excellent" },
  good: { dot: "#F59E0B", label: "Good" },
  low: { dot: "#DC2626", label: "Low" },
  notMarked: { dot: "#94A3B8", label: "Pending" },
};

// Health colors
const HEALTH_COLORS = {
  excellent: "#16A34A",
  veryGood: "#22C55E",
  good: "#F59E0B",
  fair: "#F97316",
  poor: "#DC2626",
  unknown: "#6B7280",
};

const HEALTH_LABELS = {
  excellent: "Excellent",
  veryGood: "Very Good",
  good: "Good",
  fair: "Fair",
  poor: "Needs Attention",
  unknown: "No Data",
};

const TodayPage = ({ secretKey }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("md")); // ✅ Changed to md (900px)
  const isSmallMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { data, isLoading } = useTodayOverview(secretKey);

  // ─── Sorted class list (client-side backup sort) ───
  const sortedClasses = useMemo(() => {
    if (!data?.classWise) return [];
    return sortClasses(data.classWise);
  }, [data]);

  // ─── Chart data: Marked classes in class order, then pending at bottom ───
  // ─── Chart data with stacked bars (Present + Absent + Pending) ───
  const chartData = useMemo(() => {
    if (!sortedClasses.length) return [];
    return sortedClasses.map((c) => {
      const marked = c.present + c.absent;
      const pending = Math.max(0, c.totalStudents - marked);
      return {
        name: c.label,
        // Stacked values (each becomes a separate bar segment)
        present: c.isMarked ? c.present : 0,
        absent: c.isMarked ? c.absent : 0,
        pending: c.isMarked ? pending : c.totalStudents, // If not marked, all are pending
        // Extra info for tooltip
        total: c.totalStudents,
        percentage: c.isMarked ? c.percentage : 0,
        isMarked: c.isMarked,
        status: c.status,
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
  //  HOLIDAY BANNER
  // ═══════════════════════════════════════════════════════════════
  if (data.isHoliday) {
    return (
      <Paper
        sx={{
          p: 4,
          borderRadius: 2,
          textAlign: "center",
          border: "1px solid",
          borderColor: "warning.light",
          bgcolor: isDark ? alpha("#F59E0B", 0.05) : "#FFFBEB",
        }}
      >
        <BeachAccessOutlinedIcon
          sx={{ fontSize: 64, color: "warning.main", mb: 1 }}
        />
        <Typography variant="h6" fontWeight={800}>
          🏖️ {data.holiday?.name || "Holiday"}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {data.holiday?.type || "Holiday"} · No attendance today
        </Typography>
      </Paper>
    );
  }

  const stats = data.stats || {};
  const health = data.health || {};
  const healthColor = HEALTH_COLORS[health.level] || HEALTH_COLORS.unknown;
  const healthLabel = HEALTH_LABELS[health.level] || "No Data";
  const overallPct = stats.overallPercentage || 0;

  const pctColor =
    overallPct >= 90 ? "#16A34A" : overallPct >= 75 ? "#F59E0B" : "#DC2626";

  return (
    <Stack spacing={2}>
      {/* ══════════════════════════════════════════════════════
          🎯 HERO: SCHOOL SUMMARY
      ══════════════════════════════════════════════════════ */}
      <Paper
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 2.5,
          border: "1px solid",
          borderColor: "divider",
          background: `linear-gradient(135deg, ${alpha(pctColor, isDark ? 0.15 : 0.08)} 0%, ${alpha(pctColor, isDark ? 0.05 : 0.02)} 100%)`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <Typography
            variant="caption"
            fontWeight={800}
            sx={{
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "text.secondary",
            }}
          >
            🎯 Today's Attendance
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

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={5}>
            <Box>
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: "3.5rem", sm: "4.5rem" },
                  fontWeight: 900,
                  color: pctColor,
                  lineHeight: 1,
                }}
              >
                {overallPct}%
              </Typography>
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.75}
                sx={{ mt: 0.5 }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: healthColor,
                  }}
                />
                <Typography
                  variant="body2"
                  fontWeight={800}
                  sx={{ color: healthColor, fontSize: "0.95rem" }}
                >
                  {healthLabel}
                </Typography>
              </Stack>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: "0.72rem", display: "block", mt: 0.3 }}
              >
                {overallPct >= 90
                  ? `Above target of 90% ✓`
                  : `Below target of 90% by ${90 - overallPct}%`}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={7}>
            <Grid container spacing={1.5}>
              <Grid item xs={4}>
                <SummaryStat
                  icon={CheckCircleOutlineIcon}
                  value={stats.totalPresent || 0}
                  label="Present"
                  color="#16A34A"
                  isDark={isDark}
                />
              </Grid>
              <Grid item xs={4}>
                <SummaryStat
                  icon={CancelOutlinedIcon}
                  value={stats.totalAbsent || 0}
                  label="Absent"
                  color="#DC2626"
                  isDark={isDark}
                />
              </Grid>
              <Grid item xs={4}>
                <SummaryStat
                  icon={HourglassBottomOutlinedIcon}
                  value={stats.totalStudents - (stats.totalMarked || 0)}
                  label="Pending"
                  color="#F59E0B"
                  isDark={isDark}
                />
              </Grid>
              <Grid item xs={12}>
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: isDark ? alpha("#fff", 0.04) : "#FAFBFC",
                    justifyContent: "space-around",
                  }}
                  divider={
                    <Box
                      sx={{
                        borderRight: "1px solid",
                        borderColor: "divider",
                      }}
                    />
                  }
                >
                  <Stack alignItems="center" sx={{ flex: 1 }}>
                    <Typography
                      variant="body2"
                      fontWeight={900}
                      sx={{ fontSize: "0.85rem" }}
                    >
                      {stats.totalStudents || 0}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: "0.6rem",
                        color: "text.secondary",
                        fontWeight: 700,
                      }}
                    >
                      TOTAL
                    </Typography>
                  </Stack>
                  <Stack alignItems="center" sx={{ flex: 1 }}>
                    <Typography
                      variant="body2"
                      fontWeight={900}
                      sx={{ fontSize: "0.85rem" }}
                    >
                      {stats.totalClasses || 0}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: "0.6rem",
                        color: "text.secondary",
                        fontWeight: 700,
                      }}
                    >
                      CLASSES
                    </Typography>
                  </Stack>
                </Stack>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        <Stack
          direction="row"
          spacing={{ xs: 1, sm: 2 }}
          flexWrap="wrap"
          useFlexGap
          sx={{
            mt: 2,
            pt: 2,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <QuickCount
            emoji="🟢"
            label="Excellent"
            value={stats.excellentClasses || 0}
            color="#16A34A"
            isDark={isDark}
          />
          <QuickCount
            emoji="🟡"
            label="Good"
            value={stats.goodClasses || 0}
            color="#F59E0B"
            isDark={isDark}
          />
          <QuickCount
            emoji="🔴"
            label="Low"
            value={stats.lowClasses || 0}
            color="#DC2626"
            isDark={isDark}
          />
          <QuickCount
            emoji="⏳"
            label="Pending"
            value={stats.pendingClasses || 0}
            color="#6B7280"
            isDark={isDark}
          />
        </Stack>
      </Paper>

      {/* ══════════════════════════════════════════════════════
          📋 CLASS-WISE TABLE + CHART (Split on desktop)
      ══════════════════════════════════════════════════════ */}
      <Grid container spacing={2}>
        {/* ─── LEFT: Table ─── */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
              height: { md: 500 },
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
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
                  sx={{
                    fontWeight: 700,
                    height: 20,
                    fontSize: "0.65rem",
                  }}
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
              // ═══════════════════════════════════════════════════════════
              //  📱 MOBILE VIEW — Compact cards
              // ═══════════════════════════════════════════════════════════
              <Box sx={{ flex: 1, overflowY: "auto" }}>
                <Stack
                  divider={
                    <Box
                      sx={{
                        borderBottom: "1px solid",
                        borderColor: "divider",
                      }}
                    />
                  }
                >
                  {sortedClasses.map((cls) => {
                    const config =
                      STATUS_CONFIG[cls.status] || STATUS_CONFIG.notMarked;
                    return (
                      <Box
                        key={cls._id}
                        sx={{
                          px: 1.5,
                          py: 1.25,
                          borderLeft: "3px solid",
                          borderLeftColor: config.dot,
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      >
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          sx={{ mb: 0.5 }}
                        >
                          <Typography
                            variant="body2"
                            fontWeight={800}
                            sx={{ fontSize: "0.85rem" }}
                          >
                            {cls.label}
                          </Typography>
                          {cls.isMarked ? (
                            <Typography
                              variant="body2"
                              fontWeight={900}
                              sx={{
                                fontSize: "1rem",
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
                        </Stack>
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={1.5}
                        >
                          <Stack
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                          >
                            <MobileStatLabel
                              label="Std"
                              value={cls.totalStudents}
                              color="text.primary"
                            />
                            <MobileStatLabel
                              label="P"
                              value={cls.isMarked ? cls.present : "—"}
                              color={cls.isMarked ? "#16A34A" : "text.disabled"}
                            />
                            <MobileStatLabel
                              label="A"
                              value={cls.isMarked ? cls.absent : "—"}
                              color={cls.isMarked ? "#DC2626" : "text.disabled"}
                            />
                          </Stack>
                          {cls.isMarked && (
                            <Box sx={{ flex: 1, ml: 0.5 }}>
                              <LinearProgress
                                variant="determinate"
                                value={cls.percentage}
                                sx={{
                                  height: 4,
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
                            </Box>
                          )}
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            ) : (
              // ═══════════════════════════════════════════════════════════
              //  💻 DESKTOP/TABLET VIEW — Compact table
              // ═══════════════════════════════════════════════════════════
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
                        Class
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          ...headerCellStyle(isDark),
                          width: 55,
                        }}
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
                        sx={{
                          ...headerCellStyle(isDark),
                          width: 140,
                          pr: 2,
                        }}
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
                          sx={{
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
                              sx={{
                                fontSize: "0.85rem",
                                color: "text.primary",
                              }}
                            >
                              {cls.label}
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

        {/* ─── RIGHT: Chart (DESKTOP ONLY) ─── */}
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
              {/* Header */}
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

              {/* Chart body (scrollable if too many classes) */}
              {/* Chart body — VERTICAL (standing) bars */}
              <Box
                sx={{
                  flex: 1,
                  overflow: "auto",
                  p: 1,
                }}
              >
                <Box
                  sx={{
                    // Dynamic width based on classes count (40px per bar minimum)
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
                      {/* ✅ STACKED BARS — each color stacks on top */}
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

              {/* Chart footer legend */}
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
          🥧 DISTRIBUTION OVERVIEW (below, full width)
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
    </Stack>
  );
};

// ═══════════════════════════════════════════════════════════════════
//  CUSTOM TOOLTIP for the horizontal bar chart
// ═══════════════════════════════════════════════════════════════════

const CustomTooltip = ({ active, payload, isDark }) => {
  if (!active || !payload || !payload.length) return null;

  // Extract data from any payload item (they all have same original data)
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
        {/* Total students */}
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

        {/* Present */}
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

        {/* Absent */}
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

        {/* Pending */}
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

const SummaryStat = ({ icon: Icon, value, label, color, isDark }) => (
  <Box
    sx={{
      p: 1,
      borderRadius: 1.5,
      bgcolor: alpha(color, isDark ? 0.12 : 0.06),
      border: "1px solid",
      borderColor: alpha(color, 0.2),
      textAlign: "center",
    }}
  >
    <Icon sx={{ fontSize: 16, color, mb: 0.3 }} />
    <Typography
      variant="body2"
      fontWeight={900}
      sx={{ fontSize: "1.05rem", color, lineHeight: 1 }}
    >
      {value}
    </Typography>
    <Typography
      variant="caption"
      sx={{
        fontSize: "0.6rem",
        fontWeight: 800,
        color,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
      }}
    >
      {label}
    </Typography>
  </Box>
);

const QuickCount = ({ emoji, label, value, color, isDark }) => (
  <Stack
    direction="row"
    spacing={0.75}
    alignItems="center"
    sx={{
      px: 1.25,
      py: 0.5,
      borderRadius: 1.5,
      bgcolor: alpha(color, isDark ? 0.12 : 0.06),
      minWidth: "fit-content",
    }}
  >
    <Typography sx={{ fontSize: "0.85rem", lineHeight: 1 }}>{emoji}</Typography>
    <Typography
      variant="caption"
      fontWeight={700}
      sx={{ fontSize: "0.7rem", color: "text.secondary" }}
    >
      {label}
    </Typography>
    <Typography
      variant="caption"
      fontWeight={900}
      sx={{ fontSize: "0.78rem", color, fontFamily: "monospace" }}
    >
      {value}
    </Typography>
  </Stack>
);

const LegendItem = ({ dot, label, isDark }) => (
  <Stack direction="row" alignItems="center" spacing={0.5}>
    <Box
      sx={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        bgcolor: dot,
      }}
    />
    <Typography
      variant="caption"
      sx={{
        fontSize: "0.68rem",
        fontWeight: 700,
        color: "text.secondary",
      }}
    >
      {label}
    </Typography>
  </Stack>
);

const MobileStatLabel = ({ label, value, color }) => (
  <Box>
    <Typography
      component="span"
      variant="caption"
      sx={{
        fontSize: "0.68rem",
        color: "text.secondary",
        fontWeight: 700,
        mr: 0.4,
      }}
    >
      {label}:
    </Typography>
    <Typography
      component="span"
      variant="caption"
      sx={{
        fontSize: "0.75rem",
        fontWeight: 800,
        fontFamily: "monospace",
        color,
      }}
    >
      {value}
    </Typography>
  </Box>
);

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
