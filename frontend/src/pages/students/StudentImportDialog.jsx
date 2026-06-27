import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
  Avatar,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  LinearProgress,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useDropzone } from "react-dropzone";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/Warning";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import importApi from "../../api/importApi";

const STEPS = ["Download Template", "Upload Excel", "Review & Import"];

const StudentImportDialog = ({ open, onClose, onImported }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const resetWizard = useCallback(() => {
    setActiveStep(0);
    setFile(null);
    setValidationResult(null);
    setImportResult(null);
  }, []);

  const handleClose = () => {
    if (importing || validating) return;
    resetWizard();
    onClose();
  };

  // ─── STEP 1: Download Template ─────────────────────────
  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const response = await importApi.downloadTemplate();
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "student-import-template.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      enqueueSnackbar("Template downloaded successfully", {
        variant: "success",
      });
    } catch (err) {
      enqueueSnackbar("Failed to download template", { variant: "error" });
    } finally {
      setDownloading(false);
    }
  };

  // ─── STEP 2: File Upload via Dropzone ──────────────────
  const onDrop = useCallback(
    (acceptedFiles) => {
      const f = acceptedFiles[0];
      if (!f) return;

      if (f.size > 10 * 1024 * 1024) {
        enqueueSnackbar("File size must be less than 10MB", {
          variant: "warning",
        });
        return;
      }

      setFile(f);
      setValidationResult(null);
    },
    [enqueueSnackbar],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    disabled: validating,
  });

  const handleValidate = async () => {
    if (!file) {
      enqueueSnackbar("Please select a file first", { variant: "warning" });
      return;
    }

    setValidating(true);
    try {
      const res = await importApi.validate(file);
      setValidationResult(res.data?.data);
      setActiveStep(2);
      enqueueSnackbar(
        `Validation complete: ${res.data?.data?.valid || 0} valid rows found`,
        { variant: "info" },
      );
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Validation failed", {
        variant: "error",
      });
    } finally {
      setValidating(false);
    }
  };

  // ─── STEP 3: Execute Import ────────────────────────────
  const handleExecuteImport = async () => {
    if (!file || !validationResult?.valid) return;

    setImporting(true);
    try {
      const res = await importApi.execute(file);
      setImportResult(res.data?.data);
      enqueueSnackbar(`Imported ${res.data?.data?.imported || 0} students`, {
        variant: "success",
      });
      if (onImported) onImported();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Import failed", {
        variant: "error",
      });
    } finally {
      setImporting(false);
    }
  };

  // ─── Download Error Report ─────────────────────────────
  const handleDownloadErrors = async () => {
    if (!validationResult?.errorRows?.length) return;

    try {
      const response = await importApi.downloadErrorReport(
        validationResult.errorRows,
      );
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "import-errors.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      enqueueSnackbar("Error report downloaded", { variant: "success" });
    } catch (err) {
      enqueueSnackbar("Failed to download error report", { variant: "error" });
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setValidationResult(null);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle component="div" sx={{ pt: 3, pb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: "primary.light", width: 44, height: 44 }}>
            <CloudUploadIcon sx={{ color: "primary.dark" }} />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={800} component="div">
              Import Students from Excel
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              component="div"
            >
              Bulk import multiple students at once
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ minHeight: { xs: 400, sm: 500 } }}>
        {/* Stepper */}
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4, mt: 1 }}>
          {STEPS.map((label, idx) => (
            <Step key={label} completed={importResult && idx < 2}>
              <StepLabel
                StepIconProps={{
                  sx: {
                    "&.Mui-completed": { color: "success.main" },
                    "&.Mui-active": { color: "primary.main" },
                  },
                }}
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* ═══════ STEP 1: Download Template ═══════ */}
        {activeStep === 0 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
              <Typography variant="body2" fontWeight={700} gutterBottom>
                Step 1: Download the Excel Template
              </Typography>
              <Typography variant="caption">
                Get the template with all required columns and sample data. Open
                it in Excel, fill in your students, then upload back here.
              </Typography>
            </Alert>

            <Paper
              sx={{
                p: 4,
                borderRadius: 3,
                textAlign: "center",
                bgcolor: "#F8FAFF",
                border: "2px dashed",
                borderColor: "primary.light",
              }}
            >
              <FileDownloadIcon
                sx={{ fontSize: 64, color: "primary.main", mb: 2 }}
              />
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Excel Template
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Includes 17 columns: Scholar Number, Name, Class, Section,
                <br />
                and other student details with formatting examples
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={
                  downloading ? (
                    <CircularProgress size={20} sx={{ color: "white" }} />
                  ) : (
                    <FileDownloadIcon />
                  )
                }
                onClick={handleDownloadTemplate}
                disabled={downloading}
                sx={{
                  background:
                    "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
                  px: 4,
                  py: 1.5,
                  fontWeight: 700,
                }}
              >
                {downloading ? "Downloading..." : "Download Template"}
              </Button>
            </Paper>

            <Box sx={{ mt: 3 }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Template Tips:</strong>
              </Typography>
              <Stack spacing={0.5} sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  • Required columns marked with * (Scholar #, Name, Class,
                  Section, etc.)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  • Date format: DD/MM/YYYY (e.g., 15/03/2010)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  • Delete the sample rows before adding your data
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  • Make sure Classes already exist in the system
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  • Roll Number auto-generated if blank
                </Typography>
              </Stack>
            </Box>
          </Box>
        )}

        {/* ═══════ STEP 2: Upload File ═══════ */}
        {activeStep === 1 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
              <Typography variant="body2" fontWeight={700} gutterBottom>
                Step 2: Upload Your Filled Excel File
              </Typography>
              <Typography variant="caption">
                Drag & drop or click to select your .xlsx or .xls file (Max
                10MB, 1000 rows max)
              </Typography>
            </Alert>

            {!file ? (
              <Paper
                {...getRootProps()}
                sx={{
                  p: 6,
                  borderRadius: 3,
                  textAlign: "center",
                  cursor: "pointer",
                  border: "2px dashed",
                  borderColor: isDragActive ? "primary.main" : "divider",
                  bgcolor: isDragActive ? "#F0F4FF" : "#F8FAFF",
                  transition: "all 0.2s",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: "#F0F4FF",
                  },
                }}
              >
                <input {...getInputProps()} />
                <FileUploadIcon
                  sx={{
                    fontSize: 80,
                    color: "primary.main",
                    mb: 2,
                    opacity: 0.7,
                  }}
                />
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  {isDragActive ? "Drop file here" : "Drop Excel file here"}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  or click anywhere to browse files
                </Typography>
                <Chip
                  label=".xlsx, .xls only • Max 10MB"
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </Paper>
            ) : (
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "success.light",
                  bgcolor: "#F0FDF4",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar
                    sx={{ bgcolor: "success.main", width: 56, height: 56 }}
                  >
                    <InsertDriveFileIcon sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body1" fontWeight={700} noWrap>
                      {file.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(file.size / 1024).toFixed(1)} KB
                    </Typography>
                  </Box>
                  <IconButton
                    color="error"
                    onClick={handleRemoveFile}
                    disabled={validating}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              </Paper>
            )}

            {validating && (
              <Box sx={{ mt: 3 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  gutterBottom
                >
                  Validating data, please wait...
                </Typography>
                <LinearProgress sx={{ borderRadius: 4, mt: 1 }} />
              </Box>
            )}
          </Box>
        )}

        {/* ═══════ STEP 3: Review & Import ═══════ */}
        {activeStep === 2 && validationResult && (
          <Box>
            {/* If import done, show success */}
            {importResult ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: "success.light",
                    mx: "auto",
                    mb: 2,
                  }}
                >
                  <CheckCircleIcon
                    sx={{ fontSize: 48, color: "success.dark" }}
                  />
                </Avatar>
                <Typography variant="h5" fontWeight={800} gutterBottom>
                  Import Successful!
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 4 }}
                >
                  Students have been added to the system
                </Typography>

                <Stack
                  direction="row"
                  spacing={2}
                  justifyContent="center"
                  flexWrap="wrap"
                  useFlexGap
                  sx={{ mb: 3 }}
                >
                  <Paper
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: "#E6F4EA",
                      minWidth: 130,
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="success.dark"
                      fontWeight={700}
                    >
                      IMPORTED
                    </Typography>
                    <Typography
                      variant="h4"
                      fontWeight={900}
                      color="success.dark"
                    >
                      {importResult.imported}
                    </Typography>
                  </Paper>

                  {importResult.duplicatesSkipped > 0 && (
                    <Paper
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: "#FFF4E5",
                        minWidth: 130,
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="warning.dark"
                        fontWeight={700}
                      >
                        DUPLICATES
                      </Typography>
                      <Typography
                        variant="h4"
                        fontWeight={900}
                        color="warning.dark"
                      >
                        {importResult.duplicatesSkipped}
                      </Typography>
                    </Paper>
                  )}

                  {importResult.errorsSkipped > 0 && (
                    <Paper
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: "#FEE2E2",
                        minWidth: 130,
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="error.dark"
                        fontWeight={700}
                      >
                        ERRORS
                      </Typography>
                      <Typography
                        variant="h4"
                        fontWeight={900}
                        color="error.dark"
                      >
                        {importResult.errorsSkipped}
                      </Typography>
                    </Paper>
                  )}
                </Stack>
              </Box>
            ) : (
              /* Validation results — pre-import */
              <>
                <Stack
                  direction="row"
                  spacing={1.5}
                  flexWrap="wrap"
                  useFlexGap
                  sx={{ mb: 3 }}
                >
                  <Paper
                    sx={{
                      p: 2,
                      flex: 1,
                      minWidth: 130,
                      borderRadius: 2,
                      bgcolor: "#E6F4EA",
                      textAlign: "center",
                    }}
                  >
                    <CheckCircleIcon sx={{ color: "success.dark", mb: 0.5 }} />
                    <Typography
                      variant="h5"
                      fontWeight={900}
                      color="success.dark"
                    >
                      {validationResult.valid}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="success.dark"
                      fontWeight={700}
                    >
                      VALID
                    </Typography>
                  </Paper>

                  <Paper
                    sx={{
                      p: 2,
                      flex: 1,
                      minWidth: 130,
                      borderRadius: 2,
                      bgcolor: "#FFF4E5",
                      textAlign: "center",
                    }}
                  >
                    <WarningIcon sx={{ color: "warning.dark", mb: 0.5 }} />
                    <Typography
                      variant="h5"
                      fontWeight={900}
                      color="warning.dark"
                    >
                      {validationResult.duplicates}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="warning.dark"
                      fontWeight={700}
                    >
                      DUPLICATES
                    </Typography>
                  </Paper>

                  <Paper
                    sx={{
                      p: 2,
                      flex: 1,
                      minWidth: 130,
                      borderRadius: 2,
                      bgcolor: "#FEE2E2",
                      textAlign: "center",
                    }}
                  >
                    <ErrorIcon sx={{ color: "error.dark", mb: 0.5 }} />
                    <Typography
                      variant="h5"
                      fontWeight={900}
                      color="error.dark"
                    >
                      {validationResult.errors}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="error.dark"
                      fontWeight={700}
                    >
                      ERRORS
                    </Typography>
                  </Paper>

                  <Paper
                    sx={{
                      p: 2,
                      flex: 1,
                      minWidth: 130,
                      borderRadius: 2,
                      bgcolor: "#F0F4FF",
                      textAlign: "center",
                    }}
                  >
                    <Typography
                      variant="h5"
                      fontWeight={900}
                      color="primary.main"
                    >
                      {validationResult.total}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="primary.dark"
                      fontWeight={700}
                    >
                      TOTAL ROWS
                    </Typography>
                  </Paper>
                </Stack>

                {/* Errors table */}
                {validationResult.errors > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mb: 1.5 }}
                    >
                      <Typography
                        variant="subtitle2"
                        fontWeight={800}
                        color="error.dark"
                      >
                        ❌ Errors ({validationResult.errorRows.length})
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<FileDownloadIcon />}
                        onClick={handleDownloadErrors}
                      >
                        Download Error Report
                      </Button>
                    </Stack>
                    <TableContainer
                      component={Paper}
                      sx={{ maxHeight: 250, borderRadius: 2 }}
                    >
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell
                              sx={{ fontWeight: 700, bgcolor: "#FEE2E2" }}
                            >
                              Row
                            </TableCell>
                            <TableCell
                              sx={{ fontWeight: 700, bgcolor: "#FEE2E2" }}
                            >
                              Scholar
                            </TableCell>
                            <TableCell
                              sx={{ fontWeight: 700, bgcolor: "#FEE2E2" }}
                            >
                              Name
                            </TableCell>
                            <TableCell
                              sx={{ fontWeight: 700, bgcolor: "#FEE2E2" }}
                            >
                              Errors
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {validationResult.errorRows.map((e) => (
                            <TableRow key={e.rowNum}>
                              <TableCell>{e.rowNum}</TableCell>
                              <TableCell
                                sx={{
                                  fontFamily: "monospace",
                                  fontSize: "0.78rem",
                                }}
                              >
                                {e.scholarNumber}
                              </TableCell>
                              <TableCell>{e.name}</TableCell>
                              <TableCell
                                sx={{
                                  color: "error.dark",
                                  fontSize: "0.78rem",
                                }}
                              >
                                {e.errors}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                {/* Duplicates table */}
                {validationResult.duplicates > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={800}
                      color="warning.dark"
                      sx={{ mb: 1.5 }}
                    >
                      ⚠️ Duplicates ({validationResult.duplicateRows.length}) —
                      Will be skipped
                    </Typography>
                    <TableContainer
                      component={Paper}
                      sx={{ maxHeight: 200, borderRadius: 2 }}
                    >
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell
                              sx={{ fontWeight: 700, bgcolor: "#FFF4E5" }}
                            >
                              Row
                            </TableCell>
                            <TableCell
                              sx={{ fontWeight: 700, bgcolor: "#FFF4E5" }}
                            >
                              Scholar
                            </TableCell>
                            <TableCell
                              sx={{ fontWeight: 700, bgcolor: "#FFF4E5" }}
                            >
                              Name
                            </TableCell>
                            <TableCell
                              sx={{ fontWeight: 700, bgcolor: "#FFF4E5" }}
                            >
                              Reason
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {validationResult.duplicateRows.map((d) => (
                            <TableRow key={d.rowNum}>
                              <TableCell>{d.rowNum}</TableCell>
                              <TableCell
                                sx={{
                                  fontFamily: "monospace",
                                  fontSize: "0.78rem",
                                }}
                              >
                                {d.scholarNumber}
                              </TableCell>
                              <TableCell>{d.name}</TableCell>
                              <TableCell
                                sx={{
                                  color: "warning.dark",
                                  fontSize: "0.78rem",
                                }}
                              >
                                {d.reason}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                {validationResult.valid === 0 ? (
                  <Alert severity="error" sx={{ borderRadius: 2 }}>
                    <Typography variant="body2" fontWeight={700}>
                      No valid rows to import
                    </Typography>
                    <Typography variant="caption">
                      Fix the errors in your Excel file and try again.
                    </Typography>
                  </Alert>
                ) : (
                  <Alert severity="success" sx={{ borderRadius: 2 }}>
                    <Typography variant="body2" fontWeight={700}>
                      Ready to import {validationResult.valid} student
                      {validationResult.valid !== 1 ? "s" : ""}
                    </Typography>
                    <Typography variant="caption">
                      {validationResult.duplicates > 0 &&
                        `${validationResult.duplicates} duplicates will be skipped. `}
                      {validationResult.errors > 0 &&
                        `${validationResult.errors} rows with errors will be skipped.`}
                    </Typography>
                  </Alert>
                )}

                {importing && (
                  <Box sx={{ mt: 3 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      gutterBottom
                    >
                      Importing {validationResult.valid} students, please
                      wait...
                    </Typography>
                    <LinearProgress sx={{ borderRadius: 4, mt: 1 }} />
                  </Box>
                )}
              </>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {/* Show different buttons based on step and state */}
        {importResult ? (
          <>
            <Button startIcon={<RestartAltIcon />} onClick={resetWizard}>
              Import More
            </Button>
            <Box sx={{ flex: 1 }} />
            <Button variant="contained" onClick={handleClose}>
              Close
            </Button>
          </>
        ) : (
          <>
            {activeStep > 0 && !importing && (
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => {
                  if (activeStep === 2) {
                    setActiveStep(1);
                    setValidationResult(null);
                  } else {
                    setActiveStep((s) => s - 1);
                  }
                }}
                disabled={validating}
              >
                Back
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            <Button onClick={handleClose} disabled={validating || importing}>
              Cancel
            </Button>

            {activeStep === 0 && (
              <Button
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                onClick={() => setActiveStep(1)}
                sx={{
                  background:
                    "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
                }}
              >
                Next: Upload File
              </Button>
            )}

            {activeStep === 1 && (
              <Button
                variant="contained"
                endIcon={
                  validating ? (
                    <CircularProgress size={16} sx={{ color: "white" }} />
                  ) : (
                    <ArrowForwardIcon />
                  )
                }
                onClick={handleValidate}
                disabled={!file || validating}
                sx={{
                  background:
                    "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
                }}
              >
                {validating ? "Validating..." : "Validate File"}
              </Button>
            )}

            {activeStep === 2 && validationResult?.valid > 0 && (
              <Button
                variant="contained"
                color="success"
                startIcon={
                  importing ? (
                    <CircularProgress size={16} sx={{ color: "white" }} />
                  ) : (
                    <PlayArrowIcon />
                  )
                }
                onClick={handleExecuteImport}
                disabled={importing}
                sx={{ fontWeight: 700 }}
              >
                {importing
                  ? "Importing..."
                  : `Import ${validationResult.valid} Student${validationResult.valid !== 1 ? "s" : ""}`}
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default StudentImportDialog;
