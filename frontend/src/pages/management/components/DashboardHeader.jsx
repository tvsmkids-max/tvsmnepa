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
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";

const SCHOOL_LOGO = import.meta.env.VITE_SCHOOL_LOGO || "/logo.png";
const SCHOOL_SHORT_NAME = "TVSM H. SEC. SCHOOL";

const DashboardHeader = ({ label, isRefetching, onRefresh, onPrint }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

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
      <Box sx={{ px: { xs: 1.5, sm: 2.5, md: 4 }, py: { xs: 1, sm: 1.25 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          {/* Logo */}
          <Box
            sx={{
              width: { xs: 36, sm: 42 },
              height: { xs: 36, sm: 42 },
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
              sx={{ width: "82%", height: "82%", objectFit: "contain" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </Box>

          {/* School Name */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body1"
              fontWeight={900}
              noWrap
              sx={{
                fontSize: { xs: "0.95rem", sm: "1.05rem" },
                color: "text.primary",
                letterSpacing: "0.02em",
              }}
              title="Thakur Virendra Singh Memorial H. Sec. School"
            >
              {SCHOOL_SHORT_NAME}
            </Typography>
          </Box>

          {/* Actions */}
          <Stack direction="row" spacing={1} alignItems="center">
            {/* Live Sync Pill */}
            <Chip
              icon={
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: isRefetching ? "#F59E0B" : "#16A34A",
                    ml: "8px !important",
                    animation: isRefetching
                      ? "pulseLoading 1s ease-in-out infinite"
                      : "pulseLive 2s ease-in-out infinite",
                    "@keyframes pulseLive": {
                      "0%, 100%": {
                        boxShadow: `0 0 0 0 ${alpha("#16A34A", 0.6)}`,
                      },
                      "50%": {
                        boxShadow: `0 0 0 4px ${alpha("#16A34A", 0)}`,
                      },
                    },
                    "@keyframes pulseLoading": {
                      "0%, 100%": { opacity: 1 },
                      "50%": { opacity: 0.3 },
                    },
                  }}
                />
              }
              label={isRefetching ? "Syncing" : "Live sync"}
              size="small"
              sx={{
                height: 26,
                fontSize: "0.72rem",
                fontWeight: 700,
                bgcolor: isDark ? alpha("#16A34A", 0.15) : "#DCFCE7",
                color: isDark ? "#86EFAC" : "#15803D",
                border: "1px solid",
                borderColor: isDark ? alpha("#16A34A", 0.3) : "#BBF7D0",
                "& .MuiChip-label": { pl: 1, pr: 1.25 },
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
