import React from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Stack,
  Avatar,
  Chip,
  Divider,
  Button,
} from "@mui/material";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const SCHOOL_LOGO = import.meta.env.VITE_SCHOOL_LOGO || "/logo.png";

const InfoRow = ({ icon, label, value }) => (
  <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ py: 1 }}>
    <Box
      sx={{
        width: 36,
        height: 36,
        borderRadius: 2,
        bgcolor: "primary.50",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {React.cloneElement(icon, {
        sx: { fontSize: 18, color: "primary.main" },
      })}
    </Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontSize: "0.68rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          display: "block",
          mb: 0.2,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,
          color: "text.primary",
          wordBreak: "break-word",
        }}
      >
        {value || "—"}
      </Typography>
    </Box>
  </Stack>
);

const SchoolInfoSheet = ({ open, onClose, settings }) => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const schoolName = settings?.schoolName || "School";
  const sessionName =
    settings?.activeSession && typeof settings.activeSession === "object"
      ? settings.activeSession.name
      : null;

  const handleSettingsClick = () => {
    onClose?.();
    navigate("/settings");
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: "20px 20px 0 0",
          maxHeight: "85vh",
          overflow: "hidden",
          bgcolor: "background.paper",
          backgroundImage: "none",
        },
      }}
    >
      <Box sx={{ textAlign: "center", pt: 1.5, pb: 0.5 }}>
        <Box
          sx={{
            width: 40,
            height: 4,
            borderRadius: 2,
            bgcolor: "divider",
            mx: "auto",
          }}
        />
      </Box>

      {/* Navy gradient header (stays branded in both themes) */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
          px: 3,
          pt: 3,
          pb: 3,
          position: "relative",
          color: "white",
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            color: "white",
            bgcolor: "rgba(255,255,255,0.1)",
            "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
          }}
          size="small"
        >
          <CloseOutlinedIcon fontSize="small" />
        </IconButton>

        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            src={SCHOOL_LOGO}
            sx={{
              width: 64,
              height: 64,
              bgcolor: "white",
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
              "& img": { objectFit: "contain", p: 0.5 },
            }}
          >
            <SchoolOutlinedIcon sx={{ color: "#0D1B3E", fontSize: 32 }} />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0, pr: 4 }}>
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                display: "block",
              }}
            >
              School Name
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                lineHeight: 1.2,
                fontSize: "1rem",
                color: "white",
                wordBreak: "break-word",
              }}
            >
              {schoolName}
            </Typography>
            {sessionName && (
              <Chip
                icon={<SchoolOutlinedIcon sx={{ fontSize: 14 }} />}
                label={sessionName}
                size="small"
                sx={{
                  mt: 1,
                  height: 22,
                  bgcolor: "rgba(245,166,35,0.25)",
                  color: "#FFD580",
                  fontWeight: 700,
                  fontSize: "0.68rem",
                  border: "1px solid rgba(245,166,35,0.4)",
                  "& .MuiChip-icon": { color: "#FFD580" },
                }}
              />
            )}
          </Box>
        </Stack>
      </Box>

      <Box sx={{ px: 3, py: 2, overflow: "auto" }}>
        <Typography
          variant="caption"
          sx={{
            display: "block",
            color: "text.secondary",
            fontSize: "0.65rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            mb: 1,
          }}
        >
          Contact & Details
        </Typography>

        <Stack divider={<Divider flexItem />}>
          {settings?.address && (
            <InfoRow
              icon={<LocationOnOutlinedIcon />}
              label="Address"
              value={settings.address}
            />
          )}
          {settings?.phone && (
            <InfoRow
              icon={<PhoneOutlinedIcon />}
              label="Phone"
              value={settings.phone}
            />
          )}
          {settings?.email && (
            <InfoRow
              icon={<EmailOutlinedIcon />}
              label="Email"
              value={settings.email}
            />
          )}
          <InfoRow
            icon={<AccessTimeOutlinedIcon />}
            label="Attendance Hours"
            value={
              settings?.attendanceOpenTime && settings?.attendanceLockTime
                ? `${settings.attendanceOpenTime} — ${settings.attendanceLockTime}`
                : "Not set"
            }
          />
        </Stack>

        {isAdmin && (
          <Button
            fullWidth
            variant="outlined"
            startIcon={<SettingsOutlinedIcon />}
            endIcon={<ArrowForwardOutlinedIcon />}
            onClick={handleSettingsClick}
            sx={{
              mt: 2.5,
              mb: 1.5,
              py: 1.3,
              borderRadius: 2,
              fontWeight: 700,
              borderColor: "primary.main",
              color: "primary.main",
              justifyContent: "space-between",
              "&:hover": {
                bgcolor: "primary.50",
                borderColor: "primary.dark",
              },
            }}
          >
            <Box sx={{ flex: 1, textAlign: "left", ml: 1 }}>Full Settings</Box>
          </Button>
        )}

        <Box sx={{ textAlign: "center", py: 1 }}>
          <Typography
            variant="caption"
            sx={{ color: "text.disabled", fontSize: "0.65rem" }}
          >
            v{import.meta.env.VITE_APP_VERSION || "1.0.0"} • Developed by{" "}
            <strong style={{ color: "#1E4D98" }}>Abhishek</strong>
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
};

export default SchoolInfoSheet;
