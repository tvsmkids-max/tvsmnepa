import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate, useParams } from "react-router-dom";
import { useSnackbar } from "notistack";
import PageHeader from "../../components/common/PageHeader";
import examApi from "../../api/examApi";
import classApi from "../../api/classApi";
import {
  EXAM_STATUS_LABELS,
  EXAM_STATUS_COLORS,
  NEXT_STATUSES,
  BACKWARD,
  CONFIG_EDITABLE,
  examTypeLabel,
  toDateInput,
} from "./examConstants";

const apiMsg = (err, fallback) =>
  err.response?.data?.errors?.[0]?.message ||
  err.response?.data?.message ||
  fallback;

const blankSubject = () => ({ name: "", maxMarks: "", passingMarks: "" });

const ExamDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [audit, setAudit] = useState([]);

  const [details, setDetails] = useState(null);
  const [savingDetails, setSavingDetails] = useState(false);

  const [cfgOpen, setCfgOpen] = useState(false);
  const [allClasses, setAllClasses] = useState([]);
  const [pickedClasses, setPickedClasses] = useState([]);
  const [subjects, setSubjects] = useState([blankSubject()]);
  const [savingCfg, setSavingCfg] = useState(false);

  const [statusTarget, setStatusTarget] = useState(null);
  const [reason, setReason] = useState("");

  const [reloadKey, setReloadKey] = useState(0);
  const load = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await examApi.getById(id);
        if (cancelled) return;
        const e = res.data?.data;
        setExam(e);
        setDetails({
          name: e.name,
          examType: e.examType,
          startDate: toDateInput(e.startDate),
          endDate: toDateInput(e.endDate),
          instructions: e.instructions || "",
        });
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        enqueueSnackbar(apiMsg(err, "Failed to load examination"), {
          variant: "error",
        });
        navigate("/exams");
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey, navigate, enqueueSnackbar]);

  useEffect(() => {
    if (tab !== 2) return;
    let cancelled = false;
    const run = async () => {
      try {
        const res = await examApi.audit(id, { limit: 100 });
        if (!cancelled) setAudit(res.data?.data || []);
      } catch {
        if (!cancelled) setAudit([]);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [tab, id, reloadKey]);

  if (loading || !exam) return <LinearProgress />;

  const editable = CONFIG_EDITABLE.includes(exam.status);

  const saveDetails = async () => {
    setSavingDetails(true);
    try {
      await examApi.update(id, {
        name: details.name,
        examType: details.examType,
        startDate: details.startDate || null,
        endDate: details.endDate || null,
        instructions: details.instructions,
      });
      enqueueSnackbar("Details saved", { variant: "success" });
      load();
    } catch (err) {
      enqueueSnackbar(apiMsg(err, "Failed to save"), { variant: "error" });
    } finally {
      setSavingDetails(false);
    }
  };

  const openConfig = async (cfg) => {
    try {
      if (allClasses.length === 0) {
        const res = await classApi.list({
          session: exam.session._id,
          limit: 500,
          all: true,
        });
        setAllClasses(res.data?.data || []);
      }
    } catch {
      enqueueSnackbar("Failed to load classes", { variant: "error" });
      return;
    }
    if (cfg) {
      setPickedClasses([cfg.class._id]);
      setSubjects(
        cfg.subjects.map((s) => ({
          name: s.name,
          maxMarks: s.maxMarks,
          passingMarks: s.passingMarks,
        })),
      );
    } else {
      setPickedClasses([]);
      setSubjects([blankSubject()]);
    }
    setCfgOpen(true);
  };

  const subjectError = () => {
    const names = new Set();
    for (const s of subjects) {
      const n = s.name.trim().toLowerCase();
      if (!n) return "Every subject needs a name";
      if (names.has(n)) return `Duplicate subject: ${s.name.trim()}`;
      names.add(n);
      const max = Number(s.maxMarks);
      const pass = Number(s.passingMarks);
      if (!(max >= 1)) return `${s.name}: maximum marks must be at least 1`;
      if (s.passingMarks === "" || !(pass >= 0))
        return `${s.name}: enter passing marks`;
      if (pass > max) return `${s.name}: passing marks exceed maximum marks`;
    }
    return "";
  };

  const saveConfig = async () => {
    setSavingCfg(true);
    try {
      await examApi.saveClassConfigs(id, {
        classIds: pickedClasses,
        subjects: subjects.map((s) => ({
          name: s.name.trim(),
          maxMarks: Number(s.maxMarks),
          passingMarks: Number(s.passingMarks),
        })),
      });
      enqueueSnackbar("Configuration saved", { variant: "success" });
      setCfgOpen(false);
      load();
    } catch (err) {
      enqueueSnackbar(apiMsg(err, "Failed to save configuration"), { variant: "error" });
    } finally {
      setSavingCfg(false);
    }
  };

  const removeClass = async (classId) => {
    try {
      await examApi.removeClassConfig(id, classId);
      load();
    } catch (err) {
      enqueueSnackbar(apiMsg(err, "Failed to remove class"), { variant: "error" });
    }
  };

  const confirmStatus = async () => {
    try {
      await examApi.changeStatus(id, { status: statusTarget, reason });
      enqueueSnackbar("Status updated", { variant: "success" });
      setStatusTarget(null);
      setReason("");
      load();
    } catch (err) {
      enqueueSnackbar(apiMsg(err, "Status change failed"), { variant: "error" });
    }
  };

  const deleteExam = async () => {
    if (!window.confirm("Delete this draft examination permanently?")) return;
    try {
      await examApi.remove(id);
      enqueueSnackbar("Examination deleted", { variant: "success" });
      navigate("/exams");
    } catch (err) {
      enqueueSnackbar(apiMsg(err, "Delete failed"), { variant: "error" });
    }
  };

  const setField = (k) => (e) => setDetails((d) => ({ ...d, [k]: e.target.value }));
  const setSubject = (i, k) => (e) =>
    setSubjects((list) =>
      list.map((s, idx) => (idx === i ? { ...s, [k]: e.target.value } : s)),
    );
  const nextStatuses = NEXT_STATUSES[exam.status] || [];
  const cfgError = subjectError();
  const sortedConfigs = [...(exam.classConfigs || [])].sort(
    (a, b) =>
      (a.class?.displayOrder ?? 0) - (b.class?.displayOrder ?? 0) ||
      `${a.class?.name}${a.class?.section}`.localeCompare(
        `${b.class?.name}${b.class?.section}`,
      ),
  );

  return (
    <Box>
      <PageHeader
        title={exam.name}
        subtitle={`${examTypeLabel(exam.examType)} · Session ${exam.session?.name}`}
        breadcrumbs={[{ label: "Examinations", path: "/exams" }, { label: exam.name }]}
      />

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} flexWrap="wrap">
          <Chip
            label={EXAM_STATUS_LABELS[exam.status]}
            color={EXAM_STATUS_COLORS[exam.status]}
          />
          {nextStatuses.map((s) => (
            <Button
              key={s}
              size="small"
              variant={(BACKWARD[exam.status] || []).includes(s) ? "outlined" : "contained"}
              onClick={() => setStatusTarget(s)}
            >
              {(BACKWARD[exam.status] || []).includes(s) ? "Move back to " : "Move to "}
              {EXAM_STATUS_LABELS[s]}
            </Button>
          ))}
          {exam.status === "draft" && (
            <Button size="small" color="error" onClick={deleteExam}>
              Delete draft
            </Button>
          )}
        </Stack>
        {!editable && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Details and class configuration are locked once the examination has started.
          </Alert>
        )}
      </Paper>

      <Paper>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
          <Tab label="Classes & Subjects" />
          <Tab label="Details" />
          <Tab label="Audit History" />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Configured classes ({sortedConfigs.length})
              </Typography>
              {editable && (
                <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={() => openConfig(null)}>
                  Add / configure classes
                </Button>
              )}
            </Stack>
            {sortedConfigs.length === 0 ? (
              <Alert severity="warning">
                No classes configured. Add classes with subjects, maximum marks and passing marks.
              </Alert>
            ) : (
              sortedConfigs.map((cfg) => (
                <Paper key={cfg._id} variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography fontWeight={600}>
                      {cfg.class?.name} - {cfg.class?.section}
                    </Typography>
                    {editable && (
                      <Stack direction="row" spacing={1}>
                        <Button size="small" onClick={() => openConfig(cfg)}>
                          Edit
                        </Button>
                        <Button size="small" color="error" onClick={() => removeClass(cfg.class._id)}>
                          Remove
                        </Button>
                      </Stack>
                    )}
                  </Stack>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Subject</TableCell>
                        <TableCell align="right">Max marks</TableCell>
                        <TableCell align="right">Passing marks</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cfg.subjects.map((s) => (
                        <TableRow key={s._id}>
                          <TableCell>{s.name}</TableCell>
                          <TableCell align="right">{s.maxMarks}</TableCell>
                          <TableCell align="right">{s.passingMarks}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              ))
            )}
          </Box>
        )}

        {tab === 1 && details && (
          <Stack spacing={2} sx={{ p: 2, maxWidth: 560 }}>
            <TextField label="Name" value={details.name} onChange={setField("name")} disabled={!editable} />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Start date" type="date" value={details.startDate} onChange={setField("startDate")} InputLabelProps={{ shrink: true }} disabled={!editable} fullWidth />
              <TextField label="End date" type="date" value={details.endDate} onChange={setField("endDate")} InputLabelProps={{ shrink: true }} disabled={!editable} fullWidth />
            </Stack>
            <TextField label="Instructions" value={details.instructions} onChange={setField("instructions")} multiline minRows={4} disabled={!editable} />
            {editable && (
              <Box>
                <Button variant="contained" onClick={saveDetails} disabled={savingDetails}>
                  Save details
                </Button>
              </Box>
            )}
          </Stack>
        )}

        {tab === 2 && (
          <Box sx={{ p: 2, overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>When</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Class</TableCell>
                  <TableCell>By</TableCell>
                  <TableCell>Reason</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {audit.map((a) => (
                  <TableRow key={a._id}>
                    <TableCell>{new Date(a.at).toLocaleString()}</TableCell>
                    <TableCell>{a.action}</TableCell>
                    <TableCell>{a.class ? `${a.class.name} - ${a.class.section}` : "—"}</TableCell>
                    <TableCell>{a.actor?.name || "—"}</TableCell>
                    <TableCell>{a.reason || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

      <Dialog open={cfgOpen} onClose={() => setCfgOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Classes, subjects and marks</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mt: 1 }}>
            Apply to classes
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", mb: 2 }}>
            {allClasses
              .filter((c) => !c.isArchived)
              .map((c) => (
                <FormControlLabel
                  key={c._id}
                  control={
                    <Checkbox
                      checked={pickedClasses.includes(c._id)}
                      onChange={(e) =>
                        setPickedClasses((p) =>
                          e.target.checked ? [...p, c._id] : p.filter((x) => x !== c._id),
                        )
                      }
                    />
                  }
                  label={`${c.name} - ${c.section}`}
                  sx={{ minWidth: 150 }}
                />
              ))}
          </Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Subjects (the same list is saved for every selected class)
          </Typography>
          {subjects.map((s, i) => (
            <Stack key={i} direction="row" spacing={1} sx={{ mb: 1 }}>
              <TextField size="small" label="Subject" value={s.name} onChange={setSubject(i, "name")} sx={{ flex: 2 }} />
              <TextField size="small" label="Max marks" type="number" value={s.maxMarks} onChange={setSubject(i, "maxMarks")} sx={{ flex: 1 }} />
              <TextField size="small" label="Passing marks" type="number" value={s.passingMarks} onChange={setSubject(i, "passingMarks")} sx={{ flex: 1 }} />
              <IconButton
                aria-label="Remove subject"
                disabled={subjects.length === 1}
                onClick={() => setSubjects((l) => l.filter((_, idx) => idx !== i))}
              >
                <DeleteOutlineIcon />
              </IconButton>
            </Stack>
          ))}
          <Button size="small" startIcon={<AddIcon />} onClick={() => setSubjects((l) => [...l, blankSubject()])}>
            Add subject
          </Button>
          {cfgError && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {cfgError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCfgOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={saveConfig}
            disabled={savingCfg || pickedClasses.length === 0 || !!cfgError}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!statusTarget} onClose={() => setStatusTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>
          Change status to {statusTarget && EXAM_STATUS_LABELS[statusTarget]}
        </DialogTitle>
        <DialogContent>
          <TextField
            label={
              (BACKWARD[exam.status] || []).includes(statusTarget)
                ? "Reason (required)"
                : "Note (optional)"
            }
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            minRows={2}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={confirmStatus}
            disabled={
              (BACKWARD[exam.status] || []).includes(statusTarget) && !reason.trim()
            }
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExamDetailPage;
