import React, { useState, useEffect } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  IconButton,
  Stack,
  Typography,
  Collapse,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";
import CloudDownloadOutlinedIcon from "@mui/icons-material/CloudDownloadOutlined";
import CloseIcon from "@mui/icons-material/Close";
import useAuth from "../../hooks/useAuth";
import { useBackupStats } from "../../hooks/useBackup";

const DISMISS_KEY = "sams_backup_banner_dismissed";
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

const WeeklyBackupBanner = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // Only fetch stats if user is admin
  const { data: stats } = useBackupStats({
    enabled: isAdmin,
    refetchOnMount: false,
  });

  // Check dismissal on mount
  useEffect(() => {
    try {
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt) {
        const elapsedMs = Date.now() - parseInt(dismissedAt, 10);
        if (elapsedMs < DISMISS_DURATION_MS) {
          setDismissed(true);
        } else {
          localStorage.removeItem(DISMISS_KEY);
        }
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  };

  const handleBackup = () => {
    navigate("/backup");
  };

  // Don't show if:
  // - Not admin
  // - No stats yet
  // - Dismissed (24h)
  // - Last backup was within 7 days
  if (!isAdmin || !stats || dismissed) return null;

  const daysSince = stats.daysSinceLastBackup;
  const neverBackedUp = stats.lastBackupAt === null;

  // Show only if never backed up OR 7+ days since last backup
  if (!neverBackedUp && (daysSince === null || daysSince < 7)) return null;

  const title = neverBackedUp
    ? "💾 Create your first backup"
    : `💾 Weekly backup reminder`;

  const message = neverBackedUp
    ? "Protect your school data by creating a backup. Takes less than a minute."
    : `It's been ${daysSince} days since your last backup. Time for a fresh one!`;

  return (
    <Collapse in={!dismissed}>
      <Alert
        severity={neverBackedUp ? "info" : "warning"}
        icon={<StorageOutlinedIcon />}
        sx={{
          mb: 2,
          borderRadius: 3,
          border: "1px solid",
          borderColor: neverBackedUp ? "info.light" : "warning.light",
          "& .MuiAlert-message": {
            width: "100%",
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
          },
          "& .MuiAlert-action": {
            alignItems: "center",
            pr: 0,
          },
        }}
        action={
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            sx={{ pl: 1 }}
          >
            <Button
              size="small"
              variant="contained"
              startIcon={<CloudDownloadOutlinedIcon />}
              onClick={handleBackup}
              color={neverBackedUp ? "info" : "warning"}
              sx={{
                fontWeight: 800,
                textTransform: "none",
                fontSize: "0.78rem",
                whiteSpace: "nowrap",
              }}
            >
              Backup Now
            </Button>
            <IconButton
              size="small"
              onClick={handleDismiss}
              sx={{ color: "text.secondary" }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        }
      >
        <Box>
          <AlertTitle sx={{ fontWeight: 800, mb: 0, fontSize: "0.92rem" }}>
            {title}
          </AlertTitle>
          <Typography variant="caption" sx={{ fontSize: "0.78rem" }}>
            {message}
          </Typography>
        </Box>
      </Alert>
    </Collapse>
  );
};

export default WeeklyBackupBanner;
