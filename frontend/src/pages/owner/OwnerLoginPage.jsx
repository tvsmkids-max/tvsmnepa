import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import ownerApi, { ownerToken } from "../../api/ownerApi";
import usePlatformBrand from "../../hooks/usePlatformBrand";

export default function OwnerLoginPage() {
  const navigate = useNavigate();
  const { brand } = usePlatformBrand();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (ownerToken.get()) return <Navigate to="/owner" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await ownerApi.login({ username, password });
      ownerToken.set(res.data.data.token);
      navigate("/owner", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Could not sign in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2, bgcolor: "background.default" }}>
      <Paper variant="outlined" component="form" onSubmit={submit} sx={{ p: 3, width: "100%", maxWidth: 380 }}>
        <Stack spacing={2}>
          <Box sx={{ textAlign: "center" }}>
            {brand.logo && <Box component="img" src={brand.logo} alt="" sx={{ height: 48, mb: 1, objectFit: "contain" }} />}
            <Typography variant="h6" fontWeight={700}>
              {brand.productName || "Platform"} Owner
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in to manage schools and branding
            </Typography>
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          <Button type="submit" variant="contained" disabled={busy || !username || !password}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
