import { useState, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import { useSnackbar } from "notistack";
import examApi from "../../api/examApi";
import {
  downloadRollNumberPdf,
  printRollNumberPdf,
} from "../../utils/examRollNumberPdf";

const label = (c) => `${c.name} - ${c.section}`;
const apiMsg = (err, fb) =>
  err.response?.data?.errors?.[0]?.message || err.response?.data?.message || fb;

const ExamRollNumberTab = ({ exam }) => {
  const { enqueueSnackbar } = useSnackbar();
  const locked = exam.status === "results_published";
  const configs = [...(exam.classConfigs || [])].sort(
    (a, b) =>
      (a.class?.displayOrder ?? 0) - (b.class?.displayOrder ?? 0) ||
      label(a.class).localeCompare(label(b.class)),
  );

  const [data, setData] = useState({}); // classId -> {records, unassigned}
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [edit, setEdit] = useState(null); // {classId, record}
  const [newRoll, setNewRoll] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const results = await Promise.all(
          (exam.classConfigs || []).map((c) =>
            examApi.getRollNumbers(exam._id, c.class._id).then((r) => [c.class._id, r.data.data]),
          ),
        );
        if (!cancelled) setData(Object.fromEntries(results));
      } catch (err) {
        if (!cancelled) enqueueSnackbar(apiMsg(err, "Failed to load roll numbers"), { variant: "error" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [exam._id, exam.classConfigs, enqueueSnackbar]);

  const generate = async (classId) => {
    setBusy(classId);
    try {
      const res = await examApi.generateRollNumbers(exam._id, classId);
      setData((d) => ({ ...d, [classId]: res.data.data }));
      enqueueSnackbar("Roll numbers assigned", { variant: "success" });
    } catch (err) {
      enqueueSnackbar(apiMsg(err, "Failed"), { variant: "error" });
    } finally {
      setBusy("");
    }
  };

  const saveEdit = async () => {
    try {
      await examApi.updateRollNumber(exam._id, edit.classId, edit.record.student, {
        rollNumber: Number(newRoll),
        reason,
      });
      const res = await examApi.getRollNumbers(exam._id, edit.classId);
      setData((d) => ({ ...d, [edit.classId]: res.data.data }));
      enqueueSnackbar("Roll number updated", { variant: "success" });
      setEdit(null);
    } catch (err) {
      enqueueSnackbar(apiMsg(err, "Update failed"), { variant: "error" });
    }
  };

  const groups = (list) =>
    list
      .map((c) => ({ label: label(c.class), records: data[c.class._id]?.records || [] }))
      .filter((g) => g.records.length > 0);
  const fname = `roll-numbers-${exam.name.replace(/\s+/g, "-").toLowerCase()}`;

  if (loading) return <LinearProgress />;
  if (configs.length === 0)
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="warning">Configure classes and subjects first.</Alert>
      </Box>
    );

  return (
    <Box sx={{ p: 2 }}>
      <Alert severity="info" sx={{ mb: 2 }}>
        Roll numbers are assigned A–Z by student name (scholar number breaks ties), start at 1 in
        every class and stay the same for all examinations of this session. New students receive
        the next free number; existing numbers are never changed automatically.
      </Alert>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button size="small" variant="outlined" startIcon={<PrintOutlinedIcon />}
          disabled={groups(configs).length === 0}
          onClick={() => printRollNumberPdf({ exam, groups: groups(configs) })}>
          Print all classes
        </Button>
        <Button size="small" variant="outlined" startIcon={<PictureAsPdfOutlinedIcon />}
          disabled={groups(configs).length === 0}
          onClick={() => downloadRollNumberPdf({ exam, groups: groups(configs) }, fname)}>
          PDF all classes
        </Button>
      </Stack>

      {configs.map((cfg) => {
        const classId = cfg.class._id;
        const d = data[classId] || { records: [], unassigned: [] };
        const first = d.records.length === 0;
        return (
          <Paper key={classId} variant="outlined" sx={{ p: 1.5, mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
              <Typography fontWeight={600}>
                {label(cfg.class)}{" "}
                <Typography component="span" variant="body2" color="text.secondary">
                  ({d.records.length} numbered)
                </Typography>
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" disabled={d.records.length === 0}
                  onClick={() => printRollNumberPdf({ exam, groups: groups([cfg]) })}>Print</Button>
                <Button size="small" disabled={d.records.length === 0}
                  onClick={() => downloadRollNumberPdf({ exam, groups: groups([cfg]) }, `${fname}-${label(cfg.class)}`)}>PDF</Button>
                {!locked && (
                  <Button size="small" variant="contained"
                    disabled={busy === classId || (!first && d.unassigned.length === 0)}
                    onClick={() => generate(classId)}>
                    {first ? "Generate roll numbers" : `Assign to ${d.unassigned.length} new student(s)`}
                  </Button>
                )}
              </Stack>
            </Stack>
            {!first && d.unassigned.length > 0 && (
              <Alert severity="warning" sx={{ mb: 1 }}>
                Without a roll number: {d.unassigned.map((s) => s.name).join(", ")}
              </Alert>
            )}
            {d.records.length > 0 && (
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Roll</TableCell>
                      <TableCell>Student</TableCell>
                      <TableCell>Scholar no.</TableCell>
                      <TableCell>Note</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {d.records.map((r) => (
                      <TableRow key={r._id}>
                        <TableCell>{r.rollNumber}</TableCell>
                        <TableCell>{r.studentName}</TableCell>
                        <TableCell>{r.scholarNumber}</TableCell>
                        <TableCell>
                          {r.source === "late_joiner" && <Chip size="small" label="Late joiner" sx={{ mr: 0.5 }} />}
                          {r.source === "manual" && <Chip size="small" color="warning" label="Corrected" sx={{ mr: 0.5 }} />}
                          {r.studentStatus !== "Active" && <Chip size="small" label={r.studentStatus} />}
                        </TableCell>
                        <TableCell align="right">
                          {!locked && (
                            <IconButton size="small" aria-label="Correct roll number"
                              onClick={() => { setEdit({ classId, record: r }); setNewRoll(String(r.rollNumber)); setReason(""); }}>
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Paper>
        );
      })}

      <Dialog open={!!edit} onClose={() => setEdit(null)} fullWidth maxWidth="xs">
        <DialogTitle>Correct roll number</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {edit?.record.studentName} (currently {edit?.record.rollNumber}). The change is recorded
            in the audit history.
          </Typography>
          <Stack spacing={2}>
            <TextField label="New roll number" type="number" value={newRoll} onChange={(e) => setNewRoll(e.target.value)} />
            <TextField label="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEdit(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit}
            disabled={!newRoll || Number(newRoll) < 1 || reason.trim().length < 3}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExamRollNumberTab;
