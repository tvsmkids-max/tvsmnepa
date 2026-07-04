import React from "react";
import {
  Box,
  Paper,
  Grid,
  Stack,
  Typography,
  Skeleton,
  Alert,
  useTheme,
  useMediaQuery,
  alpha,
} from "@mui/material";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";

import StatCard from "../components/StatCard";
import { useMonthlyTrends } from "../../../hooks/useManagement";

const MonthlyPage = ({ secretKey }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { data, isLoading } = useMonthlyTrends(secretKey);

  if (isLoading) {
    return (
      <Stack spacing={2}>
        <Grid container spacing={1.2}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={6} sm={3} key={i}>
              <Skeleton
                variant="rectangular"
                height={90}
                sx={{ borderRadius: 2 }}
              />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
      </Stack>
    );
  }

  if (!data || !data.trend?.length) {
    return (
      <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No monthly data available yet
        </Typography>
      </Paper>
    );
  }

  const { stats, trend, weeks, dayOfWeek, insights, month } = data;

  return (
    <Stack spacing={2}>
      {/* Month Label */}
      <Typography
        variant="h6"
        fontWeight={800}
        sx={{ color: "text.primary", fontSize: { xs: "1rem", sm: "1.2rem" } }}
      >
        📈 {month}
      </Typography>

      {/* KPIs */}
      <Grid container spacing={1.2}>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Working Days"
            value={stats.workingDays || 0}
            icon={CalendarTodayOutlinedIcon}
            color="primary"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Avg Attendance"
            value={`${stats.monthAvg || 0}%`}
            icon={PercentOutlinedIcon}
            color={
              stats.monthAvg >= 90
                ? "success"
                : stats.monthAvg >= 75
                  ? "warning"
                  : "error"
            }
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="vs Last Month"
            value={`${stats.vsLastMonth > 0 ? "+" : ""}${stats.vsLastMonth || 0}%`}
            icon={TrendingUpOutlinedIcon}
            color={stats.vsLastMonth >= 0 ? "success" : "error"}
            subtitle={`Prev: ${stats.prevAvg || 0}%`}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Best Day"
            value={`${stats.bestDayPct || 0}%`}
            icon={EmojiEventsOutlinedIcon}
            color="info"
          />
        </Grid>
      </Grid>

      {/* Daily Trend */}
      <Paper
        sx={{
          p: { xs: 1.5, sm: 2 },
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography
          variant="subtitle2"
          fontWeight={800}
          sx={{ mb: 1.5, fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
        >
          📈 Daily Trend
        </Typography>
        <Box sx={{ height: { xs: 200, sm: 240 } }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trend}
              margin={{ top: 5, right: 15, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? "#334155" : "#E2E8F0"}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: theme.palette.text.secondary }}
                interval={Math.max(
                  0,
                  Math.floor(trend.length / (isMobile ? 5 : 8)),
                )}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 9, fill: theme.palette.text.secondary }}
                width={30}
              />
              <RechartsTooltip
                contentStyle={{
                  background: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v) => [`${v}%`, "Attendance"]}
              />
              <Line
                type="monotone"
                dataKey="percentage"
                stroke={isDark ? "#93C5FD" : "#1E4D98"}
                strokeWidth={2.5}
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      {/* Week + Day-of-week (stacked on mobile) */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              height: "100%",
            }}
          >
            <Typography
              variant="subtitle2"
              fontWeight={800}
              sx={{ mb: 1.5, fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
            >
              📊 Week-by-Week
            </Typography>
            <Box sx={{ height: { xs: 180, sm: 220 } }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weeks}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#334155" : "#E2E8F0"}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9, fill: theme.palette.text.secondary }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 9, fill: theme.palette.text.secondary }}
                    width={30}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v) => [`${v}%`, "Avg"]}
                  />
                  <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                    {weeks.map((w, i) => (
                      <Cell
                        key={i}
                        fill={
                          w.percentage >= 90
                            ? "#16A34A"
                            : w.percentage >= 75
                              ? "#F59E0B"
                              : "#DC2626"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              height: "100%",
            }}
          >
            <Typography
              variant="subtitle2"
              fontWeight={800}
              sx={{ mb: 1.5, fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
            >
              📆 Day-of-Week Pattern
            </Typography>
            <Box sx={{ height: { xs: 180, sm: 220 } }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dayOfWeek.filter((d) => d.hasData)}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#334155" : "#E2E8F0"}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 9, fill: theme.palette.text.secondary }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 9, fill: theme.palette.text.secondary }}
                    width={30}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v) => [`${v}%`, "Average"]}
                  />
                  <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                    {dayOfWeek
                      .filter((d) => d.hasData)
                      .map((d, i) => (
                        <Cell
                          key={i}
                          fill={
                            d.percentage >= 90
                              ? "#16A34A"
                              : d.percentage >= 75
                                ? "#F59E0B"
                                : "#DC2626"
                          }
                        />
                      ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Insights */}
      {insights && (
        <Paper
          sx={{
            p: { xs: 1.5, sm: 2 },
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ mb: 1.5 }}
          >
            <InsightsOutlinedIcon
              sx={{ fontSize: 18, color: "primary.main" }}
            />
            <Typography
              variant="subtitle2"
              fontWeight={800}
              sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
            >
              🎯 Key Insights
            </Typography>
          </Stack>
          <Grid container spacing={1.5}>
            {insights.bestDay && (
              <Grid item xs={12} sm={6}>
                <Alert
                  severity="success"
                  sx={{
                    borderRadius: 1.5,
                    py: 0.5,
                    "& .MuiAlert-message": { fontSize: "0.72rem" },
                  }}
                >
                  <Typography variant="caption" fontWeight={700}>
                    ⭐ Best Day: {insights.bestDay.label} (
                    {insights.bestDay.percentage}%)
                  </Typography>
                </Alert>
              </Grid>
            )}
            {insights.worstDay && (
              <Grid item xs={12} sm={6}>
                <Alert
                  severity="warning"
                  sx={{
                    borderRadius: 1.5,
                    py: 0.5,
                    "& .MuiAlert-message": { fontSize: "0.72rem" },
                  }}
                >
                  <Typography variant="caption" fontWeight={700}>
                    ⚠️ Lowest Day: {insights.worstDay.label} (
                    {insights.worstDay.percentage}%)
                  </Typography>
                </Alert>
              </Grid>
            )}
            {insights.bestDow && (
              <Grid item xs={12} sm={6}>
                <Alert
                  severity="info"
                  sx={{
                    borderRadius: 1.5,
                    py: 0.5,
                    "& .MuiAlert-message": { fontSize: "0.72rem" },
                  }}
                >
                  <Typography variant="caption" fontWeight={700}>
                    📅 Best Weekday: {insights.bestDow.day} (
                    {insights.bestDow.percentage}%)
                  </Typography>
                </Alert>
              </Grid>
            )}
            {insights.worstDow &&
              insights.worstDow.day !== insights.bestDow?.day && (
                <Grid item xs={12} sm={6}>
                  <Alert
                    severity="warning"
                    sx={{
                      borderRadius: 1.5,
                      py: 0.5,
                      "& .MuiAlert-message": { fontSize: "0.72rem" },
                    }}
                  >
                    <Typography variant="caption" fontWeight={700}>
                      📉 Weakest Weekday: {insights.worstDow.day} (
                      {insights.worstDow.percentage}%)
                    </Typography>
                  </Alert>
                </Grid>
              )}
            <Grid item xs={12} sm={6}>
              <Alert
                severity={
                  insights.trending === "up"
                    ? "success"
                    : insights.trending === "down"
                      ? "error"
                      : "info"
                }
                sx={{
                  borderRadius: 1.5,
                  py: 0.5,
                  "& .MuiAlert-message": { fontSize: "0.72rem" },
                }}
              >
                <Typography variant="caption" fontWeight={700}>
                  {insights.trending === "up"
                    ? "📈 Trending Up"
                    : insights.trending === "down"
                      ? "📉 Trending Down"
                      : "➡️ Stable"}
                  {" · "}Consistency: {insights.consistency}
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Stack>
  );
};

export default MonthlyPage;
