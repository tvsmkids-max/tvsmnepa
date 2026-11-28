import { useEffect, useState } from "react";
import { Alert, Box, Button, LinearProgress, Paper, Stack, TextField, Typography } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import ownerApi from "../../api/ownerApi";
import { fileToLogoDataUrl } from "../../utils/imageFile";

const FIELDS = [
  ["productName", "Product name"],
  ["tagline", "Tagline"],
  ["companyName", "Company name"],
  ["primaryColor", "Brand colour (e.g. #1E40AF)"],
  ["supportEmail", "Support email"],
  ["supportPhone", "Support phone"],
  ["website", "Website (https://…)"],
  ["poweredByText", "Footer text (replaces “Powered by …”)"],
];

export default function OwnerPlatformPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ownerApi
      .getPlatform()
      .then((r) => setForm(r.data.data))
      .catch(() => setMsg({ type: "error", text: "Could not load settings" }));
  }, []);

  const pickLogo = async (e) => {
    try {
      const url = await fileToLogoDataUrl(e.target.files?.[0]);
      setForm((f) => ({ ...f, logo: url }));
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await ownerApi.savePlatform(form);
      setForm(res.data.data);
      qc.invalidateQueries({ queryKey: ["platform-brand"] });
      setMsg({ type: "success", text: "Saved. The login page and app header now show this brand." });
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Could not save" });
    } finally {
      setBusy(false);
    }
  };

  if (!form) return <LinearProgress />;
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Brand settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        This is your product&apos;s identity. Schools are shown as users of it. Leave a field empty to hide it.
      </Typography>
      {msg && <Alert severity={msg.type} sx={{ mb: 2 }}>{msg.text}</Alert>}
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{ width: 72, height: 72, border: 1, borderColor: "divider", borderRadius: 1, display: "grid", placeItems: "center", overflow: "hidden" }}>
            {form.logo ? <Box component="img" src={form.logo} alt="Logo" sx={{ maxWidth: "100%", maxHeight: "100%" }} /> : <Typography variant="caption">No logo</Typography>}
          </Box>
          <Button component="label" variant="outlined" size="small">
            Upload logo
            <input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={pickLogo} />
          </Button>
          {form.logo && (
            <Button size="small" color="inherit" onClick={() => setForm((f) => ({ ...f, logo: null }))}>
              Remove
            </Button>
          )}
        </Stack>
        {FIELDS.map(([k, label]) => (
          <TextField key={k} size="small" label={label} value={form[k] || ""} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
        ))}
        <Box>
          <Button variant="contained" onClick={save} disabled={busy}>
            Save
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
