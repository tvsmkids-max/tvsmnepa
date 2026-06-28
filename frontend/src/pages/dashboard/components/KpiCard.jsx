import React from "react";
import { Card, CardContent, Box, Typography, Stack, Chip } from "@mui/material";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined";
import TrendingFlatOutlinedIcon from "@mui/icons-material/TrendingFlatOutlined";
import useThemeMode from "../../../hooks/useThemeMode";

const KpiCard = ({
  title,
  value,
  suffix,
  icon,
  color = "primary",
  trend = null,
  trendInverse = false, // For metrics where "down" is good (e.g., absent count)
  subtitle,
  onClick,
  loading = false,
}) => {
  const { isDark } = useThemeMode();

  // Color palette mapping
  const palette = {
    primary: {
      bg: isDark ? "rgba(59,130,246,0.12)" : "#F0F4FF",
      iconBg: isDark ? "rgba(59,130,246,0.2)" : "#DBEAFE",
      iconColor: isDark ? "#60A5FA" : "#1E4D98",
      text: isDark ? "#93C5FD" : "#1E4D98",
      border: isDark ? "rgba(59,130,246,0.3)" : "#BFDBFE",
    },
    success: {
      bg: isDark ? "rgba(34,197,94,0.12)" : "#E6F4EA",
      iconBg: isDark ? "rgba(34,197,94,0.2)" : "#C6F6D5",
      iconColor: isDark ? "#4ADE80" : "#15803D",
      text: isDark ? "#86EFAC" : "#15803D",
      border: isDark ? "rgba(34,197,94,0.3)" : "#A7F3D0",
    },
    error: {
      bg: isDark ? "rgba(239,68,68,0.12)" : "#FEE2E2",
      iconBg: isDark ? "rgba(239,68,68,0.2)" : "#FECACA",
      iconColor: isDark ? "#F87171" : "#B91C1C",
      text: isDark ? "#FCA5A5" : "#B91C1C",
      border: isDark ? "rgba(239,68,68,0.3)" : "#FECACA",
    },
    warning: {
      bg: isDark ? "rgba(245,158,11,0.12)" : "#FFF4E5",
      iconBg: isDark ? "rgba(245,158,11,0.2)" : "#FED7AA",
      iconColor: isDark ? "#FBBF24" : "#92400E",
      text: isDark ? "#FCD34D" : "#92400E",
      border: isDark ? "rgba(245,158,11,0.3)" : "#FED7AA",
    },
    info: {
      bg: isDark ? "rgba(14,165,233,0.12)" : "#E0F2FE",
      iconBg: isDark ? "rgba(14,165,233,0.2)" : "#BAE6FD",
      iconColor: isDark ? "#38BDF8" : "#0369A1",
      text: isDark ? "#7DD3FC" : "#0369A1",
      border: isDark ? "rgba(14,165,233,0.3)" : "#BAE6FD",
    },
  };

  const styles = palette[color] || palette.primary;

  // Trend logic
  const renderTrend = () => {
    if (trend === null || trend === undefined) return null;

    const isUp = trend > 0;
    const isDown = trend < 0;
    const isFlat = trend === 0;

    // Determine if trend is "good" or "bad"
    let trendColor;
    if (isFlat) {
      trendColor = "text.secondary";
    } else {
      const actuallyGood = trendInverse ? isDown : isUp;
      trendColor = actuallyGood
        ? isDark
          ? "#4ADE80"
          : "success.dark"
        : isDark
          ? "#F87171"
          : "error.dark";
    }

    const TrendIcon = isFlat
      ? TrendingFlatOutlinedIcon
      : isUp
        ? TrendingUpOutlinedIcon
        : TrendingDownOutlinedIcon;

    const absVal = Math.abs(trend);
    const prefix = isUp ? "+" : isDown ? "−" : "";

    return (
      <Stack direction="row" alignItems="center" spacing={0.3}>
        <TrendIcon sx={{ fontSize: 14, color: trendColor }} />
        <Typography
          variant="caption"
          fontWeight={800}
          sx={{ color: trendColor, fontSize: "0.7rem" }}
        >
          {prefix}
          {absVal}
          {suffix === "%" ? "%" : ""}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: "text.disabled", fontSize: "0.65rem" }}
        >
          vs yesterday
        </Typography>
      </Stack>
    );
  };

  return (
    <Card
      onClick={onClick}
      sx={{
        height: "100%",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s ease",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        "&:hover": onClick
          ? {
              transform: "translateY(-2px)",
              boxShadow: isDark
                ? "0 8px 16px rgba(0,0,0,0.4)"
                : "0 8px 16px rgba(0,0,0,0.1)",
              borderColor: styles.border,
            }
          : {},
      }}
    >
      <CardContent sx={{ p: { xs: 1.8, sm: 2.2 } }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          sx={{ mb: 1.5 }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 700,
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                display: "block",
                mb: 0.5,
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="h4"
              fontWeight={900}
              sx={{
                color: "text.primary",
                fontSize: { xs: "1.6rem", sm: "1.8rem" },
                lineHeight: 1,
              }}
            >
              {loading ? "—" : value}
              {suffix && (
                <Typography
                  component="span"
                  variant="h6"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 700,
                    fontSize: "1rem",
                    ml: 0.3,
                  }}
                >
                  {suffix}
                </Typography>
              )}
            </Typography>
          </Box>

          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: styles.iconBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {React.cloneElement(icon, {
              sx: { color: styles.iconColor, fontSize: 22 },
            })}
          </Box>
        </Stack>

        {(trend !== null || subtitle) && (
          <Box sx={{ mt: 1 }}>
            {trend !== null && renderTrend()}
            {subtitle && !trend && (
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontSize: "0.7rem",
                  display: "block",
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default KpiCard;
