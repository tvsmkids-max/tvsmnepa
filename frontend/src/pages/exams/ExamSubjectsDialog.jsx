import { useEffect, useState } from "react";
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, List,
  ListItem, ListItemText, Stack, TextField,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { useSnackbar } from "notistack";
import examApi from "../../api/examApi";

const msg = (err, fb) => err.response?.data?.errors?.[0]?.message || err.response?.data?.message || fb;

/** School-wide subject list: add once, pick everywhere. */
export default function ExamSubjectsDialog({ open, onClose }) {
  const { enqueueSnackbar } = useSnackbar();
  const [list, setList] = useState([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await examApi.listSubjects();
        if (!cancelled) setList(res.data?.data || []);
      } catch (err) {
        if (!cancelled) enqueueSnackbar(msg(err, "Failed to load subjects"), { variant: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, key, enqueueSnackbar]);

  const run = async (fn, ok) => {
    setBusy(true);
    try {
      await fn();
      if (ok) enqueueSnackbar(ok, { variant: "success" });
      setKey((k) => k + 1);
    } catch (err) {
      enqueueSnackbar(msg(err, "Action failed"), { variant: "error" });
    } finally {
      setBusy(false);
    }
  };

  const add = () => {
    const n = name.trim();
    if (!n) return;
    run(async () => {
      await examApi.addSubject(n);
      setName("");
    }, "Subject added");
  };

  const rename = (s) => {
    const n = window.prompt("Rename subject", s.name);
    if (n && n.trim() && n.trim() !== s.name) run(() => examApi.renameSubject(s._id, n.trim()), "Renamed");
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Subject list</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          Subjects added here appear in every class&apos;s subject dropdown. A subject already used
          in an examination cannot be removed.
        </Alert>
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <TextField
            size="small"
            fullWidth
            label="New subject"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Button variant="contained" onClick={add} disabled={busy || !name.trim()}>
            Add
          </Button>
        </Stack>
        <List dense sx={{ maxHeight: 320, overflow: "auto" }}>
          {list.map((s) => (
            <ListItem
              key={s._id}
              divider
              secondaryAction={
                <>
                  <IconButton size="small" aria-label={`Rename ${s.name}`} onClick={() => rename(s)} disabled={busy}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label={`Remove ${s.name}`}
                    disabled={busy}
                    onClick={() => run(() => examApi.removeSubject(s._id), "Removed")}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </>
              }
            >
              <ListItemText primary={s.name} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}
