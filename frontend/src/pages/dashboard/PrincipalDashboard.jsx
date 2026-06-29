import React from "react";
import {
  Box,
  Grid,
  Typography,
  Chip,
  Paper,
  Stack,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  LinearProgress,
  CircularProgress,
  Alert,
  Button,
} from "@mui/material";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import HourglassBottomOutlinedIcon from "@mui/icons-material/HourglassBottomOutlined";
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined";
import BeachAccessOutlinedIcon from "@mui/icons-material/BeachAccessOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import WavingHandIcon from "@mui/icons-material/WavingHand";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import useAuth from "../../hooks/useAuth";
import useThemeMode from "../../hooks/useThemeMode";
import { usePrincipalDashboard } from "../../hooks/usePrincipal";
import { useQueryClient } from "@tanstack/react-query";

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const PrincipalDashboard = () => {
  const { user } = useAuth();
  const { isDark } = useThemeMode();
  const queryClient = useQueryClient();
  const { data, isLoading } = usePrincipalDashboard();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["principal"] });
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  const stats = data?.stats || {};
  const classWise = data?.classWise || [];
  const holidays = data?.holidays || [];
  const sessionName = data?.session?.name || "";

  return (
    <Box sx={{ pb: { xs: 10, md: 3 } }}>
      {/* ═══ 1-LINE GREETING ═══ */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
        flexWrap="wrap"
        gap={1}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body1" fontWeight={800}>
            {greeting()}, {user?.name?.split(" ")[0]}{" "}
            <WavingHandIcon
              sx={{ fontSize: 16, color: "#F5A623", verticalAlign: "middle" }}
            />
          </Typography>
          <Chip
            label="🎓 Principal"
            size="small"
            sx={{
              height: 22,
              fontSize: "0.68rem",
              fontWeight: 700,
              bgcolor: isDark ? "rgba(34,197,94,0.15)" : "#E6F4EA",
              color: isDark ? "#86EFAC" : "#15803D",
            }}
          />
          {sessionName && (
            <Chip
              label={sessionName}
              size="small"
              sx={{
                height: 22,
                fontSize: "0.68rem",
                fontWeight: 700,
                bgcolor: isDark ? "rgba(245,166,35,0.15)" : "#FFF4E5",
                color: isDark ? "#FCD34D" : "#92400E",
              }}
            />
          )}
        </Stack>
        <Button
          size="small"
          startIcon={<RefreshOutlinedIcon sx={{ fontSize: 14 }} />}
          onClick={handleRefresh}
          sx={{
            fontWeight: 700,
            fontSize: "0.72rem",
            textTransform: "none",
            color: "text.secondary",
          }}
        >
          Refresh
        </Button>
      </Stack>

      {/* ═══ HOLIDAY ═══ */}
      {data?.isHoliday && (
        <Alert
          severity="warning"
          icon={<BeachAccessOutlinedIcon />}
          sx={{ mb: 2, borderRadius: 2 }}
        >
          <Typography variant="body2" fontWeight={700}>
            🏖️ {data.holiday?.name}
          </Typography>
        </Alert>
      )}

      {/* ═══ KPI CARDS ═══ */}
      <Grid container spacing={1.2} sx={{ mb: 2 }}>
        {[
          {
            label: "Attendance",
            value: `${stats.overallPercentage || 0}%`,
            icon: <PercentOutlinedIcon />,
            color:
              (stats.overallPercentage || 0) >= 75
                ? isDark
                  ? "#4ADE80"
                  : "success.dark"
                : isDark
                  ? "#FBBF24"
                  : "warning.dark",
          },
          {
            label: "Present",
            value: stats.totalPresent || 0,
            icon: <CheckCircleOutlinedIcon />,
            color: isDark ? "#86EFAC" : "success.dark",
          },
          {
            label: "Absent",
            value: stats.totalAbsent || 0,
            icon: <CancelOutlinedIcon />,
            color: isDark ? "#FCA5A5" : "error.dark",
          },
          {
            label: "Pending",
            value: stats.pendingClasses || 0,
            icon: <HourglassBottomOutlinedIcon />,
            color:
              (stats.pendingClasses || 0) === 0
                ? isDark
                  ? "#4ADE80"
                  : "success.dark"
                : isDark
                  ? "#FCD34D"
                  : "warning.dark",
          },
        ].map((kpi) => (
          <Grid item xs={3} key={kpi.label}>
            <Paper
              sx={{
                p: { xs: 1, sm: 1.2 },
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                textAlign: "center",
              }}
            >
              {React.cloneElement(kpi.icon, {
                sx: { fontSize: 18, color: kpi.color, mb: 0.2 },
              })}
              <Typography
                variant="h6"
                fontWeight={900}
                sx={{
                  fontSize: { xs: "1rem", sm: "1.2rem" },
                  lineHeight: 1,
                  color: kpi.color,
                }}
              >
                {kpi.value}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.58rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "text.secondary",
                }}
              >
                {kpi.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* ═══ CLASS-WISE TABLE ═══ */}
      <Paper
        sx={{
          borderRadius: 2,
          mb: 2,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#FAFBFC",
          }}
        >
          <Typography
            variant="body2"
            fontWeight={800}
            sx={{ fontSize: "0.85rem" }}
          >
            Class-wise Attendance
          </Typography>
        </Box>

        {classWise.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              No classes found
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 500 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.72rem",
                      bgcolor: isDark ? "#1E293B" : "#F1F5F9",
                    }}
                  >
                    Class
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.72rem",
                      bgcolor: isDark ? "#1E293B" : "#F1F5F9",
                    }}
                  >
                    Teacher
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.72rem",
                      bgcolor: isDark ? "#1E293B" : "#F1F5F9",
                    }}
                  >
                    Total
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.72rem",
                      bgcolor: isDark ? "#1E293B" : "#F1F5F9",
                      color: isDark ? "#86EFAC" : "success.dark",
                    }}
                  >
                    P
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.72rem",
                      bgcolor: isDark ? "#1E293B" : "#F1F5F9",
                      color: isDark ? "#FCA5A5" : "error.dark",
                    }}
                  >
                    A
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.72rem",
                      bgcolor: isDark ? "#1E293B" : "#F1F5F9",
                    }}
                  >
                    %
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.72rem",
                      bgcolor: isDark ? "#1E293B" : "#F1F5F9",
                    }}
                  >
                    Status
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {classWise.map((cls) => (
                  <TableRow key={cls._id} hover>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ fontSize: "0.82rem" }}
                      >
                        {cls.label}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "0.72rem",
                          color:
                            cls.classTeacher === "Not assigned"
                              ? "text.disabled"
                              : "text.primary",
                        }}
                      >
                        {cls.classTeacher}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ fontSize: "0.82rem" }}
                      >
                        {cls.totalStudents}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{
                          fontSize: "0.82rem",
                          color: isDark ? "#86EFAC" : "success.dark",
                        }}
                      >
                        {cls.present}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{
                          fontSize: "0.82rem",
                          color: isDark ? "#FCA5A5" : "error.dark",
                        }}
                      >
                        {cls.absent}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {cls.isMarked ? (
                        <Stack alignItems="center" spacing={0.2}>
                          <Typography
                            variant="body2"
                            fontWeight={800}
                            sx={{
                              fontSize: "0.82rem",
                              color:
                                cls.percentage >= 75
                                  ? isDark
                                    ? "#4ADE80"
                                    : "success.dark"
                                  : cls.percentage >= 50
                                    ? isDark
                                      ? "#FBBF24"
                                      : "warning.dark"
                                    : isDark
                                      ? "#F87171"
                                      : "error.dark",
                            }}
                          >
                            {cls.percentage}%
                          </Typography>
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
                            sx={{ width: 40, height: 3, borderRadius: 2 }}
                          />
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.disabled">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={cls.isMarked ? "✓" : "⏳"}
                        size="small"
                        color={cls.isMarked ? "success" : "warning"}
                        sx={{
                          height: 20,
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          minWidth: 32,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total Row */}
                <TableRow
                  sx={{
                    bgcolor: isDark ? "rgba(59,130,246,0.08)" : "#F0F4FF",
                    "& td": { borderBottom: "none" },
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={900}>
                      TOTAL
                    </Typography>
                  </TableCell>
                  <TableCell />
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight={900}>
                      {stats.totalStudents}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography
                      variant="body2"
                      fontWeight={900}
                      sx={{ color: isDark ? "#86EFAC" : "success.dark" }}
                    >
                      {stats.totalPresent}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography
                      variant="body2"
                      fontWeight={900}
                      sx={{ color: isDark ? "#FCA5A5" : "error.dark" }}
                    >
                      {stats.totalAbsent}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography
                      variant="body2"
                      fontWeight={900}
                      sx={{ color: isDark ? "#4ADE80" : "success.dark" }}
                    >
                      {stats.overallPercentage || 0}%
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`${stats.markedClasses}/${stats.totalClasses}`}
                      size="small"
                      color="primary"
                      sx={{ fontWeight: 800, height: 20, fontSize: "0.65rem" }}
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* ═══ UPCOMING HOLIDAYS ═══ */}
      {holidays.length > 0 && (
        <Paper
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography
            variant="body2"
            fontWeight={800}
            sx={{ fontSize: "0.85rem", mb: 1 }}
          >
            🏖️ Upcoming Holidays
          </Typography>
          <Stack spacing={0.8}>
            {holidays.slice(0, 5).map((h) => (
              <Stack
                key={h._id}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="body2" sx={{ fontSize: "0.82rem" }}>
                  {h.name}
                </Typography>
                <Stack direction="row" spacing={0.8} alignItems="center">
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: "0.72rem" }}
                  >
                    {formatDate(h.date)}
                  </Typography>
                  <Chip
                    label={h.type}
                    size="small"
                    sx={{ height: 18, fontSize: "0.6rem", fontWeight: 700 }}
                  />
                </Stack>
              </Stack>
            ))}
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default PrincipalDashboard;
