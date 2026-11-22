import { useState, useEffect, useMemo } from "react";
import {
  Box, Paper, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField,
  Typography, Alert, LinearProgress, MenuItem, IconButton, Tooltip,
} from "@mui/material";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import { useSnackbar } from "notistack";
import { gridTableSx } from "../../components/common/tableStyles";
import examApi from "../../api/examApi";
import { downloadTimetablePdf, printTimetablePdf } from "../../utils/examTimetablePdf";
import {
  classIdOf, classLabel as label, makeGroups, matrixFor, printedClassName, sortConfigs,
} from "../../utils/examTimetableGroups";

const TIMETABLE_EDITABLE = ["draft", "configuration_pending", "scheduled", "ongoing"];

const dayName = (d) =>
  d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", timeZone: "UTC" }) : "";
const dayKey = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

let rowSeq = 0;
const newRow = (date = "", cells = {}) => ({ id: ++rowSeq, date, cells });

/** One row per (date, n-th subject of a class on that date) so nothing is lost. */
const buildRows = (cfgs, saved) => {
  const ids = new Set(cfgs.map((c) => c.class._id));
  const byDate = new Map(); // date -> classId -> [subjectKey]
  saved.forEach((e) => {
    const cid = classIdOf(e);
    if (!ids.has(cid)) return;
    if (!byDate.has(e.date)) byDate.set(e.date, new Map());
    const m = byDate.get(e.date);
    if (!m.has(cid)) m.set(cid, []);
    m.get(cid).push(e.subjectKey);
  });
  const rows = [];
  [...byDate.keys()].sort().forEach((date) => {
    const m = byDate.get(date);
    const depth = Math.max(...[...m.values()].map((v) => v.length));
    for (let k = 0; k < depth; k += 1) {
      const cells = {};
      m.forEach((list, cid) => {
        if (list[k]) cells[cid] = list[k];
      });
      rows.push(newRow(date, cells));
    }
  });
  return rows;
};

const sigOf = (cid, rows) =>
  rows
    .filter((r) => r.date && r.cells[cid])
    .map((r) => `${r.date}|${r.cells[cid]}`)
    .sort()
    .join(",");

const GroupTable = ({ title, cfgs, rows, setRows, saved, editable, exam, onSaved, saving, setSaving }) => {
  const { enqueueSnackbar } = useSnackbar();

  const baseline = useMemo(() => {
    const m = {};
    cfgs.forEach((c) => {
      m[c.class._id] = saved
        .filter((e) => classIdOf(e) === c.class._id)
        .map((e) => `${e.date}|${e.subjectKey}`)
        .sort()
        .join(",");
    });
    return m;
  }, [cfgs, saved]);

  const changedClasses = cfgs.filter((c) => sigOf(c.class._id, rows) !== baseline[c.class._id]);
  const problems = [];
  rows.forEach((r, i) => {
    if (!r.date && Object.values(r.cells).some(Boolean)) problems.push(`Row ${i + 1}: choose a date.`);
  });

  const setCell = (id, cid, v) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, cells: { ...r.cells, [cid]: v } } : r)));
  const setDate = (id, v) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, date: v } : r)));
  const usedElsewhere = (cid, id) =>
    new Set(rows.filter((r) => r.id !== id && r.cells[cid]).map((r) => r.cells[cid]));

  const fillPeriod = () => {
    const start = dayKey(exam.startDate);
    const end = dayKey(exam.endDate);
    if (!start || !end) return;
    const have = new Set(rows.map((r) => r.date));
    const add = [];
    for (let d = new Date(`${start}T00:00:00Z`); d <= new Date(`${end}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
      const k = d.toISOString().slice(0, 10);
      if (d.getUTCDay() !== 0 && !have.has(k)) add.push(newRow(k));
    }
    setRows((rs) => [...rs, ...add].sort((a, b) => (a.date || "9").localeCompare(b.date || "9")));
  };

  const save = async () => {
    setSaving(true);
    const warnings = [];
    try {
      for (const c of changedClasses) {
        const entries = rows
          .filter((r) => r.date && r.cells[c.class._id])
          .map((r) => ({
            subjectName: c.subjects.find((s) => s.nameKey === r.cells[c.class._id]).name,
            date: r.date,
          }));
        const res = await examApi.saveTimetable(exam._id, c.class._id, entries);
        (res.data?.data?.warnings || []).forEach((w) => warnings.push(w));
      }
      enqueueSnackbar(`${title} timetable saved`, { variant: "success" });
      onSaved(warnings);
    } catch (err) {
      enqueueSnackbar(
        err.response?.data?.errors?.[0]?.message || err.response?.data?.message || "Failed to save timetable",
        { variant: "error" },
      );
    } finally {
      setSaving(false);
    }
  };

  const subjectName = (c, key) => c.subjects.find((s) => s.nameKey === key)?.name || "";
  const hdr = { whiteSpace: "nowrap" };

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography sx={{ fontWeight: 700, mb: 1.5 }}>{title}</Typography>
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ ...gridTableSx, minWidth: 560 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...hdr, minWidth: { xs: 120, md: 150 } }}>Date</TableCell>
              <TableCell sx={hdr}>Day</TableCell>
              {cfgs.map((c) => (
                <TableCell key={c.class._id} sx={{ ...hdr, minWidth: 130 }} align="center">
                  {label(c.class)}
                </TableCell>
              ))}
              {editable && <TableCell sx={{ ...hdr, width: 40 }} />}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={cfgs.length + 3} align="center" sx={{ color: "text.secondary" }}>
                  No dates yet. {editable ? "Add a date to start." : ""}
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell sx={{ p: { xs: 0.5, md: 1 } }}>
                  {editable ? (
                    <TextField
                      size="small"
                      type="date"
                      sx={{ "& input": { fontSize: { xs: "0.8rem", md: "1rem" }, px: { xs: 0.75, md: 1.75 } } }}
                      value={r.date}
                      onChange={(e) => setDate(r.id, e.target.value)}
                      slotProps={{ htmlInput: { "aria-label": "Exam date" } }}
                    />
                  ) : (
                    r.date
                  )}
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{dayName(r.date)}</TableCell>
                {cfgs.map((c) => {
                  const cid = c.class._id;
                  const used = usedElsewhere(cid, r.id);
                  return (
                    <TableCell key={cid} align="center" sx={{ p: 0.5 }}>
                      {editable ? (
                        <TextField
                          select
                          size="small"
                          fullWidth
                          value={r.cells[cid] || ""}
                          onChange={(e) => setCell(r.id, cid, e.target.value)}
                          slotProps={{
                            select: {
                              displayEmpty: true,
                              renderValue: (v) => (v ? subjectName(c, v) : "—"),
                              SelectDisplayProps: { "aria-label": `${label(c.class)} subject on ${r.date || "row"}` },
                            },
                          }}
                        >
                          <MenuItem value="">—</MenuItem>
                          {c.subjects.map((s) => (
                            <MenuItem key={s.nameKey} value={s.nameKey} disabled={used.has(s.nameKey)}>
                              {s.name}
                              {used.has(s.nameKey) ? " (already set)" : ""}
                            </MenuItem>
                          ))}
                        </TextField>
                      ) : (
                        subjectName(c, r.cells[cid]) || "—"
                      )}
                    </TableCell>
                  );
                })}
                {editable && (
                  <TableCell sx={{ p: 0 }} align="center">
                    <Tooltip title="Remove this date">
                      <IconButton size="small" aria-label="Remove row" onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      {editable && (
        <>
          {problems.map((p) => (
            <Alert key={p} severity="warning" sx={{ mt: 1 }}>{p}</Alert>
          ))}
          <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap", alignItems: "center" }} useFlexGap>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setRows((rs) => [...rs, newRow()])}>
              Add date
            </Button>
            {exam.startDate && exam.endDate && (
              <Button size="small" onClick={fillPeriod}>
                Fill exam period (no Sundays)
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            <Button variant="contained" onClick={save} disabled={saving || changedClasses.length === 0 || problems.length > 0}>
              Save {title.split(" (")[0]}
            </Button>
          </Stack>
          {changedClasses.length === 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              No unsaved changes.
            </Typography>
          )}
        </>
      )}
    </Paper>
  );
};

/**
 * Timetable entry as one table per level (Pre-Primary / Primary / Higher):
 * a Date column shared by the level and one subject dropdown per class.
 */
const ExamTimetableTab = ({ exam }) => {
  const { enqueueSnackbar } = useSnackbar();
  const editable = TIMETABLE_EDITABLE.includes(exam.status);
  const configs = useMemo(() => sortConfigs(exam.classConfigs), [exam.classConfigs]);
  const groups = useMemo(() => makeGroups(configs), [configs]);

  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState([]);
  const [rowsBy, setRowsBy] = useState({});
  const [saving, setSaving] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await examApi.getTimetable(exam._id);
        const data = res.data?.data || [];
        if (cancelled) return;
        setSaved(data);
        const next = {};
        makeGroups(sortConfigs(exam.classConfigs)).forEach((g) => {
          next[g.key] = buildRows(g.cfgs, data);
        });
        setRowsBy(next);
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
    // Reload only for another exam or after a save; never discard unsaved edits on a parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam._id, reloadKey, enqueueSnackbar]);

  const pdfArgs = {
    exam,
    groups: groups
      .map((g) => {
        const first = g.cfgs[0].class;
        const last = g.cfgs[g.cfgs.length - 1].class;
        const short = (c) => printedClassName(c).replace(/^Class /, "");
        return {
          title: g.title,
          classRange: g.cfgs.length === 1 ? short(first) : `${short(first)} to ${short(last)}`,
          columns: g.cfgs.map((c) => ({ id: c.class._id, label: printedClassName(c.class) })),
          rows: matrixFor(g.cfgs, saved),
        };
      })
      .filter((g) => g.rows.length > 0),
  };
  const fname = `timetable-${exam.name.replace(/\s+/g, "-").toLowerCase()}`;
  const missing = configs
    .map((c) => ({
      c,
      n: c.subjects.filter((s) => !saved.some((e) => classIdOf(e) === c.class._id && e.subjectKey === s.nameKey)).length,
    }))
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
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
          Pick the date and choose each class's subject from the dropdown. Leave a cell as “—” when a
          class has no paper that day. Save each table separately.
        </Typography>
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
        <Alert severity="warning" sx={{ mb: 2 }}>
          Subjects without a date: {missing.map((m) => `${label(m.c.class)} (${m.n})`).join(", ")}. Marks entry for
          a subject needs its exam date and that day's attendance.
        </Alert>
      )}
      {warnings.map((w, i) => (
        <Alert key={i} severity="warning" sx={{ mb: 1 }}>{w}</Alert>
      ))}

      {groups.map((g) => (
        <GroupTable
          key={g.key}
          title={g.title}
          cfgs={g.cfgs}
          rows={rowsBy[g.key] || []}
          setRows={(fn) => setRowsBy((p) => ({ ...p, [g.key]: typeof fn === "function" ? fn(p[g.key] || []) : fn }))}
          saved={saved}
          editable={editable}
          exam={exam}
          saving={saving}
          setSaving={setSaving}
          onSaved={(w) => {
            setWarnings(w);
            setReloadKey((k) => k + 1);
          }}
        />
      ))}
    </Box>
  );
};

export default ExamTimetableTab;
