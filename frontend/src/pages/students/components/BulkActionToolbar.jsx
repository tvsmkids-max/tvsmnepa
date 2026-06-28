import React from "react";
import {
  Paper,
  Stack,
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Badge,
  Slide,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

const BulkActionToolbar = ({
  show,
  selectedCount,
  maxSelect,
  allPageSelected,
  onClose,
  onSelectAllPage,
  onDelete,
  onExport,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Slide direction="down" in={show} mountOnEnter unmountOnExit>
      <Paper
        sx={{
          p: { xs: 1, sm: 1.5 },
          mb: 2,
          borderRadius: 3,
          background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
          color: "#fff",
          position: "sticky",
          top: 8,
          zIndex: 10,
          boxShadow: "0 8px 24px rgba(13,27,62,0.25)",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={{ xs: 0.5, sm: 1.5 }}
          flexWrap="wrap"
          useFlexGap
        >
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: "#fff",
              bgcolor: "rgba(255,255,255,0.1)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>

          <Badge
            badgeContent={selectedCount}
            color="warning"
            max={999}
            sx={{
              "& .MuiBadge-badge": {
                fontWeight: 800,
                right: -4,
                top: 0,
              },
            }}
          >
            <Typography
              variant="body2"
              fontWeight={800}
              sx={{
                fontSize: { xs: "0.78rem", sm: "0.9rem" },
                pr: 1.2,
              }}
            >
              Selected
            </Typography>
          </Badge>

          {!isMobile && (
            <Typography
              variant="caption"
              sx={{ opacity: 0.7, fontSize: "0.7rem" }}
            >
              {selectedCount}/{maxSelect} max
            </Typography>
          )}

          <Box sx={{ flex: 1 }} />

          {/* Select Page Toggle */}
          <Button
            size="small"
            variant="outlined"
            onClick={onSelectAllPage}
            startIcon={
              !isMobile &&
              (allPageSelected ? (
                <CheckBoxIcon />
              ) : (
                <CheckBoxOutlineBlankIcon />
              ))
            }
            sx={{
              color: "#fff",
              borderColor: "rgba(255,255,255,0.4)",
              fontWeight: 700,
              fontSize: { xs: "0.68rem", sm: "0.78rem" },
              px: { xs: 1, sm: 1.5 },
              minWidth: "auto",
              textTransform: "none",
              "&:hover": {
                borderColor: "#fff",
                bgcolor: "rgba(255,255,255,0.1)",
              },
            }}
          >
            {allPageSelected ? "Unselect" : isMobile ? "Page" : "Select Page"}
          </Button>

          {/* Export Selected */}
          <Tooltip title="Export selected students">
            <span>
              <Button
                size="small"
                variant="outlined"
                onClick={onExport}
                disabled={selectedCount === 0}
                startIcon={!isMobile && <FileDownloadIcon />}
                sx={{
                  color: "#fff",
                  borderColor: "rgba(255,255,255,0.4)",
                  fontWeight: 700,
                  fontSize: { xs: "0.68rem", sm: "0.78rem" },
                  px: { xs: 1, sm: 1.5 },
                  minWidth: "auto",
                  textTransform: "none",
                  "&:hover": {
                    borderColor: "#fff",
                    bgcolor: "rgba(255,255,255,0.1)",
                  },
                  "&.Mui-disabled": {
                    color: "rgba(255,255,255,0.4)",
                    borderColor: "rgba(255,255,255,0.2)",
                  },
                }}
              >
                {isMobile ? (
                  <FileDownloadIcon sx={{ fontSize: 18 }} />
                ) : (
                  "Export"
                )}
              </Button>
            </span>
          </Tooltip>

          {/* Delete Selected */}
          <Button
            size="small"
            variant="contained"
            color="error"
            startIcon={!isMobile && <DeleteSweepIcon />}
            onClick={onDelete}
            disabled={selectedCount === 0}
            sx={{
              fontWeight: 800,
              fontSize: { xs: "0.7rem", sm: "0.82rem" },
              px: { xs: 1, sm: 2 },
              textTransform: "none",
            }}
          >
            {isMobile ? `Del ${selectedCount}` : `Delete (${selectedCount})`}
          </Button>
        </Stack>
      </Paper>
    </Slide>
  );
};

export default BulkActionToolbar;
