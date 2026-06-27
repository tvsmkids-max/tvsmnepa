import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Paper,
  Grid,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  Avatar,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  Button,
  useMediaQuery,
  useTheme,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import DateRangeIcon from "@mui/icons-material/DateRange";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EventNoteIcon from "@mui/icons-material/EventNote";
import SchoolIcon from "@mui/icons-material/School";
import WarningIcon from "@mui/icons-material/Warning";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import BarChartIcon from "@mui/icons-material/BarChart";
import PieChartIcon from "@mui/icons-material/PieChart";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import analyticsApi from "../../api/analyticsApi";

const CHART_COLORS = {
  present: "#2E7D32",
  absent: "#C62828",
  primary: "#1565C0",
  warning: "#F57F17",
  line: "#1E4D98",
  area: "#E0EBFF",
};

const PIE_COLORS = ["#2E7D32", "#C62828"];

const AnalyticsDashboard = () => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [quickStats, setQuickStats] = useState(null);
  const [trend, setTrend] = useState([]);
  const [classComparison, setClassComparison] = useState([]);
  const [distribution, setDistribution] = useState(null);
  const [defaulters, setDefaulters] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      setLoading(true);
      try {
        const [qs, tr, cc, dist, def, ins] = await Promise.all([
          analyticsApi.getQuickStats().catch(() => ({ data: { data: null } })),
          analyticsApi.getTrend(30).catch(() => ({ data: { data: [] } })),
          analyticsApi
            .getClassComparison()
            .catch(() => ({ data: { data: [] } })),
          analyticsApi
            .getDistribution()
            .catch(() => ({ data: { data: null } })),
          analyticsApi
            .getTopDefaulters(10)
            .catch(() => ({ data: { data: [] } })),
          analyticsApi.getInsights().catch(() => ({ data: { data: null } })),
        ]);

        if (!cancelled) {
          setQuickStats(qs.data?.data);
          setTrend(tr.data?.data || []);
          setClassComparison(cc.data?.data || []);
          setDistribution(dist.data?.data);
          setDefaulters(def.data?.data || []);
          setInsights(ins.data?.data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };

    loadAll();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Get trend icon + color
  const getTrendIndicator = (direction) => {
    if (direction === "up") {
      return {
        icon: <TrendingUpIcon sx={{ fontSize: 18 }} />,
        color: "success.main",
        label: "Up",
      };
    }
    if (direction === "down") {
      return {
        icon: <TrendingDownIcon sx={{ fontSize: 18 }} />,
        color: "error.main",
        label: "Down",
      };
    }
    return {
      icon: <TrendingFlatIcon sx={{ fontSize: 18 }} />,
      color: "text.secondary",
      label: "Same",
    };
  };

  // Stat card at top
  const QuickStatCard = ({ icon, label, value, period, color }) => (
    <Card sx={{ height: "100%", borderRadius: 2.5 }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar
            sx={{
              width: 44,
              height: 44,
              bgcolor: `${color}.light`,
              flexShrink: 0,
            }}
          >
            {React.cloneElement(icon, {
              sx: { color: `${color}.dark`, fontSize: 22 },
            })}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontSize: "0.65rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {label}
            </Typography>
            <Typography
              variant="h5"
              fontWeight={900}
              color={`${color}.main`}
              sx={{ lineHeight: 1, mt: 0.3 }}
            >
              {value !== null ? `${value}%` : "—"}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: "0.68rem" }}
            >
              {period}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  // Custom tooltip for recharts
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <Paper
        sx={{
          p: 1.5,
          borderRadius: 2,
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography
          variant="caption"
          fontWeight={700}
          sx={{ display: "block", mb: 0.5 }}
        >
          {label}
        </Typography>
        {payload.map((p, i) => (
          <Typography
            key={i}
            variant="caption"
            sx={{ display: "block", color: p.color }}
          >
            {p.name}: <strong>{p.value}</strong>
          </Typography>
        ))}
      </Paper>
    );
  };

  if (loading) {
    return (
      <Box>
        <PageHeader title="Analytics" subtitle="Loading insights..." />
        <Paper sx={{ p: 8, textAlign: "center", borderRadius: 3 }}>
          <CircularProgress />
        </Paper>
      </Box>
    );
  }

  const trendWithData = trend.filter((t) => t.total > 0);
  const hasTrend = trendWithData.length > 0;
  const hasClassData = classComparison.length > 0;
  const hasDistribution = distribution && distribution.total > 0;
  const hasDefaulters = defaulters.length > 0;

  return (
    <Box sx={{ pb: { xs: 10, md: 4 } }}>
      <PageHeader
        title="Analytics"
        subtitle="Attendance insights & trends"
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Analytics" },
        ]}
        action={
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={triggerRefresh}
            size="small"
          >
            Refresh
          </Button>
        }
      />

      {/* ═══════ QUICK STATS BAR ═══════ */}
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <QuickStatCard
            icon={<CalendarTodayIcon />}
            label="Today"
            value={quickStats?.today?.percentage ?? null}
            period={`${quickStats?.today?.present || 0}P / ${quickStats?.today?.absent || 0}A`}
            color="primary"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <QuickStatCard
            icon={<DateRangeIcon />}
            label="This Week"
            value={quickStats?.week?.percentage ?? null}
            period={`${quickStats?.week?.total || 0} marks`}
            color="info"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <QuickStatCard
            icon={<CalendarMonthIcon />}
            label="This Month"
            value={quickStats?.month?.percentage ?? null}
            period={`${quickStats?.month?.total || 0} marks`}
            color="success"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <QuickStatCard
            icon={<EventNoteIcon />}
            label="This Year"
            value={quickStats?.year?.percentage ?? null}
            period={`${quickStats?.year?.total || 0} marks`}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* ═══════ INSIGHTS ROW ═══════ */}
      {insights && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Month Trend Card */}
          {insights.comparedToLastMonth && (
            <Grid item xs={12} sm={4}>
              <Card sx={{ borderRadius: 2.5, height: "100%" }}>
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontWeight: 700,
                      textTransform: "uppercase",
                      fontSize: "0.65rem",
                    }}
                  >
                    vs Last Month
                  </Typography>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ mt: 1 }}
                  >
                    {React.cloneElement(
                      getTrendIndicator(insights.comparedToLastMonth.direction)
                        .icon,
                      {
                        sx: {
                          color: getTrendIndicator(
                            insights.comparedToLastMonth.direction,
                          ).color,
                          fontSize: 28,
                        },
                      },
                    )}
                    <Box>
                      <Typography
                        variant="h5"
                        fontWeight={900}
                        sx={{
                          color: getTrendIndicator(
                            insights.comparedToLastMonth.direction,
                          ).color,
                          lineHeight: 1,
                        }}
                      >
                        {insights.comparedToLastMonth.difference > 0 ? "+" : ""}
                        {insights.comparedToLastMonth.difference}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {insights.comparedToLastMonth.currentMonth}% vs{" "}
                        {insights.comparedToLastMonth.lastMonth}%
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Best Class */}
          {insights.bestClass && (
            <Grid item xs={6} sm={4}>
              <Card
                sx={{
                  borderRadius: 2.5,
                  height: "100%",
                  bgcolor: "#E6F4EA",
                  border: "1px solid",
                  borderColor: "success.light",
                }}
              >
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ mb: 1 }}
                  >
                    <EmojiEventsIcon
                      sx={{ color: "success.dark", fontSize: 20 }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        textTransform: "uppercase",
                        fontSize: "0.65rem",
                        color: "success.dark",
                      }}
                    >
                      Best Class
                    </Typography>
                  </Stack>
                  <Typography
                    variant="h6"
                    fontWeight={900}
                    color="success.dark"
                  >
                    {insights.bestClass.name}
                  </Typography>
                  <Typography variant="caption" color="success.dark">
                    {insights.bestClass.percentage}% attendance
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Worst Class */}
          {insights.worstClass &&
            insights.worstClass._id !== insights.bestClass?._id && (
              <Grid item xs={6} sm={4}>
                <Card
                  sx={{
                    borderRadius: 2.5,
                    height: "100%",
                    bgcolor: "#FEE2E2",
                    border: "1px solid",
                    borderColor: "error.light",
                  }}
                >
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ mb: 1 }}
                    >
                      <WarningIcon sx={{ color: "error.dark", fontSize: 20 }} />
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          textTransform: "uppercase",
                          fontSize: "0.65rem",
                          color: "error.dark",
                        }}
                      >
                        Needs Attention
                      </Typography>
                    </Stack>
                    <Typography
                      variant="h6"
                      fontWeight={900}
                      color="error.dark"
                    >
                      {insights.worstClass.name}
                    </Typography>
                    <Typography variant="caption" color="error.dark">
                      {insights.worstClass.percentage}% attendance
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
        </Grid>
      )}

      {/* ═══════ TREND LINE CHART + PIE CHART ═══════ */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Trend Line */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, borderRadius: 3, height: "100%" }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 2 }}
            >
              <TrendingUpIcon sx={{ color: "primary.main" }} />
              <Typography variant="subtitle1" fontWeight={800}>
                Attendance Trend (Last 30 Days)
              </Typography>
            </Stack>

            {hasTrend ? (
              <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                <AreaChart
                  data={trendWithData}
                  margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
                >
                  <defs>
                    <linearGradient
                      id="trendGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={CHART_COLORS.line}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={CHART_COLORS.line}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 10, fill: "#6B7B99" }}
                    interval={isMobile ? 4 : 2}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "#6B7B99" }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="percentage"
                    name="Attendance %"
                    stroke={CHART_COLORS.line}
                    strokeWidth={2.5}
                    fill="url(#trendGradient)"
                    dot={{ r: 3, fill: CHART_COLORS.line }}
                    activeDot={{
                      r: 6,
                      stroke: CHART_COLORS.line,
                      strokeWidth: 2,
                      fill: "white",
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ py: 8, textAlign: "center" }}>
                <TrendingUpIcon
                  sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  No attendance data for trend chart
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Pie Chart */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, borderRadius: 3, height: "100%" }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 2 }}
            >
              <PieChartIcon sx={{ color: "primary.main" }} />
              <Typography variant="subtitle1" fontWeight={800}>
                This Month
              </Typography>
            </Stack>

            {hasDistribution ? (
              <>
                <ResponsiveContainer width="100%" height={isMobile ? 180 : 200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Present", value: distribution.present },
                        { name: "Absent", value: distribution.absent },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={isMobile ? 40 : 55}
                      outerRadius={isMobile ? 65 : 80}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {PIE_COLORS.map((color, idx) => (
                        <Cell key={idx} fill={color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>

                <Stack
                  direction="row"
                  spacing={3}
                  justifyContent="center"
                  sx={{ mt: 1 }}
                >
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        bgcolor: CHART_COLORS.present,
                      }}
                    />
                    <Typography variant="caption" fontWeight={700}>
                      Present: {distribution.present}
                    </Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        bgcolor: CHART_COLORS.absent,
                      }}
                    />
                    <Typography variant="caption" fontWeight={700}>
                      Absent: {distribution.absent}
                    </Typography>
                  </Stack>
                </Stack>
              </>
            ) : (
              <Box sx={{ py: 6, textAlign: "center" }}>
                <PieChartIcon
                  sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  No data for this month
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* ═══════ CLASS COMPARISON BAR CHART ═══════ */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <BarChartIcon sx={{ color: "primary.main" }} />
          <Typography variant="subtitle1" fontWeight={800}>
            Class-Wise Comparison (This Month)
          </Typography>
        </Stack>

        {hasClassData ? (
          <ResponsiveContainer width="100%" height={isMobile ? 220 : 300}>
            <BarChart
              data={classComparison}
              margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#6B7B99" }}
                interval={0}
                angle={isMobile ? -45 : 0}
                textAnchor={isMobile ? "end" : "middle"}
                height={isMobile ? 60 : 30}
              />
              <YAxis tick={{ fontSize: 10, fill: "#6B7B99" }} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Bar
                dataKey="present"
                name="Present"
                fill={CHART_COLORS.present}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="absent"
                name="Absent"
                fill={CHART_COLORS.absent}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <BarChartIcon
              sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              No class data available
            </Typography>
          </Box>
        )}

        {/* Class performance cards below chart */}
        {hasClassData && (
          <>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={1}>
              {classComparison.map((cls) => (
                <Grid item xs={6} sm={4} md={3} key={cls._id}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      borderLeft: "3px solid",
                      borderLeftColor:
                        cls.percentage >= 75
                          ? "success.main"
                          : cls.percentage >= 50
                            ? "warning.main"
                            : "error.main",
                    }}
                  >
                    <Typography variant="body2" fontWeight={800} noWrap>
                      {cls.name}
                    </Typography>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="caption" color="text.secondary">
                        {cls.students} students
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={900}
                        color={
                          cls.percentage >= 75
                            ? "success.dark"
                            : cls.percentage >= 50
                              ? "warning.dark"
                              : "error.dark"
                        }
                      >
                        {cls.percentage}%
                      </Typography>
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
                      sx={{ borderRadius: 4, height: 4, mt: 0.5 }}
                    />
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Paper>

      {/* ═══════ TOP DEFAULTERS ═══════ */}
      <Paper sx={{ p: 2, borderRadius: 3 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <WarningIcon sx={{ color: "warning.main" }} />
            <Typography variant="subtitle1" fontWeight={800}>
              Top Defaulters (This Month)
            </Typography>
          </Stack>
          {hasDefaulters && (
            <Button
              size="small"
              onClick={() => navigate("/reports")}
              endIcon={<VisibilityIcon />}
            >
              Full Report
            </Button>
          )}
        </Stack>

        {hasDefaulters ? (
          <Stack spacing={1}>
            {defaulters.map((s, idx) => (
              <Paper
                key={s._id}
                variant="outlined"
                onClick={() => navigate(`/students/${s._id}`)}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  borderLeft: "3px solid",
                  borderLeftColor: "error.main",
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: "#FEF2F2",
                    transform: "translateX(2px)",
                  },
                  transition: "all 0.15s",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: idx < 3 ? "error.main" : "error.light",
                      fontSize: "0.85rem",
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {s.name}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={0.8}
                      alignItems="center"
                      flexWrap="wrap"
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}
                      >
                        {s.scholarNumber}
                      </Typography>
                      {s.class && (
                        <Chip
                          label={`${s.class.name}-${s.class.section}`}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            bgcolor: "#F1F3F9",
                          }}
                        />
                      )}
                    </Stack>
                  </Box>
                  <Stack alignItems="flex-end">
                    <Typography
                      variant="h6"
                      fontWeight={900}
                      color="error.dark"
                      sx={{ lineHeight: 1 }}
                    >
                      {s.percentage}%
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: "0.65rem" }}
                    >
                      {s.present}P / {s.absent}A
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        ) : (
          <Box sx={{ py: 5, textAlign: "center" }}>
            <EmojiEventsIcon
              sx={{ fontSize: 48, color: "success.main", mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              All students are above threshold!
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default AnalyticsDashboard;
