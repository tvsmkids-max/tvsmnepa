import React from "react";
import {
  Card,
  CardContent,
  Box,
  Typography,
  Stack,
  Button,
  Avatar,
  Chip,
  Divider,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined";
import BeachAccessOutlinedIcon from "@mui/icons-material/BeachAccessOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import BackupOutlinedIcon from "@mui/icons-material/BackupOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
import useThemeMode from "../../../hooks/useThemeMode";

const ICON_MAP = {
  warning: WarningAmberOutlinedIcon,
  "trending-down": TrendingDownOutlinedIcon,
  "beach-access": BeachAccessOutlinedIcon,
  error: ErrorOutlineOutlinedIcon,
  schedule: ScheduleOutlinedIcon,
  backup: BackupOutlinedIcon,
};

const AlertsCard = ({ data, isLoading }) => {
  const navigate = useNavigate();
  const { isDark } = useThemeMode();

  const alerts = data?.alerts || [];
  const total = data?.total || 0;

  const getColorPalette = (type) => {
    const palettes = {
      error: {
        bg: isDark ? "rgba(239,68,68,0.1)" : "#FEE2E2",
        border: isDark ? "rgba(239,68,68,0.3)" : "#FECACA",
        text: isDark ? "#F87171" : "#991B1B",
        iconBg: isDark ? "rgba(239,68,68,0.2)" : "#FEE2E2",
      },
      warning: {
        bg: isDark ? "rgba(245,158,11,0.1)" : "#FFF4E5",
        border: isDark ? "rgba(245,158,11,0.3)" : "#FED7AA",
        text: isDark ? "#FBBF24" : "#92400E",
        iconBg: isDark ? "rgba(245,158,11,0.2)" : "#FED7AA",
      },
      info: {
        bg: isDark ? "rgba(14,165,233,0.1)" : "#E0F2FE",
        border: isDark ? "rgba(14,165,233,0.3)" : "#BAE6FD",
        text: isDark ? "#38BDF8" : "#0369A1",
        iconBg: isDark ? "rgba(14,165,233,0.2)" : "#BAE6FD",
      },
      success: {
        bg: isDark ? "rgba(34,197,94,0.1)" : "#E6F4EA",
        border: isDark ? "rgba(34,197,94,0.3)" : "#A7F3D0",
        text: isDark ? "#4ADE80" : "#15803D",
        iconBg: isDark ? "rgba(34,197,94,0.2)" : "#C6F6D5",
      },
    };
    return palettes[type] || palettes.info;
  };

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardContent
        sx={{
          p: { xs: 2, sm: 2.5 },
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: isDark ? "rgba(239,68,68,0.15)" : "warning.50",
              width: 38,
              height: 38,
            }}
          >
            <NotificationsActiveOutlinedIcon
              sx={{
                color: isDark ? "#FCA5A5" : "warning.dark",
                fontSize: 20,
              }}
            />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800} sx={{ fontSize: "1rem" }}>
              Today's Alerts
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {total === 0
                ? "All clear, no issues"
                : `${total} item${total !== 1 ? "s" : ""} need attention`}
            </Typography>
          </Box>
          {total > 0 && (
            <Chip
              label={total}
              size="small"
              color="error"
              sx={{ fontWeight: 800, height: 24 }}
            />
          )}
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {/* Body */}
        {isLoading ? (
          <Box sx={{ textAlign: "center", py: 4, flex: 1 }}>
            <CircularProgress size={28} />
          </Box>
        ) : alerts.length === 0 ? (
          <Box
            sx={{
              textAlign: "center",
              py: 4,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: isDark ? "rgba(34,197,94,0.15)" : "success.50",
                mb: 1.5,
              }}
            >
              <CheckCircleOutlinedIcon
                sx={{
                  fontSize: 32,
                  color: isDark ? "#4ADE80" : "success.dark",
                }}
              />
            </Avatar>
            <Typography variant="body2" fontWeight={700}>
              All clear! 🎉
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 0.5 }}
            >
              No pending actions or warnings
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.2} sx={{ flex: 1 }}>
            {alerts.map((alert) => {
              const Icon = ICON_MAP[alert.icon] || WarningAmberOutlinedIcon;
              const palette = getColorPalette(alert.type);

              return (
                <Box
                  key={alert.id}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: palette.bg,
                    border: "1px solid",
                    borderColor: palette.border,
                    transition: "all 0.15s",
                    "&:hover": {
                      transform: "translateX(2px)",
                    },
                  }}
                >
                  <Stack direction="row" spacing={1.2} alignItems="flex-start">
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: palette.iconBg,
                        flexShrink: 0,
                      }}
                    >
                      <Icon sx={{ fontSize: 18, color: palette.text }} />
                    </Avatar>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        fontWeight={800}
                        sx={{
                          color: palette.text,
                          fontSize: "0.85rem",
                          lineHeight: 1.3,
                          mb: 0.2,
                        }}
                      >
                        {alert.title}
                      </Typography>
                      {alert.message && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            fontSize: "0.72rem",
                            display: "block",
                            lineHeight: 1.4,
                            mb: alert.actionLabel ? 1 : 0,
                          }}
                        >
                          {alert.message}
                        </Typography>
                      )}

                      {alert.actionLabel && alert.actionLink && (
                        <Button
                          size="small"
                          variant="text"
                          endIcon={
                            <ArrowForwardOutlinedIcon sx={{ fontSize: 14 }} />
                          }
                          onClick={() => navigate(alert.actionLink)}
                          sx={{
                            color: palette.text,
                            fontWeight: 800,
                            fontSize: "0.7rem",
                            textTransform: "none",
                            minWidth: "auto",
                            p: 0,
                            mt: 0.3,
                            "&:hover": {
                              bgcolor: "transparent",
                              textDecoration: "underline",
                            },
                          }}
                        >
                          {alert.actionLabel}
                        </Button>
                      )}
                    </Box>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertsCard;
