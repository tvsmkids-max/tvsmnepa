import { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Chip, LinearProgress, MenuItem, Paper, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import PageHeader from "../../components/common/PageHeader";
import examApi from "../../api/examApi";
import sessionApi from "../../api/sessionApi";
import { exportReportExcel, downloadReportPdf, printReportPdf } from "../../utils/examReportExport";

const errMsg = (err, fb) =>
  err.response?.data?.errors?.[0]?.message || err.response?.data?.message || fb;

// needs: which filters the report uses; published: reads published results only.
const REPORTS = [
  { type: "class-results", label: "Class-wise results", needs: ["exam", "class"], published: true },
  { type: "subject-results", label: "Subject performance summary", needs: ["exam", "class?", "subject?"], published: true },
  { type: "pass-fail", label: "Subject-wise pass / fail", needs: ["exam", "class?", "subject?", "result?"], published: true },
  { type: "percentage", label: "Student percentage report", needs: ["exam", "class?"], published: true },
  { type: "absent", label: "Absent students", needs: ["exam", "class?", "subject?"], published: true },
  { type: "student-history", label: "Student examination history", needs: ["scholar"], published: true },
  { type: "marks-pending", label: "Marks entry pending", needs: ["exam", "class?", "subject?"], published: false },
  { type: "marks-completion", label: "Marks entry completion", needs: ["exam", "class?", "subject?"], published: false },
];

export default function ExamReportsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState("");
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState("");
  const [exam, setExam] = useState(null);
  const [type, setType] = useState(REPORTS[0].type);
  const [classId, setClassId] = useState("");
  const [subjectKey, setSubjectKey] = useState("");
  const [result, setResult] = useState("");
  const [scholar, setScholar] = useState("");
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [runKey, setRunKey] = useState(0);

  const def = REPORTS.find((r) => r.type === type);
  const needs = (k) => def.needs.some((n) => n.replace("?", "") === k);
  const required = (k) => def.needs.includes(k);

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
    return () => { cancelled = true; };
  }, [enqueueSnackbar]);

  useEffect(() => {
    if (!sessionId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await examApi.list({ session: sessionId, limit: 200 });
        if (cancelled) return;
        const list = res.data?.data || [];
        setExams(list);
        setExamId((cur) => (list.some((e) => e._id === cur) ? cur : list[0]?._id || ""));
      } catch {
        if (!cancelled) enqueueSnackbar("Failed to load examinations", { variant: "error" });
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId, enqueueSnackbar]);

  useEffect(() => {
    if (!examId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await examApi.getById(examId);
        if (!cancelled) setExam(res.data.data);
      } catch {
        if (!cancelled) setExam(null);
      }
    })();
    return () => { cancelled = true; };
  }, [examId]);

  const configs = useMemo(() => (exam && exam._id === examId ? exam.classConfigs || [] : []), [exam, examId]);
  const subjects = useMemo(() => {
    const m = new Map();
    configs
      .filter((c) => !classId || c.class?._id === classId)
      .forEach((c) => c.subjects.forEach((s) => m.set(s.nameKey, s.name)));
    return [...m.entries()];
  }, [configs, classId]);

  const ready =
    type === "student-history" ? scholar.trim().length > 0 : !!examId && (!required("class") || !!classId);

  useEffect(() => {
    if (runKey === 0) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const params = {};
        if (type === "student-history") params.scholarNumber = scholar.trim();
        else {
          params.examId = examId;
          if (needs("class") && classId) params.classId = classId;
          if (needs("subject") && subjectKey) params.subjectKey = subjectKey;
          if (needs("result") && result) params.result = result;
        }
        const res = await examApi.runReport(type, params);
        if (!cancelled) setReport(res.data.data);
      } catch (err) {
        if (!cancelled) {
          setReport(null);
          setError(errMsg(err, "Failed to generate the report"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // Runs only when "Generate" is pressed (runKey); filters are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey]);

  const act = async (fn) => {
    setBusy(true);
    try {
      await fn(report);
    } catch (err) {
      enqueueSnackbar(errMsg(err, "Export failed"), { variant: "error" });
    } finally {
      setBusy(false);
    }
  };

  const changeType = (t) => {
    setType(t);
    setReport(null);
    setError("");
  };

  return (
    <>
      <PageHeader title="Examination Reports" subtitle="Result reports use published results only; marks-entry reports use live marks" />
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: "wrap" }}>
          <TextField select size="small" label="Report" value={type} onChange={(e) => changeType(e.target.value)} sx={{ minWidth: 260 }}>
            {REPORTS.map((r) => <MenuItem key={r.type} value={r.type}>{r.label}</MenuItem>)}
          </TextField>
          {type !== "student-history" && (
            <>
              <TextField select size="small" label="Session" value={sessionId} onChange={(e) => setSessionId(e.target.value)} sx={{ minWidth: 150 }}>
                {sessions.map((s) => <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Examination" value={examId} onChange={(e) => { setExamId(e.target.value); setClassId(""); setSubjectKey(""); }} sx={{ minWidth: 200 }}>
                {exams.map((e) => <MenuItem key={e._id} value={e._id}>{e.name}</MenuItem>)}
              </TextField>
            </>
          )}
          {needs("class") && (
            <TextField select size="small" label="Class" value={classId} onChange={(e) => { setClassId(e.target.value); setSubjectKey(""); }} sx={{ minWidth: 150 }}>
              {!required("class") && <MenuItem value="">All classes</MenuItem>}
              {configs.filter((c) => c.class).map((c) => (
                <MenuItem key={c.class._id} value={c.class._id}>{c.class.name}{c.class.section ? ` - ${c.class.section}` : ""}</MenuItem>
              ))}
            </TextField>
          )}
          {needs("subject") && (
            <TextField select size="small" label="Subject" value={subjectKey} onChange={(e) => setSubjectKey(e.target.value)} sx={{ minWidth: 160 }}>
              <MenuItem value="">All subjects</MenuItem>
              {subjects.map(([k, n]) => <MenuItem key={k} value={k}>{n}</MenuItem>)}
            </TextField>
          )}
          {needs("result") && (
            <TextField select size="small" label="Result" value={result} onChange={(e) => setResult(e.target.value)} sx={{ minWidth: 130 }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="pass">Pass</MenuItem>
              <MenuItem value="fail">Fail</MenuItem>
              <MenuItem value="absent">Absent</MenuItem>
            </TextField>
          )}
          {needs("scholar") && (
            <TextField size="small" label="Scholar number" value={scholar} onChange={(e) => setScholar(e.target.value)} sx={{ minWidth: 200 }} />
          )}
          <Button variant="contained" disabled={!ready || loading} onClick={() => setRunKey((k) => k + 1)}>
            Generate
          </Button>
        </Stack>
        <Box sx={{ mt: 1 }}>
          <Chip size="small" label={def.published ? "Published results only" : "Live marks"} />
        </Box>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 1 }} />}
      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      {report && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 1 }}>
            <Box>
              <Typography variant="h6">{report.title}</Typography>
              <Typography variant="body2" color="text.secondary">{report.subtitle}</Typography>
            </Box>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
              <Button size="small" variant="outlined" disabled={busy || !report.rows.length} onClick={() => act(exportReportExcel)}>Excel</Button>
              <Button size="small" variant="outlined" disabled={busy || !report.rows.length} onClick={() => act(downloadReportPdf)}>PDF</Button>
              <Button size="small" variant="outlined" disabled={busy || !report.rows.length} onClick={() => act(printReportPdf)}>Print</Button>
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: "wrap" }} useFlexGap>
            {(report.summary || []).map((s) => <Chip key={s.label} size="small" variant="outlined" label={`${s.label}: ${s.value}`} />)}
          </Stack>
          {report.rows.length === 0 ? (
            <Alert severity="info">No records for these filters.</Alert>
          ) : (
            <TableContainer sx={{ maxHeight: 560 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {report.columns.map((c) => <TableCell key={c.key} align={c.align || "left"} sx={{ fontWeight: 700 }}>{c.label}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.rows.map((r, i) => (
                    <TableRow key={i} hover>
                      {report.columns.map((c) => <TableCell key={c.key} align={c.align || "left"}>{r[c.key] ?? ""}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}
    </>
  );
}
