import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  MenuItem,
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
import { useSnackbar } from "notistack";
import examApi from "../../api/examApi";
import sessionApi from "../../api/sessionApi";
import classApi from "../../api/classApi";
import { downloadReportCardPdf, loadLogo, printReportCardPdf } from "../../utils/examReportCardPdf";

const errMsg = (err, fb) =>
  err.response?.data?.errors?.[0]?.message || err.response?.data?.message || fb;

const EXAM_LABEL = { quarterly: "Quarterly", half_yearly: "Half Yearly", annual: "Annual" };

/**
 * Report cards for one class. mode "admin": pick session and class, edit remark
 * and promoted-to, approve ranks. mode "class": own class only, remark only.
 */
export default function ReportCardsPanel({ mode }) {
  const admin = mode === "admin";
  const { enqueueSnackbar } = useSnackbar();
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState("");
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [data, setData] = useState(null);
  const [edits, setEdits] = useState({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

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
    if (!admin || !sessionId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await classApi.list({ session: sessionId, limit: 500, all: true });
        if (cancelled) return;
        const list = res.data?.data || [];
        setClasses(list);
        setClassId((cur) => (list.some((c) => c._id === cur) ? cur : list[0]?._id || ""));
      } catch {
        if (!cancelled) enqueueSnackbar("Failed to load classes", { variant: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [admin, sessionId, enqueueSnackbar]);

  useEffect(() => {
    if (!sessionId || (admin && !classId)) return undefined;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const res = admin
          ? await examApi.reportCards(sessionId, classId)
          : await examApi.myReportCards(sessionId);
        if (!cancelled) {
          setData(res.data.data);
          setEdits({});
        }
      } catch (err) {
        if (!cancelled) {
          setData(null);
          enqueueSnackbar(errMsg(err, "Failed to load report cards"), { variant: "error" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [admin, sessionId, classId, reloadKey, enqueueSnackbar]);

  const sessionName = sessions.find((s) => s._id === sessionId)?.name || "";
  const dirty = Object.keys(edits).length;
  const students = useMemo(() => data?.students || [], [data]);
  const val = (st, f) => edits[st.studentId]?.[f] ?? st[f] ?? "";
  const setField = (st, f, v) =>
    setEdits((e) => {
      const next = { ...(e[st.studentId] || {}), [f]: v };
      const changed = ["remark", "promotedTo"].some((k) => (next[k] ?? st[k] ?? "") !== (st[k] ?? ""));
      const copy = { ...e };
      if (changed) copy[st.studentId] = next;
      else delete copy[st.studentId];
      return copy;
    });

  const save = async () => {
    setBusy(true);
    try {
      const entries = Object.entries(edits).map(([studentId, v]) => ({
        studentId,
        ...(v.remark !== undefined ? { remark: v.remark } : {}),
        ...(admin && v.promotedTo !== undefined ? { promotedTo: v.promotedTo } : {}),
      }));
      if (admin) await examApi.saveReportCardFields(sessionId, classId, entries);
      else await examApi.saveMyRemarks(sessionId, entries.map((e) => ({ studentId: e.studentId, remark: e.remark ?? "" })));
      enqueueSnackbar("Saved", { variant: "success" });
      setReloadKey((k) => k + 1);
    } catch (err) {
      enqueueSnackbar(errMsg(err, "Failed to save"), { variant: "error" });
    } finally {
      setBusy(false);
    }
  };

  const rankAction = async (approve) => {
    setBusy(true);
    try {
      if (approve) await examApi.approveRanks(sessionId, classId);
      else await examApi.revokeRanks(sessionId, classId);
      enqueueSnackbar(approve ? "Ranks approved" : "Ranks revoked", { variant: "success" });
      setReloadKey((k) => k + 1);
    } catch (err) {
      enqueueSnackbar(errMsg(err, "Action failed"), { variant: "error" });
    } finally {
      setBusy(false);
    }
  };

  const pdfArgs = async (cards) => ({
    data,
    cards: cards.map((c) => ({ ...c, remark: val(c, "remark"), promotedTo: val(c, "promotedTo") })),
    logo: await loadLogo(),
    sessionName,
  });
  const run = async (fn, cards, name) => {
    if (dirty && !window.confirm("You have unsaved changes that will not appear on the printout. Continue?")) return;
    setBusy(true);
    try {
      await fn(await pdfArgs(cards), name);
    } catch {
      enqueueSnackbar("Could not create the PDF", { variant: "error" });
    } finally {
      setBusy(false);
    }
  };
  const fileBase = `Report-Cards-${data?.class?.name || "class"}${data?.class?.section || ""}-${sessionName}`;

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField select size="small" label="Session" value={sessionId} onChange={(e) => setSessionId(e.target.value)} sx={{ minWidth: 160 }}>
          {sessions.map((s) => (
            <MenuItem key={s._id} value={s._id}>
              {s.name}
            </MenuItem>
          ))}
        </TextField>
        {admin && (
          <TextField select size="small" label="Class" value={classId} onChange={(e) => setClassId(e.target.value)} sx={{ minWidth: 180 }}>
            {classes.map((c) => (
              <MenuItem key={c._id} value={c._id}>
                {c.name}
                {c.section ? ` - ${c.section}` : ""}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {data && (
        <>
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" sx={{ mb: 2 }}>
            {data.exams.map((e) => (
              <Chip
                key={e.type}
                size="small"
                color={e.published ? "success" : "default"}
                label={`${EXAM_LABEL[e.type]}: ${e.published ? "published" : "not published"}`}
              />
            ))}
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="contained" disabled={busy || students.length === 0} onClick={() => run(downloadReportCardPdf, students, `${fileBase}.pdf`)}>
              Download all (PDF)
            </Button>
            <Button disabled={busy || students.length === 0} onClick={() => run((a) => printReportCardPdf(a), students)}>
              Print all
            </Button>
          </Stack>

          {students.length === 0 && (
            <Alert severity="info">No published results for this class yet. Report cards appear once an exam&apos;s results are published.</Alert>
          )}

          {admin && students.length > 0 && (
            <Alert severity={data.ranksApproved ? "success" : data.ranksStale ? "warning" : "info"} sx={{ mb: 2 }} action={
              data.ranksApproved ? (
                <Button color="inherit" size="small" disabled={busy} onClick={() => rankAction(false)}>
                  Revoke
                </Button>
              ) : (
                <Button color="inherit" size="small" disabled={busy || !data.exams.find((e) => e.type === "annual")?.published} onClick={() => rankAction(true)}>
                  Approve ranks
                </Button>
              )
            }>
              {data.ranksApproved
                ? "Ranks 1–10 (by Annual percentage) are approved and print on the cards."
                : data.ranksStale
                  ? "Annual results changed after the ranks were approved. Review and approve again."
                  : "Ranks (top 10 by Annual percentage) do not print until you approve them. Everyone else shows “-”."}
            </Alert>
          )}

          {students.length > 0 && (
            <Paper sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Roll</TableCell>
                    <TableCell>Student</TableCell>
                    <TableCell>Result</TableCell>
                    {admin && <TableCell>Rank (preview)</TableCell>}
                    <TableCell>Attendance</TableCell>
                    <TableCell sx={{ minWidth: 220 }}>Remark</TableCell>
                    {admin && <TableCell sx={{ minWidth: 160 }}>Promoted to</TableCell>}
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map((st) => (
                    <TableRow key={st.studentId} selected={!!edits[st.studentId]}>
                      <TableCell>{st.rollNumber}</TableCell>
                      <TableCell>{st.name}</TableCell>
                      <TableCell>{st.result || "—"}</TableCell>
                      {admin && <TableCell>{st.rank ?? "-"}</TableCell>}
                      <TableCell>{st.attendance.total ? `${st.attendance.present} / ${st.attendance.total}` : "—"}</TableCell>
                      <TableCell>
                        <TextField size="small" fullWidth value={val(st, "remark")} onChange={(e) => setField(st, "remark", e.target.value)} inputProps={{ maxLength: 120, "aria-label": `Remark for ${st.name}` }} />
                      </TableCell>
                      {admin && (
                        <TableCell>
                          <TextField size="small" fullWidth value={val(st, "promotedTo")} onChange={(e) => setField(st, "promotedTo", e.target.value)} inputProps={{ maxLength: 60, "aria-label": `Promoted to for ${st.name}` }} />
                        </TableCell>
                      )}
                      <TableCell>
                        <Button size="small" disabled={busy} onClick={() => run(downloadReportCardPdf, [st], `Report-Card-${st.name}.pdf`)}>
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
          {dirty > 0 && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
              <Button variant="contained" onClick={save} disabled={busy}>
                Save changes ({dirty})
              </Button>
              <Button onClick={() => setEdits({})} disabled={busy}>
                Discard
              </Button>
              <Typography variant="caption" color="text.secondary">
                Unsaved changes do not appear on printed cards.
              </Typography>
            </Stack>
          )}
        </>
      )}
    </Box>
  );
}
