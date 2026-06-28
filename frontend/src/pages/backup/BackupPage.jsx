import React from "react";
import {
  Box,
  Typography,
  Breadcrumbs,
  Link,
  Stack,
  Grid,
  Alert,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";

import BackupStatsCard from "./components/BackupStatsCard";
import BackupCard from "./components/BackupCard";
import RestoreCard from "./components/RestoreCard";

import { useBackupStats, useDownloadBackup } from "../../hooks/useBackup";

const BackupPage = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useBackupStats();
  const downloadMutation = useDownloadBackup();

  return (
    <Box sx={{ pb: { xs: 10, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 2.5 }}>
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          sx={{ mb: 1 }}
        >
          <Link
            underline="hover"
            color="inherit"
            onClick={() => navigate("/dashboard")}
            sx={{ cursor: "pointer", fontSize: "0.82rem" }}
          >
            Dashboard
          </Link>
          <Typography
            color="text.primary"
            sx={{ fontSize: "0.82rem", fontWeight: 700 }}
          >
            Backup & Restore
          </Typography>
        </Breadcrumbs>

        <Stack direction="row" alignItems="center" spacing={1.5}>
          <StorageOutlinedIcon sx={{ fontSize: 32, color: "primary.main" }} />
          <Box>
            <Typography
              variant="h4"
              fontWeight={900}
              sx={{
                fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" },
                lineHeight: 1.1,
                color: "text.primary",
              }}
            >
              Backup & Restore
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 0.3,
                fontSize: { xs: "0.78rem", sm: "0.85rem" },
              }}
            >
              Protect your school data with regular backups
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Info banner for first-time users */}
      {stats && !stats.lastBackupAt && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 3 }}>
          <Typography variant="body2" fontWeight={700}>
            👋 Welcome to Backup & Restore
          </Typography>
          <Typography variant="caption">
            You haven't created any backups yet. We recommend creating a weekly
            backup to protect your school data.
          </Typography>
        </Alert>
      )}

      {/* Stats Card */}
      <Box sx={{ mb: 2.5 }}>
        <BackupStatsCard stats={stats} isLoading={isLoading} />
      </Box>

      {/* Backup + Restore Cards */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <BackupCard
            stats={stats}
            isDownloading={downloadMutation.isPending}
            onDownload={() => downloadMutation.mutate()}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <RestoreCard />
        </Grid>
      </Grid>

      {/* Tips */}
      <Box
        sx={{
          mt: 3,
          p: 2,
          borderRadius: 3,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography
          variant="caption"
          fontWeight={800}
          color="text.secondary"
          sx={{
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontSize: "0.68rem",
            display: "block",
            mb: 1.2,
          }}
        >
          💡 Best Practices
        </Typography>
        <Stack spacing={0.8}>
          <Typography variant="body2" sx={{ fontSize: "0.82rem" }}>
            • Create backups <strong>weekly</strong> (every Monday recommended)
          </Typography>
          <Typography variant="body2" sx={{ fontSize: "0.82rem" }}>
            • Store backups in <strong>multiple locations</strong> (cloud +
            local)
          </Typography>
          <Typography variant="body2" sx={{ fontSize: "0.82rem" }}>
            • Keep last <strong>4-5 backups</strong> for recovery options
          </Typography>
          <Typography variant="body2" sx={{ fontSize: "0.82rem" }}>
            • Test restore on a <strong>staging environment</strong> first if
            possible
          </Typography>
          <Typography variant="body2" sx={{ fontSize: "0.82rem" }}>
            • Always backup <strong>before major changes</strong> (promotions,
            bulk imports)
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
};

export default BackupPage;
