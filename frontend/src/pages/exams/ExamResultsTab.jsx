import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import examApi from "../../api/examApi";
import ResultsTable from "./ResultsTable";

const errMsg = (err, fb) =>
  err.response?.data?.errors?.[0]?.message || err.response?.data?.message || fb;

export default function ExamResultsTab({ exam, onChanged }) {
  const { enqueueSnackbar } = useSnackbar();
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [check, setCheck] = useState(null); // validation (before results exist)
  const [results, setResults] = useState(null); // list (after calculation)
  const [classId, setClassId] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null); // "publish" | "withdraw"
  const [summary, setSummary] = useState(null);
  const [reason, setReason] = useState("");

  const hasResults = ["results_prepared", "results_published"].includes(exam.status);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        if (hasResults) {
          const res = await examApi.listResults(exam._id, classId || undefined);
          if (!cancelled) {
            setResults(res.data.data);
            setCheck(null);
            if (!classId && res.data.data.classes[0]) setClassId(res.data.data.classes[0].class._id);
          }
        } else {
          const res = await examApi.validateResults(exam._id);
          if (!cancelled) {
            setCheck(res.data.data);
            setResults(null);
          }
        }
      } catch (err) {
        if (!cancelled) enqueueSnackbar(errMsg(err, "Failed to load results"), { variant: "error" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [exam._id, exam.status, hasResults, classId, reloadKey, enqueueSnackbar]);

  const done = (msg) => {
    enqueueSnackbar(msg, { variant: "success" });
    setDialog(null);
    setReason("");
    setReloadKey((k) => k + 1);
    onChanged();
  };

  const calculate = async () => {
    setBusy(true);
    try {
      await examApi.calculateResults(exam._id);
      done("Results calculated");
    } catch (err) {
      enqueueSnackbar(errMsg(err, "Calculation failed"), { variant: "error" });
      setReloadKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  };

  const openPublish = async () => {
    setBusy(true);
    try {
      const res = await examApi.publishSummary(exam._id);
      setSummary(res.data.data);
      setDialog("publish");
    } catch (err) {
      enqueueSnackbar(errMsg(err, "Could not prepare the publication summary"), { variant: "error" });
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setBusy(true);
    try {
      await examApi.publishResults(exam._id);
      done("Results published");
    } catch (err) {
      enqueueSnackbar(errMsg(err, "Publishing failed"), { variant: "error" });
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    setBusy(true);
    try {
      await examApi.withdrawResults(exam._id, reason.trim());
      done("Results withdrawn");
    } catch (err) {
      enqueueSnackbar(errMsg(err, "Withdrawal failed"), { variant: "error" });
    } finally {
      setBusy(false);
    }
  };

  if (loading && !check && !results) return <LinearProgress />;

  const published = exam.status === "results_published";
  const current = results?.classes.find((c) => c.class._id === classId);

  return (
    <Box>
      {!hasResults && check && (
        <>
          <Alert severity={check.statusOk ? "info" : "warning"} sx={{ mb: 2 }}>
            {check.statusOk
              ? "Results can be calculated once every class is submitted and approved (locked) with no issues."
              : "Results can be calculated only when the examination is Marks Submitted (all classes submitted)."}
          </Alert>
          {check.classes.map((c) => (
            <Paper key={c.class._id} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: c.issues.length ? 1 : 0 }}>
                <Typography fontWeight={600}>
                  Class {c.class.name} - {c.class.section}
                </Typography>
                <Chip size="small" color={c.ready ? "success" : "warning"} label={c.ready ? "Ready" : "Issues"} />
                <Chip size="small" variant="outlined" label={`${c.students} students`} />
                {c.absentRecords > 0 && (
                  <Chip size="small" variant="outlined" label={`${c.absentRecords} absent records`} />
                )}
              </Stack>
              {c.issues.length > 0 && (
                <List dense disablePadding>
                  {c.issues.map((i) => (
                    <ListItem key={i} disableGutters sx={{ py: 0 }}>
                      <ListItemText primary={i} />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          ))}
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setReloadKey((k) => k + 1)}>Re-check</Button>
            <Button variant="contained" onClick={calculate} disabled={busy || !check.ready || !check.statusOk}>
              Calculate results
            </Button>
          </Stack>
        </>
      )}

      {hasResults && results && (
        <>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 2 }}>
            <Chip
              color={published ? "success" : "warning"}
              label={published ? "Published" : "Prepared — not published"}
            />
            <Chip variant="outlined" label={`Version ${results.exam.version}`} />
            <Box sx={{ flexGrow: 1 }} />
            {!published && (
              <Button variant="contained" onClick={openPublish} disabled={busy}>
                Review &amp; publish
              </Button>
            )}
            <Button color="warning" onClick={() => setDialog("withdraw")} disabled={busy}>
              Withdraw results
            </Button>
          </Stack>
          {!published && (
            <Alert severity="info" sx={{ mb: 2 }}>
              These results are visible to the Admin only until you publish them.
            </Alert>
          )}
          <TextField
            select
            size="small"
            label="Class"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            sx={{ minWidth: 200, mb: 2 }}
          >
            {results.classes.map((c) => (
              <MenuItem key={c.class._id} value={c.class._id}>
                Class {c.class.name} - {c.class.section}
              </MenuItem>
            ))}
          </TextField>
          {current && (
            <>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                {current.summary.subjects.map((s) => (
                  <Chip
                    key={s.key}
                    size="small"
                    variant="outlined"
                    label={`${s.name}: ${s.pass} pass · ${s.fail} fail · ${s.absent} absent`}
                  />
                ))}
              </Stack>
              <ResultsTable students={current.students} />
            </>
          )}
        </>
      )}

      <Dialog open={dialog === "publish"} onClose={busy ? undefined : () => setDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>Publish results</DialogTitle>
        <DialogContent dividers>
          {summary && (
            <>
              <Typography sx={{ mb: 1 }}>
                {summary.exam.name} · version {summary.exam.version}
              </Typography>
              <Typography variant="body2">Students with results: {summary.students}</Typography>
              <Typography variant="body2">Absent records: {summary.absentRecords}</Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Students with overall Incomplete (absent in a subject): {summary.overallIncomplete}
              </Typography>
              {summary.ready ? (
                <Alert severity="success">All classes passed the pre-publication checks.</Alert>
              ) : (
                <Alert severity="error">
                  {summary.checks.filter((c) => !c.ready).length} class(es) failed the checks. Withdraw the
                  results and fix the marks first.
                </Alert>
              )}
              <Alert severity="warning" sx={{ mt: 2 }}>
                Published results become visible to class teachers. Corrections afterwards need an audited
                withdrawal.
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" onClick={publish} disabled={busy || !summary?.ready}>
            Publish
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialog === "withdraw"} onClose={busy ? undefined : () => setDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>Withdraw results</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            The examination returns to Marks Submitted. The current results are kept as a superseded version.
            You can then unlock marks, correct them, lock again and recalculate.
          </Typography>
          <TextField
            autoFocus
            label="Reason (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" color="warning" onClick={withdraw} disabled={busy || reason.trim().length < 3}>
            Withdraw
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
