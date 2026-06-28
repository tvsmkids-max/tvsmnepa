import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  Box,
  Typography,
  Stack,
  Chip,
  Button,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import BeachAccessOutlinedIcon from "@mui/icons-material/BeachAccessOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";

const TYPE_CONFIG = {
  National: {
    bg: "#FEE2E2",
    text: "#991B1B",
    border: "#FECACA",
    grad: "linear-gradient(135deg, #DC2626, #EF4444)",
    icon: <FlagOutlinedIcon />,
  },
  School: {
    bg: "#E0EBFF",
    text: "#1E4D98",
    border: "#BFDBFE",
    grad: "linear-gradient(135deg, #1E4D98, #3B82F6)",
    icon: <SchoolOutlinedIcon />,
  },
  Vacation: {
    bg: "#FEF3C7",
    text: "#92400E",
    border: "#FCD34D",
    grad: "linear-gradient(135deg, #F59E0B, #FBBF24)",
    icon: <BeachAccessOutlinedIcon />,
  },
};

const HolidayCard = ({ holiday, isAdmin, onEdit, onDelete }) => {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const menuOpen = Boolean(menuAnchor);

  const config = TYPE_CONFIG[holiday.type] || TYPE_CONFIG.School;

  // Compute holiday state (past, today, upcoming)
  const holidayState = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(holiday.date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = holiday.endDate
      ? new Date(holiday.endDate)
      : new Date(holiday.date);
    endDate.setHours(23, 59, 59, 999);

    const todayMs = today.getTime();
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    if (todayMs >= startMs && todayMs <= endMs) {
      return { label: "Today", color: "success", isToday: true, isPast: false };
    }
    if (startMs < todayMs) {
      return { label: "Past", color: "default", isToday: false, isPast: true };
    }

    const diffDays = Math.ceil((startMs - todayMs) / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) {
      return {
        label: `In ${diffDays}d`,
        color: "warning",
        isToday: false,
        isPast: false,
      };
    }
    return {
      label: "Upcoming",
      color: "info",
      isToday: false,
      isPast: false,
    };
  }, [holiday.date, holiday.endDate]);

  // Format dates
  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const formatDateShort = (d) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });

  const dayName = new Date(holiday.date).toLocaleDateString("en-IN", {
    weekday: "long",
  });

  // Calculate duration
  const durationDays = useMemo(() => {
    if (!holiday.endDate) return 1;
    const start = new Date(holiday.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(holiday.endDate);
    end.setHours(0, 0, 0, 0);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  }, [holiday.date, holiday.endDate]);

  const handleMenuOpen = (e) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  };
  const handleMenuClose = () => setMenuAnchor(null);

  const handleAction = (action, e) => {
    e?.stopPropagation();
    handleMenuClose();
    action?.(holiday);
  };

  return (
    <Card
      sx={{
        borderRadius: 2.5,
        transition: "all 0.2s ease",
        border: "1.5px solid",
        borderColor: holidayState.isToday
          ? "success.main"
          : holidayState.isPast
            ? "divider"
            : config.border,
        bgcolor: "background.paper",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        opacity: holidayState.isPast ? 0.7 : 1,
        "&:hover": {
          borderColor: "primary.main",
          transform: "translateY(-2px)",
          boxShadow: "0 8px 16px rgba(13,27,62,0.12)",
        },
      }}
    >
      {/* Top-right state badge */}
      <Box
        sx={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 1,
        }}
      >
        <Chip
          label={holidayState.label}
          size="small"
          color={holidayState.color}
          sx={{
            fontWeight: 800,
            fontSize: "0.65rem",
            height: 20,
          }}
        />
      </Box>

      <CardContent
        sx={{
          p: 2,
          pb: "0 !important",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header with icon */}
        <Stack direction="row" spacing={1.5} sx={{ mb: 1.5, pr: 8 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              background: config.grad,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              flexShrink: 0,
              boxShadow: "0 3px 10px rgba(0,0,0,0.12)",
            }}
          >
            {React.cloneElement(config.icon, { sx: { fontSize: 22 } })}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body1"
              fontWeight={800}
              sx={{
                fontSize: "0.95rem",
                lineHeight: 1.2,
                mb: 0.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: "text.primary",
              }}
              title={holiday.name}
            >
              {holiday.name}
            </Typography>
            <Chip
              label={holiday.type}
              size="small"
              sx={{
                bgcolor: config.bg,
                color: config.text,
                fontWeight: 800,
                height: 20,
                fontSize: "0.68rem",
              }}
            />
          </Box>
        </Stack>

        <Divider sx={{ mb: 1.2 }} />

        {/* Date Info */}
        <Stack spacing={0.6}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CalendarMonthOutlinedIcon
              sx={{ fontSize: 14, color: "text.secondary" }}
            />
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{
                fontSize: "0.82rem",
                color: "text.primary",
                flex: 1,
              }}
            >
              {holiday.endDate ? (
                <>
                  {formatDateShort(holiday.date)} →{" "}
                  {formatDateShort(holiday.endDate)}
                </>
              ) : (
                formatDate(holiday.date)
              )}
            </Typography>
          </Stack>

          {/* Day name + Duration */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.72rem",
                color: "text.secondary",
                fontWeight: 600,
                ml: 2.6,
              }}
            >
              {dayName}
            </Typography>

            {durationDays > 1 && (
              <Chip
                label={`${durationDays} days`}
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  bgcolor: "primary.50",
                  color: "primary.dark",
                }}
              />
            )}
          </Stack>

          {/* Description */}
          {holiday.description && (
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.72rem",
                color: "text.secondary",
                mt: 0.3,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                textOverflow: "ellipsis",
                lineHeight: 1.4,
              }}
              title={holiday.description}
            >
              {holiday.description}
            </Typography>
          )}

          {/* Attendance status */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.6}
            sx={{ mt: 0.5 }}
          >
            {holiday.allowAttendance ? (
              <>
                <EventAvailableOutlinedIcon
                  sx={{ fontSize: 14, color: "success.dark" }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: "success.dark",
                  }}
                >
                  Attendance Allowed
                </Typography>
              </>
            ) : (
              <>
                <EventBusyOutlinedIcon
                  sx={{ fontSize: 14, color: "text.secondary" }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: "text.secondary",
                  }}
                >
                  Attendance Blocked
                </Typography>
              </>
            )}
          </Stack>
        </Stack>
      </CardContent>

      {/* Actions Footer (Admin only) */}
      {isAdmin && (
        <Box
          sx={{
            mt: 1.5,
            borderTop: "1px solid",
            borderColor: "divider",
            bgcolor: "action.hover",
            display: "flex",
            gap: 0.5,
            p: 0.5,
          }}
        >
          <Button
            size="small"
            startIcon={<EditOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={(e) => handleAction(onEdit, e)}
            sx={{
              flex: 1,
              minWidth: 0,
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "none",
              color: "primary.main",
              py: 0.6,
              "&:hover": { bgcolor: "primary.50" },
            }}
          >
            Edit
          </Button>

          <Tooltip title="More actions">
            <IconButton
              size="small"
              onClick={handleMenuOpen}
              sx={{
                width: 32,
                height: 32,
                color: "text.secondary",
              }}
            >
              <MoreVertIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={menuAnchor}
            open={menuOpen}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            PaperProps={{
              elevation: 0,
              sx: {
                mt: 0.5,
                minWidth: 180,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
              },
            }}
          >
            <MenuItem
              onClick={(e) => handleAction(onDelete, e)}
              sx={{
                py: 1,
                fontSize: "0.85rem",
                color: "error.main",
                "&:hover": { bgcolor: "error.50" },
              }}
            >
              <ListItemIcon>
                <DeleteOutlineOutlinedIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText
                primary="Delete"
                primaryTypographyProps={{
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  color: "error.main",
                }}
              />
            </MenuItem>
          </Menu>
        </Box>
      )}
    </Card>
  );
};

export default HolidayCard;
