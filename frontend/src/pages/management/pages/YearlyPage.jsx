import React from "react";
import {
  Box,
  Paper,
  Grid,
  Stack,
  Typography,
  Skeleton,
  useTheme,
  useMediaQuery,
  alpha,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined";

import StatCard from "../components/StatCard";
import { useYearlyPerformance } from "../../../hooks/useManagement";

const YearlyPage = ({ secretKey }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { data, isLoading } = useYearlyPerformance(secretKey);

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
        <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} />
      </Stack>
    );
  }

  if (!data || !data.months?.length) {
    return (
      <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No yearly data available yet
        </Typography>
      </Paper>
    );
  }

  const { stats, months, quarterly, insights, session } = data;

  return (
    <Stack spacing={2}>
      <Box>
        <Typography
          variant="h6"
          fontWeight={800}
          sx={{ fontSize: { xs: "1rem", sm: "1.2rem" } }}
        >
          📆 Academic Session {session}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Full year attendance performance
        </Typography>
      </Box>

      <Grid container spacing={1.2}>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Working Days"
            value={stats.totalWorkingDays || 0}
            icon={CalendarMonthOutlinedIcon}
            color="primary"
            subtitle="This year"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Year Average"
            value={`${stats.yearAvg || 0}%`}
            icon={PercentOutlinedIcon}
            color={
              stats.yearAvg >= 90
                ? "success"
                : stats.yearAvg >= 75
                  ? "warning"
                  : "error"
            }
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Months"
            value={stats.totalMonths || 0}
            icon={CalendarMonthOutlinedIcon}
            color="info"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Best Month"
            value={
              insights?.bestMonth ? `${insights.bestMonth.percentage}%` : "—"
            }
            subtitle={insights?.bestMonth?.shortLabel || "No data"}
            icon={EmojiEventsOutlinedIcon}
            color="success"
          />
        </Grid>
      </Grid>

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
          📊 Month-by-Month Attendance
        </Typography>
        <Box sx={{ height: { xs: 220, sm: 280 } }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={months}
              margin={{ top: 5, right: 15, left: -20, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? "#334155" : "#E2E8F0"}
              />
              <XAxis
                dataKey="shortLabel"
                tick={{ fontSize: 9, fill: theme.palette.text.secondary }}
                angle={-15}
                textAnchor="end"
                height={50}
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
                formatter={(v, name, item) => [
                  `${v}%`,
                  `${item.payload.label} (${item.payload.workingDays} days)`,
                ]}
              />
              <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                {months.map((m, i) => (
                  <Cell
                    key={i}
                    fill={
                      m.percentage >= 90
                        ? "#16A34A"
                        : m.percentage >= 75
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

      <Paper
        sx={{
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: isDark ? alpha("#fff", 0.02) : "#FAFBFC",
          }}
        >
          <Typography
            variant="subtitle2"
            fontWeight={800}
            sx={{ fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
          >
            🏆 Quarterly Performance
          </Typography>
        </Box>
        <Grid container>
          {quarterly.map((q, idx) => {
            const noData = !q.hasData;
            return (
              <Grid
                item
                xs={6}
                sm={3}
                key={q.label}
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  borderRight: {
                    xs: idx % 2 === 0 ? "1px solid" : "none",
                    sm: idx < 3 ? "1px solid" : "none",
                  },
                  borderBottom: {
                    xs: idx < 2 ? "1px solid" : "none",
                    sm: "none",
                  },
                  borderColor: "divider !important",
                  textAlign: "center",
                  opacity: noData ? 0.5 : 1,
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight={700}
                  sx={{
                    fontSize: "0.65rem",
                    color: "text.secondary",
                    display: "block",
                    mb: 0.5,
                  }}
                >
                  {q.label}
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight={900}
                  sx={{
                    color: noData
                      ? "text.disabled"
                      : q.percentage >= 90
                        ? "#16A34A"
                        : q.percentage >= 75
                          ? "#F59E0B"
                          : "#DC2626",
                    lineHeight: 1.2,
                    fontSize: { xs: "1.3rem", sm: "1.6rem" },
                  }}
                >
                  {noData ? "—" : `${q.percentage}%`}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "0.6rem",
                    color: "text.disabled",
                    display: "block",
                    mt: 0.3,
                  }}
                >
                  {q.months || "—"}
                </Typography>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {(insights?.bestMonth || insights?.worstMonth) && (
        <Grid container spacing={2}>
          {insights?.bestMonth && (
            <Grid item xs={12} sm={6}>
              <Paper
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: isDark ? alpha("#16A34A", 0.3) : "#BBF7D0",
                  bgcolor: isDark ? alpha("#16A34A", 0.05) : "#F0FDF4",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <EmojiEventsOutlinedIcon
                    sx={{ fontSize: 32, color: "#16A34A" }}
                  />
                  <Box>
                    <Typography
                      variant="caption"
                      fontWeight={800}
                      sx={{
                        textTransform: "uppercase",
                        fontSize: "0.65rem",
                        color: "#15803D",
                      }}
                    >
                      Best Performing Month
                    </Typography>
                    <Typography
                      variant="h6"
                      fontWeight={900}
                      sx={{
                        color: "#15803D",
                        fontSize: { xs: "1rem", sm: "1.15rem" },
                      }}
                    >
                      {insights.bestMonth.label}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ fontSize: "0.72rem", color: "#166534" }}
                    >
                      {insights.bestMonth.percentage}% ·{" "}
                      {insights.bestMonth.workingDays} days
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          )}
          {insights?.worstMonth && (
            <Grid item xs={12} sm={6}>
              <Paper
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: isDark ? alpha("#DC2626", 0.3) : "#FECACA",
                  bgcolor: isDark ? alpha("#DC2626", 0.05) : "#FEF2F2",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <TrendingDownOutlinedIcon
                    sx={{ fontSize: 32, color: "#DC2626" }}
                  />
                  <Box>
                    <Typography
                      variant="caption"
                      fontWeight={800}
                      sx={{
                        textTransform: "uppercase",
                        fontSize: "0.65rem",
                        color: "#B91C1C",
                      }}
                    >
                      Needs Attention
                    </Typography>
                    <Typography
                      variant="h6"
                      fontWeight={900}
                      sx={{
                        color: "#B91C1C",
                        fontSize: { xs: "1rem", sm: "1.15rem" },
                      }}
                    >
                      {insights.worstMonth.label}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ fontSize: "0.72rem", color: "#991B1B" }}
                    >
                      {insights.worstMonth.percentage}% · Lowest month
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}
    </Stack>
  );
};

export default YearlyPage;
