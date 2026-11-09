import { useState } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Button,
  IconButton,
  TextField,
  Chip,
  Divider,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Skeleton,
  Collapse,
  useTheme,
  alpha,
} from "@mui/material";
import { useSnackbar } from "notistack";
import KeyOutlinedIcon from "@mui/icons-material/KeyOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import CodeOutlinedIcon from "@mui/icons-material/CodeOutlined";

import ConfirmDialog from "../../../components/common/ConfirmDialog";
import {
  useExternalKeys,
  useCreateExternalKey,
  useRevokeExternalKey,
  useDeleteExternalKey,
} from "../../../hooks/useExternalKeys";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

const formatDate = (d) => {
  if (!d) return "Never";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ExternalApiSection = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { enqueueSnackbar } = useSnackbar();

  const { data: keys = [], isLoading } = useExternalKeys();
  const createMutation = useCreateExternalKey();
  const revokeMutation = useRevokeExternalKey();
  const deleteMutation = useDeleteExternalKey();

  const [createOpen, setCreateOpen] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [allowedOrigins, setAllowedOrigins] = useState("");
  const [generatedSecret, setGeneratedSecret] = useState(null);
  const [confirmRevoke, setConfirmRevoke] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const externalEndpointBase = `${API_BASE_URL}/external`;

  const handleCopyText = async (text, label = "Copied to clipboard") => {
    try {
      await navigator.clipboard.writeText(text);
      enqueueSnackbar(label, { variant: "success", autoHideDuration: 2000 });
    } catch {
      enqueueSnackbar("Failed to copy", { variant: "error" });
    }
  };

  const handleCreate = async () => {
    try {
      const res = await createMutation.mutateAsync({
        label: newLabel.trim() || "External MERN Website",
        allowedOrigins: allowedOrigins.trim(),
      });
      const createdPayload = res.data?.data;
      setCreateOpen(false);
      setNewLabel("");
      setAllowedOrigins("");
      if (createdPayload?.apiKey) {
        setGeneratedSecret(createdPayload.apiKey);
      }
    } catch {
      // Handled by hook
    }
  };

  const handleRevoke = async () => {
    if (!confirmRevoke) return;
    try {
      await revokeMutation.mutateAsync(confirmRevoke._id);
      setConfirmRevoke(null);
    } catch {
      // Handled by hook
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete._id);
      setConfirmDelete(null);
    } catch {
      // Handled by hook
    }
  };

  return (
    <Paper sx={{ p: 3, borderRadius: 3, mt: 3 }}>
      {/* Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2.5,
              bgcolor: alpha(theme.palette.info.main, 0.12),
              color: "info.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <KeyOutlinedIcon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              External Read-Only API Keys
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Connect another website (MERN / portal) to display attendance data
              safely in read-only mode
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<CodeOutlinedIcon />}
            onClick={() => setShowDocs((prev) => !prev)}
          >
            {showDocs ? "Hide Endpoints" : "API Endpoints"}
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddOutlinedIcon />}
            onClick={() => setCreateOpen(true)}
          >
            Generate Key
          </Button>
        </Stack>
      </Stack>

      <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
        Keys generated here allow <strong>GET (read-only)</strong> requests
        only. External websites cannot create, edit, or delete any school
        records. Keep your secret key on your other website&apos;s backend
        server (<code>X-API-Key</code> header).
      </Alert>

      {/* Collapsible Quick Endpoints Reference */}
      <Collapse in={showDocs}>
        <Box
          sx={{
            p: 2,
            mb: 2.5,
            borderRadius: 2,
            bgcolor: isDark ? alpha("#fff", 0.04) : "#F8FAFC",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 1 }}
          >
            <Typography variant="subtitle2" fontWeight={700}>
              Base URL: <code>{externalEndpointBase}</code>
            </Typography>
            <Button
              size="small"
              startIcon={<ContentCopyOutlinedIcon fontSize="small" />}
              onClick={() =>
                handleCopyText(externalEndpointBase, "Base URL copied!")
              }
            >
              Copy Base URL
            </Button>
          </Stack>
          <Typography
            variant="caption"
            component="pre"
            sx={{
              m: 0,
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
              color: "text.secondary",
              lineHeight: 1.7,
            }}
          >
            {`Header required:  X-API-Key: tvsm_ro_your_secret_key

GET /status                                 → Verify connection & active session
GET /overview?date=YYYY-MM-DD               → School summary + class breakdown
GET /classes                                → Active classes with student counts
GET /classes/:classId/attendance?date=...   → Full class roster & status
GET /attendance?date=...&classId=...&page=1 → Paginated attendance records
GET /students/:scholarNumber/attendance     → Single student attendance history
GET /monthly-summary?year=YYYY&month=MM     → Monthly class-wise summary`}
          </Typography>
        </Box>
      </Collapse>

      <Divider sx={{ mb: 2 }} />

      {/* Key List */}
      {isLoading ? (
        <Stack spacing={1.5}>
          <Skeleton variant="rounded" height={76} />
          <Skeleton variant="rounded" height={76} />
        </Stack>
      ) : keys.length === 0 ? (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            No external API keys created yet. Click{" "}
            <strong>Generate Key</strong> to connect your other MERN website.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {keys.map((item) => (
            <Box
              key={item._id}
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: item.isActive
                  ? "background.paper"
                  : alpha(theme.palette.action.disabledBackground, 0.3),
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                spacing={1}
                sx={{ mb: 1 }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="subtitle2" fontWeight={700}>
                    {item.label}
                  </Typography>
                  <Chip
                    size="small"
                    icon={
                      item.isActive ? (
                        <CheckCircleOutlineIcon />
                      ) : (
                        <CancelOutlinedIcon />
                      )
                    }
                    label={item.isActive ? "Active" : "Revoked"}
                    color={item.isActive ? "success" : "default"}
                    variant="outlined"
                  />
                </Stack>

                <Stack direction="row" spacing={0.5}>
                  {item.isActive && (
                    <Tooltip title="Revoke API key">
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={() => setConfirmRevoke(item)}
                      >
                        <BlockOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Delete permanently">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setConfirmDelete(item)}
                    >
                      <DeleteOutlineOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>

              <Typography
                variant="caption"
                sx={{
                  display: "inline-block",
                  px: 1,
                  py: 0.4,
                  mb: 1,
                  borderRadius: 1,
                  fontFamily: "monospace",
                  bgcolor: isDark ? alpha("#fff", 0.06) : "#F1F5F9",
                }}
              >
                {item.keyPrefix}
              </Typography>

              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                <Typography variant="caption" color="text.secondary">
                  Requests: <strong>{item.requestCount || 0}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Last used: <strong>{formatDate(item.lastUsedAt)}</strong>
                </Typography>
                {item.lastUsedIp && (
                  <Typography variant="caption" color="text.secondary">
                    Last IP: <strong>{item.lastUsedIp}</strong>
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  Created: <strong>{formatDate(item.createdAt)}</strong>
                </Typography>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      {/* Create Key Dialog */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Generate Read-Only API Key
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Website / App Label"
              placeholder="e.g., Main School Website (MERN)"
              fullWidth
              size="small"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <TextField
              label="Allowed Origins (Optional)"
              placeholder="https://yoursite.com (leave blank for backend proxy)"
              helperText="Leave empty when calling from your other MERN Express backend."
              fullWidth
              size="small"
              value={allowedOrigins}
              onChange={(e) => setAllowedOrigins(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setCreateOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={createMutation.isPending}
            startIcon={
              createMutation.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : null
            }
          >
            Generate
          </Button>
        </DialogActions>
      </Dialog>

      {/* One-time Secret Key Reveal Dialog */}
      <Dialog
        open={Boolean(generatedSecret)}
        onClose={() => setGeneratedSecret(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Copy Your New Read-Only API Key
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            Save this key in your other MERN backend&apos;s <code>.env</code>{" "}
            file now. For security, only its SHA-256 hash is stored and this
            full key <strong>cannot be viewed again</strong>.
          </Alert>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: isDark ? alpha("#fff", 0.06) : "#F8FAFC",
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontFamily: "monospace", wordBreak: "break-all" }}
            >
              {generatedSecret}
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<ContentCopyOutlinedIcon />}
              onClick={() =>
                handleCopyText(generatedSecret, "Secret API key copied!")
              }
              sx={{ flexShrink: 0 }}
            >
              Copy
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={() => setGeneratedSecret(null)}>
            Done, I Saved It
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Revoke */}
      <ConfirmDialog
        open={Boolean(confirmRevoke)}
        title="Revoke API Key?"
        message={`"${confirmRevoke?.label}" will immediately stop working on the connected website.`}
        confirmText="Revoke Key"
        severity="warning"
        loading={revokeMutation.isPending}
        onConfirm={handleRevoke}
        onClose={() => setConfirmRevoke(null)}
      />

      {/* Confirm Delete */}
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete API Key?"
        message={`Permanently delete "${confirmDelete?.label}" (${confirmDelete?.keyPrefix})?`}
        confirmText="Delete"
        severity="error"
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </Paper>
  );
};

export default ExternalApiSection;
