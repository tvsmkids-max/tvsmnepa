import { gridTableSx } from "../../components/common/tableStyles";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  MenuItem, Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  LinearProgress, Paper, Stack, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs,
  TextField, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useSnackbar } from "notistack";
import PageHeader from "../../components/common/PageHeader";
import examApi from "../../api/examApi";
import { EXAM_STATUS_LABELS, EXAM_STATUS_COLORS, examTypeLabel } from "./examConstants";

const apiMsg = (err, fb) =>
  err.response?.data?.errors?.[0]?.message || err.response?.data?.message || fb;

const GRADES = ["A+", "A", "B", "C", "D"];
const NUMBER = /^\d+(\.\d{1,2})?$/;
const round2 = (n) => Math.round(n * 100) / 100;
const txt = (v) => (v === null || v === undefined ? "" : String(v));
const niceDate = (d) =>
  d
    ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
    : "";
const maxText = (s) =>
  s.gradeOnly
    ? "Grade"
    : s.internalMax > 0 || s.oralMax > 0
      ? `${s.maxMarks} (${[
          `${s.maxMarks - (s.internalMax || 0) - (s.oralMax || 0)}W`,
          s.internalMax > 0 && `${s.internalMax}I`,
          s.oralMax > 0 && `${s.oralMax}O`,
        ]
          .filter(Boolean)
          .join(" + ")})`
      : s.maxMarks;

// The marks columns of a subject: Written (or plain Marks), then Internal / Oral when it has them.
const partsOf = (subj) => {
  if (!subj || subj.gradeOnly) return [];
  const hasParts = (subj.internalMax || 0) > 0 || (subj.oralMax || 0) > 0;
  const list = [{ key: "marksText", label: hasParts ? "Written" : "Marks", max: hasParts ? subj.writtenMax : subj.maxMarks }];
  if (subj.internalMax > 0) list.push({ key: "internalText", label: "Internal", max: subj.internalMax });
  if (subj.oralMax > 0) list.push({ key: "oralText", label: "Oral", max: subj.oralMax });
  return list;
};

const toRows = (sheet) =>
  sheet.rows.map((r) => ({
    studentId: r.studentId,
    rollNumber: r.rollNumber,
    rollCode: r.rollCode || r.rollNumber,
    scholarNumber: r.scholarNumber,
    name: r.name,
    studentStatus: r.studentStatus,
    attendance: r.attendance,
    needsSave: !!r.needsSave,
    marksText: txt(sheet.subject.internalMax > 0 || sheet.subject.oralMax > 0 ? r.writtenMarks : r.marks),
    internalText: txt(r.internalMarks),
    oralText: txt(r.oralMarks),
    grade: r.grade || "",
    remarks: r.remarks || "",
  }));

const cellError = (text, max) => {
  const t = String(text).trim();
  if (t === "") return "";
  if (!NUMBER.test(t)) return "Invalid number";
  if (Number(t) > max) return `Max ${max}`;
  return "";
};

const ExamMarksEntryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  const [overview, setOverview] = useState(null);
  const [subjectKey, setSubjectKey] = useState("");
  const [sheet, setSheet] = useState(null);
  const [rows, setRows] = useState([]);
  const [baseline, setBaseline] = useState("[]");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRefs = useRef({});

  const needsSave = rows.some((r) => r.needsSave);
  const dirty = JSON.stringify(rows) !== baseline || needsSave;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await examApi.marksOverview(id);
        if (cancelled) return;
        const data = res.data.data;
        setOverview(data);
        setSubjectKey((k) => k || data.subjects[0]?.key || "");
      } catch (err) {
        if (cancelled) return;
        enqueueSnackbar(apiMsg(err, "Failed to load marks entry"), { variant: "error" });
        navigate("/exams/mine");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey, navigate, enqueueSnackbar]);

  useEffect(() => {
    if (!subjectKey) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await examApi.marksSheet(id, subjectKey);
        if (cancelled) return;
        const data = res.data.data;
        const r = toRows(data);
        setSheet(data);
        setRows(r);
        setBaseline(JSON.stringify(r));
      } catch (err) {
        if (!cancelled) enqueueSnackbar(apiMsg(err, "Failed to load marks"), { variant: "error" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, subjectKey, reloadKey, enqueueSnackbar]);

  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const subj = sheet?.subject;
  const gradeOnly = !!subj?.gradeOnly;
  const parts = useMemo(() => partsOf(subj), [subj]);
  const hasTotal = parts.length > 1;
  const att = sheet?.attendance;
  const blocked = !!att?.blocked;

  const errorsOf = (r) =>
    r.attendance === "absent" ? {} : Object.fromEntries(parts.map((p) => [p.key, cellError(r[p.key], p.max)]));
  const hasErrors = rows.some((r) => Object.values(errorsOf(r)).some(Boolean));
  const totalOf = (r) => {
    if (r.attendance === "absent") return "AB";
    if (parts.some((p) => r[p.key].trim() === "")) return "—";
    return String(round2(parts.reduce((a, p) => a + Number(r[p.key]), 0)));
  };

  const confirmDiscard = () => !dirty || window.confirm("You have unsaved changes. Leave without saving?");
  const switchSubject = (_, key) => {
    if (key === subjectKey || !confirmDiscard()) return;
    setSubjectKey(key);
  };
  const setRow = (i, patch) => setRows((list) => list.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  // Enter moves right, then to the next student's first box.
  const focusAfter = (i, c) => (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const next = inputRefs.current[`${i}-${c + 1}`] || inputRefs.current[`${i + 1}-0`];
    next?.focus();
  };

  const save = async () => {
    if (hasErrors) {
      enqueueSnackbar("Fix the highlighted marks first", { variant: "warning" });
      return false;
    }
    setSaving(true);
    try {
      const num = (r, k) => (r.attendance === "absent" || r[k].trim() === "" ? null : Number(r[k]));
      await examApi.saveMarks(
        id,
        subjectKey,
        rows.map((r) => ({
          studentId: r.studentId,
          attendance: r.attendance,
          marks: gradeOnly ? null : num(r, "marksText"),
          internalMarks: subj.internalMax > 0 ? num(r, "internalText") : null,
          oralMarks: subj.oralMax > 0 ? num(r, "oralText") : null,
          grade: gradeOnly && r.attendance !== "absent" && r.grade ? r.grade : null,
          remarks: r.remarks,
        })),
      );
      enqueueSnackbar("Draft saved", { variant: "success" });
      reload();
      return true;
    } catch (err) {
      enqueueSnackbar(apiMsg(err, "Failed to save marks"), { variant: "error" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await examApi.submitMarks(id);
      enqueueSnackbar("Marks submitted to Admin", { variant: "success" });
    } catch (err) {
      enqueueSnackbar(apiMsg(err, "Submission failed"), { variant: "error" });
    } finally {
      setSubmitOpen(false);
      setSubmitting(false);
      reload();
    }
  };

  if (loading || !overview || !sheet) return <LinearProgress />;

  const { exam } = overview;
  const submitted = overview.submission.status !== "draft";
  const locked = overview.submission.status === "locked";
  const totalPending = overview.subjects.reduce((a, s) => a + s.pending, 0);
  const canSubmit = overview.canEdit && !dirty && totalPending === 0 && overview.missingRoll.length === 0;
  const editable = overview.canEdit && !blocked;
  const cls = overview.class;
  const clsLabel = `${cls.name}${cls.section && cls.section !== "-" ? ` - ${cls.section}` : ""}`;

  // One input box (shared by the table and the phone cards).
  const box = (r, i, p, c, dense) => (
    <TextField
      size="small"
      value={r.attendance === "absent" ? "" : r[p.key]}
      placeholder={r.attendance === "absent" ? "AB" : ""}
      disabled={!editable || r.attendance === "absent"}
      error={!!errorsOf(r)[p.key]}
      helperText={errorsOf(r)[p.key] || (dense ? "" : undefined)}
      label={dense ? `${p.label} /${p.max}` : undefined}
      onChange={(e) => setRow(i, { [p.key]: e.target.value })}
      onKeyDown={focusAfter(i, c)}
      inputRef={(el) => {
        inputRefs.current[`${i}-${c}`] = el;
      }}
      slotProps={{ htmlInput: { inputMode: "decimal", enterKeyHint: "next", "aria-label": `${p.label} for ${r.name}`, style: { textAlign: dense ? "left" : "right" } } }}
      sx={{ width: dense ? "100%" : 92 }}
    />
  );
  const gradeBox = (r, i, dense) => (
    <TextField
      select
      size="small"
      label={dense ? "Grade" : undefined}
      value={r.attendance === "absent" ? "" : r.grade}
      disabled={!editable || r.attendance === "absent"}
      onChange={(e) => setRow(i, { grade: e.target.value })}
      slotProps={{ select: { displayEmpty: true }, htmlInput: { "aria-label": `Grade for ${r.name}` } }}
      sx={{ width: dense ? "100%" : 110 }}
    >
      <MenuItem value="">
        <em>—</em>
      </MenuItem>
      {GRADES.map((g) => (
        <MenuItem key={g} value={g}>
          {g}
        </MenuItem>
      ))}
    </TextField>
  );
  const absentChip = <Chip size="small" color="error" variant="outlined" label="Absent" />;

  return (
    <Box>
      <PageHeader
        title="Marks Entry"
        subtitle={`${exam.name} · ${examTypeLabel(exam.examType)} · Session ${exam.session?.name} · Class ${clsLabel}`}
      />

      <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: "center", flexWrap: "wrap" }} useFlexGap>
        <Chip size="small" label={EXAM_STATUS_LABELS[exam.status]} color={EXAM_STATUS_COLORS[exam.status]} />
        <Chip
          size="small"
          label={locked ? "Approved & locked by Admin" : submitted ? "Submitted to Admin" : "Not submitted"}
          color={submitted ? "success" : "warning"}
        />
        {overview.submission.reopenCount > 0 && (
          <Chip size="small" variant="outlined" label={`Reopened ${overview.submission.reopenCount}×`} />
        )}
        <Button size="small" onClick={() => confirmDiscard() && navigate("/exams/mine")}>
          Back to examinations
        </Button>
      </Stack>

      {submitted && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {locked
            ? "These marks are approved and locked by the Admin. They cannot be changed."
            : "These marks are submitted and locked. Only the Admin can reopen marks entry."}
        </Alert>
      )}
      {!overview.entryOpen && !submitted && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Marks entry opens once the examination is Ongoing or Completed.
        </Alert>
      )}

      <Paper variant="outlined" sx={{ mb: 2, overflowX: "auto" }}>
        <Table size="small" sx={gridTableSx}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Max marks</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, display: { xs: "none", sm: "table-cell" } }}>Passing</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Entered</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, display: { xs: "none", sm: "table-cell" } }}>Absent</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {overview.subjects.map((s) => (
              <TableRow key={s.key} hover selected={s.key === subjectKey} sx={{ cursor: "pointer" }} onClick={() => switchSubject(null, s.key)}>
                <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{maxText(s)}</TableCell>
                <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>{s.gradeOnly ? "—" : s.passingMarks}</TableCell>
                <TableCell align="right">{s.entered} / {s.totalStudents}</TableCell>
                <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>{s.absent}</TableCell>
                <TableCell>
                  <Chip size="small" color={s.pending === 0 ? "success" : s.entered > 0 ? "warning" : "default"} label={s.pending === 0 ? "Complete" : s.entered > 0 ? "In progress" : "Not started"} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Paper variant="outlined">
        <Tabs value={subjectKey} onChange={switchSubject} variant="scrollable" scrollButtons="auto">
          {overview.subjects.map((s) => (
            <Tab key={s.key} value={s.key} label={s.name} />
          ))}
        </Tabs>

        <Box sx={{ p: { xs: 1.5, md: 2 } }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 1.5 }}>
            <Typography sx={{ fontWeight: 700 }}>
              {subj.name} · maximum {subj.maxMarks || "—"}
              {!gradeOnly && `, passing ${subj.passingMarks}`}
            </Typography>
            {att?.date && (
              <Chip size="small" variant="outlined" label={`Exam date ${niceDate(att.date)} · absence from attendance`} />
            )}
          </Stack>

          {blocked && (
            <Alert
              severity="warning"
              sx={{ mb: 1.5 }}
              action={
                att?.date ? (
                  <Button color="inherit" size="small" onClick={() => navigate("/attendance/mark")}>
                    Mark attendance
                  </Button>
                ) : null
              }
            >
              {att.message}
            </Alert>
          )}
          {!blocked && rows.some((r) => r.attendance === "absent") && (
            <Alert severity="info" sx={{ mb: 1.5 }}>
              Students marked Absent in the attendance of {niceDate(att.date)} are filled as Absent. To
              change this, correct the attendance first.
            </Alert>
          )}
          {dirty && editable && (
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              {needsSave && JSON.stringify(rows) === baseline
                ? "Attendance changed since you last saved. Press Save draft to update."
                : "You have unsaved changes. Use “Save draft” before leaving this subject."}
            </Alert>
          )}

          {rows.length === 0 ? (
            <Alert severity="info">No active students in this class.</Alert>
          ) : isMobile ? (
            <Stack spacing={1.25}>
              {rows.map((r, i) => (
                <Paper key={r.studentId} variant="outlined" sx={{ p: 1.5, bgcolor: r.attendance === "absent" ? "action.hover" : "background.paper" }}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1, gap: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, lineHeight: 1.25 }}>
                        {r.rollCode}. {r.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Adm. {r.scholarNumber}
                        {r.studentStatus !== "Active" ? ` · ${r.studentStatus}` : ""}
                      </Typography>
                    </Box>
                    {r.attendance === "absent" ? absentChip : hasTotal && <Typography sx={{ fontWeight: 700 }}>{totalOf(r)}</Typography>}
                  </Stack>
                  {gradeOnly ? (
                    gradeBox(r, i, true)
                  ) : (
                    <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${parts.length}, 1fr)`, gap: 1 }}>
                      {parts.map((p, c) => (
                        <Box key={p.key}>{box(r, i, p, c, true)}</Box>
                      ))}
                    </Box>
                  )}
                </Paper>
              ))}
            </Stack>
          ) : (
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small" sx={gridTableSx}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Roll</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Admission no.</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                    {gradeOnly ? (
                      <TableCell sx={{ fontWeight: 700 }}>Grade</TableCell>
                    ) : (
                      parts.map((p) => (
                        <TableCell key={p.key} align="right" sx={{ fontWeight: 700 }}>
                          {p.label} <Typography component="span" variant="caption" color="text.secondary">/ {p.max}</Typography>
                        </TableCell>
                      ))
                    )}
                    {hasTotal && (
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Total <Typography component="span" variant="caption" color="text.secondary">/ {subj.maxMarks}</Typography>
                      </TableCell>
                    )}
                    <TableCell sx={{ fontWeight: 700 }}>Attendance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={r.studentId} hover sx={{ bgcolor: r.attendance === "absent" ? "action.hover" : undefined }}>
                      <TableCell sx={{ fontWeight: 600 }}>{r.rollCode}</TableCell>
                      <TableCell>{r.scholarNumber}</TableCell>
                      <TableCell>
                        {r.name}
                        {r.studentStatus !== "Active" && <Chip size="small" label={r.studentStatus} sx={{ ml: 1 }} />}
                      </TableCell>
                      {gradeOnly ? (
                        <TableCell>{gradeBox(r, i, false)}</TableCell>
                      ) : (
                        parts.map((p, c) => (
                          <TableCell key={p.key} align="right" sx={{ verticalAlign: "top" }}>
                            {box(r, i, p, c, false)}
                          </TableCell>
                        ))
                      )}
                      {hasTotal && (
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {totalOf(r)}
                        </TableCell>
                      )}
                      <TableCell>{r.attendance === "absent" ? absentChip : <Typography variant="body2" color="text.secondary">Present</Typography>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          {editable && (
            <Stack
              direction="row"
              spacing={1}
              sx={{
                mt: 2,
                ...(isMobile && {
                  position: "sticky",
                  bottom: "calc(64px + env(safe-area-inset-bottom))",
                  zIndex: 5,
                  bgcolor: "background.paper",
                  borderTop: "1px solid",
                  borderColor: "divider",
                  mx: -1.5,
                  px: 1.5,
                  py: 1,
                  "& .MuiButton-root": { flex: 1, whiteSpace: "nowrap" },
                }),
              }}
            >
              <Button variant="contained" onClick={save} disabled={saving || !dirty}>
                Save draft
              </Button>
              <Button variant="outlined" onClick={() => setSubmitOpen(true)} disabled={!canSubmit}>
                {isMobile ? "Submit" : "Review & submit to Admin"}
              </Button>
              {!isMobile && !canSubmit && (
                <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
                  {dirty ? "Save your draft first. " : ""}
                  {totalPending > 0 ? `${totalPending} entr${totalPending === 1 ? "y" : "ies"} still pending across subjects.` : ""}
                </Typography>
              )}
            </Stack>
          )}
        </Box>
      </Paper>

      <Dialog open={submitOpen} onClose={() => setSubmitOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Submit marks to Admin?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            After submission you cannot change these marks. Only the Admin can reopen marks entry,
            and must give a reason.
          </Alert>
          <Table size="small" sx={gridTableSx}>
            <TableHead>
              <TableRow>
                <TableCell>Subject</TableCell>
                <TableCell align="right">Entered</TableCell>
                <TableCell align="right">Absent</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {overview.subjects.map((s) => (
                <TableRow key={s.key}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell align="right">{s.entered} of {s.totalStudents}</TableCell>
                  <TableCell align="right">{s.absent}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitOpen(false)}>Go back and review</Button>
          <Button variant="contained" color="warning" onClick={submit} disabled={submitting}>
            Submit final marks
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExamMarksEntryPage;
