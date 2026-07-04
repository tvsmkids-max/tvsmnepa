import React from "react";
import { Paper, Box, Typography, useTheme, alpha } from "@mui/material";

const StatCard = ({
  label,
  value,
  subtitle,
  icon: Icon,
  color = "primary",
  trend,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const colorMap = {
    primary: {
      main: isDark ? "#93C5FD" : "#1E4D98",
      bg: isDark ? alpha("#3B82F6", 0.12) : "#DBEAFE",
      border: isDark ? alpha("#3B82F6", 0.3) : "#BFDBFE",
    },
    success: {
      main: isDark ? "#86EFAC" : "#15803D",
      bg: isDark ? alpha("#16A34A", 0.12) : "#DCFCE7",
      border: isDark ? alpha("#16A34A", 0.3) : "#BBF7D0",
    },
    error: {
      main: isDark ? "#FCA5A5" : "#B91C1C",
      bg: isDark ? alpha("#DC2626", 0.12) : "#FEE2E2",
      border: isDark ? alpha("#DC2626", 0.3) : "#FECACA",
    },
    warning: {
      main: isDark ? "#FCD34D" : "#B45309",
      bg: isDark ? alpha("#F59E0B", 0.12) : "#FEF3C7",
      border: isDark ? alpha("#F59E0B", 0.3) : "#FDE68A",
    },
    info: {
      main: isDark ? "#A5B4FC" : "#4338CA",
      bg: isDark ? alpha("#6366F1", 0.12) : "#E0E7FF",
      border: isDark ? alpha("#6366F1", 0.3) : "#C7D2FE",
    },
    default: {
      main: "text.primary",
      bg: isDark ? alpha("#fff", 0.06) : "#F1F5F9",
      border: "divider",
    },
  };

  const c = colorMap[color] || colorMap.default;

  return (
    <Paper
      sx={{
        p: { xs: 1.25, sm: 1.75 },
        borderRadius: 2,
        border: "1px solid",
        borderColor: c.border,
        bgcolor: c.bg,
        textAlign: "center",
        height: "100%",
        transition: "transform 0.15s",
        "&:hover": { transform: "translateY(-2px)" },
      }}
    >
      {Icon && (
        <Box sx={{ mb: 0.3 }}>
          <Icon sx={{ fontSize: { xs: 18, sm: 22 }, color: c.main }} />
        </Box>
      )}
      <Typography
        variant="h5"
        fontWeight={900}
        sx={{
          fontSize: { xs: "1.1rem", sm: "1.4rem" },
          lineHeight: 1,
          color: c.main,
        }}
      >
        {value}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          fontSize: "0.6rem",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: c.main,
          display: "block",
          mt: 0.3,
        }}
      >
        {label}
      </Typography>
      {subtitle && (
        <Typography
          variant="caption"
          sx={{
            fontSize: "0.6rem",
            color: "text.secondary",
            display: "block",
            mt: 0.2,
          }}
        >
          {subtitle}
        </Typography>
      )}
      {trend !== undefined && trend !== null && (
        <Typography
          variant="caption"
          sx={{
            fontSize: "0.65rem",
            fontWeight: 700,
            color:
              trend > 0 ? "#16A34A" : trend < 0 ? "#DC2626" : "text.secondary",
            display: "block",
            mt: 0.3,
          }}
        >
          {trend > 0 ? "↑" : trend < 0 ? "↓" : "→"} {Math.abs(trend)}%
        </Typography>
      )}
    </Paper>
  );
};

export default StatCard;
