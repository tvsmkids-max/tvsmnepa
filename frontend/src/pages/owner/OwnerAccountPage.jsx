import { useState } from "react";
import { Alert, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import ownerApi, { ownerToken } from "../../api/ownerApi";

export default function OwnerAccountPage() {
  const [f, setF] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (f.newPassword !== f.confirm) {
      setMsg({ type: "error", text: "New passwords do not match" });
      return;
    }
    setBusy(true);
    try {
      const res = await ownerApi.changePassword({ currentPassword: f.currentPassword, newPassword: f.newPassword });
      ownerToken.set(res.data.data.token);
      setF({ currentPassword: "", newPassword: "", confirm: "" });
      setMsg({ type: "success", text: "Password changed" });
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Could not change password" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper variant="outlined" component="form" onSubmit={submit} sx={{ p: 2.5, maxWidth: 420 }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Change password
      </Typography>
      {msg && <Alert severity={msg.type} sx={{ mb: 2 }}>{msg.text}</Alert>}
      <Stack spacing={2}>
        <TextField size="small" type="password" label="Current password" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} autoComplete="current-password" />
        <TextField size="small" type="password" label="New password" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} autoComplete="new-password" helperText="8+ characters with upper, lower, number and symbol" />
        <TextField size="small" type="password" label="Confirm new password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} autoComplete="new-password" />
        <Button type="submit" variant="contained" disabled={busy || !f.currentPassword || !f.newPassword}>
          Change password
        </Button>
      </Stack>
    </Paper>
  );
}
