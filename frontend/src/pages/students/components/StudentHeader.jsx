import React from "react";
import {
  Box,
  Stack,
  Typography,
  Button,
  Tooltip,
  useMediaQuery,
  useTheme,
  Breadcrumbs,
  Link,
  CircularProgress,
  Chip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import AddIcon from "@mui/icons-material/Add";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import CheckBoxOutlinedIcon from "@mui/icons-material/CheckBoxOutlined";

const StudentHeader = ({
  total,
  isAdmin = false,
  selectionMode = false,
  exporting = false,
  exportDisabled = false,
  onAdd,
  onImport,
  onExport,
  onSelectMode,
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box sx={{ mb: 2.5 }}>
      {/* Breadcrumbs */}
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
          Students
        </Typography>
      </Breadcrumbs>

      {/* Title + Actions Row */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        sx={{ flexWrap: "wrap", gap: 1.5 }}
      >
        {/* Left: Title + Count */}
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography
              variant="h4"
              fontWeight={900}
              sx={{
                fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" },
                lineHeight: 1.1,
                color: "text.primary",
              }}
            >
              Students
            </Typography>
            {total !== undefined && (
              <Chip
                label={`${total} total`}
                size="small"
                sx={{
                  bgcolor: "primary.50",
                  color: "primary.dark",
                  fontWeight: 800,
                  fontSize: "0.72rem",
                  height: 24,
                  px: 0.5,
                }}
              />
            )}
          </Stack>

          {/* Improved Page Subtitle */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.3,
              fontSize: { xs: "0.78rem", sm: "0.85rem" },
              display: { xs: "none", sm: "block" },
            }}
          >
            View and manage student records, classes, and attendance.
          </Typography>
        </Box>

        {/* Right: Action Buttons */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ flexWrap: "wrap", gap: 1 }}
        >
          {/* Bulk Select Toggle */}
          {isAdmin && !selectionMode && (
            <Tooltip title="Select multiple students">
              <Button
                variant="outlined"
                size={isMobile ? "small" : "medium"}
                startIcon={
                  !isMobile && <CheckBoxOutlinedIcon sx={{ fontSize: 18 }} />
                }
                onClick={onSelectMode}
                sx={{
                  fontWeight: 700,
                  textTransform: "none",
                  borderColor: "primary.main",
                  color: "primary.main",
                  px: { xs: 1.5, sm: 2 },
                  minWidth: { xs: 40, sm: "auto" },
                  "&:hover": {
                    bgcolor: "primary.50",
                    borderColor: "primary.dark",
                  },
                }}
              >
                {isMobile ? (
                  <CheckBoxOutlinedIcon sx={{ fontSize: 18 }} />
                ) : (
                  "Select"
                )}
              </Button>
            </Tooltip>
          )}

          {/* Export */}
          <Tooltip
            title={exportDisabled ? "No data to export" : "Export to Excel"}
          >
            <span>
              <Button
                variant="outlined"
                size={isMobile ? "small" : "medium"}
                startIcon={
                  !isMobile &&
                  (exporting ? (
                    <CircularProgress size={14} />
                  ) : (
                    <FileDownloadOutlinedIcon sx={{ fontSize: 18 }} />
                  ))
                }
                onClick={onExport}
                disabled={exporting || exportDisabled}
                sx={{
                  fontWeight: 700,
                  textTransform: "none",
                  borderColor: "success.main",
                  color: "success.dark",
                  px: { xs: 1.5, sm: 2 },
                  minWidth: { xs: 40, sm: "auto" },
                  "&:hover": {
                    bgcolor: "success.50",
                    borderColor: "success.dark",
                  },
                }}
              >
                {isMobile ? (
                  exporting ? (
                    <CircularProgress size={16} />
                  ) : (
                    <FileDownloadOutlinedIcon sx={{ fontSize: 18 }} />
                  )
                ) : exporting ? (
                  "Exporting..."
                ) : (
                  "Export"
                )}
              </Button>
            </span>
          </Tooltip>

          {/* Import (admin only) */}
          {isAdmin && (
            <Tooltip title="Import from Excel">
              <Button
                variant="outlined"
                size={isMobile ? "small" : "medium"}
                startIcon={
                  !isMobile && <FileUploadOutlinedIcon sx={{ fontSize: 18 }} />
                }
                onClick={onImport}
                sx={{
                  fontWeight: 700,
                  textTransform: "none",
                  px: { xs: 1.5, sm: 2 },
                  minWidth: { xs: 40, sm: "auto" },
                }}
              >
                {isMobile ? (
                  <FileUploadOutlinedIcon sx={{ fontSize: 18 }} />
                ) : (
                  "Import"
                )}
              </Button>
            </Tooltip>
          )}

          {/* Add Student (primary CTA) */}
          <Button
            variant="contained"
            size={isMobile ? "small" : "medium"}
            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
            onClick={onAdd}
            sx={{
              background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
              fontWeight: 700,
              textTransform: "none",
              px: { xs: 1.5, sm: 2.5 },
              boxShadow: "0 4px 12px rgba(13,27,62,0.2)",
              "&:hover": {
                boxShadow: "0 6px 16px rgba(13,27,62,0.3)",
              },
            }}
          >
            {isMobile ? "Add" : "Add Student"}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default StudentHeader;
