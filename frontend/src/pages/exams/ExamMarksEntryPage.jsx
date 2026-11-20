import { useState, useEffect, useMemo, useRef } from "react";
import {
  MenuItem,
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useTheme, useMediaQuery } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useSnackbar } from "notistack";
import PageHeader from "../../components/common/PageHeader";
import examApi from "../../api/examApi";
import { EXAM_STATUS_LABELS, EXAM_STATUS_COLORS, examTypeLabel } from "./examConstants";

const apiMsg = (err, fb) =>
  err.response?.data?.errors?.[0]?.message || err.response?.data?.message || fb;

// "" -> not entered. Otherwise a non-negative number with at most 2 decimals.
const GRADES = ["A+", "A", "B", "C", "D"];

const marksError = (row, max, text = row.marksText) => {
  if (row.attendance === "absent") return "";
  const t = String(text).trim();
  if (t === "") return "";
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return "Enter a valid number";
  if (Number(t) > max) return `Cannot exceed ${max}`;
  return "";
};

const toRows = (sheet) =>
  sheet.rows.map((r) => ({
    studentId: r.studentId,
    rollNumber: r.rollNumber,
    scholarNumber: r.scholarNumber,
    name: r.name,
    studentStatus: r.studentStatus,
    attendance: r.attendance,
    marksText: (() => {
      const v = sheet.subject.internalMax > 0 ? r.writtenMarks : r.marks;
      return v === null || v === undefined ? "" : String(v);
    })(),
    internalText: r.internalMarks === null || r.internalMarks === undefined ? "" : String(r.internalMarks),
    grade: r.grade || "",
    remarks: r.remarks || "",
  }));

const ExamMarksEntryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { enqueueSnackbar } = useSnackbar();

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

  const dirty = JSON.stringify(rows) !== baseline;

  // Overview (dashboard)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
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
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey, navigate, enqueueSnackbar]);

  // Sheet for the selected subject
  useEffect(() => {
    if (!subjectKey) return;
    let cancelled = false;
    const run = async () => {
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
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [id, subjectKey, reloadKey, enqueueSnackbar]);

  // Warn before closing the tab with unsaved changes.
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
  const hasParts = (subj?.internalMax ?? 0) > 0;
  const max = hasParts ? subj.writtenMax : (subj?.maxMarks ?? 0);
  const errors = useMemo(
    () => rows.map((r) => (gradeOnly ? "" : marksError(r, max))),
    [rows, max, gradeOnly],
  );
  const internalErrors = useMemo(
    () => rows.map((r) => (hasParts ? marksError(r, subj.internalMax, r.internalText) : "")),
    [rows, hasParts, subj],
  );
  const hasErrors = errors.some(Boolean) || internalErrors.some(Boolean);
  const totalOf = (r) =>
    r.marksText.trim() === "" || r.internalText.trim() === ""
      ? "—"
      : String(Math.round((Number(r.marksText) + Number(r.internalText)) * 100) / 100);

  const confirmDiscard = () =>
    !dirty || window.confirm("You have unsaved changes. Leave without saving?");

  const switchSubject = (_, key) => {
    if (key === subjectKey || !confirmDiscard()) return;
    setSubjectKey(key);
  };

  const setRow = (i, patch) =>
    setRows((list) => list.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const setAttendance = (i, value) => {
    if (!value) return;
    setRow(
      i,
      value === "absent"
        ? { attendance: "absent", marksText: "", internalText: "", grade: "" }
        : { attendance: "present" },
    );
  };

  const focusNext = (i) => (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    inputRefs.current[i + 1]?.focus();
  };

  const save = async () => {
    if (hasErrors) {
      enqueueSnackbar("Fix the highlighted marks first", { variant: "warning" });
      return false;
    }
    setSaving(true);
    try {
      await examApi.saveMarks(
        id,
        subjectKey,
        rows.map((r) => ({
          studentId: r.studentId,
          attendance: r.attendance,
          marks:
            gradeOnly || r.attendance === "absent" || r.marksText.trim() === ""
              ? null
              : Number(r.marksText),
          internalMarks:
            !hasParts || r.attendance === "absent" || r.internalText.trim() === ""
              ? null
              : Number(r.internalText),
          grade: gradeOnly && r.attendance !== "absent" && r.grade ? r.grade : null,
          remarks: r.remarks,
        })),
      );
      enqueueSnackbar("Draft saved", { variant: "success" });
      setBaseline(JSON.stringify(rows));
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
      setSubmitOpen(false);
      reload();
    } catch (err) {
      enqueueSnackbar(apiMsg(err, "Submission failed"), { variant: "error" });
      setSubmitOpen(false);
      reload();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !overview || !sheet) return <LinearProgress />;

  const { exam } = overview;
  const submitted = overview.submission.status !== "draft";
  const locked = overview.submission.status === "locked";
  const totalPending = overview.subjects.reduce((a, s) => a + s.pending, 0);
  const canSubmit =
    overview.canEdit && !dirty && totalPending === 0 && overview.missingRoll.length === 0;
  const editable = overview.canEdit;
  const cls = overview.class;

  return (
    <Box>
      <PageHeader
        title="Marks Entry"
        subtitle={`${exam.name} · ${examTypeLabel(exam.examType)} · Session ${exam.session?.name} · Class ${cls.name} - ${cls.section}`}
      />

      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" alignItems="center">
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
          Marks entry opens once the Admin marks the examination as Completed.
        </Alert>
      )}
      {overview.missingRoll.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {overview.missingRoll.length} student(s) have no roll number yet:{" "}
          {overview.missingRoll.map((s) => s.name).join(", ")}. Ask the Admin to assign roll
          numbers before you submit.
        </Alert>
      )}

      <Paper sx={{ mb: 2, overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Subject</TableCell>
              <TableCell align="right">Max marks</TableCell>
              <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>Passing marks</TableCell>
              <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>Students</TableCell>
              <TableCell align="right">Entered</TableCell>
              <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>Absent</TableCell>
              <TableCell align="right">Pending</TableCell>
              <TableCell>Entry status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {overview.subjects.map((s) => (
              <TableRow
                key={s.key}
                hover
                selected={s.key === subjectKey}
                sx={{ cursor: "pointer" }}
                onClick={() => switchSubject(null, s.key)}
              >
                <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                <TableCell align="right">{s.gradeOnly ? "Grade" : s.internalMax > 0 ? `${s.maxMarks} (${s.maxMarks - s.internalMax} + ${s.internalMax})` : s.maxMarks}</TableCell>
                <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>{s.gradeOnly ? "—" : s.passingMarks}</TableCell>
                <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>{s.totalStudents}</TableCell>
                <TableCell align="right">{s.entered}</TableCell>
                <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>{s.absent}</TableCell>
                <TableCell align="right">{s.pending}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={s.pending === 0 ? "success" : s.entered > 0 ? "warning" : "default"}
                    label={s.pending === 0 ? "Complete" : s.entered > 0 ? "In progress" : "Not started"}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Paper>
        <Tabs value={subjectKey} onChange={switchSubject} variant="scrollable">
          {overview.subjects.map((s) => (
            <Tab key={s.key} value={s.key} label={s.name} />
          ))}
        </Tabs>

        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            {sheet.subject.name} — maximum {sheet.subject.maxMarks}, passing {sheet.subject.passingMarks}
          </Typography>
          {dirty && editable && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              You have unsaved changes. Use “Save draft” before leaving this subject.
            </Alert>
          )}

          {!isMobile ? (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Roll</TableCell>
                  <TableCell>Admission no.</TableCell>
                  <TableCell>Student</TableCell>
                  {gradeOnly ? (
                    <TableCell>Grade</TableCell>
                  ) : hasParts ? (
                    <>
                      <TableCell>Written (max {max})</TableCell>
                      <TableCell>Internal (max {subj.internalMax})</TableCell>
                      <TableCell align="right">Total / {subj.maxMarks}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell align="right">Max</TableCell>
                      <TableCell>Obtained</TableCell>
                    </>
                  )}
                  <TableCell>Status</TableCell>
                  <TableCell>Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={r.studentId}>
                    <TableCell>{r.rollNumber}</TableCell>
                    <TableCell>{r.scholarNumber}</TableCell>
                    <TableCell>
                      {r.name}
                      {r.studentStatus !== "Active" && (
                        <Chip size="small" label={r.studentStatus} sx={{ ml: 1 }} />
                      )}
                    </TableCell>
                    {gradeOnly ? (
                      <TableCell sx={{ minWidth: 110 }}>
                        <TextField
                          select
                          size="small"
                          value={r.attendance === "absent" ? "" : r.grade}
                          disabled={!editable || r.attendance === "absent"}
                          onChange={(e) => setRow(i, { grade: e.target.value })}
                          inputProps={{ "aria-label": `Grade for ${r.name}` }}
                          SelectProps={{ displayEmpty: true }}
                          sx={{ width: 100 }}
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
                      </TableCell>
                    ) : (
                      <>
                        {!hasParts && <TableCell align="right">{max}</TableCell>}
                        <TableCell sx={{ minWidth: 110 }}>
                          <TextField
                            size="small"
                            value={r.attendance === "absent" ? "" : r.marksText}
                            placeholder={r.attendance === "absent" ? "Absent" : ""}
                            disabled={!editable || r.attendance === "absent"}
                            error={!!errors[i]}
                            helperText={errors[i]}
                            onChange={(e) => setRow(i, { marksText: e.target.value })}
                            onKeyDown={focusNext(i)}
                            inputRef={(el) => {
                              inputRefs.current[i] = el;
                            }}
                            inputProps={{ inputMode: "decimal", "aria-label": `Marks for ${r.name}` }}
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                        {hasParts && (
                          <>
                            <TableCell sx={{ minWidth: 110 }}>
                              <TextField
                                size="small"
                                value={r.attendance === "absent" ? "" : r.internalText}
                                disabled={!editable || r.attendance === "absent"}
                                error={!!internalErrors[i]}
                                helperText={internalErrors[i]}
                                onChange={(e) => setRow(i, { internalText: e.target.value })}
                                inputProps={{ inputMode: "decimal", "aria-label": `Internal marks for ${r.name}` }}
                                sx={{ width: 100 }}
                              />
                            </TableCell>
                            <TableCell align="right">{r.attendance === "absent" ? "—" : totalOf(r)}</TableCell>
                          </>
                        )}
                      </>
                    )}
                    <TableCell>
                      <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={r.attendance}
                        disabled={!editable}
                        onChange={(_, v) => setAttendance(i, v)}
                      >
                        <ToggleButton value="present" color="success">Present</ToggleButton>
                        <ToggleButton value="absent" color="error">Absent</ToggleButton>
                      </ToggleButtonGroup>
                    </TableCell>
                    <TableCell sx={{ minWidth: 160 }}>
                      <TextField
                        size="small"
                        value={r.remarks}
                        disabled={!editable}
                        onChange={(e) => setRow(i, { remarks: e.target.value })}
                        inputProps={{ maxLength: 200 }}
                        fullWidth
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <Alert severity="info">
                        No numbered students in this class yet. Ask the Admin to generate roll
                        numbers.
                      </Alert>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
          ) : (
            <Stack spacing={1.25}>
              {rows.length === 0 && (
                <Alert severity="info">
                  No numbered students in this class yet. Ask the Admin to generate roll numbers.
                </Alert>
              )}
              {rows.map((r, i) => {
                const absent = r.attendance === "absent";
                return (
                  <Paper key={r.studentId} variant="outlined" sx={{ p: 1.5, opacity: absent ? 0.85 : 1 }}>
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, lineHeight: 1.25 }}>
                          {r.rollNumber}. {r.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Adm. {r.scholarNumber}
                          {r.studentStatus !== "Active" ? ` · ${r.studentStatus}` : ""}
                        </Typography>
                      </Box>
                      <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={r.attendance}
                        disabled={!editable}
                        onChange={(_, v) => setAttendance(i, v)}
                      >
                        <ToggleButton value="present" color="success" sx={{ px: 1.25 }}>P</ToggleButton>
                        <ToggleButton value="absent" color="error" sx={{ px: 1.25 }}>A</ToggleButton>
                      </ToggleButtonGroup>
                    </Stack>
                    {gradeOnly ? (
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="Grade"
                        value={absent ? "" : r.grade}
                        disabled={!editable || absent}
                        onChange={(e) => setRow(i, { grade: e.target.value })}
                        SelectProps={{ displayEmpty: true }}
                        slotProps={{ inputLabel: { shrink: true } }}
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
                    ) : (
                      <Stack direction="row" spacing={1}>
                        <TextField
                          size="small"
                          fullWidth
                          label={hasParts ? `Written (max ${max})` : `Marks (max ${max})`}
                          value={absent ? "" : r.marksText}
                          placeholder={absent ? "Absent" : ""}
                          disabled={!editable || absent}
                          error={!!errors[i]}
                          helperText={errors[i]}
                          onChange={(e) => setRow(i, { marksText: e.target.value })}
                          onKeyDown={focusNext(i)}
                          inputRef={(el) => {
                            inputRefs.current[i] = el;
                          }}
                          inputProps={{ inputMode: "decimal", enterKeyHint: "next" }}
                          slotProps={{ inputLabel: { shrink: true } }}
                        />
                        {hasParts && (
                          <>
                            <TextField
                              size="small"
                              fullWidth
                              label={`Internal (max ${subj.internalMax})`}
                              value={absent ? "" : r.internalText}
                              disabled={!editable || absent}
                              error={!!internalErrors[i]}
                              helperText={internalErrors[i]}
                              onChange={(e) => setRow(i, { internalText: e.target.value })}
                              inputProps={{ inputMode: "decimal" }}
                              slotProps={{ inputLabel: { shrink: true } }}
                            />
                            <Box sx={{ minWidth: 52, textAlign: "center", alignSelf: "center" }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                Total
                              </Typography>
                              <Typography sx={{ fontWeight: 700 }}>{absent ? "—" : totalOf(r)}</Typography>
                            </Box>
                          </>
                        )}
                      </Stack>
                    )}
                  </Paper>
                );
              })}
            </Stack>
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
                  mx: -2,
                  px: 2,
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
              {!canSubmit && (
                <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center", display: { xs: "none", sm: "block" } }}>
                  {dirty
                    ? "Save your draft first."
                    : totalPending > 0
                      ? `${totalPending} entr${totalPending === 1 ? "y" : "ies"} still pending across all subjects.`
                      : ""}
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
          <Table size="small">
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
