import React, { useState, useEffect, useCallback, memo } from "react";
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
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  AreaChart,
  Area,
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
} from "recharts";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined";
import TrendingFlatOutlinedIcon from "@mui/icons-material/TrendingFlatOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import DateRangeOutlinedIcon from "@mui/icons-material/DateRangeOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import PieChartOutlinedIcon from "@mui/icons-material/PieChartOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import PageHeader from "../../components/common/PageHeader";
import analyticsApi from "../../api/analyticsApi";

const CHART_COLORS = {
  present: "#16A34A",
  absent: "#DC2626",
  primary: "#1565C0",
  warning: "#D97706",
  line: "#1E4D98",
};

const getTrendIndicator = (direction) => {
  if (direction === "up")
    return { icon: TrendingUpOutlinedIcon, color: "success.main" };
  if (direction === "down")
    return { icon: TrendingDownOutlinedIcon, color: "error.main" };
  return { icon: TrendingFlatOutlinedIcon, color: "text.secondary" };
};

const QuickStatCard = memo(({ icon: Icon, label, value, period, colorKey }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const color = theme.palette[colorKey];
  const bgColor = alpha(color.main, isDark ? 0.15 : 0.08);

  return (
    <Card sx={{ height: "100%", borderRadius: 2.5 }}>
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar
            sx={{
              width: 44,
              height: 44,
              bgcolor: bgColor,
              flexShrink: 0,
            }}
          >
            <Icon sx={{ color: color.main, fontSize: 22 }} />
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
              sx={{ color: color.main, lineHeight: 1, mt: 0.3 }}
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
});
QuickStatCard.displayName = "QuickStatCard";

const CustomTooltip = memo(({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Paper
      sx={{
        p: 1.5,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        boxShadow: 3,
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
});
CustomTooltip.displayName = "CustomTooltip";

const AnalyticsDashboard = () => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
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

  const gridStroke = isDark ? "#374151" : "#E2E8F0";
  const axisTickColor = isDark ? "#9CA3AF" : "#6B7B99";
  const successBg = alpha(theme.palette.success.main, isDark ? 0.15 : 0.08);
  const errorBg = alpha(theme.palette.error.main, isDark ? 0.15 : 0.08);
  const defaulterHoverBg = alpha(theme.palette.error.main, 0.06);

  const pieFill = [
    isDark ? "#4ADE80" : "#16A34A",
    isDark ? "#F87171" : "#DC2626",
  ];

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
            startIcon={<RefreshOutlinedIcon />}
            onClick={triggerRefresh}
            size="small"
          >
            Refresh
          </Button>
        }
      />

      {/* QUICK STATS */}
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <QuickStatCard
            icon={CalendarTodayOutlinedIcon}
            label="Today"
            value={quickStats?.today?.percentage ?? null}
            period={`${quickStats?.today?.present || 0}P / ${quickStats?.today?.absent || 0}A`}
            colorKey="primary"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <QuickStatCard
            icon={DateRangeOutlinedIcon}
            label="This Week"
            value={quickStats?.week?.percentage ?? null}
            period={`${quickStats?.week?.total || 0} marks`}
            colorKey="info"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <QuickStatCard
            icon={CalendarMonthOutlinedIcon}
            label="This Month"
            value={quickStats?.month?.percentage ?? null}
            period={`${quickStats?.month?.total || 0} marks`}
            colorKey="success"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <QuickStatCard
            icon={EventNoteOutlinedIcon}
            label="This Year"
            value={quickStats?.year?.percentage ?? null}
            period={`${quickStats?.year?.total || 0} marks`}
            colorKey="warning"
          />
        </Grid>
      </Grid>

      {/* INSIGHTS ROW */}
      {insights && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {insights.comparedToLastMonth &&
            (() => {
              const trendIndicator = getTrendIndicator(
                insights.comparedToLastMonth.direction,
              );
              const TrendIcon = trendIndicator.icon;
              return (
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
                        <TrendIcon
                          sx={{ color: trendIndicator.color, fontSize: 28 }}
                        />
                        <Box>
                          <Typography
                            variant="h5"
                            fontWeight={900}
                            sx={{ color: trendIndicator.color, lineHeight: 1 }}
                          >
                            {insights.comparedToLastMonth.difference > 0
                              ? "+"
                              : ""}
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
              );
            })()}

          {insights.bestClass && (
            <Grid item xs={6} sm={4}>
              <Card
                sx={{
                  borderRadius: 2.5,
                  height: "100%",
                  bgcolor: successBg,
                  border: "1px solid",
                  borderColor: alpha(theme.palette.success.main, 0.3),
                }}
              >
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ mb: 1 }}
                  >
                    <EmojiEventsOutlinedIcon
                      sx={{ color: "success.main", fontSize: 20 }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        textTransform: "uppercase",
                        fontSize: "0.65rem",
                        color: "success.main",
                      }}
                    >
                      Best Class
                    </Typography>
                  </Stack>
                  <Typography
                    variant="h6"
                    fontWeight={900}
                    color="success.main"
                  >
                    {insights.bestClass.name}
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    {insights.bestClass.percentage}% attendance
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

          {insights.worstClass &&
            insights.worstClass._id !== insights.bestClass?._id && (
              <Grid item xs={6} sm={4}>
                <Card
                  sx={{
                    borderRadius: 2.5,
                    height: "100%",
                    bgcolor: errorBg,
                    border: "1px solid",
                    borderColor: alpha(theme.palette.error.main, 0.3),
                  }}
                >
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ mb: 1 }}
                    >
                      <WarningAmberOutlinedIcon
                        sx={{ color: "error.main", fontSize: 20 }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          textTransform: "uppercase",
                          fontSize: "0.65rem",
                          color: "error.main",
                        }}
                      >
                        Needs Attention
                      </Typography>
                    </Stack>
                    <Typography
                      variant="h6"
                      fontWeight={900}
                      color="error.main"
                    >
                      {insights.worstClass.name}
                    </Typography>
                    <Typography variant="caption" color="error.main">
                      {insights.worstClass.percentage}% attendance
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
        </Grid>
      )}

      {/* TREND + PIE */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, borderRadius: 3, height: "100%" }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 2 }}
            >
              <TrendingUpOutlinedIcon sx={{ color: "primary.main" }} />
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
                        stopOpacity={isDark ? 0.4 : 0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={CHART_COLORS.line}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis
                    dataKey="displayDate"
                    tick={{ fontSize: 10, fill: axisTickColor }}
                    interval={isMobile ? 4 : 2}
                    stroke={gridStroke}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: axisTickColor }}
                    tickFormatter={(v) => `${v}%`}
                    stroke={gridStroke}
                  />
                  <RechartsTooltip
                    content={<CustomTooltip />}
                    cursor={{
                      stroke: alpha(CHART_COLORS.line, 0.3),
                      strokeWidth: 1,
                    }}
                  />
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
                      fill: isDark ? "#1F2937" : "white",
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ py: 8, textAlign: "center" }}>
                <TrendingUpOutlinedIcon
                  sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  No attendance data for trend chart
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, borderRadius: 3, height: "100%" }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 2 }}
            >
              <PieChartOutlinedIcon sx={{ color: "primary.main" }} />
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
                      {pieFill.map((color, idx) => (
                        <Cell key={idx} fill={color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
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
                        bgcolor: pieFill[0],
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
                        bgcolor: pieFill[1],
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
                <PieChartOutlinedIcon
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

      {/* CLASS COMPARISON BAR CHART */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <BarChartOutlinedIcon sx={{ color: "primary.main" }} />
          <Typography variant="subtitle1" fontWeight={800}>
            Class-Wise Comparison (This Month)
          </Typography>
        </Stack>

        {hasClassData ? (
          <>
            <ResponsiveContainer width="100%" height={isMobile ? 220 : 300}>
              <BarChart
                data={classComparison}
                margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: axisTickColor }}
                  interval={0}
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? "end" : "middle"}
                  height={isMobile ? 60 : 30}
                  stroke={gridStroke}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: axisTickColor }}
                  stroke={gridStroke}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar
                  dataKey="present"
                  name="Present"
                  fill={pieFill[0]}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="absent"
                  name="Absent"
                  fill={pieFill[1]}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={1}>
              {classComparison.map((cls) => {
                const perfColor =
                  cls.percentage >= 75
                    ? "success"
                    : cls.percentage >= 50
                      ? "warning"
                      : "error";
                return (
                  <Grid item xs={6} sm={4} md={3} key={cls._id}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        borderLeft: "3px solid",
                        borderLeftColor: `${perfColor}.main`,
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
                          color={`${perfColor}.main`}
                        >
                          {cls.percentage}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={cls.percentage}
                        color={perfColor}
                        sx={{ borderRadius: 4, height: 4, mt: 0.5 }}
                      />
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </>
        ) : (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <BarChartOutlinedIcon
              sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              No class data available
            </Typography>
          </Box>
        )}
      </Paper>

      {/* TOP DEFAULTERS */}
      <Paper sx={{ p: 2, borderRadius: 3 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <WarningAmberOutlinedIcon sx={{ color: "warning.main" }} />
            <Typography variant="subtitle1" fontWeight={800}>
              Top Defaulters (This Month)
            </Typography>
          </Stack>
          {hasDefaulters && (
            <Button
              size="small"
              onClick={() => navigate("/reports/defaulters")}
              endIcon={<VisibilityOutlinedIcon />}
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
                  transition: "all 0.15s",
                  "&:hover": {
                    bgcolor: defaulterHoverBg,
                    transform: "translateX(2px)",
                  },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor:
                        idx < 3
                          ? alpha(theme.palette.error.main, 0.8)
                          : alpha(theme.palette.error.main, 0.4),
                      color: "white",
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
                        {formatScholarNo(s)}
                      </Typography>
                      {s.class && (
                        <Chip
                          label={`${s.class.name}-${s.class.section}`}
                          size="small"
                          variant="outlined"
                          sx={{
                            height: 18,
                            fontSize: "0.65rem",
                            fontWeight: 700,
                          }}
                        />
                      )}
                    </Stack>
                  </Box>
                  <Stack alignItems="flex-end">
                    <Typography
                      variant="h6"
                      fontWeight={900}
                      color="error.main"
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
            <EmojiEventsOutlinedIcon
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
