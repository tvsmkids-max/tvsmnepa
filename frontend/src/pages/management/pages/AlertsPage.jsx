import React from "react";
import {
  Box,
  Paper,
  Grid,
  Stack,
  Typography,
  Chip,
  Skeleton,
  Alert,
  LinearProgress,
  Divider,
  useTheme,
  alpha,
} from "@mui/material";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined";
import HourglassBottomOutlinedIcon from "@mui/icons-material/HourglassBottomOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

import StatCard from "../components/StatCard";
import { useAlerts } from "../../../hooks/useManagement";
import { sortClasses } from "../../../utils/classSort";

const AlertsPage = ({ secretKey }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const { data, isLoading } = useAlerts(secretKey);

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
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
      </Stack>
    );
  }

  if (!data) return null;

  const {
    counts = {},
    criticalClasses = [],
    lowClasses = [],
    chronicClasses = [],
    pendingClasses = [],
  } = data;

  const totalIssues =
    counts.criticalClasses +
    counts.lowClasses +
    counts.chronicStudents +
    counts.pendingClasses;

  return (
    <Stack spacing={2}>
      {/* All Good Banner */}
      {totalIssues === 0 && (
        <Paper
          sx={{
            p: 4,
            borderRadius: 2,
            textAlign: "center",
            border: "1px solid",
            borderColor: isDark ? alpha("#16A34A", 0.3) : "#BBF7D0",
            bgcolor: isDark ? alpha("#16A34A", 0.05) : "#F0FDF4",
          }}
        >
          <CheckCircleOutlineIcon
            sx={{ fontSize: 56, color: "#16A34A", mb: 1 }}
          />
          <Typography variant="h6" fontWeight={800} sx={{ color: "#15803D" }}>
            All Clear! 🎉
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            No critical alerts. School is performing well across all metrics.
          </Typography>
        </Paper>
      )}

      {/* Alert Counts */}
      <Grid container spacing={1.2}>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Critical"
            value={counts.criticalClasses || 0}
            subtitle="Classes <60%"
            icon={ErrorOutlineOutlinedIcon}
            color="error"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Low"
            value={counts.lowClasses || 0}
            subtitle="Classes 60-75%"
            icon={WarningAmberOutlinedIcon}
            color="warning"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Chronic"
            value={counts.chronicStudents || 0}
            subtitle="Students <75%"
            icon={PeopleOutlinedIcon}
            color="error"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="Pending"
            value={counts.pendingClasses || 0}
            subtitle="Not marked today"
            icon={HourglassBottomOutlinedIcon}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Critical Classes */}
      {criticalClasses.length > 0 && (
        <Paper
          sx={{
            borderRadius: 2,
            border: "2px solid",
            borderColor: isDark ? alpha("#DC2626", 0.4) : "#FECACA",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderBottom: "1px solid",
              borderColor: "divider",
              bgcolor: isDark ? alpha("#DC2626", 0.1) : "#FEF2F2",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <ErrorOutlineOutlinedIcon sx={{ fontSize: 18, color: "#DC2626" }} />
            <Typography variant="subtitle2" fontWeight={800}>
              🔴 Critical Classes (Below 60% this month)
            </Typography>
          </Box>
          <Stack divider={<Divider />}>
            {criticalClasses.map((cls) => (
              <Stack
                key={cls._id}
                direction="row"
                alignItems="center"
                spacing={1.5}
                sx={{ px: 2, py: 1.5, "&:hover": { bgcolor: "action.hover" } }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    bgcolor: isDark ? alpha("#DC2626", 0.15) : "#FEE2E2",
                    color: "#DC2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <TrendingDownOutlinedIcon />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={800}>
                    Class {cls.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {cls.totalStudents} students · Immediate action needed
                  </Typography>
                </Box>
                <Chip
                  label={`${cls.percentage}%`}
                  size="small"
                  sx={{
                    fontWeight: 800,
                    height: 26,
                    fontSize: "0.75rem",
                    bgcolor: "#DC2626",
                    color: "white",
                    minWidth: 60,
                  }}
                />
              </Stack>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Low Classes */}
      {lowClasses.length > 0 && (
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
              bgcolor: isDark ? alpha("#F59E0B", 0.08) : "#FFFBEB",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <WarningAmberOutlinedIcon sx={{ fontSize: 18, color: "#B45309" }} />
            <Typography variant="subtitle2" fontWeight={800}>
              🟡 Low Performance (60-75%)
            </Typography>
          </Box>
          <Stack divider={<Divider />}>
            {lowClasses.map((cls) => (
              <Stack
                key={cls._id}
                direction="row"
                alignItems="center"
                spacing={1.5}
                sx={{ px: 2, py: 1.25, "&:hover": { bgcolor: "action.hover" } }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700}>
                    Class {cls.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: "0.7rem" }}
                  >
                    {cls.totalStudents} students
                  </Typography>
                </Box>
                <Box sx={{ width: 100 }}>
                  <LinearProgress
                    variant="determinate"
                    value={cls.percentage}
                    sx={{
                      height: 4,
                      borderRadius: 2,
                      bgcolor: isDark ? alpha("#F59E0B", 0.15) : "#FEF3C7",
                      "& .MuiLinearProgress-bar": {
                        bgcolor: "#F59E0B",
                      },
                    }}
                  />
                </Box>
                <Chip
                  label={`${cls.percentage}%`}
                  size="small"
                  sx={{
                    fontWeight: 800,
                    height: 22,
                    fontSize: "0.7rem",
                    bgcolor: isDark ? alpha("#F59E0B", 0.18) : "#FEF3C7",
                    color: isDark ? "#FCD34D" : "#B45309",
                    minWidth: 55,
                  }}
                />
              </Stack>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Chronic Absenteeism */}
      {chronicClasses.length > 0 && (
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
              alignItems: "center",
              gap: 1,
            }}
          >
            <PeopleOutlinedIcon sx={{ fontSize: 18, color: "#DC2626" }} />
            <Typography variant="subtitle2" fontWeight={800}>
              📊 Chronic Absenteeism (Classes with 20%+ chronic students)
            </Typography>
          </Box>
          <Stack divider={<Divider />}>
            {chronicClasses.map((cls) => (
              <Stack
                key={cls._id}
                direction="row"
                alignItems="center"
                spacing={1.5}
                sx={{ px: 2, py: 1.5, "&:hover": { bgcolor: "action.hover" } }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={800}>
                    Class {cls.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {cls.chronicCount} out of {cls.totalStudents} students below
                    75% ·{" "}
                    <Box
                      component="span"
                      sx={{ fontWeight: 700, color: "#DC2626" }}
                    >
                      {cls.percentage}% chronic
                    </Box>
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Pending Classes Today */}
      {pendingClasses.length > 0 && (
        <Paper
          sx={{
            borderRadius: 2,
            border: "1px solid",
            borderColor: isDark ? alpha("#F59E0B", 0.3) : "#FDE68A",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderBottom: "1px solid",
              borderColor: "divider",
              bgcolor: isDark ? alpha("#F59E0B", 0.1) : "#FFFBEB",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <HourglassBottomOutlinedIcon
              sx={{ fontSize: 18, color: "#B45309" }}
            />
            <Typography variant="subtitle2" fontWeight={800}>
              ⏰ Pending Today (Attendance not marked)
            </Typography>
          </Box>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {pendingClasses.map((cls) => (
                <Chip
                  label={cls.label}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: "0.68rem", sm: "0.72rem" },
                    height: { xs: 24, sm: 26 },
                    bgcolor: isDark ? alpha("#F59E0B", 0.18) : "#FEF3C7",
                    color: isDark ? "#FCD34D" : "#B45309",
                    border: "1px solid",
                    borderColor: isDark ? alpha("#F59E0B", 0.3) : "#FDE68A",
                  }}
                />
              ))}
            </Stack>
          </Box>
        </Paper>
      )}
    </Stack>
  );
};

export default AlertsPage;
