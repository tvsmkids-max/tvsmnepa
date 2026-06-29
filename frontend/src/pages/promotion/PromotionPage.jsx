import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Stack,
  Button,
  CircularProgress,
  Checkbox,
  Avatar,
  Chip,
  Alert,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useSnackbar } from "notistack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import promotionApi from "../../api/promotionApi";
import sessionApi from "../../api/sessionApi";
import classApi from "../../api/classApi";

const PromotionPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [sessions, setSessions] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [previewing, setPreviewing] = useState(false);
  const [promoting, setPromoting] = useState(false);

  const [sourceSession, setSourceSession] = useState("");
  const [sourceClass, setSourceClass] = useState("");
  const [targetSession, setTargetSession] = useState("");
  const [targetClass, setTargetClass] = useState("");

  const [preview, setPreview] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [sessRes, classRes] = await Promise.all([
          sessionApi.list(),
          classApi.list({ limit: 500, all: true }),
        ]);
        if (!cancelled) {
          setSessions(sessRes.data?.data || []);
          setAllClasses(classRes.data?.data || []);
        }
      } catch {
        // ignore
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const sourceClasses = allClasses.filter(
    (c) => !sourceSession || (c.session?._id || c.session) === sourceSession,
  );
  const targetClasses = allClasses;

  const handlePreview = async () => {
    if (!sourceSession || !sourceClass || !targetSession || !targetClass) {
      enqueueSnackbar("Please select all fields", { variant: "warning" });
      return;
    }
    if (sourceSession === targetSession) {
      enqueueSnackbar("Source and target session must be different", {
        variant: "warning",
      });
      return;
    }
    setPreviewing(true);
    setPreview(null);
    setResult(null);
    try {
      const res = await promotionApi.preview({
        sourceClassId: sourceClass,
        sourceSessionId: sourceSession,
        targetClassId: targetClass,
        targetSessionId: targetSession,
      });
      const data = res.data?.data;
      setPreview(data);
      setSelectedStudents(data?.eligible?.map((s) => s._id) || []);
      enqueueSnackbar(`${data?.summary?.canPromote || 0} students eligible`, {
        variant: "info",
      });
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Preview failed", {
        variant: "error",
      });
    } finally {
      setPreviewing(false);
    }
  };

  const handleExecute = async () => {
    setConfirmOpen(false);
    setPromoting(true);
    try {
      const res = await promotionApi.execute({
        sourceClassId: sourceClass,
        sourceSessionId: sourceSession,
        targetClassId: targetClass,
        targetSessionId: targetSession,
        studentIds: selectedStudents,
      });
      setResult(res.data?.data);
      enqueueSnackbar(`Promoted ${res.data?.data?.promoted} students`, {
        variant: "success",
      });
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || "Promotion failed", {
        variant: "error",
      });
    } finally {
      setPromoting(false);
    }
  };

  const toggleStudent = (id) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const toggleAll = () => {
    if (!preview?.eligible) return;
    const allIds = preview.eligible.map((s) => s._id);
    setSelectedStudents((prev) =>
      prev.length === allIds.length ? [] : allIds,
    );
  };

  const reset = () => {
    setPreview(null);
    setResult(null);
    setSelectedStudents([]);
  };

  const getSessionName = (id) =>
    sessions.find((s) => s._id === id)?.name || "—";

  const getClassName = (id) => {
    const c = allClasses.find((cls) => cls._id === id);
    return c ? `${c.name}-${c.section}` : "—";
  };

  const getClassWithSession = (cls) => {
    const session = sessions.find(
      (s) => s._id === (cls.session?._id || cls.session),
    );
    return `${cls.name} - ${cls.section}${session ? ` (${session.name})` : ""}`;
  };

  // ── Theme-aware colors ──
  const successBg = alpha(theme.palette.success.main, isDark ? 0.15 : 0.08);
  const warningBg = alpha(theme.palette.warning.main, isDark ? 0.15 : 0.08);
  const errorBg = alpha(theme.palette.error.main, isDark ? 0.15 : 0.08);
  const primaryBg = alpha(theme.palette.primary.main, isDark ? 0.15 : 0.08);
  const selectedRowBg = alpha(theme.palette.primary.main, isDark ? 0.12 : 0.06);

  return (
    <Box sx={{ pb: { xs: 10, md: 4 } }}>
      <PageHeader
        title="Student Promotion"
        subtitle="Promote students to next class for new session"
        breadcrumbs={[
          { label: "Dashboard", path: "/dashboard" },
          { label: "Promotions" },
        ]}
      />

      {/* ── Success Result ── */}
      {result && (
        <Paper
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 3,
            textAlign: "center",
          }}
        >
          <Avatar
            sx={{
              width: 64,
              height: 64,
              bgcolor: successBg,
              mx: "auto",
              mb: 2,
            }}
          >
            <CheckCircleOutlinedIcon
              sx={{ fontSize: 36, color: "success.main" }}
            />
          </Avatar>
          <Typography variant="h5" fontWeight={800} gutterBottom>
            Promotion Complete
          </Typography>
          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            sx={{ mb: 2 }}
          >
            <Chip
              label={`${result.promoted} Promoted`}
              sx={{
                bgcolor: successBg,
                color: "success.main",
                fontWeight: 700,
                border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
              }}
            />
            {result.skipped > 0 && (
              <Chip
                label={`${result.skipped} Skipped`}
                sx={{
                  bgcolor: warningBg,
                  color: "warning.main",
                  fontWeight: 700,
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                }}
              />
            )}
            {result.failed > 0 && (
              <Chip
                label={`${result.failed} Failed`}
                sx={{
                  bgcolor: errorBg,
                  color: "error.main",
                  fontWeight: 700,
                  border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                }}
              />
            )}
          </Stack>
          <Button variant="outlined" onClick={reset}>
            Promote More Students
          </Button>
        </Paper>
      )}

      {/* ── Selection Form ── */}
      {!result && (
        <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
          <Grid container spacing={2}>
            {/* Source Label */}
            <Grid item xs={12}>
              <Typography
                variant="caption"
                fontWeight={700}
                color="text.secondary"
                sx={{
                  textTransform: "uppercase",
                  fontSize: "0.68rem",
                  letterSpacing: "0.06em",
                }}
              >
                Promote From (Source)
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Source Session</InputLabel>
                <Select
                  value={sourceSession}
                  label="Source Session"
                  onChange={(e) => {
                    setSourceSession(e.target.value);
                    setSourceClass("");
                    setPreview(null);
                  }}
                >
                  {sessions.map((s) => (
                    <MenuItem key={s._id} value={s._id}>
                      {s.name} {s.isActive && "(Active)"}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small" disabled={!sourceSession}>
                <InputLabel>Source Class</InputLabel>
                <Select
                  value={sourceClass}
                  label="Source Class"
                  onChange={(e) => {
                    setSourceClass(e.target.value);
                    setPreview(null);
                  }}
                >
                  {sourceClasses.map((c) => (
                    <MenuItem key={c._id} value={c._id}>
                      {c.name} - {c.section}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Arrow */}
            <Grid item xs={12} sx={{ textAlign: "center", py: 0 }}>
              <ArrowForwardIcon
                sx={{
                  color: "divider",
                  fontSize: 28,
                  transform: "rotate(90deg)",
                }}
              />
            </Grid>

            {/* Target Label */}
            <Grid item xs={12}>
              <Typography
                variant="caption"
                fontWeight={700}
                color="text.secondary"
                sx={{
                  textTransform: "uppercase",
                  fontSize: "0.68rem",
                  letterSpacing: "0.06em",
                }}
              >
                Promote To (Target)
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Target Session</InputLabel>
                <Select
                  value={targetSession}
                  label="Target Session"
                  onChange={(e) => {
                    setTargetSession(e.target.value);
                    setTargetClass("");
                    setPreview(null);
                  }}
                >
                  {sessions
                    .filter((s) => s._id !== sourceSession)
                    .map((s) => (
                      <MenuItem key={s._id} value={s._id}>
                        {s.name} {s.isActive && "(Active)"}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small" disabled={!targetSession}>
                <InputLabel>Target Class</InputLabel>
                <Select
                  value={targetClass}
                  label="Target Class"
                  onChange={(e) => {
                    setTargetClass(e.target.value);
                    setPreview(null);
                  }}
                >
                  {targetClasses.map((c) => (
                    <MenuItem key={c._id} value={c._id}>
                      {getClassWithSession(c)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                fullWidth
                onClick={handlePreview}
                disabled={
                  !sourceSession ||
                  !sourceClass ||
                  !targetSession ||
                  !targetClass ||
                  previewing
                }
                startIcon={
                  previewing ? (
                    <CircularProgress size={16} sx={{ color: "white" }} />
                  ) : (
                    <SchoolOutlinedIcon />
                  )
                }
                sx={{ py: 1.3 }}
              >
                {previewing ? "Loading Preview..." : "Preview Promotion"}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* ── Preview ── */}
      {preview && !result && (
        <>
          {/* Summary Bar */}
          <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
              gap={1}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={`${getClassName(sourceClass)} (${getSessionName(sourceSession)})`}
                  sx={{
                    fontWeight: 700,
                    bgcolor: "action.hover",
                    color: "text.primary",
                  }}
                />
                <ArrowForwardIcon
                  sx={{ color: "text.secondary", fontSize: 18 }}
                />
                <Chip
                  label={`${getClassName(targetClass)} (${getSessionName(targetSession)})`}
                  sx={{
                    fontWeight: 700,
                    bgcolor: primaryBg,
                    color: "primary.main",
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                  }}
                />
              </Stack>
              <Stack direction="row" spacing={1}>
                <Chip
                  label={`${preview.summary.canPromote} eligible`}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    bgcolor: successBg,
                    color: "success.main",
                  }}
                />
                {preview.summary.alreadyDone > 0 && (
                  <Chip
                    label={`${preview.summary.alreadyDone} already done`}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      bgcolor: warningBg,
                      color: "warning.main",
                    }}
                  />
                )}
              </Stack>
            </Stack>
          </Paper>

          {/* Already Promoted Warning */}
          {preview.alreadyPromoted.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 3 }}>
              <Typography variant="body2" fontWeight={700}>
                {preview.alreadyPromoted.length} student(s) already exist in
                target session — will be skipped
              </Typography>
            </Alert>
          )}

          {/* Student List */}
          {preview.eligible.length === 0 ? (
            <Paper sx={{ borderRadius: 3 }}>
              <EmptyState
                icon={<SchoolOutlinedIcon sx={{ fontSize: 64 }} />}
                title="No eligible students"
                message="All students are already promoted or no active students found."
              />
            </Paper>
          ) : (
            <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
              {/* List Header */}
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.default",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Checkbox
                    checked={
                      selectedStudents.length === preview.eligible.length
                    }
                    indeterminate={
                      selectedStudents.length > 0 &&
                      selectedStudents.length < preview.eligible.length
                    }
                    onChange={toggleAll}
                    size="small"
                  />
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    color="text.secondary"
                    sx={{
                      textTransform: "uppercase",
                      fontSize: "0.68rem",
                    }}
                  >
                    Select All ({selectedStudents.length}/
                    {preview.eligible.length})
                  </Typography>
                </Stack>
              </Box>

              {/* Student rows */}
              {preview.eligible.map((s, idx) => {
                const isSelected = selectedStudents.includes(s._id);
                const isLast = idx === preview.eligible.length - 1;
                return (
                  <Box
                    key={s._id}
                    onClick={() => toggleStudent(s._id)}
                    sx={{
                      px: 2,
                      py: 1.5,
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      cursor: "pointer",
                      borderBottom: isLast ? "none" : "1px solid",
                      borderColor: "divider",
                      bgcolor: isSelected ? selectedRowBg : "transparent",
                      "&:hover": {
                        bgcolor: isSelected ? selectedRowBg : "action.hover",
                      },
                      transition: "background-color 0.15s",
                    }}
                  >
                    <Checkbox checked={isSelected} size="small" />
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor:
                          s.gender === "Female"
                            ? alpha("#EC4899", 0.15)
                            : alpha(theme.palette.primary.main, 0.15),
                        color:
                          s.gender === "Female" ? "#EC4899" : "primary.main",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {s.name?.[0]?.toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700} noWrap>
                        {s.name}
                      </Typography>
                      <Stack direction="row" spacing={0.8} alignItems="center">
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            fontFamily: "monospace",
                            fontSize: "0.7rem",
                          }}
                        >
                          {s.scholarNumber}
                        </Typography>
                        {s.fatherName && (
                          <Typography
                            variant="caption"
                            color="text.disabled"
                            sx={{ fontSize: "0.68rem" }}
                          >
                            • {s.fatherName}
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                    <Stack alignItems="flex-end">
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: "0.68rem" }}
                      >
                        Roll {s.currentRoll} →{" "}
                        <Typography
                          component="strong"
                          sx={{
                            fontSize: "0.68rem",
                            fontWeight: 800,
                            color: "primary.main",
                          }}
                        >
                          {s.newRoll}
                        </Typography>
                      </Typography>
                    </Stack>
                  </Box>
                );
              })}
            </Paper>
          )}

          {/* Action Buttons */}
          {preview.eligible.length > 0 && (
            <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={reset}
                sx={{ py: 1.3 }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                fullWidth
                color="success"
                onClick={() => setConfirmOpen(true)}
                disabled={selectedStudents.length === 0 || promoting}
                startIcon={
                  promoting ? (
                    <CircularProgress size={16} sx={{ color: "white" }} />
                  ) : (
                    <CheckCircleOutlinedIcon />
                  )
                }
                sx={{ py: 1.3 }}
              >
                {promoting
                  ? "Promoting..."
                  : `Promote ${selectedStudents.length} Student${
                      selectedStudents.length !== 1 ? "s" : ""
                    }`}
              </Button>
            </Stack>
          )}
        </>
      )}

      {/* Empty state */}
      {!sourceSession && !preview && !result && (
        <Paper sx={{ borderRadius: 3 }}>
          <EmptyState
            icon={<SchoolOutlinedIcon sx={{ fontSize: 64 }} />}
            title="Select classes to begin"
            message="Choose source and target session + class above to preview promotion."
          />
        </Paper>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm Promotion"
        message={`Promote ${selectedStudents.length} student(s) from ${getClassName(sourceClass)} to ${getClassName(targetClass)}? This creates new records in ${getSessionName(targetSession)}. Original records are preserved.`}
        confirmText="Promote Now"
        severity="info"
        loading={promoting}
        onConfirm={handleExecute}
        onClose={() => setConfirmOpen(false)}
      />
    </Box>
  );
};

export default PromotionPage;
