import { useState, useEffect, useMemo } from "react";
import {
  Box, Paper, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField,
  Typography, Alert, LinearProgress, Checkbox, FormControlLabel, Chip,
} from "@mui/material";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import { useSnackbar } from "notistack";
import examApi from "../../api/examApi";
import { downloadTimetablePdf, printTimetablePdf } from "../../utils/examTimetablePdf";

const TIMETABLE_EDITABLE = ["draft", "configuration_pending", "scheduled", "ongoing"];

const label = (c) => `${c.name}${c.section && c.section !== "-" ? ` - ${c.section}` : ""}`;
const classIdOf = (e) => String(e.class?._id || e.class);
const dayName = (d) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" });
const niceDate = (d) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

/**
 * Exam dates are entered once per subject and applied to every selected class
 * that has that subject (no times). The table below is the resulting timetable.
 */
const ExamTimetableTab = ({ exam }) => {
  const { enqueueSnackbar } = useSnackbar();
  const editable = TIMETABLE_EDITABLE.includes(exam.status);
  const configs = useMemo(
    () =>
      [...(exam.classConfigs || [])].sort(
        (a, b) =>
          (a.class?.displayOrder ?? 0) - (b.class?.displayOrder ?? 0) ||
          label(a.class).localeCompare(label(b.class)),
      ),
    [exam.classConfigs],
  );

  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState([]);
  const [picked, setPicked] = useState(() => configs.map((c) => c.class._id));
  const [dates, setDates] = useState({}); // subjectKey -> typed date
  const [saving, setSaving] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await examApi.getTimetable(exam._id);
        if (!cancelled) setSaved(res.data?.data || []);
      } catch (err) {
        if (!cancelled)
          enqueueSnackbar(err.response?.data?.message || "Failed to load timetable", { variant: "error" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [exam._id, reloadKey, enqueueSnackbar]);

  const selected = configs.filter((c) => picked.includes(c.class._id));

  // One line per subject across the selected classes.
  const subjects = useMemo(() => {
    const map = new Map();
    selected.forEach((c) =>
      c.subjects.forEach((s) => {
        if (!map.has(s.nameKey)) map.set(s.nameKey, { key: s.nameKey, name: s.name, classes: [] });
        map.get(s.nameKey).classes.push(c.class._id);
      }),
    );
    return [...map.values()];
  }, [selected]);

  const existing = (subj) => {
    const found = saved.filter((e) => e.subjectKey === subj.key && subj.classes.includes(classIdOf(e)));
    const uniq = [...new Set(found.map((e) => e.date))];
    return { value: uniq.length === 1 ? uniq[0] : "", mixed: uniq.length > 1, count: found.length };
  };
  const dateOf = (subj) => dates[subj.key] ?? existing(subj).value;

  const changed = subjects.filter((s) => dateOf(s) && dateOf(s) !== existing(s).value);

  const toggle = (id) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const apply = async () => {
    setSaving(true);
    try {
      const res = await examApi.saveBulkTimetable(exam._id, {
        classIds: picked,
        subjects: changed.map((s) => ({ subjectName: s.name, date: dateOf(s) })),
      });
      setWarnings(res.data.data.warnings || []);
      setDates({});
      setReloadKey((k) => k + 1);
      enqueueSnackbar(`Dates applied to ${res.data.data.classes} class(es)`, { variant: "success" });
    } catch (err) {
      enqueueSnackbar(
        err.response?.data?.errors?.[0]?.message || err.response?.data?.message || "Failed to save dates",
        { variant: "error" },
      );
    } finally {
      setSaving(false);
    }
  };

  // Resulting timetable: one row per (date, subject) listing the classes.
  const table = useMemo(() => {
    const map = new Map();
    const nameOf = new Map(configs.map((c) => [c.class._id, label(c.class)]));
    saved.forEach((e) => {
      const k = `${e.date}|${e.subjectKey}`;
      if (!map.has(k)) map.set(k, { date: e.date, subject: e.subjectName, classes: [] });
      map.get(k).classes.push(nameOf.get(classIdOf(e)) || label(e.class || {}));
    });
    return [...map.values()].sort(
      (a, b) => a.date.localeCompare(b.date) || a.subject.localeCompare(b.subject),
    );
  }, [saved, configs]);

  const pdfArgs = {
    exam,
    groups: configs
      .map((cfg) => ({
        label: label(cfg.class),
        entries: saved
          .filter((e) => classIdOf(e) === cfg.class._id)
          .sort((a, b) => `${a.date} ${a.subjectName}`.localeCompare(`${b.date} ${b.subjectName}`)),
      }))
      .filter((g) => g.entries.length > 0),
  };
  const fname = `timetable-${exam.name.replace(/\s+/g, "-").toLowerCase()}`;
  const missing = configs
    .map((c) => ({ c, n: c.subjects.filter((s) => !saved.some((e) => classIdOf(e) === c.class._id && e.subjectKey === s.nameKey)).length }))
    .filter((x) => x.n > 0);

  if (loading) return <LinearProgress />;
  if (configs.length === 0)
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="warning">Configure classes and subjects first.</Alert>
      </Box>
    );

  return (
    <Box sx={{ p: 2 }}>
      {!editable && (
        <Alert severity="info" sx={{ mb: 2 }}>
          The timetable is locked once the examination is completed.
        </Alert>
      )}

      {editable && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Set exam dates</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Select the classes, then give each subject one date. It is applied to every selected
            class that has that subject. To change a single class, select only that class.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: "center", flexWrap: "wrap" }} useFlexGap>
            <Button size="small" onClick={() => setPicked(picked.length === configs.length ? [] : configs.map((c) => c.class._id))}>
              {picked.length === configs.length ? "Clear all" : "Select all"}
            </Button>
          </Stack>
          <Box sx={{ display: "flex", flexWrap: "wrap", mb: 2 }}>
            {configs.map((c) => (
              <FormControlLabel
                key={c.class._id}
                control={<Checkbox size="small" checked={picked.includes(c.class._id)} onChange={() => toggle(c.class._id)} />}
                label={label(c.class)}
                sx={{ minWidth: 130 }}
              />
            ))}
          </Box>
          {subjects.length === 0 ? (
            <Alert severity="info">Select at least one class.</Alert>
          ) : (
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Exam date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Classes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {subjects.map((s) => {
                    const ex = existing(s);
                    return (
                      <TableRow key={s.key}>
                        <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="date"
                            value={dateOf(s)}
                            onChange={(e) => setDates((d) => ({ ...d, [s.key]: e.target.value }))}
                            helperText={ex.mixed && dates[s.key] === undefined ? "Classes have different dates" : ""}
                            slotProps={{ inputLabel: { shrink: true } }}
                          />
                        </TableCell>
                        <TableCell>
                          {s.classes.length} of {selected.length}
                          {ex.count < s.classes.length && (
                            <Chip size="small" color="warning" variant="outlined" label={`${s.classes.length - ex.count} not scheduled`} sx={{ ml: 1 }} />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          )}
          <Stack direction="row" spacing={1} sx={{ mt: 2, alignItems: "center" }}>
            <Button variant="contained" onClick={apply} disabled={saving || changed.length === 0 || picked.length === 0}>
              Apply {changed.length || ""} date{changed.length === 1 ? "" : "s"}
            </Button>
            {changed.length === 0 && <Typography variant="caption" color="text.secondary">Change or fill a date to apply.</Typography>}
          </Stack>
          {warnings.map((w, i) => (
            <Alert key={i} severity="warning" sx={{ mt: 1 }}>{w}</Alert>
          ))}
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1, flexWrap: "wrap", gap: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>Exam timetable</Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" startIcon={<PrintOutlinedIcon />} disabled={!pdfArgs.groups.length} onClick={() => printTimetablePdf(pdfArgs)}>
              Print
            </Button>
            <Button size="small" variant="outlined" startIcon={<PictureAsPdfOutlinedIcon />} disabled={!pdfArgs.groups.length} onClick={() => downloadTimetablePdf(pdfArgs, fname)}>
              PDF
            </Button>
          </Stack>
        </Stack>
        {missing.length > 0 && (
          <Alert severity="warning" sx={{ mb: 1 }}>
            Dates still missing: {missing.map((m) => `${label(m.c.class)} (${m.n})`).join(", ")}. Marks entry for a subject needs its exam date and that day's attendance.
          </Alert>
        )}
        {table.length === 0 ? (
          <Alert severity="info">No dates set yet.</Alert>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Day</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Classes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {table.map((r) => (
                  <TableRow key={`${r.date}|${r.subject}`} hover>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{niceDate(r.date)}</TableCell>
                    <TableCell>{dayName(r.date)}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{r.subject}</TableCell>
                    <TableCell>{r.classes.join(", ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ExamTimetableTab;
