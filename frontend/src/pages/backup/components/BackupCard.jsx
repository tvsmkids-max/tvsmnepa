import React from "react";
import {
  Card,
  CardContent,
  Box,
  Typography,
  Stack,
  Button,
  Avatar,
  Alert,
  CircularProgress,
  Divider,
  Chip,
} from "@mui/material";
import CloudDownloadOutlinedIcon from "@mui/icons-material/CloudDownloadOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

const BackupCard = ({ onDownload, isDownloading, stats }) => {
  const totalRecords = stats?.total || 0;

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative gradient */}
      <Box
        sx={{
          position: "absolute",
          top: -50,
          right: -50,
          width: 180,
          height: 180,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)",
        }}
      />

      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, position: "relative" }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: "success.50",
              width: 44,
              height: 44,
            }}
          >
            <CloudDownloadOutlinedIcon
              sx={{ color: "success.dark", fontSize: 22 }}
            />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={800}>
              Create Backup
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Download all your data as JSON
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {/* What's included */}
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="caption"
            fontWeight={700}
            color="text.secondary"
            sx={{
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontSize: "0.68rem",
              display: "block",
              mb: 1,
            }}
          >
            What's Included
          </Typography>

          <Stack spacing={0.6}>
            {[
              "All students with their information",
              "Classes and sections",
              "Teachers and their assignments",
              "Complete attendance history",
              "Holidays and academic sessions",
              "School settings",
            ].map((item) => (
              <Stack
                key={item}
                direction="row"
                alignItems="center"
                spacing={0.8}
              >
                <CheckCircleOutlinedIcon
                  sx={{ fontSize: 14, color: "success.main" }}
                />
                <Typography
                  variant="body2"
                  sx={{ fontSize: "0.82rem", color: "text.primary" }}
                >
                  {item}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        {/* Info alert */}
        <Alert
          severity="info"
          icon={<InfoOutlinedIcon />}
          sx={{
            mb: 2,
            borderRadius: 2,
            "& .MuiAlert-message": { width: "100%" },
          }}
        >
          <Typography variant="body2" fontWeight={700}>
            Save the file securely
          </Typography>
          <Typography variant="caption" sx={{ display: "block", mt: 0.3 }}>
            Backup will download to your device. Store it in a safe location
            (cloud drive, external storage).
          </Typography>
        </Alert>

        {/* Download button */}
        <Button
          fullWidth
          variant="contained"
          size="large"
          startIcon={
            isDownloading ? (
              <CircularProgress size={18} sx={{ color: "white" }} />
            ) : (
              <CloudDownloadOutlinedIcon />
            )
          }
          onClick={onDownload}
          disabled={isDownloading || totalRecords === 0}
          sx={{
            py: 1.3,
            fontWeight: 800,
            textTransform: "none",
            background: "linear-gradient(135deg, #2E7D32 0%, #22C55E 100%)",
            fontSize: "0.95rem",
            boxShadow: "0 4px 12px rgba(34,197,94,0.3)",
            "&:hover": {
              boxShadow: "0 6px 16px rgba(34,197,94,0.4)",
            },
            "&.Mui-disabled": {
              background: "rgba(0,0,0,0.12)",
            },
          }}
        >
          {isDownloading
            ? "Creating Backup..."
            : totalRecords === 0
              ? "No Data to Backup"
              : `Download Backup (${totalRecords.toLocaleString()} records)`}
        </Button>

        {isDownloading && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              textAlign: "center",
              mt: 1,
              fontStyle: "italic",
            }}
          >
            This may take up to 2 minutes for large databases...
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default BackupCard;
