import React, { useState } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Chip,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  useMediaQuery,
  alpha,
  LinearProgress,
  IconButton,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import EventNoteIcon from "@mui/icons-material/EventNote";
import PeopleIcon from "@mui/icons-material/People";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import { useRangeOverview, useClassDetail } from "../../../hooks/useManagement";
import ClassAttendanceDialog from "../../reports/ClassAttendanceDialog";

// ─── DATE UTILS ───
const getRangeDates = (rangeVal) => {
  const to = new Date();
  const from = new Date();
  if (rangeVal === "month") from.setDate(1);
  else from.setDate(to.getDate() - rangeVal);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
};

// ═══════════════════════════════════════════════════════════════════
//  KPI CARD
// ═══════════════════════════════════════════════════════════════════
const KpiCard = ({
  title,
  value,
  subtext,
  delta,
  icon,
  color,
  sparkline,
  isDark,
  invertGood = false,
}) => {
  const deltaNum = parseFloat(delta);
  const isPositive = deltaNum > 0;
  const isNegative = deltaNum < 0;

  let arrow = null;
  let deltaColor = "text.secondary";
  let deltaBg = isDark ? alpha("#94A3B8", 0.1) : "#F1F5F9";

  if (isPositive) {
    arrow = <TrendingUpIcon sx={{ fontSize: 12 }} />;
    deltaColor = invertGood ? "#DC2626" : "#16A34A";
    deltaBg = invertGood
      ? isDark
        ? alpha("#DC2626", 0.15)
        : "#FEE2E2"
      : isDark
        ? alpha("#16A34A", 0.15)
        : "#DCFCE7";
  } else if (isNegative) {
    arrow = <TrendingDownIcon sx={{ fontSize: 12 }} />;
    deltaColor = invertGood ? "#16A34A" : "#DC2626";
    deltaBg = invertGood
      ? isDark
        ? alpha("#16A34A", 0.15)
        : "#DCFCE7"
      : isDark
        ? alpha("#DC2626", 0.15)
        : "#FEE2E2";
  }

  const sparkColor = deltaNum >= 0 && !invertGood ? "#16A34A" : "#DC2626";

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        flex: 1,
        minWidth: { xs: "100%", sm: "calc(33.333% - 12px)" },
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: alpha(color, isDark ? 0.2 : 0.12),
              color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </Box>
          <Typography variant="body2" fontWeight={700} color="text.secondary">
            {title}
          </Typography>
        </Stack>
        {delta !== "0.0" && (
          <Chip
            icon={arrow}
            label={`${isPositive ? "+" : ""}${delta}%`}
            size="small"
            sx={{
              height: 22,
              fontSize: "0.7rem",
              fontWeight: 800,
              color: deltaColor,
              bgcolor: deltaBg,
              border: "none",
              "& .MuiChip-icon": { color: "inherit", ml: 0.5 },
              "& .MuiChip-label": { pr: 1 },
            }}
          />
        )}
      </Stack>
      <Typography
        variant="h3"
        fontWeight={900}
        color="text.primary"
        sx={{
          letterSpacing: "-0.02em",
          fontSize: { xs: "1.8rem", sm: "2.1rem" },
          lineHeight: 1.1,
        }}
      >
        {value}
      </Typography>
      <Typography
        variant="caption"
        color="text.disabled"
        fontWeight={600}
        sx={{ mt: 0.5, mb: 1.5 }}
      >
        {subtext}
      </Typography>
      <Box sx={{ height: 40, mx: -2.5, mb: -2.5, mt: "auto" }}>
        {sparkline && sparkline.length > 1 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={sparkline}
              margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id={`spark-${title}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={sparkColor} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={sparkColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={sparkColor}
                strokeWidth={2}
                fill={`url(#spark-${title})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Paper>
  );
};

const STATUS_CONFIG = {
  excellent: { dot: "#16A34A" },
  good: { dot: "#F59E0B" },
  low: { dot: "#DC2626" },
  notMarked: { dot: "#94A3B8" },
};

const headSx = (isDark) => ({
  bgcolor: isDark ? "#111827" : "#F8FAFC",
  fontWeight: 800,
  fontSize: "0.72rem",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  color: "text.secondary",
  py: 1.5,
  whiteSpace: "nowrap",
});

// ═══════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
const TodayPage = ({ secretKey }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [rangeType, setRangeType] = useState(0);
  const [group, setGroup] = useState("ALL");
  const [selectedClassId, setSelectedClassId] = useState(null);

  const dates = getRangeDates(rangeType === "month" ? "month" : rangeType);
  const todayStr = new Date().toISOString().split("T")[0];

  const { data, isLoading } = useRangeOverview(
    secretKey,
    dates.from,
    dates.to,
    group,
  );
  const { data: classDetail } = useClassDetail(
    secretKey,
    selectedClassId,
    todayStr,
    !!selectedClassId,
  );

  if (isLoading && !data) {
    return (
      <Stack spacing={3}>
        <Skeleton variant="rectangular" height={50} sx={{ borderRadius: 2 }} />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Skeleton
            variant="rectangular"
            height={180}
            sx={{ flex: 1, borderRadius: 3 }}
          />
          <Skeleton
            variant="rectangular"
            height={180}
            sx={{ flex: 1, borderRadius: 3 }}
          />
          <Skeleton
            variant="rectangular"
            height={180}
            sx={{ flex: 1, borderRadius: 3 }}
          />
        </Stack>
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 3 }} />
      </Stack>
    );
  }

  if (!data) return null;

  const { kpis, trend, todayClassWise, attention } = data;

  const rangeLabels = [
    { label: "Today", val: 0 },
    { label: "Last 7 Days", val: 6 },
    { label: "Last 14 Days", val: 13 },
    { label: "Last 30 Days", val: 29 },
    { label: "This Month", val: "month" },
  ];

  const currentRangeLabel =
    rangeLabels.find((r) => r.val === rangeType)?.label || "Today";

  // ═══════════════════════════════════════════════════════════════════
  //  📱 MOBILE VIEW
  // ═══════════════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <Box sx={{ pb: 2 }}>
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="h5"
            fontWeight={900}
            sx={{ letterSpacing: "-0.02em", color: "text.primary" }}
          >
            Today's Attendance
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
            bgcolor: "background.paper",
          }}
        >
          {todayClassWise.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                No classes found
              </Typography>
            </Box>
          ) : (
            <TableContainer sx={{ overflowX: "hidden" }}>
              <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...headSx(isDark), width: "auto", pl: 2 }}>
                      Class
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        ...headSx(isDark),
                        width: 40,
                        px: 0,
                        borderLeft: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      Std
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        ...headSx(isDark),
                        width: 36,
                        px: 0,
                        borderLeft: "1px solid",
                        borderColor: "divider",
                        color: "#16A34A !important",
                      }}
                    >
                      P
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        ...headSx(isDark),
                        width: 36,
                        px: 0,
                        borderLeft: "1px solid",
                        borderColor: "divider",
                        color: "#DC2626 !important",
                      }}
                    >
                      A
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        ...headSx(isDark),
                        width: 50,
                        px: 0,
                        borderLeft: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      %
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ ...headSx(isDark), width: 32, px: 0 }}
                    />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {todayClassWise.map((cls) => {
                    const config =
                      STATUS_CONFIG[cls.status] || STATUS_CONFIG.notMarked;
                    return (
                      <TableRow
                        key={cls._id}
                        hover
                        onClick={() => setSelectedClassId(cls._id)}
                        sx={{
                          cursor: "pointer",
                          "& td": { py: 1.25, borderColor: "divider", px: 1 },
                        }}
                      >
                        {/* Class Name & Teacher */}
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
                              lineHeight: 1.1,
                              textTransform: "uppercase",
                            }}
                          >
                            {cls.label}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: "0.65rem",
                              fontWeight: 600,
                              color: cls.teacherLabel
                                ? "text.secondary"
                                : "text.disabled",
                              textTransform: "uppercase",
                              display: "block",
                              mt: 0.2,
                            }}
                          >
                            {cls.teacherLabel
                              ? cls.teacherLabel.toUpperCase()
                              : "No teacher"}
                          </Typography>
                        </TableCell>

                        {/* Std (Total) */}
                        <TableCell
                          align="center"
                          sx={{
                            borderLeft: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          <Typography
                            variant="body2"
                            fontWeight={800}
                            sx={{ fontSize: "0.85rem", color: "text.primary" }}
                          >
                            {cls.totalStudents}
                          </Typography>
                        </TableCell>

                        {/* Present (Green Text, No Bg) */}
                        <TableCell
                          align="center"
                          sx={{
                            borderLeft: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          <Typography
                            variant="body2"
                            fontWeight={800}
                            sx={{
                              fontSize: "0.85rem",
                              color: cls.isMarked ? "#16A34A" : "text.disabled",
                            }}
                          >
                            {cls.isMarked ? cls.present : "—"}
                          </Typography>
                        </TableCell>

                        {/* Absent (Red Text, No Bg) */}
                        <TableCell
                          align="center"
                          sx={{
                            borderLeft: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          <Typography
                            variant="body2"
                            fontWeight={800}
                            sx={{
                              fontSize: "0.85rem",
                              color: cls.isMarked ? "#DC2626" : "text.disabled",
                            }}
                          >
                            {cls.isMarked ? cls.absent : "—"}
                          </Typography>
                        </TableCell>

                        {/* Percentage (Colored Text, No Bar) */}
                        <TableCell
                          align="center"
                          sx={{
                            borderLeft: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          {cls.isMarked ? (
                            <Typography
                              variant="body2"
                              fontWeight={900}
                              sx={{ fontSize: "0.85rem", color: config.dot }}
                            >
                              {cls.percentage}%
                            </Typography>
                          ) : (
                            <Typography
                              variant="caption"
                              fontWeight={700}
                              sx={{
                                fontSize: "0.6rem",
                                color: "text.disabled",
                              }}
                            >
                              PENDING
                            </Typography>
                          )}
                        </TableCell>

                        {/* Chevron */}
                        <TableCell align="center">
                          <ChevronRightIcon
                            sx={{ fontSize: 18, color: "text.secondary" }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        <ClassAttendanceDialog
          open={!!selectedClassId}
          onClose={() => setSelectedClassId(null)}
          classData={classDetail}
          date={todayStr}
          mode="management"
        />
      </Box>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  //  💻 DESKTOP EXCLUSIVE VIEW (Full Dashboard)
  // ═══════════════════════════════════════════════════════════════════
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          fontWeight={900}
          sx={{ letterSpacing: "-0.02em", fontSize: "1.8rem" }}
        >
          Attendance Overview
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Monitor school attendance, coverage and absence across all classes.
        </Typography>
      </Box>

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Stack direction="row" spacing={1}>
          {rangeLabels.map((r) => (
            <Chip
              key={r.val}
              label={r.label}
              onClick={() => setRangeType(r.val)}
              variant={rangeType === r.val ? "filled" : "outlined"}
              sx={{
                fontWeight: rangeType === r.val ? 800 : 600,
                borderRadius: 2,
                height: 30,
                bgcolor: rangeType === r.val ? "primary.main" : "transparent",
                color: rangeType === r.val ? "white" : "text.primary",
                "&:hover": {
                  bgcolor:
                    rangeType === r.val ? "primary.dark" : "action.hover",
                },
              }}
            />
          ))}
        </Stack>
        <Stack direction="row" spacing={1}>
          {["ALL", "PRE PRIMARY", "PRIMARY", "MIDDLE", "SENIOR"].map((g) => (
            <Chip
              key={g}
              label={g}
              onClick={() => setGroup(g)}
              variant={group === g ? "filled" : "outlined"}
              sx={{
                fontWeight: group === g ? 800 : 600,
                borderRadius: 2,
                height: 30,
                fontSize: "0.7rem",
                bgcolor:
                  group === g
                    ? isDark
                      ? "#5B21B6"
                      : "#6D28D9"
                    : "transparent",
                color: group === g ? "white" : "text.secondary",
                borderColor: group === g ? "transparent" : "divider",
              }}
            />
          ))}
        </Stack>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <KpiCard
          title="Attendance Rate"
          value={`${kpis.attendanceRate.value}%`}
          subtext={`vs prior ${currentRangeLabel.toLowerCase()}`}
          delta={kpis.attendanceRate.delta}
          icon={<ShowChartIcon fontSize="small" />}
          color="#6D28D9"
          sparkline={kpis.attendanceRate.sparkline}
          isDark={isDark}
        />
        <KpiCard
          title="Coverage"
          value={`${kpis.coverage.value}%`}
          subtext="Students marked in range"
          delta={kpis.coverage.delta}
          icon={<EventNoteIcon fontSize="small" />}
          color="#2563EB"
          sparkline={kpis.coverage.sparkline}
          isDark={isDark}
        />
        <KpiCard
          title="Absent Rate"
          value={`${kpis.absentRate.value}%`}
          subtext="Days marked absent"
          delta={kpis.absentRate.delta}
          icon={<PeopleIcon fontSize="small" />}
          color="#DC2626"
          sparkline={kpis.absentRate.sparkline}
          isDark={isDark}
          invertGood
        />
      </Stack>

      {(attention.pending > 0 || attention.low > 0) && (
        <Paper
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 3,
            border: "1px solid",
            borderColor: alpha("#F59E0B", 0.4),
            bgcolor: isDark ? alpha("#F59E0B", 0.08) : "#FFFBEB",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <WarningAmberIcon sx={{ color: "#F59E0B" }} />
            <Box>
              <Typography
                variant="body2"
                fontWeight={800}
                sx={{ color: isDark ? "#FCD34D" : "#B45309" }}
              >
                Attention Required Today
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {attention.pending > 0 &&
                  `${attention.pending} classes pending. `}
                {attention.low > 0 && `${attention.low} classes below 75%.`}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      )}

      {/* ═══════════════════════════════════════════
          📋 DESKTOP TODAY CLASS-WISE TABLE
      ═══════════════════════════════════════════ */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6" fontWeight={800} sx={{ fontSize: "1rem" }}>
              Today's Class-wise Attendance
            </Typography>
            <Chip
              label={`${todayClassWise.length} classes`}
              size="small"
              sx={{ fontWeight: 700, height: 22, fontSize: "0.65rem" }}
            />
          </Stack>
        </Box>

        {todayClassWise.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              No classes found
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 500 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headSx(isDark)}>Class & Teacher</TableCell>
                  <TableCell
                    align="center"
                    sx={{ ...headSx(isDark), width: 70 }}
                  >
                    Std
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      ...headSx(isDark),
                      width: 70,
                      color: "#16A34A !important",
                    }}
                  >
                    P
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      ...headSx(isDark),
                      width: 70,
                      color: "#DC2626 !important",
                    }}
                  >
                    A
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ ...headSx(isDark), width: 160 }}
                  >
                    Attendance
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ ...headSx(isDark), width: 50 }}
                  >
                    View
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {todayClassWise.map((cls) => {
                  const config =
                    STATUS_CONFIG[cls.status] || STATUS_CONFIG.notMarked;
                  return (
                    <TableRow
                      key={cls._id}
                      hover
                      onClick={() => setSelectedClassId(cls._id)}
                      sx={{
                        cursor: "pointer",
                        "& td": { py: 1.15, borderColor: "divider" },
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
                          sx={{ fontSize: "0.86rem" }}
                        >
                          {cls.label}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: "0.68rem",
                            fontWeight: 600,
                            color: cls.teacherLabel
                              ? "text.secondary"
                              : "text.disabled",
                            textTransform: "uppercase",
                            letterSpacing: "0.03em",
                            display: "block",
                          }}
                        >
                          {cls.teacherLabel
                            ? cls.teacherLabel.toUpperCase()
                            : "No teacher"}
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 34,
                            height: 28,
                            borderRadius: 1.5,
                            bgcolor: isDark ? alpha("#fff", 0.05) : "#F1F5F9",
                            color: "text.primary",
                            fontWeight: 800,
                            fontSize: "0.9rem",
                          }}
                        >
                          {cls.totalStudents}
                        </Box>
                      </TableCell>

                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 34,
                            height: 28,
                            borderRadius: 1.5,
                            bgcolor: cls.isMarked
                              ? isDark
                                ? alpha("#16A34A", 0.15)
                                : "#DCFCE7"
                              : "transparent",
                            color: cls.isMarked ? "#16A34A" : "text.disabled",
                            fontWeight: 800,
                            fontSize: "0.9rem",
                          }}
                        >
                          {cls.isMarked ? cls.present : "—"}
                        </Box>
                      </TableCell>

                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 34,
                            height: 28,
                            borderRadius: 1.5,
                            bgcolor: cls.isMarked
                              ? isDark
                                ? alpha("#DC2626", 0.15)
                                : "#FEE2E2"
                              : "transparent",
                            color: cls.isMarked ? "#DC2626" : "text.disabled",
                            fontWeight: 800,
                            fontSize: "0.9rem",
                          }}
                        >
                          {cls.isMarked ? cls.absent : "—"}
                        </Box>
                      </TableCell>

                      <TableCell align="center">
                        {cls.isMarked ? (
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1.5}
                            justifyContent="center"
                          >
                            <Typography
                              variant="body2"
                              fontWeight={900}
                              sx={{
                                fontSize: "0.95rem",
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
                                height: 6,
                                borderRadius: 3,
                                bgcolor: isDark
                                  ? alpha("#fff", 0.08)
                                  : alpha("#000", 0.06),
                                "& .MuiLinearProgress-bar": {
                                  bgcolor: config.dot,
                                  borderRadius: 3,
                                },
                              }}
                            />
                          </Stack>
                        ) : (
                          <Chip
                            label="Pending"
                            size="small"
                            sx={{
                              height: 24,
                              fontSize: "0.68rem",
                              fontWeight: 800,
                              bgcolor: isDark
                                ? alpha("#F59E0B", 0.15)
                                : "#FEF3C7",
                              color: isDark ? "#FCD34D" : "#B45309",
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          sx={{ color: "text.secondary" }}
                        >
                          <ChevronRightIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* ═══════════════════════════════════════════
          📈 TREND CHART
      ═══════════════════════════════════════════ */}
      {trend.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Box>
              <Typography
                variant="h6"
                fontWeight={800}
                sx={{ fontSize: "1rem" }}
              >
                Attendance Trend
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Daily attendance % · {currentRangeLabel}
              </Typography>
            </Box>
          </Stack>
          <Box sx={{ height: 300, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trend}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="trendGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={isDark ? "#334155" : "#E2E8F0"}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                />
                <RechartsTooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "none",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                    fontWeight: 700,
                  }}
                  itemStyle={{ color: "#2563EB" }}
                />
                <Line
                  type="monotone"
                  dataKey="percentage"
                  name="Attendance %"
                  stroke="#2563EB"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    fill: theme.palette.background.paper,
                    strokeWidth: 2,
                    stroke: "#2563EB",
                  }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      )}

      {/* Dialog */}
      <ClassAttendanceDialog
        open={!!selectedClassId}
        onClose={() => setSelectedClassId(null)}
        classData={classDetail}
        date={todayStr}
        mode="management"
      />
    </Box>
  );
};

export default TodayPage;
