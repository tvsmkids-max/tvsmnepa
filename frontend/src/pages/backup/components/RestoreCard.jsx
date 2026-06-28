import React, { useState, useRef } from "react";
import {
  Card,
  CardContent,
  Box,
  Typography,
  Stack,
  Button,
  Avatar,
  Alert,
  AlertTitle,
  CircularProgress,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
} from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import RestoreOutlinedIcon from "@mui/icons-material/RestoreOutlined";
import CloseIcon from "@mui/icons-material/Close";
import { useSnackbar } from "notistack";
import {
  useValidateBackup,
  useRestoreBackup,
  parseBackupFile,
} from "../../../hooks/useBackup";

const PREVIEW_LABELS = {
  settings: "Settings",
  academicSessions: "Sessions",
  classes: "Classes",
  teachers: "Teachers",
  students: "Students",
  attendance: "Attendance",
  holidays: "Holidays",
};

const RestoreCard = () => {
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedBackup, setParsedBackup] = useState(null);
  const [validationData, setValidationData] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [parsing, setParsing] = useState(false);

  const validateMutation = useValidateBackup();
  const restoreMutation = useRestoreBackup();

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setParsedBackup(null);
    setValidationData(null);
    setParsing(true);

    try {
      // Parse JSON
      const data = await parseBackupFile(file);
      setParsedBackup(data);

      // Validate
      const res = await validateMutation.mutateAsync(data);
      setValidationData(res.data?.data || null);

      enqueueSnackbar("Backup file validated successfully", {
        variant: "success",
      });
    } catch (err) {
      enqueueSnackbar(err.message || "Failed to parse backup", {
        variant: "error",
      });
      setSelectedFile(null);
      setParsedBackup(null);
    } finally {
      setParsing(false);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setParsedBackup(null);
    setValidationData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRestoreClick = () => {
    if (!parsedBackup) return;
    setConfirmOpen(true);
    setConfirmText("");
  };

  const handleConfirmRestore = async () => {
    if (confirmText !== "RESTORE") return;

    try {
      await restoreMutation.mutateAsync({
        backup: parsedBackup,
        collections: null, // null = restore all default collections
      });
      setConfirmOpen(false);
      handleClearFile();
    } catch {
      // Error already handled
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const isRestoring = restoreMutation.isPending;
  const totalRecords = validationData
    ? Object.values(validationData.preview || {}).reduce((sum, n) => sum + n, 0)
    : 0;

  return (
    <>
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
              "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)",
          }}
        />

        <CardContent sx={{ p: { xs: 2, sm: 2.5 }, position: "relative" }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{ mb: 2 }}
          >
            <Avatar
              sx={{
                bgcolor: "warning.50",
                width: 44,
                height: 44,
              }}
            >
              <CloudUploadOutlinedIcon
                sx={{ color: "warning.dark", fontSize: 22 }}
              />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Restore from Backup
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Upload a backup JSON file to restore
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ mb: 2 }} />

          {/* Warning */}
          <Alert
            severity="warning"
            icon={<WarningAmberOutlinedIcon />}
            sx={{ mb: 2, borderRadius: 2 }}
          >
            <AlertTitle sx={{ fontWeight: 800, fontSize: "0.9rem" }}>
              Merge Mode
            </AlertTitle>
            <Typography variant="caption">
              Only new records will be added. Existing records (matched by ID)
              will be <strong>skipped</strong>. No data will be deleted or
              overwritten.
            </Typography>
          </Alert>

          {/* File Picker */}
          {!selectedFile ? (
            <Box
              onClick={() => fileInputRef.current?.click()}
              sx={{
                border: "2px dashed",
                borderColor: "divider",
                borderRadius: 2,
                p: 3,
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s",
                bgcolor: "background.default",
                "&:hover": {
                  borderColor: "primary.main",
                  bgcolor: "primary.50",
                },
              }}
            >
              <CloudUploadOutlinedIcon
                sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
              />
              <Typography variant="body1" fontWeight={700} sx={{ mb: 0.5 }}>
                Click to choose backup file
              </Typography>
              <Typography variant="caption" color="text.secondary">
                JSON files only (max 100MB)
              </Typography>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                hidden
                onChange={handleFileSelect}
              />
            </Box>
          ) : (
            <>
              {/* Selected File Info */}
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "background.default",
                  border: "1px solid",
                  borderColor: parsing
                    ? "warning.light"
                    : validationData
                      ? "success.light"
                      : "error.light",
                  mb: 2,
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <DescriptionOutlinedIcon
                    sx={{
                      color: parsing
                        ? "warning.main"
                        : validationData
                          ? "success.main"
                          : "error.main",
                      fontSize: 28,
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      noWrap
                      title={selectedFile.name}
                    >
                      {selectedFile.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(selectedFile.size)}
                      {parsing && " • Validating..."}
                      {validationData && " • ✓ Valid backup file"}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    onClick={handleClearFile}
                    sx={{ minWidth: "auto", color: "text.secondary" }}
                    disabled={isRestoring}
                  >
                    <CloseIcon fontSize="small" />
                  </Button>
                </Stack>
              </Box>

              {/* Validation Status */}
              {parsing && (
                <Box sx={{ textAlign: "center", py: 2 }}>
                  <CircularProgress size={32} />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 1 }}
                  >
                    Validating backup file...
                  </Typography>
                </Box>
              )}

              {/* Validation Result */}
              {validationData && !parsing && (
                <>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: "success.50",
                      border: "1px solid",
                      borderColor: "success.light",
                      mb: 2,
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ mb: 1 }}
                    >
                      <CheckCircleOutlinedIcon
                        sx={{ color: "success.dark", fontSize: 18 }}
                      />
                      <Typography
                        variant="body2"
                        fontWeight={800}
                        color="success.dark"
                      >
                        Backup Validated
                      </Typography>
                    </Stack>
                    {validationData.metadata?.createdAt && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block" }}
                      >
                        Created:{" "}
                        {new Date(
                          validationData.metadata.createdAt,
                        ).toLocaleString("en-IN")}
                      </Typography>
                    )}
                    {validationData.metadata?.createdBy?.name && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block" }}
                      >
                        By: {validationData.metadata.createdBy.name}
                      </Typography>
                    )}
                    {validationData.metadata?.schoolInfo?.name && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block" }}
                      >
                        School: {validationData.metadata.schoolInfo.name}
                      </Typography>
                    )}
                  </Box>

                  {/* Preview */}
                  <Typography
                    variant="caption"
                    fontWeight={800}
                    color="text.secondary"
                    sx={{
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontSize: "0.68rem",
                      display: "block",
                      mb: 1,
                    }}
                  >
                    Records to Process ({totalRecords.toLocaleString()} total)
                  </Typography>

                  <Stack
                    direction="row"
                    spacing={0.6}
                    flexWrap="wrap"
                    useFlexGap
                    sx={{ mb: 2 }}
                  >
                    {Object.entries(validationData.preview || {}).map(
                      ([key, count]) => (
                        <Chip
                          key={key}
                          label={`${PREVIEW_LABELS[key] || key}: ${count.toLocaleString()}`}
                          size="small"
                          variant={count > 0 ? "filled" : "outlined"}
                          color={count > 0 ? "primary" : "default"}
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.7rem",
                            height: 24,
                          }}
                        />
                      ),
                    )}
                  </Stack>

                  {/* Restore Button */}
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    color="warning"
                    startIcon={<RestoreOutlinedIcon />}
                    onClick={handleRestoreClick}
                    disabled={isRestoring || totalRecords === 0}
                    sx={{
                      py: 1.3,
                      fontWeight: 800,
                      textTransform: "none",
                      fontSize: "0.95rem",
                      boxShadow: "0 4px 12px rgba(245,158,11,0.3)",
                    }}
                  >
                    Restore {totalRecords.toLocaleString()} Records
                  </Button>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmOpen}
        onClose={() => !isRestoring && setConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle component="div" sx={{ pt: 3, pb: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              sx={{
                bgcolor: "warning.light",
                width: 44,
                height: 44,
              }}
            >
              <WarningAmberOutlinedIcon sx={{ color: "warning.dark" }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Confirm Restore
              </Typography>
              <Typography variant="caption" color="text.secondary">
                This action will merge data into your database
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            <AlertTitle sx={{ fontWeight: 800 }}>
              You're about to restore:
            </AlertTitle>
            <Typography variant="body2">
              <strong>{totalRecords.toLocaleString()} records</strong> across{" "}
              {Object.keys(validationData?.preview || {}).length} collections.
              <br />
              Existing records will be <strong>skipped</strong> (no overwrites).
            </Typography>
          </Alert>

          <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
            Type <strong style={{ color: "#D97706" }}>RESTORE</strong> to
            confirm:
          </Typography>

          <TextField
            fullWidth
            size="small"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type RESTORE here"
            autoComplete="off"
            disabled={isRestoring}
            sx={{
              "& input": {
                fontWeight: 800,
                letterSpacing: 1,
                fontFamily: "monospace",
              },
            }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={isRestoring}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleConfirmRestore}
            disabled={confirmText !== "RESTORE" || isRestoring}
            startIcon={
              isRestoring ? (
                <CircularProgress size={16} sx={{ color: "white" }} />
              ) : (
                <RestoreOutlinedIcon />
              )
            }
            sx={{ fontWeight: 800 }}
          >
            {isRestoring
              ? "Restoring..."
              : `Restore ${totalRecords.toLocaleString()}`}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RestoreCard;
