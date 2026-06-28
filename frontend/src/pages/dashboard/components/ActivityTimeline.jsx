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
  Chip,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import BackupOutlinedIcon from "@mui/icons-material/BackupOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import ClassOutlinedIcon from "@mui/icons-material/ClassOutlined";
import BeachAccessOutlinedIcon from "@mui/icons-material/BeachAccessOutlined";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import CircleOutlinedIcon from "@mui/icons-material/CircleOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import useThemeMode from "../../../hooks/useThemeMode";

const ICON_CONFIG = {
  attendance: { Icon: EventNoteOutlinedIcon, color: "#10B981" },
  login: { Icon: LoginOutlinedIcon, color: "#6366F1" },
  backup: { Icon: BackupOutlinedIcon, color: "#8B5CF6" },
  lock: { Icon: LockOutlinedIcon, color: "#F59E0B" },
  promote: { Icon: SchoolOutlinedIcon, color: "#3B82F6" },
  student: { Icon: PersonOutlinedIcon, color: "#EC4899" },
  class: { Icon: ClassOutlinedIcon, color: "#06B6D4" },
  teacher: { Icon: PersonOutlinedIcon, color: "#14B8A6" },
  holiday: { Icon: BeachAccessOutlinedIcon, color: "#F97316" },
  notification: { Icon: NotificationsOutlinedIcon, color: "#EAB308" },
  settings: { Icon: SettingsOutlinedIcon, color: "#64748B" },
  default: { Icon: CircleOutlinedIcon, color: "#94A3B8" },
};

const formatTimeAgo = (date) => {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const ActivityTimeline = ({ data, isLoading }) => {
  const navigate = useNavigate();
  const { isDark } = useThemeMode();

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
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar
              sx={{
                bgcolor: isDark ? "rgba(99,102,241,0.15)" : "primary.50",
                width: 38,
                height: 38,
              }}
            >
              <HistoryOutlinedIcon
                sx={{
                  color: isDark ? "#A5B4FC" : "primary.main",
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
                Recent Activity
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Live feed from system
              </Typography>
            </Box>
          </Stack>

          <Button
            size="small"
            endIcon={<OpenInNewOutlinedIcon sx={{ fontSize: 14 }} />}
            onClick={() => navigate("/activity-logs")}
            sx={{
              fontWeight: 700,
              fontSize: "0.72rem",
              textTransform: "none",
            }}
          >
            View All
          </Button>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {/* Body */}
        {isLoading ? (
          <Box sx={{ textAlign: "center", py: 4, flex: 1 }}>
            <CircularProgress size={28} />
          </Box>
        ) : !data || data.length === 0 ? (
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
            <HistoryOutlinedIcon
              sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              No recent activity
            </Typography>
          </Box>
        ) : (
          <Stack
            spacing={1.5}
            sx={{
              flex: 1,
              overflowY: "auto",
              maxHeight: { xs: 400, md: 500 },
              pr: 0.5,
            }}
          >
            {data.map((item, idx) => {
              const config = ICON_CONFIG[item.iconType] || ICON_CONFIG.default;
              const { Icon } = config;
              const isLast = idx === data.length - 1;

              return (
                <Stack
                  key={item._id}
                  direction="row"
                  spacing={1.5}
                  alignItems="flex-start"
                  sx={{ position: "relative" }}
                >
                  {/* Timeline dot + line */}
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: isDark
                          ? `${config.color}25`
                          : `${config.color}15`,
                        border: "2px solid",
                        borderColor: config.color,
                      }}
                    >
                      <Icon sx={{ fontSize: 16, color: config.color }} />
                    </Avatar>
                    {!isLast && (
                      <Box
                        sx={{
                          width: 2,
                          flex: 1,
                          minHeight: 20,
                          bgcolor: "divider",
                          mt: 0.5,
                        }}
                      />
                    )}
                  </Box>

                  {/* Content */}
                  <Box sx={{ flex: 1, minWidth: 0, pb: isLast ? 0 : 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        color: "text.primary",
                        lineHeight: 1.4,
                        mb: 0.3,
                      }}
                    >
                      {item.description}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={0.8}
                      alignItems="center"
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "0.7rem",
                          color: "text.secondary",
                          fontWeight: 600,
                        }}
                      >
                        {item.userName}
                      </Typography>
                      {item.userRole && (
                        <Chip
                          label={item.userRole}
                          size="small"
                          sx={{
                            height: 16,
                            fontSize: "0.58rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            bgcolor:
                              item.userRole === "admin"
                                ? isDark
                                  ? "rgba(245,166,35,0.2)"
                                  : "#FFF4E5"
                                : isDark
                                  ? "rgba(59,130,246,0.2)"
                                  : "#E0EBFF",
                            color:
                              item.userRole === "admin"
                                ? isDark
                                  ? "#FCD34D"
                                  : "#B45309"
                                : isDark
                                  ? "#93C5FD"
                                  : "#1E4D98",
                            "& .MuiChip-label": { px: 0.6 },
                          }}
                        />
                      )}
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "0.68rem",
                          color: "text.disabled",
                        }}
                      >
                        • {formatTimeAgo(item.createdAt)}
                      </Typography>
                    </Stack>
                  </Box>
                </Stack>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityTimeline;
