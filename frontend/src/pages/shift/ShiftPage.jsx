import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Paper,
  Grid,
  Typography,
  Stack,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Breadcrumbs,
  Link,
  Divider,
  Avatar,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import ArrowDownwardOutlinedIcon from "@mui/icons-material/ArrowDownwardOutlined";
import PreviewOutlinedIcon from "@mui/icons-material/PreviewOutlined";
import ClassOutlinedIcon from "@mui/icons-material/ClassOutlined";

import ClassSelector from "./components/ClassSelector";
import StudentPicker from "./components/StudentPicker";
import ShiftPreviewDialog from "./components/ShiftPreviewDialog";

import { useClasses } from "../../hooks/useStudents";
import { useShiftPreview, useShiftExecute } from "../../hooks/useShift";
import useThemeMode from "../../hooks/useThemeMode";
import studentApi from "../../api/studentApi";

const ShiftPage = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { isDark } = useThemeMode();

  // ─── Class data ───
  const { data: classes = [], isLoading: classesLoading } = useClasses();

  // ─── State ───
  const [sourceClassId, setSourceClassId] = useState("");
  const [targetClassId, setTargetClassId] = useState("");
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // ─── Mutations ───
  const previewMutation = useShiftPreview();
  const executeMutation = useShiftExecute();

  // ─── Source class label ───
  const sourceClass = useMemo(
    () => classes.find((c) => c._id === sourceClassId),
    [classes, sourceClassId],
  );
  const targetClass = useMemo(
    () => classes.find((c) => c._id === targetClassId),
    [classes, targetClassId],
  );

  const sourceLabel = sourceClass
    ? `${sourceClass.name}-${sourceClass.section}`
    : "";
  const targetLabel = targetClass
    ? `${targetClass.name}-${targetClass.section}`
    : "";

  // ─── Load students when source class changes ───
  useEffect(() => {
    if (!sourceClassId) {
      setStudents([]);
      setSelectedIds(new Set());
      return;
    }

    let cancelled = false;

    const load = async () => {
      setStudentsLoading(true);
      try {
        const res = await studentApi.list({
          class: sourceClassId,
          status: "Active",
          limit: 500,
        });
        if (!cancelled) {
          setStudents(res.data?.data || []);
          setStudentsLoading(false);
          setSelectedIds(new Set());
        }
      } catch (err) {
        if (!cancelled) {
          setStudents([]);
          setStudentsLoading(false);
          enqueueSnackbar(
            err.response?.data?.message || "Failed to load students",
            { variant: "error" },
          );
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [sourceClassId, enqueueSnackbar]);

  // ─── Selection handlers ───
  const handleToggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((ids) => {
    setSelectedIds(new Set(ids));
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // ─── Preview handler ───
  const handlePreview = async () => {
    if (!sourceClassId || !targetClassId) {
      enqueueSnackbar("Select both source and target class", {
        variant: "warning",
      });
      return;
    }

    if (selectedIds.size === 0) {
      enqueueSnackbar("Select at least one student", {
        variant: "warning",
      });
      return;
    }

    try {
      const res = await previewMutation.mutateAsync({
        sourceClassId,
        targetClassId,
        studentIds: Array.from(selectedIds),
      });

      setPreviewData(res.data?.data || null);
      setPreviewOpen(true);
    } catch {
      // Error handled by mutation
    }
  };

  // ─── Execute handler ───
  const handleConfirmShift = async () => {
    if (!previewData) return;

    try {
      await executeMutation.mutateAsync({
        sourceClassId,
        targetClassId,
        studentIds: Array.from(selectedIds),
      });

      setPreviewOpen(false);
      setPreviewData(null);
      setSelectedIds(new Set());

      // Reload students in source class
      setSourceClassId((prev) => {
        // Force re-fetch by re-setting
        const temp = prev;
        setSourceClassId("");
        setTimeout(() => setSourceClassId(temp), 100);
        return "";
      });
    } catch {
      // Error handled by mutation
    }
  };

  // ─── Validation ───
  const canPreview =
    sourceClassId &&
    targetClassId &&
    sourceClassId !== targetClassId &&
    selectedIds.size > 0;

  return (
    <Box sx={{ pb: { xs: 10, md: 4 } }}>
      {/* ─── HEADER ─── */}
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
          <Link
            underline="hover"
            color="inherit"
            onClick={() => navigate("/students")}
            sx={{ cursor: "pointer", fontSize: "0.82rem" }}
          >
            Students
          </Link>
          <Typography
            color="text.primary"
            sx={{ fontSize: "0.82rem", fontWeight: 700 }}
          >
            Section Shift
          </Typography>
        </Breadcrumbs>

        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar
            sx={{
              width: 44,
              height: 44,
              background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
            }}
          >
            <SwapHorizOutlinedIcon sx={{ color: "white", fontSize: 22 }} />
          </Avatar>
          <Box>
            <Typography
              variant="h4"
              fontWeight={900}
              sx={{
                fontSize: { xs: "1.5rem", sm: "1.75rem" },
                lineHeight: 1.1,
                color: "text.primary",
              }}
            >
              Section Shift
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: "0.82rem" }}
            >
              Move students between classes and sections
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* ─── INFO BANNER ─── */}
      <Alert
        severity="info"
        sx={{ mb: 2, borderRadius: 3 }}
        icon={<SwapHorizOutlinedIcon />}
      >
        <Typography variant="body2" fontWeight={700}>
          How it works
        </Typography>
        <Typography variant="caption" sx={{ display: "block", mt: 0.3 }}>
          1. Select source class → 2. Pick students → 3. Choose target class →
          4. Preview & confirm
        </Typography>
      </Alert>

      {/* ─── CLASS SELECTORS ─── */}
      <Paper
        sx={{
          p: { xs: 2, sm: 2.5 },
          mb: 2,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Grid container spacing={2} alignItems="center">
          {/* Source Class */}
          <Grid item xs={12} md={5}>
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Chip
                  label="FROM"
                  size="small"
                  color="error"
                  sx={{ fontWeight: 800, fontSize: "0.7rem", height: 22 }}
                />
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{ textTransform: "uppercase", fontSize: "0.7rem" }}
                >
                  Source Class
                </Typography>
              </Stack>
              <ClassSelector
                label="Select Source Class"
                value={sourceClassId}
                onChange={(val) => {
                  setSourceClassId(val);
                  if (val === targetClassId) setTargetClassId("");
                }}
                classes={classes}
                color="error"
              />
            </Stack>
          </Grid>

          {/* Arrow */}
          <Grid
            item
            xs={12}
            md={2}
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ArrowDownwardOutlinedIcon
              sx={{
                fontSize: 32,
                color: "primary.main",
                transform: { xs: "rotate(0)", md: "rotate(-90deg)" },
              }}
            />
          </Grid>

          {/* Target Class */}
          <Grid item xs={12} md={5}>
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Chip
                  label="TO"
                  size="small"
                  color="success"
                  sx={{ fontWeight: 800, fontSize: "0.7rem", height: 22 }}
                />
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{ textTransform: "uppercase", fontSize: "0.7rem" }}
                >
                  Target Class
                </Typography>
              </Stack>
              <ClassSelector
                label="Select Target Class"
                value={targetClassId}
                onChange={setTargetClassId}
                classes={classes}
                excludeId={sourceClassId}
                color="success"
                helperText={
                  targetClass
                    ? `Currently has ${targetClass.studentCount || 0} students`
                    : ""
                }
              />
            </Stack>
          </Grid>
        </Grid>

        {/* Same class warning */}
        {sourceClassId && targetClassId && sourceClassId === targetClassId && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            Source and target class cannot be the same!
          </Alert>
        )}
      </Paper>

      {/* ─── STUDENT PICKER ─── */}
      {sourceClassId && (
        <Box sx={{ mb: 2 }}>
          <StudentPicker
            students={students}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onClearSelection={handleClearSelection}
            loading={studentsLoading}
            sourceLabel={sourceLabel}
          />
        </Box>
      )}

      {/* ─── SHIFT BUTTON ─── */}
      {sourceClassId && (
        <Paper
          sx={{
            p: 2,
            borderRadius: 3,
            border: "1px solid",
            borderColor: canPreview ? "primary.main" : "divider",
            bgcolor: canPreview
              ? isDark
                ? "rgba(59,130,246,0.08)"
                : "primary.50"
              : "background.paper",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", sm: "center" }}
            spacing={2}
          >
            <Box>
              <Typography variant="body2" fontWeight={800}>
                {selectedIds.size > 0
                  ? `${selectedIds.size} student${selectedIds.size !== 1 ? "s" : ""} selected`
                  : "No students selected"}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: "0.72rem" }}
              >
                {canPreview
                  ? `Ready to shift from ${sourceLabel} → ${targetLabel}`
                  : selectedIds.size === 0
                    ? "Select students from the list above"
                    : !targetClassId
                      ? "Select a target class"
                      : "Cannot shift — check selections"}
              </Typography>
            </Box>

            <Button
              variant="contained"
              size="large"
              startIcon={
                previewMutation.isPending ? (
                  <CircularProgress size={18} sx={{ color: "white" }} />
                ) : (
                  <PreviewOutlinedIcon />
                )
              }
              onClick={handlePreview}
              disabled={!canPreview || previewMutation.isPending}
              sx={{
                background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
                fontWeight: 800,
                textTransform: "none",
                px: 4,
                py: 1.3,
                fontSize: "0.95rem",
                "&.Mui-disabled": {
                  background: "rgba(0,0,0,0.12)",
                },
              }}
            >
              {previewMutation.isPending
                ? "Generating Preview..."
                : `Preview Shift (${selectedIds.size})`}
            </Button>
          </Stack>
        </Paper>
      )}

      {/* ─── PREVIEW DIALOG ─── */}
      <ShiftPreviewDialog
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewData(null);
        }}
        onConfirm={handleConfirmShift}
        previewData={previewData}
        loading={executeMutation.isPending}
      />
    </Box>
  );
};

export default ShiftPage;
