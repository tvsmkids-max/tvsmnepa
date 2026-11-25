import React from "react";
import { Button, Tooltip, useMediaQuery, useTheme, CircularProgress, Stack } from "@mui/material";
import PageHeader from "../../../components/common/PageHeader";
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const actions = (
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
                                    textTransform: "none",
                  px: { xs: 1.5, sm: 2 },
                  minWidth: { xs: 40, sm: "auto" },
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
            title={exportDisabled ? "No data to export" : isAdmin ? "Export to Excel" : "Download PDF"}
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
                                    textTransform: "none",
                  px: { xs: 1.5, sm: 2 },
                  minWidth: { xs: 40, sm: "auto" },
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
                ) : isAdmin ? (
                  "Export"
                ) : (
                  "PDF"
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
          >
            {isMobile ? "Add" : "Add Student"}
          </Button>
        </Stack>
  );

  return (
    <PageHeader
      title="Students"
      count={total}
      subtitle="View and manage student records, classes, and attendance."
      breadcrumbs={[{ label: "Dashboard", path: "/dashboard" }, { label: "Students" }]}
      action={actions}
    />
  );
};

export default StudentHeader;
