import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  IconButton,
  Avatar,
  Button,
  CircularProgress,
  Tooltip,
  Card,
  CardContent,
} from "@mui/material";
import { useSnackbar } from "notistack";
import NotificationsIcon from "@mui/icons-material/Notifications";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import WarningIcon from "@mui/icons-material/Warning";
import InfoIcon from "@mui/icons-material/Info";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import notificationApi from "../../api/notificationApi";

const TYPE_CONFIG = {
  info: { icon: <InfoIcon />, color: "info", bg: "#E0EBFF" },
  warning: { icon: <WarningIcon />, color: "warning", bg: "#FFF4E5" },
  alert: { icon: <ErrorIcon />, color: "error", bg: "#FEE2E2" },
  success: { icon: <CheckCircleIcon />, color: "success", bg: "#E6F4EA" },
};

const NotificationsPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await notificationApi.list();
        if (!cancelled) {
          setNotifications(res.data?.data || []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setNotifications([]);
          setLoading(false);
          enqueueSnackbar(err.response?.data?.message || "Failed to load", {
            variant: "error",
          });
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, enqueueSnackbar]);

  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleMarkRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      triggerRefresh();
    } catch {
      enqueueSnackbar("Failed", { variant: "error" });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      enqueueSnackbar("All marked read", { variant: "success" });
      triggerRefresh();
    } catch {
      enqueueSnackbar("Failed", { variant: "error" });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActionLoading(true);
    try {
      await notificationApi.delete(confirmDelete._id);
      enqueueSnackbar("Deleted", { variant: "success" });
      setConfirmDelete(null);
      triggerRefresh();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Failed", {
        variant: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      await notificationApi.checkPendingNow();
      enqueueSnackbar("Check completed", { variant: "success" });
      triggerRefresh();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Failed", {
        variant: "error",
      });
    } finally {
      setChecking(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

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
      year: "numeric",
    });
  };

  return (
    <Box>
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread of ${notifications.length} total • Auto-checks daily at attendance lock time`}
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Notifications" },
        ]}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PlayArrowIcon />}
              onClick={handleCheckNow}
              disabled={checking}
            >
              {checking ? "Checking..." : "Check Now"}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={triggerRefresh}
            >
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="contained"
                size="small"
                startIcon={<DoneAllIcon />}
                onClick={handleMarkAllRead}
              >
                Mark All Read
              </Button>
            )}
          </Stack>
        }
      />

      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ p: 6, textAlign: "center" }}>
            <CircularProgress />
          </Box>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<NotificationsIcon sx={{ fontSize: 64 }} />}
            title="No notifications yet"
            message="System will automatically notify you when teachers haven't marked attendance by the lock time."
          />
        ) : (
          <Box>
            {notifications.map((n, idx) => {
              const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
              const isLast = idx === notifications.length - 1;
              return (
                <Box
                  key={n._id}
                  sx={{
                    p: 2.5,
                    display: "flex",
                    gap: 2,
                    alignItems: "flex-start",
                    borderBottom: isLast ? "none" : "1px solid",
                    borderColor: "divider",
                    bgcolor: n.isRead ? "transparent" : "#F8FAFF",
                    cursor: "pointer",
                    transition: "background-color 0.15s",
                    "&:hover": { bgcolor: "#F0F4FF" },
                  }}
                  onClick={() => !n.isRead && handleMarkRead(n._id)}
                >
                  <Avatar
                    sx={{
                      width: 44,
                      height: 44,
                      bgcolor: config.bg,
                      flexShrink: 0,
                    }}
                  >
                    {React.cloneElement(config.icon, {
                      sx: { color: `${config.color}.dark` },
                    })}
                  </Avatar>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ mb: 0.5 }}
                    >
                      <Typography
                        variant="body2"
                        fontWeight={n.isRead ? 600 : 800}
                        sx={{ flex: 1 }}
                      >
                        {n.title}
                      </Typography>
                      {!n.isRead && (
                        <Chip
                          label="NEW"
                          size="small"
                          color="primary"
                          sx={{
                            height: 18,
                            fontSize: "0.6rem",
                            fontWeight: 800,
                          }}
                        />
                      )}
                    </Stack>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1, fontWeight: n.isRead ? 400 : 500 }}
                    >
                      {n.message}
                    </Typography>

                    {/* Show pending class details if metadata exists */}
                    {n.metadata?.classes?.length > 0 && (
                      <Box
                        sx={{
                          p: 1.5,
                          mt: 1,
                          mb: 1,
                          borderRadius: 2,
                          bgcolor: "rgba(245,166,35,0.1)",
                          border: "1px solid",
                          borderColor: "warning.light",
                        }}
                      >
                        <Typography
                          variant="caption"
                          fontWeight={800}
                          color="warning.dark"
                          sx={{
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            display: "block",
                            mb: 1,
                          }}
                        >
                          Pending Classes ({n.metadata.classes.length})
                        </Typography>
                        <Stack spacing={0.5}>
                          {n.metadata.classes.map((cls, i) => (
                            <Stack
                              key={i}
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <Chip
                                label={`${cls.name}-${cls.section}`}
                                size="small"
                                sx={{
                                  height: 22,
                                  fontWeight: 700,
                                  fontSize: "0.7rem",
                                  bgcolor: "white",
                                  border: "1px solid",
                                  borderColor: "warning.light",
                                }}
                              />
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontSize: "0.7rem" }}
                              >
                                {cls.teacher}
                              </Typography>
                            </Stack>
                          ))}
                        </Stack>
                      </Box>
                    )}

                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      flexWrap="wrap"
                    >
                      <Typography variant="caption" color="text.secondary">
                        {formatTime(n.createdAt)}
                      </Typography>
                      <Chip
                        label={n.type}
                        size="small"
                        color={config.color}
                        variant="outlined"
                        sx={{
                          height: 18,
                          fontSize: "0.62rem",
                          textTransform: "uppercase",
                        }}
                      />
                    </Stack>
                  </Box>

                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(n);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              );
            })}
          </Box>
        )}
      </Paper>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Notification"
        message={`Delete "${confirmDelete?.title}"?`}
        confirmText="Delete"
        severity="error"
        loading={actionLoading}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </Box>
  );
};

export default NotificationsPage;
