import { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Paper,
  Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import ownerApi from "../../api/ownerApi";
import { fileToLogoDataUrl } from "../../utils/imageFile";

const TEXT = [
  ["name", "School name *"],
  ["address", "Address"],
  ["recognition", "Recognition / board line"],
  ["udiseCode", "UDISE code"],
  ["affiliationCode", "Affiliation code"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["footer", "Footer line on printed documents"],
];
const blank = { code: "", name: "", nameLines: ["", ""], logo: null, principalSignature: null, address: "", recognition: "", udiseCode: "", affiliationCode: "", phone: "", email: "", footer: "" };

function SchoolDialog({ id, onClose, onSaved }) {
  const [form, setForm] = useState(id ? null : blank);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    ownerApi.getSchool(id).then((r) => {
      const s = r.data.data;
      setForm({ ...blank, ...s, nameLines: [s.nameLines?.[0] || "", s.nameLines?.[1] || ""] });
    });
  }, [id]);

  const img = (key) => async (e) => {
    try {
      const url = await fileToLogoDataUrl(e.target.files?.[0], key === "logo" ? 512 : 600);
      setForm((f) => ({ ...f, [key]: url }));
    } catch (x) {
      setErr(x.message);
    }
  };

  const save = async () => {
    setBusy(true);
    setErr("");
    const body = { ...form, nameLines: form.nameLines.filter((l) => l.trim()) };
    if (id) delete body.code;
    try {
      if (id) await ownerApi.updateSchool(id, body);
      else await ownerApi.createSchool(body);
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.message || "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{id ? "Edit school" : "Add school"}</DialogTitle>
      <DialogContent>
        {!form ? (
          <LinearProgress />
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            {err && <Alert severity="error">{err}</Alert>}
            <TextField size="small" label="Login code * (letters/digits, e.g. TVSM)" value={form.code} disabled={!!id} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} helperText={id ? "The login code cannot be changed" : "Users type this code to sign in. It cannot be changed later."} inputProps={{ maxLength: 12 }} />
            {TEXT.map(([k, label]) => (
              <TextField key={k} size="small" label={label} value={form[k] || ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            ))}
            {[0, 1].map((i) => (
              <TextField key={i} size="small" label={`Printed name line ${i + 1}`} value={form.nameLines[i]} onChange={(e) => setForm({ ...form, nameLines: form.nameLines.map((l, j) => (j === i ? e.target.value : l)) })} />
            ))}
            {[["logo", "School logo"], ["principalSignature", "Principal signature"]].map(([k, label]) => (
              <Stack key={k} direction="row" spacing={2} alignItems="center">
                <Box sx={{ width: 64, height: 64, border: 1, borderColor: "divider", borderRadius: 1, display: "grid", placeItems: "center", overflow: "hidden" }}>
                  {form[k] ? <Box component="img" src={form[k]} alt="" sx={{ maxWidth: "100%", maxHeight: "100%" }} /> : <Typography variant="caption">None</Typography>}
                </Box>
                <Button component="label" size="small" variant="outlined">
                  {label}
                  <input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={img(k)} />
                </Button>
                {form[k] && <Button size="small" color="inherit" onClick={() => setForm({ ...form, [k]: null })}>Remove</Button>}
              </Stack>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={busy || !form}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function OwnerSchoolsPage() {
  const [rows, setRows] = useState(null);
  const [dialog, setDialog] = useState(null); // null | "new" | id
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    ownerApi
      .listSchools()
      .then((r) => setRows(r.data.data))
      .catch(() => setMsg("Could not load schools"));
  }, []);
  useEffect(load, [load]);

  const toggle = async (s) => {
    const next = s.status === "active" ? "suspended" : "active";
    if (next === "suspended" && !window.confirm(`Suspend ${s.name}? Its users will not be able to sign in (data is kept).`)) return;
    try {
      await ownerApi.setSchoolStatus(s._id, next);
      load();
    } catch (e) {
      setMsg(e.response?.data?.message || "Could not change status");
    }
  };

  return (
    <>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1 }}>Schools</Typography>
        <Button variant="contained" size="small" onClick={() => setDialog("new")}>Add school</Button>
      </Stack>
      {msg && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setMsg("")}>{msg}</Alert>}
      {!rows ? <LinearProgress /> : (
        <Paper variant="outlined" sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>School</TableCell>
                <TableCell>UDISE</TableCell>
                <TableCell>Status</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s._id}>
                  <TableCell sx={{ fontWeight: 700 }}>{s.code}</TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.udiseCode || "—"}</TableCell>
                  <TableCell><Chip size="small" label={s.status} color={s.status === "active" ? "success" : "warning"} /></TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => setDialog(s._id)}>Edit</Button>
                    <Button size="small" color={s.status === "active" ? "warning" : "success"} onClick={() => toggle(s)}>
                      {s.status === "active" ? "Suspend" : "Activate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={5}><Typography variant="body2" color="text.secondary">No schools yet.</Typography></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}
      {dialog && (
        <SchoolDialog
          id={dialog === "new" ? null : dialog}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            load();
          }}
        />
      )}
    </>
  );
}
