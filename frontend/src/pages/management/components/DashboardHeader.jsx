import React from "react";
import {
  Box,
  Stack,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  useTheme,
  alpha,
} from "@mui/material";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

const SCHOOL_NAME =
  import.meta.env.VITE_SCHOOL_NAME ||
  "Thakur Virendra Singh Memorial H. Sec. School";
const SCHOOL_LOGO = import.meta.env.VITE_SCHOOL_LOGO || "/logo.png";

const DashboardHeader = ({
  label,
  lastUpdated,
  isRefetching,
  onRefresh,
  onPrint,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const now = new Date();
  const todayStr = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const lastUpdatedStr = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <Box
      sx={{
        bgcolor: isDark ? "#0F172A" : "#FFFFFF",
        borderBottom: "1px solid",
        borderColor: "divider",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <Box sx={{ px: { xs: 1.5, sm: 2.5 }, py: { xs: 1, sm: 1.5 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          {/* Logo */}
          <Box
            sx={{
              width: { xs: 34, sm: 40 },
              height: { xs: 34, sm: 40 },
              borderRadius: 1.5,
              bgcolor: isDark ? "#1E293B" : "#F1F5F9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <Box
              component="img"
              src={SCHOOL_LOGO}
              alt="Logo"
              sx={{
                width: "80%",
                height: "80%",
                objectFit: "contain",
              }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.parentElement.innerHTML =
                  '<span style="font-size:1rem;font-weight:900;color:#1E4D98">🏫</span>';
              }}
            />
          </Box>

          {/* School Info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              fontWeight={800}
              noWrap
              sx={{
                fontSize: { xs: "0.85rem", sm: "0.95rem" },
                color: "text.primary",
                lineHeight: 1.2,
              }}
              title={SCHOOL_NAME}
            >
              {SCHOOL_NAME}
            </Typography>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mt: 0.15 }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontSize: { xs: "0.65rem", sm: "0.7rem" },
                  fontWeight: 600,
                }}
                noWrap
              >
                Management View · {todayStr}
              </Typography>
            </Stack>
          </Box>

          {/* Actions */}
          <Stack direction="row" spacing={0.5} alignItems="center">
            {/* Last updated indicator */}
            <Chip
              icon={<CheckCircleOutlineIcon sx={{ fontSize: 12 }} />}
              label={`Updated: ${lastUpdatedStr}`}
              size="small"
              sx={{
                height: 22,
                fontSize: "0.62rem",
                fontWeight: 700,
                display: { xs: "none", sm: "flex" },
                bgcolor: isDark ? alpha("#16A34A", 0.15) : "#DCFCE7",
                color: isDark ? "#86EFAC" : "#15803D",
                "& .MuiChip-icon": {
                  color: "inherit",
                  marginLeft: "6px",
                },
              }}
            />

            {/* Refresh */}
            <Tooltip title="Refresh data">
              <IconButton
                size="small"
                onClick={onRefresh}
                disabled={isRefetching}
                sx={{
                  color: "text.secondary",
                  "&:hover": {
                    color: isDark ? "#93C5FD" : "#1E4D98",
                    bgcolor: isDark
                      ? alpha("#3B82F6", 0.1)
                      : alpha("#1E4D98", 0.06),
                  },
                }}
              >
                <RefreshOutlinedIcon
                  sx={{
                    fontSize: 18,
                    animation: isRefetching
                      ? "spin 1s linear infinite"
                      : "none",
                    "@keyframes spin": {
                      from: { transform: "rotate(0deg)" },
                      to: { transform: "rotate(360deg)" },
                    },
                  }}
                />
              </IconButton>
            </Tooltip>

            {/* Print */}
            <Tooltip title="Print report">
              <IconButton
                size="small"
                onClick={onPrint}
                sx={{
                  color: "text.secondary",
                  "&:hover": {
                    color: isDark ? "#93C5FD" : "#1E4D98",
                    bgcolor: isDark
                      ? alpha("#3B82F6", 0.1)
                      : alpha("#1E4D98", 0.06),
                  },
                }}
              >
                <PrintOutlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
};

export default DashboardHeader;
