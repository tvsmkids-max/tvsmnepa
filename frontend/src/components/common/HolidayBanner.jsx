import React from "react";
import {
  Paper,
  Box,
  Stack,
  Typography,
  Chip,
  useTheme,
  alpha,
} from "@mui/material";
import BeachAccessOutlinedIcon from "@mui/icons-material/BeachAccessOutlined";
import WbSunnyOutlinedIcon from "@mui/icons-material/WbSunnyOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";

/**
 * Reusable Holiday/Non-Working Day banner
 *
 * Props:
 *   - isHoliday: boolean (true = holiday, false = non-working like Sunday)
 *   - holiday: { name, type, description } (if isHoliday)
 *   - today: { date, dayName } (always present)
 *   - nextWorkingDay: { date, dayName, label }
 *   - compact: boolean (smaller version)
 */
const HolidayBanner = ({
  isHoliday,
  holiday,
  today,
  nextWorkingDay,
  compact = false,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // Determine colors and content based on type
  const isHolidayType = isHoliday;

  const config = isHolidayType
    ? {
        color: "#16A34A",
        colorDark: "#4ADE80",
        bg: isDark ? alpha("#16A34A", 0.12) : "#F0FDF4",
        border: isDark ? alpha("#16A34A", 0.35) : "#BBF7D0",
        icon: BeachAccessOutlinedIcon,
        emoji: "🏖️",
        title: (holiday?.name || "Holiday").toUpperCase(),
        subtitle: holiday?.type || "Holiday",
        message:
          holiday?.description ||
          `Happy ${holiday?.name || "Holiday"}! 🎉 No attendance required today.`,
      }
    : {
        color: "#0EA5E9",
        colorDark: "#38BDF8",
        bg: isDark ? alpha("#0EA5E9", 0.12) : "#F0F9FF",
        border: isDark ? alpha("#0EA5E9", 0.35) : "#BAE6FD",
        icon: WbSunnyOutlinedIcon,
        emoji: "🌤️",
        title: (today?.dayName || "Weekend").toUpperCase(),
        subtitle: "Non-working Day",
        message: "No attendance required today. Enjoy your day off!",
      };

  const Icon = config.icon;
  const primaryColor = isDark ? config.colorDark : config.color;

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // ═══════════════════════════════════════════════════════════════
  //  COMPACT VARIANT (for smaller spaces)
  // ═══════════════════════════════════════════════════════════════
  if (compact) {
    return (
      <Paper
        sx={{
          p: 1.5,
          borderRadius: 2,
          border: "1px solid",
          borderColor: config.border,
          bgcolor: config.bg,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Icon sx={{ fontSize: 24, color: primaryColor, flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            fontWeight={800}
            sx={{ color: primaryColor, fontSize: "0.85rem" }}
          >
            {config.emoji} {config.title}
          </Typography>
          <Typography
            variant="caption"
            sx={{ fontSize: "0.7rem", color: "text.secondary" }}
          >
            {config.subtitle} · {formatDate(today?.date)}
          </Typography>
        </Box>
      </Paper>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  FULL VARIANT (default)
  // ═══════════════════════════════════════════════════════════════
  return (
    <Paper
      sx={{
        p: { xs: 2.5, sm: 3.5 },
        borderRadius: 2.5,
        border: "1px solid",
        borderColor: config.border,
        background: `linear-gradient(135deg, ${config.bg} 0%, ${isDark ? alpha(config.color, 0.03) : "#FFFFFF"} 100%)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative background emoji */}
      <Box
        sx={{
          position: "absolute",
          right: { xs: -20, sm: -10 },
          top: { xs: -20, sm: -10 },
          fontSize: { xs: 120, sm: 160 },
          opacity: 0.05,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {config.emoji}
      </Box>

      <Stack spacing={2} sx={{ position: "relative", zIndex: 1 }}>
        {/* Header row */}
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              width: { xs: 50, sm: 64 },
              height: { xs: 50, sm: 64 },
              borderRadius: "50%",
              bgcolor: isDark ? alpha(config.color, 0.2) : "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: `0 4px 12px ${alpha(config.color, 0.25)}`,
            }}
          >
            <Icon
              sx={{
                fontSize: { xs: 28, sm: 36 },
                color: primaryColor,
              }}
            />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              sx={{ mb: 0.5 }}
            >
              <Typography
                variant="h5"
                fontWeight={900}
                sx={{
                  color: primaryColor,
                  fontSize: { xs: "1.15rem", sm: "1.5rem" },
                  lineHeight: 1.1,
                }}
              >
                {config.emoji} {config.title}
              </Typography>
              <Chip
                label={config.subtitle}
                size="small"
                sx={{
                  fontWeight: 800,
                  height: 22,
                  fontSize: "0.65rem",
                  bgcolor: isDark ? alpha(config.color, 0.25) : "white",
                  color: primaryColor,
                  border: "1px solid",
                  borderColor: config.border,
                }}
              />
            </Stack>
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.75}
              sx={{ color: "text.secondary" }}
            >
              <CalendarMonthOutlinedIcon sx={{ fontSize: 14 }} />
              <Typography
                variant="caption"
                fontWeight={700}
                sx={{ fontSize: "0.75rem" }}
              >
                {formatDate(today?.date)}
              </Typography>
            </Stack>
          </Box>
        </Stack>

        {/* Message */}
        <Typography
          variant="body2"
          sx={{
            fontSize: { xs: "0.85rem", sm: "0.9rem" },
            color: "text.primary",
            fontWeight: 500,
            lineHeight: 1.5,
            pl: { sm: 10 },
          }}
        >
          {config.message}
        </Typography>

        {/* Next working day */}
        {nextWorkingDay && (
          <Box
            sx={{
              mt: 1,
              pt: 2,
              borderTop: "1px dashed",
              borderColor: config.border,
              pl: { sm: 10 },
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <EventAvailableOutlinedIcon
                sx={{
                  fontSize: 18,
                  color: primaryColor,
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.75rem",
                  color: "text.secondary",
                  fontWeight: 600,
                }}
              >
                Next working day:{" "}
                <Box
                  component="span"
                  sx={{ fontWeight: 800, color: primaryColor }}
                >
                  {nextWorkingDay.label || nextWorkingDay.dayName}
                </Box>
              </Typography>
            </Stack>
          </Box>
        )}
      </Stack>
    </Paper>
  );
};

export default HolidayBanner;
