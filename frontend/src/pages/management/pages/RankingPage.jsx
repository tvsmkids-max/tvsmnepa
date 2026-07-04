import React, { useState } from "react";
import {
  Box,
  Paper,
  Grid,
  Stack,
  Typography,
  Chip,
  Skeleton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  ToggleButton,
  ToggleButtonGroup,
  LinearProgress,
  Divider,
  useTheme,
  alpha,
} from "@mui/material";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined";
import TrendingFlatOutlinedIcon from "@mui/icons-material/TrendingFlatOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";

import { useRankings } from "../../../hooks/useManagement";

const RankingPage = ({ secretKey }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [period, setPeriod] = useState("month");
  const { data, isLoading } = useRankings(secretKey, period);

  const handlePeriodChange = (_, newPeriod) => {
    if (newPeriod) setPeriod(newPeriod);
  };

  // Trend icon
  const TrendIcon = ({ trend }) => {
    if (trend === "up")
      return <TrendingUpOutlinedIcon sx={{ fontSize: 16, color: "#16A34A" }} />;
    if (trend === "down")
      return (
        <TrendingDownOutlinedIcon sx={{ fontSize: 16, color: "#DC2626" }} />
      );
    return <TrendingFlatOutlinedIcon sx={{ fontSize: 16, color: "#6B7280" }} />;
  };

  // Medal emoji
  const getMedal = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  if (isLoading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rectangular" height={50} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
      </Stack>
    );
  }

  if (!data || !data.byPercentage?.length) {
    return (
      <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No ranking data available for this period
        </Typography>
      </Paper>
    );
  }

  const { byPercentage = [], byConsistency = [], periodLabel } = data;
  const topFive = byPercentage.slice(0, 5);

  return (
    <Stack spacing={2}>
      {/* Period Toggle */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
      >
        <Typography variant="h6" fontWeight={800}>
          🏆 Class Ranking
        </Typography>
        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={handlePeriodChange}
          size="small"
          sx={{
            "& .MuiToggleButton-root": {
              px: 1.5,
              py: 0.4,
              fontWeight: 700,
              fontSize: "0.72rem",
              textTransform: "none",
              border: "1px solid",
              borderColor: "divider",
            },
          }}
        >
          <ToggleButton value="today">Today</ToggleButton>
          <ToggleButton value="month">Month</ToggleButton>
          <ToggleButton value="year">Year</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Top 5 Podium */}
      <Paper
        sx={{
          p: 2,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          background: `linear-gradient(135deg, ${alpha("#F5A623", isDark ? 0.1 : 0.05)} 0%, transparent 100%)`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <EmojiEventsOutlinedIcon sx={{ fontSize: 20, color: "#F5A623" }} />
          <Typography variant="subtitle2" fontWeight={800}>
            🌟 Top 5 Classes · {periodLabel}
          </Typography>
        </Stack>

        <Stack spacing={1}>
          {topFive.map((cls) => (
            <Stack
              key={cls._id}
              direction="row"
              alignItems="center"
              spacing={1.5}
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor:
                  cls.rank === 1
                    ? isDark
                      ? alpha("#F5A623", 0.15)
                      : "#FEF3C7"
                    : isDark
                      ? alpha("#fff", 0.03)
                      : "#F8FAFC",
                border: cls.rank === 1 ? "1px solid" : "none",
                borderColor: "#F5A623",
              }}
            >
              {/* Rank */}
              <Box
                sx={{
                  minWidth: 40,
                  height: 40,
                  borderRadius: "50%",
                  bgcolor:
                    cls.rank === 1
                      ? "#F5A623"
                      : cls.rank === 2
                        ? "#94A3B8"
                        : cls.rank === 3
                          ? "#CD7F32"
                          : isDark
                            ? alpha("#fff", 0.06)
                            : "#F1F5F9",
                  color:
                    cls.rank <= 3
                      ? "white"
                      : isDark
                        ? "text.primary"
                        : "text.primary",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: cls.rank <= 3 ? "1.1rem" : "0.85rem",
                  flexShrink: 0,
                }}
              >
                {getMedal(cls.rank)}
              </Box>

              {/* Class Info */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <Typography variant="body2" fontWeight={800}>
                    Class {cls.label}
                  </Typography>
                  <TrendIcon trend={cls.trend} />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {cls.totalStudents} students · Consistency:{" "}
                  {cls.consistencyLabel}
                </Typography>
              </Box>

              {/* Percentage */}
              <Chip
                label={`${cls.percentage}%`}
                size="small"
                sx={{
                  fontWeight: 900,
                  height: 28,
                  fontSize: "0.85rem",
                  bgcolor:
                    cls.percentage >= 90
                      ? "#16A34A"
                      : cls.percentage >= 75
                        ? "#F59E0B"
                        : "#DC2626",
                  color: "white",
                  minWidth: 65,
                }}
              />
            </Stack>
          ))}
        </Stack>
      </Paper>

      {/* Full Leaderboard */}
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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="subtitle2" fontWeight={800}>
            📊 Full Leaderboard
          </Typography>
          <Chip
            label={`${byPercentage.length} classes`}
            size="small"
            sx={{
              height: 20,
              fontSize: "0.65rem",
              fontWeight: 700,
            }}
          />
        </Box>
        <TableContainer sx={{ maxHeight: 500, overflowX: "auto" }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: 800,
                    fontSize: "0.68rem",
                    textTransform: "uppercase",
                    bgcolor: isDark ? "#1E293B" : "#F1F5F9",
                    py: 1,
                    width: 60,
                  }}
                >
                  Rank
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 800,
                    fontSize: "0.68rem",
                    textTransform: "uppercase",
                    bgcolor: isDark ? "#1E293B" : "#F1F5F9",
                    py: 1,
                  }}
                >
                  Class
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 800,
                    fontSize: "0.68rem",
                    textTransform: "uppercase",
                    bgcolor: isDark ? "#1E293B" : "#F1F5F9",
                    py: 1,
                    width: 70,
                  }}
                >
                  Total
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 800,
                    fontSize: "0.68rem",
                    textTransform: "uppercase",
                    bgcolor: isDark ? "#1E293B" : "#F1F5F9",
                    py: 1,
                    width: 90,
                  }}
                >
                  Attendance
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 800,
                    fontSize: "0.68rem",
                    textTransform: "uppercase",
                    bgcolor: isDark ? "#1E293B" : "#F1F5F9",
                    py: 1,
                    width: 60,
                  }}
                >
                  Trend
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {byPercentage.map((cls) => (
                <TableRow key={cls._id} hover>
                  <TableCell sx={{ py: 1 }}>
                    <Typography
                      variant="body2"
                      fontWeight={800}
                      sx={{
                        fontFamily: "monospace",
                        fontSize: { xs: "0.78rem", sm: "0.82rem" },

                        color:
                          cls.rank <= 3
                            ? "#F5A623"
                            : isDark
                              ? "#93C5FD"
                              : "#1E4D98",
                      }}
                    >
                      {cls.rank <= 3 ? getMedal(cls.rank) : `#${cls.rank}`}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <Typography variant="body2" fontWeight={700}>
                      {cls.label}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: "0.65rem" }}
                    >
                      Consistency: {cls.consistencyLabel}
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ py: 1 }}>
                    <Typography variant="body2" fontWeight={700}>
                      {cls.totalStudents}
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ py: 1 }}>
                    <Stack alignItems="center" spacing={0.3}>
                      <Typography
                        variant="body2"
                        fontWeight={800}
                        sx={{
                          color:
                            cls.percentage >= 90
                              ? "#16A34A"
                              : cls.percentage >= 75
                                ? "#F59E0B"
                                : "#DC2626",
                        }}
                      >
                        {cls.percentage}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={cls.percentage}
                        sx={{
                          width: 50,
                          height: 3,
                          borderRadius: 2,
                          "& .MuiLinearProgress-bar": {
                            bgcolor:
                              cls.percentage >= 90
                                ? "#16A34A"
                                : cls.percentage >= 75
                                  ? "#F59E0B"
                                  : "#DC2626",
                          },
                        }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell align="center" sx={{ py: 1 }}>
                    <TrendIcon trend={cls.trend} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Consistency Leaders */}
      {byConsistency.length > 0 && (
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
              bgcolor: isDark ? alpha("#3B82F6", 0.08) : "#EFF6FF",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <VerifiedOutlinedIcon sx={{ fontSize: 18, color: "#1E4D98" }} />
            <Typography variant="subtitle2" fontWeight={800}>
              🎯 Most Consistent Classes
            </Typography>
          </Box>
          <Stack divider={<Divider />}>
            {byConsistency.map((cls, idx) => (
              <Stack
                key={cls._id}
                direction="row"
                alignItems="center"
                spacing={1.5}
                sx={{ px: 2, py: 1.25 }}
              >
                <Box
                  sx={{
                    minWidth: 28,
                    height: 28,
                    borderRadius: "50%",
                    bgcolor: isDark ? alpha("#3B82F6", 0.15) : "#DBEAFE",
                    color: isDark ? "#93C5FD" : "#1E4D98",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: "0.72rem",
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={700}>
                    Class {cls.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Variance: ±{cls.consistency}% · {cls.percentage}% avg
                  </Typography>
                </Box>
                <Chip
                  label={cls.consistencyLabel}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    height: 22,
                    fontSize: "0.68rem",
                    bgcolor: isDark ? alpha("#3B82F6", 0.15) : "#DBEAFE",
                    color: isDark ? "#93C5FD" : "#1E4D98",
                  }}
                />
              </Stack>
            ))}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
};

export default RankingPage;
