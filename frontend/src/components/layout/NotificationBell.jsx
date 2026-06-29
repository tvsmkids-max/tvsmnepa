import React, { useState, useEffect, useCallback } from "react";
import {
  IconButton,
  Badge,
  Tooltip,
  Popover,
  Box,
  Typography,
  Stack,
  Divider,
  Button,
  Avatar,
  CircularProgress,
  Chip,
  Skeleton,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import DoneAllOutlinedIcon from "@mui/icons-material/DoneAllOutlined";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import NotificationsOffOutlinedIcon from "@mui/icons-material/NotificationsOffOutlined";
import { useSnackbar } from "notistack";
import useNotifications from "../../hooks/useNotifications";
import useThemeMode from "../../hooks/useThemeMode";

const PREVIEW_LIMIT = 5;

const TYPE_CONFIG = {
  info: {
    icon: <InfoOutlinedIcon />,
    color: "info",
    bg: "#E0EBFF",
    iconColor: "#1976D2",
  },
  warning: {
    icon: <WarningAmberOutlinedIcon />,
    color: "warning",
    bg: "#FFF4E5",
    iconColor: "#E65100",
  },
  alert: {
    icon: <ErrorOutlineOutlinedIcon />,
    color: "error",
    bg: "#FEE2E2",
    iconColor: "#C62828",
  },
  success: {
    icon: <CheckCircleOutlineOutlinedIcon />,
    color: "success",
    bg: "#E6F4EA",
    iconColor: "#2E7D32",
  },
};

const formatTime = (date) => {
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
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
};

const NotificationItem = ({ notification, onClick }) => {
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.info;
  const isUnread = !notification.isRead;

  return (
    <Box
      onClick={() => onClick(notification)}
      sx={{
        p: 1.5,
        display: "flex",
        gap: 1.5,
        alignItems: "flex-start",
        cursor: "pointer",
        borderRadius: 1.5,
        transition: "all 0.15s",
        bgcolor: isUnread ? "#F8FAFF" : "transparent",
        position: "relative",
        "&:hover": {
          bgcolor: "#F0F4FF",
        },
      }}
    >
      {/* Unread indicator dot */}
      {isUnread && (
        <Box
          sx={{
            position: "absolute",
            top: 14,
            left: 6,
            width: 6,
            height: 6,
            borderRadius: "50%",
            bgcolor: "primary.main",
          }}
        />
      )}
      <Avatar
        sx={{
          width: 36,
          height: 36,
          bgcolor: config.bg,
          flexShrink: 0,
          ml: isUnread ? 1 : 0,
        }}
      >
        {React.cloneElement(config.icon, {
          sx: { color: config.iconColor, fontSize: 18 },
        })}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          fontWeight={isUnread ? 800 : 600}
          sx={{
            fontSize: "0.82rem",
            lineHeight: 1.3,
            mb: 0.3,
            color: "text.primary",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            textOverflow: "ellipsis",
          }}
        >
          {notification.title}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            fontSize: "0.72rem",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textOverflow: "ellipsis",
            mb: 0.5,
            lineHeight: 1.3,
          }}
        >
          {notification.message}
        </Typography>
        <Stack direction="row" spacing={0.8} alignItems="center">
          <Typography
            variant="caption"
            sx={{
              fontSize: "0.66rem",
              color: "text.disabled",
              fontWeight: 600,
            }}
          >
            {formatTime(notification.createdAt)}
          </Typography>
          {isUnread && (
            <Chip
              label="NEW"
              size="small"
              sx={{
                height: 14,
                fontSize: "0.55rem",
                fontWeight: 800,
                bgcolor: "primary.main",
                color: "white",
                "& .MuiChip-label": { px: 0.6 },
              }}
            />
          )}
        </Stack>
      </Box>
    </Box>
  );
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const { isDark } = useThemeMode();
  const { enqueueSnackbar } = useSnackbar();
  const { unreadCount, fetchList, markAsRead, markAllRead, refresh } =
    useNotifications();

  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [listLoading, setListLoading] = useState(false);

  const isOpen = Boolean(anchorEl);

  // Load list when popover opens
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const load = async () => {
      setListLoading(true);
      const data = await fetchList();
      if (!cancelled) {
        setNotifications(data.slice(0, PREVIEW_LIMIT));
        setListLoading(false);
      }
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [isOpen, fetchList]);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleNotificationClick = useCallback(
    async (notification) => {
      // Mark as read if unread
      if (!notification.isRead) {
        await markAsRead(notification._id);
        // Update local list optimistically
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notification._id ? { ...n, isRead: true } : n,
          ),
        );
      }

      // Close popover
      handleClose();

      // Navigate to link if available
      if (notification.link) {
        navigate(notification.link);
      }
    },
    [markAsRead, navigate],
  );

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    const ok = await markAllRead();
    if (ok) {
      enqueueSnackbar("All marked as read", { variant: "success" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } else {
      enqueueSnackbar("Failed to mark all as read", { variant: "error" });
    }
  };

  const handleViewAll = () => {
    handleClose();
    navigate("/notifications");
  };

  return (
    <>
      <Tooltip
        title={unreadCount > 0 ? `${unreadCount} unread` : "Notifications"}
      >
        <IconButton
          onClick={handleOpen}
          sx={{
            color: isDark ? "#F9FAFB" : "#111827",
            bgcolor: "rgba(255,255,255,0.1)",
            "&:hover": { bgcolor: "rgba(255,255,255,0.18)" },
            borderRadius: 2,
            width: { xs: 38, sm: 40 },
            height: { xs: 38, sm: 40 },
            position: "relative",
          }}
        >
          <Badge
            badgeContent={unreadCount}
            color="error"
            max={99}
            overlap="circular"
            sx={{
              "& .MuiBadge-badge": {
                fontWeight: 800,
                fontSize: "0.6rem",
                minWidth: 18,
                height: 18,
                border: "2px solid",
                borderColor: "#1A3A7A",
                animation: unreadCount > 0 ? "pulse 2s infinite" : "none",
                "@keyframes pulse": {
                  "0%": { transform: "scale(1)" },
                  "50%": { transform: "scale(1.1)" },
                  "100%": { transform: "scale(1)" },
                },
              },
            }}
          >
            {unreadCount > 0 ? (
              <NotificationsActiveOutlinedIcon sx={{ fontSize: 22 }} />
            ) : (
              <NotificationsOutlinedIcon sx={{ fontSize: 22 }} />
            )}
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={isOpen}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1.5,
              width: { xs: "calc(100vw - 24px)", sm: 380 },
              maxWidth: 400,
              maxHeight: "75vh",
              borderRadius: 2.5,
              boxShadow: "0 12px 32px rgba(0,0,0,0.15)",
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
            },
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
            color: "white",
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <NotificationsOutlinedIcon sx={{ fontSize: 20 }} />
              <Typography variant="body1" fontWeight={800}>
                Notifications
              </Typography>
              {unreadCount > 0 && (
                <Chip
                  label={unreadCount}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    bgcolor: "#F5A623",
                    color: "white",
                    "& .MuiChip-label": { px: 0.8 },
                  }}
                />
              )}
            </Stack>
            {unreadCount > 0 && (
              <Button
                size="small"
                startIcon={<DoneAllOutlinedIcon sx={{ fontSize: 16 }} />}
                onClick={handleMarkAllRead}
                sx={{
                  color: "white",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  bgcolor: "rgba(255,255,255,0.15)",
                  textTransform: "none",
                  px: 1.2,
                  py: 0.4,
                  "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
                }}
              >
                Mark all read
              </Button>
            )}
          </Stack>
        </Box>

        {/* Body */}
        <Box
          sx={{
            maxHeight: 420,
            overflow: "auto",
            bgcolor: "#FAFBFD",
          }}
        >
          {listLoading ? (
            <Box sx={{ p: 1 }}>
              {[1, 2, 3].map((i) => (
                <Stack
                  key={i}
                  direction="row"
                  spacing={1.5}
                  sx={{ p: 1.5 }}
                  alignItems="center"
                >
                  <Skeleton variant="circular" width={36} height={36} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton width="70%" height={16} />
                    <Skeleton width="90%" height={14} />
                    <Skeleton width="30%" height={12} />
                  </Box>
                </Stack>
              ))}
            </Box>
          ) : notifications.length === 0 ? (
            <Box
              sx={{
                py: 5,
                textAlign: "center",
                color: "text.secondary",
              }}
            >
              <NotificationsOffOutlinedIcon
                sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
              />
              <Typography variant="body2" fontWeight={700}>
                No notifications yet
              </Typography>
              <Typography
                variant="caption"
                sx={{ display: "block", mt: 0.5, fontSize: "0.72rem" }}
              >
                You're all caught up!
              </Typography>
            </Box>
          ) : (
            <Stack divider={<Divider />}>
              {notifications.map((n) => (
                <NotificationItem
                  key={n._id}
                  notification={n}
                  onClick={handleNotificationClick}
                />
              ))}
            </Stack>
          )}
        </Box>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Divider />
            <Button
              fullWidth
              onClick={handleViewAll}
              endIcon={<ArrowForwardOutlinedIcon sx={{ fontSize: 16 }} />}
              sx={{
                py: 1.3,
                fontWeight: 700,
                fontSize: "0.82rem",
                borderRadius: 0,
                color: "primary.main",
                "&:hover": {
                  bgcolor: "primary.50",
                },
              }}
            >
              View All Notifications
            </Button>
          </>
        )}
      </Popover>
    </>
  );
};

export default NotificationBell;
