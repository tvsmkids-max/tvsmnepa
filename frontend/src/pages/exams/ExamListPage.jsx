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
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  LinearProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import examApi from "../../api/examApi";
import sessionApi from "../../api/sessionApi";
import {
  EXAM_TYPES,
  EXAM_STATUS_LABELS,
  EXAM_STATUS_COLORS,
  examTypeLabel,
} from "./examConstants";

const emptyForm = {
  name: "",
  examType: "quarterly",
  session: "",
  startDate: "",
  endDate: "",
  instructions: "",
};

const ExamListPage = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState("");
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await sessionApi.list();
        const list = res.data?.data || [];
        if (cancelled) return;
        setSessions(list);
        const active = list.find((s) => s.isActive) || list[0];
        if (active) setSessionId(active._id);
      } catch {
        if (!cancelled) enqueueSnackbar("Failed to load sessions", { variant: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enqueueSnackbar]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const res = await examApi.list({ session: sessionId, limit: 200 });
        if (!cancelled) setExams(res.data?.data || []);
      } catch (err) {
        if (!cancelled) {
          setExams([]);
          enqueueSnackbar(
            err.response?.data?.message || "Failed to load examinations",
            { variant: "error" },
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [sessionId, enqueueSnackbar]);

  const openCreate = () => {
    setForm({ ...emptyForm, session: sessionId });
    setOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };
      const res = await examApi.create(payload);
      enqueueSnackbar("Examination created", { variant: "success" });
      setOpen(false);
      navigate(`/exams/${res.data?.data?._id}`);
    } catch (err) {
      const errors = err.response?.data?.errors;
      enqueueSnackbar(
        errors?.[0]?.message || err.response?.data?.message || "Failed to create",
        { variant: "error" },
      );
    } finally {
      setSaving(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Box>
      <PageHeader
        title="Examinations"
        subtitle="Create examinations and configure classes, subjects and marks"
        actionLabel="New Examination"
        onAction={openCreate}
      />

      <Paper sx={{ p: 2, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Academic Session</InputLabel>
          <Select
            label="Academic Session"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
          >
            {sessions.map((s) => (
              <MenuItem key={s._id} value={s._id}>
                {s.name}
                {s.isActive ? " (active)" : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      <Paper>
        {loading && <LinearProgress />}
        {!loading && exams.length === 0 ? (
          <EmptyState
            title="No examinations yet"
            message="Create the first examination for this session."
            actionLabel="New Examination"
            onAction={openCreate}
          />
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Dates</TableCell>
                  <TableCell align="center">Classes</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {exams.map((e) => (
                  <TableRow
                    key={e._id}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => navigate(`/exams/${e._id}`)}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>{e.name}</TableCell>
                    <TableCell>{examTypeLabel(e.examType)}</TableCell>
                    <TableCell>
                      {e.startDate && e.endDate
                        ? `${String(e.startDate).slice(0, 10)} → ${String(e.endDate).slice(0, 10)}`
                        : "—"}
                    </TableCell>
                    <TableCell align="center">{e.configuredClasses}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={EXAM_STATUS_LABELS[e.status]}
                        color={EXAM_STATUS_COLORS[e.status]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Examination</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Examination name"
              placeholder="e.g. Quarterly Examination 1"
              value={form.name}
              onChange={set("name")}
              required
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Examination type</InputLabel>
              <Select
                label="Examination type"
                value={form.examType}
                onChange={set("examType")}
              >
                {EXAM_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Academic session</InputLabel>
              <Select
                label="Academic session"
                value={form.session}
                onChange={set("session")}
              >
                {sessions.map((s) => (
                  <MenuItem key={s._id} value={s._id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Start date"
                type="date"
                value={form.startDate}
                onChange={set("startDate")}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="End date"
                type="date"
                value={form.endDate}
                onChange={set("endDate")}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
            <TextField
              label="Instructions (optional)"
              value={form.instructions}
              onChange={set("instructions")}
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={submit}
            disabled={saving || !form.name.trim() || !form.session}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExamListPage;
