import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  LinearProgress,
} from "@mui/material";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import { useSnackbar } from "notistack";
import examApi from "../../api/examApi";
import {
  downloadTimetablePdf,
  printTimetablePdf,
} from "../../utils/examTimetablePdf";

const TIMETABLE_EDITABLE = ["draft", "configuration_pending", "scheduled", "ongoing"];

const label = (c) => `${c.name} - ${c.section}`;

// rows keyed by subject for one class, filled from saved entries
const buildRows = (config, entries) =>
  config.subjects.map((s) => {
    const e = entries.find((x) => x.subjectKey === s.nameKey);
    return {
      subjectName: s.name,
      date: e?.date || "",
      startTime: e?.startTime || "",
      endTime: e?.endTime || "",
      remarks: e?.remarks || "",
    };
  });

const ExamTimetableTab = ({ exam }) => {
  const { enqueueSnackbar } = useSnackbar();
  const editable = TIMETABLE_EDITABLE.includes(exam.status);
  const configs = [...(exam.classConfigs || [])].sort(
    (a, b) =>
      (a.class?.displayOrder ?? 0) - (b.class?.displayOrder ?? 0) ||
      label(a.class).localeCompare(label(b.class)),
  );

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState({}); // classId -> rows
  const [messages, setMessages] = useState({}); // classId -> {error, warnings}
  const [saving, setSaving] = useState("");
  const [saved, setSaved] = useState([]); // flat saved entries (for PDF)

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await examApi.getTimetable(exam._id);
        if (cancelled) return;
        const entries = res.data?.data || [];
        setSaved(entries);
        const next = {};
        (exam.classConfigs || []).forEach((cfg) => {
          next[cfg.class._id] = buildRows(
            cfg,
            entries.filter((e) => String(e.class?._id || e.class) === cfg.class._id),
          );
        });
        setRows(next);
      } catch (err) {
        if (!cancelled)
          enqueueSnackbar(err.response?.data?.message || "Failed to load timetable", {
            variant: "error",
          });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [exam._id, exam.classConfigs, enqueueSnackbar]);

  const setCell = (classId, i, k) => (e) =>
    setRows((r) => ({
      ...r,
      [classId]: r[classId].map((row, idx) =>
        idx === i ? { ...row, [k]: e.target.value } : row,
      ),
    }));

  const save = async (cfg) => {
    const classId = cfg.class._id;
    const filled = rows[classId].filter((r) => r.date || r.startTime || r.endTime);
    const incomplete = filled.find((r) => !r.date || !r.startTime || !r.endTime);
    if (incomplete) {
      setMessages((m) => ({
        ...m,
        [classId]: { error: `${incomplete.subjectName}: enter date, start and end time` },
      }));
      return;
    }
    setSaving(classId);
    try {
      const res = await examApi.saveTimetable(exam._id, classId, filled);
      const { entries, warnings } = res.data.data;
      setMessages((m) => ({ ...m, [classId]: { warnings } }));
      setRows((r) => ({ ...r, [classId]: buildRows(cfg, entries) }));
      setSaved((s) => [
        ...s.filter((e) => String(e.class?._id || e.class) !== classId),
        ...entries,
      ]);
      enqueueSnackbar("Timetable saved", { variant: "success" });
    } catch (err) {
      setMessages((m) => ({
        ...m,
        [classId]: {
          error:
            err.response?.data?.errors?.[0]?.message ||
            err.response?.data?.message ||
            "Failed to save",
        },
      }));
    } finally {
      setSaving("");
    }
  };

  const pdfArgs = (list) => ({
    exam,
    groups: list
      .map((cfg) => ({
        label: label(cfg.class),
        entries: saved
          .filter((e) => String(e.class?._id || e.class) === cfg.class._id)
          .sort((a, b) =>
            `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`),
          ),
      }))
      .filter((g) => g.entries.length > 0),
  });

  const hasSaved = pdfArgs(configs).groups.length > 0;
  const fname = `timetable-${exam.name.replace(/\s+/g, "-").toLowerCase()}`;

  if (loading) return <LinearProgress />;
  if (configs.length === 0)
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="warning">Configure classes and subjects first.</Alert>
      </Box>
    );

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
        <Button
          size="small"
          variant="outlined"
          startIcon={<PrintOutlinedIcon />}
          disabled={!hasSaved}
          onClick={() => printTimetablePdf(pdfArgs(configs))}
        >
          Print all classes
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<PictureAsPdfOutlinedIcon />}
          disabled={!hasSaved}
          onClick={() => downloadTimetablePdf(pdfArgs(configs), fname)}
        >
          PDF all classes
        </Button>
        {!editable && (
          <Alert severity="info" sx={{ py: 0 }}>
            The timetable is locked once the examination is completed.
          </Alert>
        )}
      </Stack>

      {configs.map((cfg) => {
        const classId = cfg.class._id;
        const msg = messages[classId] || {};
        const classRows = rows[classId] || [];
        const done = classRows.filter((r) => r.date && r.startTime && r.endTime).length;
        return (
          <Paper key={classId} variant="outlined" sx={{ p: 1.5, mb: 2 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1 }}
              flexWrap="wrap"
            >
              <Typography fontWeight={600}>
                {label(cfg.class)}{" "}
                <Typography component="span" variant="body2" color="text.secondary">
                  ({done} of {classRows.length} subjects scheduled)
                </Typography>
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  onClick={() => printTimetablePdf(pdfArgs([cfg]))}
                  disabled={!pdfArgs([cfg]).groups.length}
                >
                  Print
                </Button>
                <Button
                  size="small"
                  onClick={() => downloadTimetablePdf(pdfArgs([cfg]), `${fname}-${label(cfg.class)}`)}
                  disabled={!pdfArgs([cfg]).groups.length}
                >
                  PDF
                </Button>
                {editable && (
                  <Button
                    size="small"
                    variant="contained"
                    disabled={saving === classId}
                    onClick={() => save(cfg)}
                  >
                    Save
                  </Button>
                )}
              </Stack>
            </Stack>
            {msg.error && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {msg.error}
              </Alert>
            )}
            {(msg.warnings || []).map((w, i) => (
              <Alert key={i} severity="warning" sx={{ mb: 1 }}>
                {w}
              </Alert>
            ))}
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Subject</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Start</TableCell>
                    <TableCell>End</TableCell>
                    <TableCell>Remarks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {classRows.map((r, i) => (
                    <TableRow key={r.subjectName}>
                      <TableCell>{r.subjectName}</TableCell>
                      <TableCell>
                        <TextField size="small" type="date" value={r.date} onChange={setCell(classId, i, "date")} disabled={!editable} InputLabelProps={{ shrink: true }} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" type="time" value={r.startTime} onChange={setCell(classId, i, "startTime")} disabled={!editable} InputLabelProps={{ shrink: true }} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" type="time" value={r.endTime} onChange={setCell(classId, i, "endTime")} disabled={!editable} InputLabelProps={{ shrink: true }} />
                      </TableCell>
                      <TableCell>
                        <TextField size="small" value={r.remarks} onChange={setCell(classId, i, "remarks")} disabled={!editable} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
};

export default ExamTimetableTab;
