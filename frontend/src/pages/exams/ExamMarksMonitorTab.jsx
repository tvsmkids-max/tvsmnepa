import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  MenuItem,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { useSnackbar } from "notistack";
import examApi from "../../api/examApi";

const errMsg = (err, fb) =>
  err.response?.data?.errors?.[0]?.message || err.response?.data?.message || fb;

const SUB_LABEL = {
  not_started: ["Not started", "default"],
  draft: ["In progress", "warning"],
  submitted: ["Submitted", "info"],
  locked: ["Locked", "success"],
};

const pct = (v) => `${v}%`;
const GRADES = ["A+", "A", "B", "C", "D"];
const baseOf = (r, parts) => ({
  attendance: r.attendance,
  marks: parts ? r.writtenMarks : r.marks,
  internalMarks: r.internalMarks ?? null,
  grade: r.grade ?? null,
});

// Admin review sheet: read-only, or editable (with a mandatory reason) when the
// class's marks are submitted but not locked.
function ReviewDialog({ examId, classId, subject, onClose, onChanged }) {
  const { enqueueSnackbar } = useSnackbar();
  const [sheet, setSheet] = useState(null);
  const [edits, setEdits] = useState({});
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await examApi.adminMarksSheet(examId, classId, subject.key);
        if (!cancelled) {
          setSheet(res.data.data);
          setEdits({});
          setReason("");
        }
      } catch (err) {
        if (!cancelled) {
          enqueueSnackbar(errMsg(err, "Failed to load marks"), { variant: "error" });
          onClose();
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [examId, classId, subject.key, reloadKey, enqueueSnackbar, onClose]);

  const gradeOnly = !!sheet?.subject.gradeOnly;
  const parts = (sheet?.subject.internalMax ?? 0) > 0;
  const writtenMax = parts ? sheet.subject.writtenMax : subject.maxMarks;
  const view = (r) => ({ ...baseOf(r, parts), ...(edits[r.studentId] || {}) });
  const changed = Object.keys(edits).length;

  const setRow = (r, patch) =>
    setEdits((e) => {
      const base = baseOf(r, parts);
      const next = { ...base, ...(e[r.studentId] || {}), ...patch };
      if (next.attendance === "absent") {
        next.marks = null;
        next.internalMarks = null;
        next.grade = null;
      }
      const same = ["attendance", "marks", "internalMarks", "grade"].every(
        (k) => (next[k] ?? null) === (base[k] ?? null),
      );
      const copy = { ...e };
      if (same) delete copy[r.studentId];
      else copy[r.studentId] = next;
      return copy;
    });

  const save = async () => {
    setSaving(true);
    try {
      const entries = sheet.rows
        .filter((r) => edits[r.studentId])
        .map((r) => ({
          studentId: r.studentId,
          attendance: edits[r.studentId].attendance,
          marks: gradeOnly || edits[r.studentId].attendance === "absent" ? null : edits[r.studentId].marks,
          internalMarks: parts && edits[r.studentId].attendance !== "absent" ? edits[r.studentId].internalMarks : null,
          grade: gradeOnly && edits[r.studentId].attendance !== "absent" ? edits[r.studentId].grade : null,
          remarks: r.remarks || "",
        }));
      if (enterMode) await examApi.adminSaveMarks(examId, classId, subject.key, entries);
      else await examApi.correctMarks(examId, classId, subject.key, entries, reason.trim());
      enqueueSnackbar(enterMode ? "Marks saved as draft" : "Marks corrected", { variant: "success" });
      setReloadKey((k) => k + 1);
      onChanged();
    } catch (err) {
      enqueueSnackbar(errMsg(err, "Failed to correct marks"), { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const canCorrect = sheet?.canCorrect;
  const enterMode = !canCorrect && !!sheet?.canEdit; // Admin entering draft marks
  const editable = canCorrect || enterMode;
  const invalid = sheet?.rows.some((r) => {
    const v = view(r);
    if (v.attendance !== "present") return false;
    const empty = (x) => x === null || x === undefined || x === "";
    // Draft entry may be partial; a correction to submitted marks must be complete.
    if (gradeOnly) return !enterMode && !v.grade;
    const bad = (x, max) => (empty(x) ? !enterMode : Number(x) < 0 || Number(x) > max);
    return bad(v.marks, writtenMax) || (parts && bad(v.internalMarks, sheet.subject.internalMax));
  });

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {subject.name} · maximum {subject.maxMarks}
        {sheet && ` · Class ${sheet.class.name} - ${sheet.class.section}`}
      </DialogTitle>
      <DialogContent dividers>
        {!sheet ? (
          <LinearProgress />
        ) : (
          <>
            <Alert severity={canCorrect ? "warning" : enterMode ? "info" : "info"} sx={{ mb: 2 }}>
              {enterMode
                ? "You are entering marks on behalf of the class teacher. Changes are saved as a draft and recorded in the audit history under your name."
                : canCorrect
                ? "Submitted marks. Any correction needs a reason and is recorded in the audit history."
                : sheet.submission.status === "locked"
                  ? "These marks are locked. Unlock them to make corrections."
                  : "Read-only. The class teacher is still entering marks."}
            </Alert>
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Roll</TableCell>
                    <TableCell>Scholar No.</TableCell>
                    <TableCell>Student</TableCell>
                    <TableCell>Attendance</TableCell>
                    <TableCell>{gradeOnly ? "Grade" : parts ? `Written (max ${writtenMax})` : "Marks"}</TableCell>
                    {parts && <TableCell>Internal (max {sheet.subject.internalMax})</TableCell>}
                    {parts && <TableCell align="right">Total</TableCell>}
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sheet.rows.map((r) => {
                    const v = view(r);
                    const dirty = !!edits[r.studentId];
                    return (
                      <TableRow key={r.studentId} selected={dirty}>
                        <TableCell>{r.rollNumber}</TableCell>
                        <TableCell>{r.scholarNumber}</TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>
                          {editable ? (
                            <Stack direction="row" spacing={0.5}>
                              <Chip
                                size="small"
                                label="Present"
                                color={v.attendance === "present" ? "success" : "default"}
                                onClick={() => setRow(r, { attendance: "present" })}
                              />
                              <Chip
                                size="small"
                                label="Absent"
                                color={v.attendance === "absent" ? "error" : "default"}
                                onClick={() => setRow(r, { attendance: "absent" })}
                              />
                            </Stack>
                          ) : (
                            <Chip
                              size="small"
                              label={r.attendance === "absent" ? "Absent" : "Present"}
                              color={r.attendance === "absent" ? "error" : "default"}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {gradeOnly ? (
                            editable && v.attendance === "present" ? (
                              <TextField
                                select
                                size="small"
                                value={v.grade ?? ""}
                                onChange={(e) => setRow(r, { grade: e.target.value || null })}
                                SelectProps={{ displayEmpty: true }}
                                sx={{ width: 90 }}
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
                            ) : v.attendance === "absent" ? (
                              "—"
                            ) : (
                              (r.grade ?? "Not entered")
                            )
                          ) : editable && v.attendance === "present" ? (
                            <TextField
                              size="small"
                              type="number"
                              value={v.marks ?? ""}
                              onChange={(e) =>
                                setRow(r, { marks: e.target.value === "" ? null : Number(e.target.value) })
                              }
                              slotProps={{ htmlInput: { min: 0, max: writtenMax, step: "any" } }}
                              sx={{ width: 100 }}
                            />
                          ) : v.attendance === "absent" ? (
                            "—"
                          ) : (
                            ((parts ? r.writtenMarks : r.marks) ?? "Not entered")
                          )}
                        </TableCell>
                        {parts && (
                          <TableCell>
                            {editable && v.attendance === "present" ? (
                              <TextField
                                size="small"
                                type="number"
                                value={v.internalMarks ?? ""}
                                onChange={(e) =>
                                  setRow(r, { internalMarks: e.target.value === "" ? null : Number(e.target.value) })
                                }
                                slotProps={{ htmlInput: { min: 0, max: sheet.subject.internalMax, step: "any" } }}
                                sx={{ width: 100 }}
                              />
                            ) : v.attendance === "absent" ? (
                              "—"
                            ) : (
                              (r.internalMarks ?? "Not entered")
                            )}
                          </TableCell>
                        )}
                        {parts && (
                          <TableCell align="right">
                            {v.attendance === "absent" || v.marks == null || v.internalMarks == null
                              ? "—"
                              : Math.round((Number(v.marks) + Number(v.internalMarks)) * 100) / 100}
                          </TableCell>
                        )}
                        <TableCell>
                          {r.rowStatus === "not_entered" ? "Missing" : r.rowStatus}
                          {r.correctionCount > 0 && ` · corrected ${r.correctionCount}×`}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
            {canCorrect && changed > 0 && (
              <TextField
                label="Reason for correction (required)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                fullWidth
                multiline
                minRows={2}
                sx={{ mt: 2 }}
              />
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Close
        </Button>
        {editable && (
          <Button
            variant="contained"
            onClick={save}
            disabled={saving || changed === 0 || (canCorrect && reason.trim().length < 3) || invalid}
          >
            {enterMode ? "Save draft" : "Save correction"}
            {changed ? ` (${changed})` : ""}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

function ReasonDialog({ title, text, confirmLabel, requireReason, onCancel, onConfirm }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={busy ? undefined : onCancel} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {text}
        </Typography>
        {requireReason && (
          <TextField
            autoFocus
            label="Reason (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={go}
          disabled={busy || (requireReason && reason.trim().length < 3)}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ExamMarksMonitorTab({ exam, onChanged }) {
  const { enqueueSnackbar } = useSnackbar();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [review, setReview] = useState(null); // { classId, subject }
  const [action, setAction] = useState(null); // { type, cls }

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const res = await examApi.monitorMarks(exam._id);
        if (!cancelled) setData(res.data.data);
      } catch (err) {
        if (!cancelled) enqueueSnackbar(errMsg(err, "Failed to load marks"), { variant: "error" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [exam._id, exam.status, reloadKey, enqueueSnackbar]);

  const closeReview = useCallback(() => setReview(null), []);

  const refresh = () => {
    setReloadKey((k) => k + 1);
    onChanged();
  };

  const runAction = async (reason) => {
    const { type, cls } = action;
    try {
      if (type === "reopen") await examApi.reopenMarks(exam._id, cls.class._id, reason);
      if (type === "lock") await examApi.lockMarks(exam._id, cls.class._id);
      if (type === "submit") await examApi.adminSubmitMarks(exam._id, cls.class._id);
      if (type === "unlock") await examApi.unlockMarks(exam._id, cls.class._id, reason);
      enqueueSnackbar(
        { reopen: "Marks reopened", lock: "Marks locked", unlock: "Marks unlocked", submit: "Marks submitted" }[type],
        { variant: "success" },
      );
      setAction(null);
      refresh();
    } catch (err) {
      enqueueSnackbar(errMsg(err, "Action failed"), { variant: "error" });
    }
  };

  if (loading && !data) return <LinearProgress />;
  if (!data) return null;

  const reviewable = ["marks_entry_in_progress", "marks_submitted"].includes(data.exam.status);
  const entryOpen = ["ongoing", "completed", "marks_entry_in_progress"].includes(data.exam.status);
  const s = data.summary;

  return (
    <Box>
      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
        <Chip label={`${s.classes} classes`} />
        <Chip label={`Not started ${s.notStarted}`} />
        <Chip color="warning" label={`In progress ${s.inProgress}`} />
        <Chip color="info" label={`Submitted ${s.submitted}`} />
        <Chip color="success" label={`Locked ${s.locked}`} />
        <Button size="small" onClick={() => setReloadKey((k) => k + 1)}>
          Refresh
        </Button>
      </Stack>
      {data.classes.length === 0 && <Alert severity="info">No classes are configured for this examination.</Alert>}

      {data.classes.map((c) => {
        const [label, color] = SUB_LABEL[c.submission.status] || SUB_LABEL.not_started;
        const st = c.submission.status;
        return (
          <Paper key={c.class._id} variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Class {c.class.name} - {c.class.section}
              </Typography>
              <Chip size="small" label={label} color={color} />
              <Chip size="small" variant="outlined" label={`${c.totalStudents} students`} />
              <Chip size="small" variant="outlined" label={`Complete ${pct(c.completion)}`} />
              {c.submission.reopenCount > 0 && (
                <Chip size="small" variant="outlined" label={`Reopened ${c.submission.reopenCount}×`} />
              )}
              <Box sx={{ flexGrow: 1 }} />
              {entryOpen && (st === "draft" || st === "not_started") && (
                <Button size="small" variant="outlined" onClick={() => setAction({ type: "submit", cls: c })}>
                  Submit for class
                </Button>
              )}
              {reviewable && st === "submitted" && (
                <>
                  <Button size="small" onClick={() => setAction({ type: "reopen", cls: c })}>
                    Reopen
                  </Button>
                  <Button size="small" variant="contained" onClick={() => setAction({ type: "lock", cls: c })}>
                    Approve &amp; lock
                  </Button>
                </>
              )}
              {reviewable && st === "locked" && (
                <Button size="small" onClick={() => setAction({ type: "unlock", cls: c })}>
                  Unlock
                </Button>
              )}
            </Stack>
            {c.missingRoll > 0 && (
              <Alert severity="warning" sx={{ mb: 1 }}>
                {c.missingRoll} active student(s) have no roll number and are not counted.
              </Alert>
            )}
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Subject</TableCell>
                    <TableCell align="right">Students</TableCell>
                    <TableCell align="right">Entered</TableCell>
                    <TableCell align="right">Pending</TableCell>
                    <TableCell align="right">Draft</TableCell>
                    <TableCell align="right">Submitted</TableCell>
                    <TableCell align="right">Absent</TableCell>
                    <TableCell align="right">Complete</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {c.subjects.map((sub) => (
                    <TableRow key={sub.key}>
                      <TableCell>{sub.name}</TableCell>
                      <TableCell align="right">{sub.totalStudents}</TableCell>
                      <TableCell align="right">{sub.entered}</TableCell>
                      <TableCell align="right">{sub.pending}</TableCell>
                      <TableCell align="right">{sub.draft}</TableCell>
                      <TableCell align="right">{sub.submitted}</TableCell>
                      <TableCell align="right">{sub.absent}</TableCell>
                      <TableCell align="right">{pct(sub.completion)}</TableCell>
                      <TableCell align="right">
                        <Button size="small" onClick={() => setReview({ classId: c.class._id, subject: sub })}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        );
      })}

      {review && (
        <ReviewDialog
          examId={exam._id}
          classId={review.classId}
          subject={review.subject}
          onClose={closeReview}
          onChanged={() => setReloadKey((k) => k + 1)}
        />
      )}
      {action && (
        <ReasonDialog
          title={
            { reopen: "Reopen marks entry", lock: "Approve and lock marks", unlock: "Unlock marks", submit: "Submit marks on behalf of the class" }[action.type]
          }
          text={
            {
              reopen: "The class teacher will be able to edit and resubmit. All current marks are kept in the audit history.",
              lock: "Locked marks cannot be edited, corrected or reopened until you unlock them.",
              unlock: "Marks return to Submitted status so they can be corrected or reopened.",
              submit: "Every subject must be complete. After submitting, the class teacher can no longer edit these marks unless you reopen them.",
            }[action.type]
          }
          confirmLabel={{ reopen: "Reopen", lock: "Lock", unlock: "Unlock", submit: "Submit" }[action.type]}
          requireReason={["reopen", "unlock"].includes(action.type)}
          onCancel={() => setAction(null)}
          onConfirm={runAction}
        />
      )}
    </Box>
  );
}
