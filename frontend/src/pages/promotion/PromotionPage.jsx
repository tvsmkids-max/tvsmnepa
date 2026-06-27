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
  Divider,
  Checkbox,
  Avatar,
  Chip,
  Alert,
} from "@mui/material";
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

  const [sessions, setSessions] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [previewing, setPreviewing] = useState(false);
  const [promoting, setPromoting] = useState(false);

  // Source
  const [sourceSession, setSourceSession] = useState("");
  const [sourceClass, setSourceClass] = useState("");

  // Target
  const [targetSession, setTargetSession] = useState("");
  const [targetClass, setTargetClass] = useState("");

  // Preview
  const [preview, setPreview] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Result
  const [result, setResult] = useState(null);

  // Load sessions and ALL classes
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

  // Source classes — filtered by selected source session
  const sourceClasses = allClasses.filter(
    (c) => !sourceSession || (c.session?._id || c.session) === sourceSession,
  );

  // Target classes — show ALL classes (admin picks target)
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

      {/* Success Result */}
      {result && (
        <Paper
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 3,
            border: "1px solid rgba(0,0,0,0.06)",
            textAlign: "center",
            boxShadow: "none",
          }}
        >
          <Avatar
            sx={{
              width: 64,
              height: 64,
              bgcolor: "#ECFDF5",
              mx: "auto",
              mb: 2,
            }}
          >
            <CheckCircleOutlinedIcon sx={{ fontSize: 36, color: "#16A34A" }} />
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
                bgcolor: "#ECFDF5",
                color: "#16A34A",
                fontWeight: 700,
              }}
            />
            {result.skipped > 0 && (
              <Chip
                label={`${result.skipped} Skipped`}
                sx={{
                  bgcolor: "#FFFBEB",
                  color: "#D97706",
                  fontWeight: 700,
                }}
              />
            )}
            {result.failed > 0 && (
              <Chip
                label={`${result.failed} Failed`}
                sx={{
                  bgcolor: "#FEF2F2",
                  color: "#DC2626",
                  fontWeight: 700,
                }}
              />
            )}
          </Stack>
          <Button variant="outlined" onClick={reset}>
            Promote More Students
          </Button>
        </Paper>
      )}

      {/* Selection Form */}
      {!result && (
        <Paper
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 3,
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "none",
          }}
        >
          <Grid container spacing={2}>
            {/* Source */}
            <Grid item xs={12}>
              <Typography
                variant="caption"
                fontWeight={700}
                sx={{
                  color: "#8E99A4",
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
                  color: "#C5CAD0",
                  fontSize: 28,
                  transform: "rotate(90deg)",
                }}
              />
            </Grid>

            {/* Target */}
            <Grid item xs={12}>
              <Typography
                variant="caption"
                fontWeight={700}
                sx={{
                  color: "#8E99A4",
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
                sx={{
                  py: 1.3,
                  bgcolor: "#0D1B3E",
                  boxShadow: "none",
                  "&:hover": { bgcolor: "#1A3060", boxShadow: "none" },
                }}
              >
                {previewing ? "Loading Preview..." : "Preview Promotion"}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Preview */}
      {preview && !result && (
        <>
          {/* Summary */}
          <Paper
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 3,
              border: "1px solid rgba(0,0,0,0.06)",
              boxShadow: "none",
            }}
          >
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
                  sx={{ fontWeight: 700, bgcolor: "#F0F1F3" }}
                />
                <ArrowForwardIcon sx={{ color: "#8E99A4", fontSize: 18 }} />
                <Chip
                  label={`${getClassName(targetClass)} (${getSessionName(targetSession)})`}
                  sx={{
                    fontWeight: 700,
                    bgcolor: "#EFF6FF",
                    color: "#2563EB",
                  }}
                />
              </Stack>
              <Stack direction="row" spacing={1}>
                <Chip
                  label={`${preview.summary.canPromote} eligible`}
                  sx={{
                    fontWeight: 700,
                    bgcolor: "#ECFDF5",
                    color: "#16A34A",
                  }}
                  size="small"
                />
                {preview.summary.alreadyDone > 0 && (
                  <Chip
                    label={`${preview.summary.alreadyDone} already done`}
                    sx={{
                      fontWeight: 700,
                      bgcolor: "#FFFBEB",
                      color: "#D97706",
                    }}
                    size="small"
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
            <Paper
              sx={{
                borderRadius: 3,
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "none",
              }}
            >
              <EmptyState
                icon={<SchoolOutlinedIcon sx={{ fontSize: 64 }} />}
                title="No eligible students"
                message="All students are already promoted or no active students found."
              />
            </Paper>
          ) : (
            <Paper
              sx={{
                borderRadius: 3,
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "none",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  borderBottom: "1px solid rgba(0,0,0,0.06)",
                  bgcolor: "#FAFBFC",
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
                    sx={{
                      color: "#8E99A4",
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
                      borderBottom: isLast
                        ? "none"
                        : "1px solid rgba(0,0,0,0.04)",
                      bgcolor: isSelected ? "#F8FAFF" : "transparent",
                      "&:hover": { bgcolor: "#F5F6FA" },
                      "&:active": { bgcolor: "#F0F1F3" },
                    }}
                  >
                    <Checkbox checked={isSelected} size="small" />
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: s.gender === "Female" ? "#EC4899" : "#1E4D98",
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
                          sx={{
                            color: "#8E99A4",
                            fontFamily: "monospace",
                            fontSize: "0.7rem",
                          }}
                        >
                          {s.scholarNumber}
                        </Typography>
                        {s.fatherName && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: "#B0B8C1",
                              fontSize: "0.68rem",
                            }}
                          >
                            • {s.fatherName}
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                    <Stack alignItems="flex-end">
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#8E99A4",
                          fontSize: "0.68rem",
                        }}
                      >
                        Roll {s.currentRoll} →{" "}
                        <strong style={{ color: "#2563EB" }}>
                          {s.newRoll}
                        </strong>
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
                onClick={() => setConfirmOpen(true)}
                disabled={selectedStudents.length === 0 || promoting}
                startIcon={
                  promoting ? (
                    <CircularProgress size={16} sx={{ color: "white" }} />
                  ) : (
                    <CheckCircleOutlinedIcon />
                  )
                }
                sx={{
                  py: 1.3,
                  bgcolor: "#16A34A",
                  boxShadow: "none",
                  "&:hover": { bgcolor: "#15803D", boxShadow: "none" },
                }}
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

      {/* Empty state when nothing selected */}
      {!sourceSession && !preview && !result && (
        <Paper
          sx={{
            borderRadius: 3,
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "none",
          }}
        >
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
