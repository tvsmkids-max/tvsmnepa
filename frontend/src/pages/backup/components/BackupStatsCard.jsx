import React from "react";
import {
  Card,
  CardContent,
  Box,
  Typography,
  Stack,
  Grid,
  Skeleton,
  Avatar,
  Divider,
  Chip,
} from "@mui/material";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import ClassOutlinedIcon from "@mui/icons-material/ClassOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import BeachAccessOutlinedIcon from "@mui/icons-material/BeachAccessOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";

const STAT_CONFIG = {
  students: {
    label: "Students",
    icon: <PeopleOutlinedIcon />,
    color: "#1E4D98",
    bg: "#E0EBFF",
  },
  classes: {
    label: "Classes",
    icon: <ClassOutlinedIcon />,
    color: "#065F46",
    bg: "#D1FAE5",
  },
  teachers: {
    label: "Teachers",
    icon: <PersonOutlinedIcon />,
    color: "#5B21B6",
    bg: "#EDE9FE",
  },
  attendance: {
    label: "Attendance Records",
    icon: <EventNoteOutlinedIcon />,
    color: "#92400E",
    bg: "#FEF3C7",
  },
  holidays: {
    label: "Holidays",
    icon: <BeachAccessOutlinedIcon />,
    color: "#9F1239",
    bg: "#FCE7F3",
  },
  academicSessions: {
    label: "Sessions",
    icon: <SchoolOutlinedIcon />,
    color: "#155E75",
    bg: "#CFFAFE",
  },
};

const formatTimeAgo = (date) => {
  if (!date) return "Never";
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const BackupStatsCard = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <Card
        sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}
      >
        <CardContent>
          <Skeleton variant="text" width="40%" height={32} />
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Grid item xs={6} sm={4} key={i}>
                <Skeleton variant="rectangular" height={80} />
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const lastBackupAgo = formatTimeAgo(stats.lastBackupAt);
  const daysSince = stats.daysSinceLastBackup;
  const isStale = daysSince === null || daysSince >= 7;

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        {/* Header */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 2 }}
          flexWrap="wrap"
          gap={1}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar
              sx={{
                bgcolor: "primary.50",
                width: 40,
                height: 40,
              }}
            >
              <StorageOutlinedIcon sx={{ color: "primary.main" }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Database Statistics
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total records that will be backed up
              </Typography>
            </Box>
          </Stack>

          <Chip
            label={`${stats.total.toLocaleString()} total`}
            color="primary"
            sx={{ fontWeight: 800 }}
          />
        </Stack>

        {/* Last Backup Info */}
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: isStale ? "warning.50" : "success.50",
            border: "1px solid",
            borderColor: isStale ? "warning.light" : "success.light",
            mb: 2,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            flexWrap="wrap"
          >
            <AccessTimeOutlinedIcon
              sx={{
                color: isStale ? "warning.dark" : "success.dark",
                fontSize: 20,
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="caption"
                fontWeight={700}
                sx={{
                  color: isStale ? "warning.dark" : "success.dark",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontSize: "0.68rem",
                  display: "block",
                }}
              >
                Last Backup
              </Typography>
              <Typography
                variant="body2"
                fontWeight={800}
                sx={{
                  color: isStale ? "warning.dark" : "success.dark",
                }}
              >
                {lastBackupAgo}
                {daysSince !== null && daysSince > 0 && (
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{
                      ml: 1,
                      fontWeight: 600,
                      opacity: 0.8,
                    }}
                  >
                    ({daysSince} day{daysSince !== 1 ? "s" : ""})
                  </Typography>
                )}
              </Typography>
            </Box>
            {isStale && (
              <Chip
                label="Action Needed"
                size="small"
                color="warning"
                sx={{ fontWeight: 700, fontSize: "0.7rem" }}
              />
            )}
          </Stack>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Stats Grid */}
        <Grid container spacing={1.5}>
          {Object.entries(STAT_CONFIG).map(([key, config]) => {
            const count = stats.stats[key] || 0;
            return (
              <Grid item xs={6} sm={4} key={key}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: "background.default",
                    border: "1px solid",
                    borderColor: "divider",
                    transition: "all 0.2s",
                    "&:hover": {
                      borderColor: config.color,
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ mb: 0.5 }}
                  >
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 1,
                        bgcolor: config.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {React.cloneElement(config.icon, {
                        sx: { fontSize: 16, color: config.color },
                      })}
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.65rem",
                        color: "text.secondary",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {config.label}
                    </Typography>
                  </Stack>
                  <Typography
                    variant="h5"
                    fontWeight={900}
                    sx={{
                      fontSize: { xs: "1.2rem", sm: "1.4rem" },
                      color: "text.primary",
                      lineHeight: 1,
                      ml: 0.5,
                    }}
                  >
                    {count.toLocaleString()}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default BackupStatsCard;
