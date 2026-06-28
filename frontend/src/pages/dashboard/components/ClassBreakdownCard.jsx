import React from "react";
import {
  Card,
  CardContent,
  Box,
  Typography,
  Stack,
  Avatar,
  Divider,
  CircularProgress,
  LinearProgress,
  Chip,
  Button,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import ClassOutlinedIcon from "@mui/icons-material/ClassOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import HourglassBottomOutlinedIcon from "@mui/icons-material/HourglassBottomOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import BeachAccessOutlinedIcon from "@mui/icons-material/BeachAccessOutlined";
import useThemeMode from "../../../hooks/useThemeMode";

const ClassBreakdownCard = ({ data, isLoading, onRefresh }) => {
  const navigate = useNavigate();
  const { isDark } = useThemeMode();

  if (data?.isHoliday) {
    return (
      <Card
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "warning.light",
          bgcolor: isDark ? "rgba(245,158,11,0.1)" : "#FFFBEB",
        }}
      >
        <CardContent sx={{ p: 3, textAlign: "center" }}>
          <BeachAccessOutlinedIcon
            sx={{ fontSize: 56, color: "warning.main", mb: 1 }}
          />
          <Typography variant="h6" fontWeight={800}>
            🏖️ {data.holiday?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {data.holiday?.type} Holiday — Attendance blocked
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const breakdown = data?.classBreakdown || [];

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        {/* Header */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 2 }}
          flexWrap="wrap"
          gap={1}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar
              sx={{
                bgcolor: isDark ? "rgba(59,130,246,0.15)" : "primary.50",
                width: 38,
                height: 38,
              }}
            >
              <ClassOutlinedIcon
                sx={{
                  color: isDark ? "#60A5FA" : "primary.main",
                  fontSize: 20,
                }}
              />
            </Avatar>
            <Box>
              <Typography
                variant="h6"
                fontWeight={800}
                sx={{ fontSize: "1rem" }}
              >
                Class-wise Breakdown
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {data?.markedClasses || 0} of {data?.totalClasses || 0} marked
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh">
              <IconButton
                size="small"
                onClick={onRefresh}
                disabled={isLoading}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <RefreshOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              size="small"
              startIcon={<EventNoteOutlinedIcon />}
              onClick={() => navigate("/attendance/mark")}
              sx={{
                background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
                fontWeight: 700,
                textTransform: "none",
                fontSize: "0.78rem",
              }}
            >
              Mark Now
            </Button>
          </Stack>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {/* Body */}
        {isLoading ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : breakdown.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <ClassOutlinedIcon
              sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
            />
            <Typography variant="body2" fontWeight={700} color="text.secondary">
              No classes found
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {breakdown.map((cls) => {
              const percentage = cls.percentage || 0;
              const progressColor =
                percentage >= 75
                  ? "success"
                  : percentage >= 50
                    ? "warning"
                    : "error";

              return (
                <Box
                  key={cls._id}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: cls.isMarked
                      ? isDark
                        ? "rgba(34,197,94,0.05)"
                        : "rgba(34,197,94,0.04)"
                      : isDark
                        ? "rgba(245,158,11,0.05)"
                        : "rgba(245,158,11,0.04)",
                    border: "1px solid",
                    borderColor: cls.isMarked
                      ? isDark
                        ? "rgba(34,197,94,0.2)"
                        : "rgba(34,197,94,0.15)"
                      : isDark
                        ? "rgba(245,158,11,0.2)"
                        : "rgba(245,158,11,0.15)",
                    transition: "all 0.15s",
                    "&:hover": {
                      transform: "translateX(2px)",
                    },
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mb: cls.isMarked ? 1 : 0.5 }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        fontWeight={800}
                        sx={{ fontSize: "0.85rem" }}
                      >
                        Class {cls.name} - {cls.section}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: "0.7rem" }}
                      >
                        {cls.totalStudents} students
                        {cls.classTeacher && ` • ${cls.classTeacher}`}
                      </Typography>
                    </Box>

                    {cls.isMarked ? (
                      <Stack direction="row" spacing={0.8} alignItems="center">
                        <Chip
                          icon={
                            <CheckCircleOutlinedIcon sx={{ fontSize: 12 }} />
                          }
                          label="Marked"
                          size="small"
                          color="success"
                          sx={{
                            height: 22,
                            fontSize: "0.65rem",
                            fontWeight: 700,
                          }}
                        />
                        <Typography
                          variant="body2"
                          fontWeight={900}
                          sx={{
                            fontSize: "1rem",
                            color:
                              percentage >= 75
                                ? isDark
                                  ? "#4ADE80"
                                  : "success.dark"
                                : percentage >= 50
                                  ? isDark
                                    ? "#FBBF24"
                                    : "warning.dark"
                                  : isDark
                                    ? "#F87171"
                                    : "error.dark",
                          }}
                        >
                          {percentage}%
                        </Typography>
                      </Stack>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        color="warning"
                        startIcon={
                          <HourglassBottomOutlinedIcon sx={{ fontSize: 14 }} />
                        }
                        onClick={() => navigate("/attendance/mark")}
                        sx={{
                          fontWeight: 700,
                          textTransform: "none",
                          fontSize: "0.7rem",
                          py: 0.3,
                        }}
                      >
                        Mark
                      </Button>
                    )}
                  </Stack>

                  {cls.isMarked && (
                    <>
                      <LinearProgress
                        variant="determinate"
                        value={percentage}
                        color={progressColor}
                        sx={{
                          height: 6,
                          borderRadius: 4,
                          bgcolor: isDark
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(0,0,0,0.06)",
                          mb: 0.6,
                        }}
                      />
                      <Stack
                        direction="row"
                        spacing={1.5}
                        sx={{ fontSize: "0.7rem" }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: isDark ? "#4ADE80" : "success.dark",
                            fontWeight: 700,
                            fontSize: "0.7rem",
                          }}
                        >
                          ✓ {cls.present} Present
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: isDark ? "#F87171" : "error.dark",
                            fontWeight: 700,
                            fontSize: "0.7rem",
                          }}
                        >
                          ✗ {cls.absent} Absent
                        </Typography>
                        {cls.unmarked > 0 && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: "text.secondary",
                              fontWeight: 600,
                              fontSize: "0.7rem",
                            }}
                          >
                            • {cls.unmarked} Pending
                          </Typography>
                        )}
                      </Stack>
                    </>
                  )}
                </Box>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

export default ClassBreakdownCard;
