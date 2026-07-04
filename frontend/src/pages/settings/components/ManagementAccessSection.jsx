import React, { useState } from "react";
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
  useTheme,
  alpha,
} from "@mui/material";
import { useSnackbar } from "notistack";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";

import ConfirmDialog from "../../../components/common/ConfirmDialog";
import {
  useAccessUrls,
  useCreateAccessUrl,
  useRevokeAccessUrl,
  useDeleteAccessUrl,
} from "../../../hooks/useManagement";

const ManagementAccessSection = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { enqueueSnackbar } = useSnackbar();

  // ─── Data ────────────────────────────────────────────────
  const { data: accessUrls = [], isLoading } = useAccessUrls();
  const createMutation = useCreateAccessUrl();
  const revokeMutation = useRevokeAccessUrl();
  const deleteMutation = useDeleteAccessUrl();

  // ─── Dialog states ───────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [newLabel, setNewLabel] = useState("");

  // ═══════════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════════

  const buildFullUrl = (secretKey) => {
    const origin = window.location.origin;
    return `${origin}/management/attendance/${secretKey}`;
  };

  const handleCopy = async (secretKey) => {
    try {
      const url = buildFullUrl(secretKey);
      await navigator.clipboard.writeText(url);
      enqueueSnackbar("URL copied to clipboard!", {
        variant: "success",
        autoHideDuration: 2000,
      });
    } catch {
      enqueueSnackbar("Failed to copy URL", { variant: "error" });
    }
  };

  const handleOpenInNewTab = (secretKey) => {
    window.open(buildFullUrl(secretKey), "_blank");
  };

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync({
        label: newLabel.trim() || "Management Dashboard",
      });
      setCreateOpen(false);
      setNewLabel("");
    } catch {
      // Handled by mutation
    }
  };

  const handleRevoke = async () => {
    if (!confirmRevoke) return;
    try {
      await revokeMutation.mutateAsync(confirmRevoke._id);
      setConfirmRevoke(null);
    } catch {
      // Handled by mutation
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMutation.mutateAsync(confirmDelete._id);
      setConfirmDelete(null);
    } catch {
      // Handled by mutation
    }
  };

  // Format date helper
  const formatDate = (d) => {
    if (!d) return "Never";
    return new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ═══════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <>
      <Paper
        sx={{
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        {/* ── HEADER ── */}
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: isDark ? alpha("#fff", 0.02) : "#FAFBFC",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1.5}
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1.5,
                  bgcolor: isDark ? alpha("#8B5CF6", 0.15) : "#EDE9FE",
                  color: isDark ? "#C4B5FD" : "#7C3AED",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <DashboardOutlinedIcon />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={800}>
                  Management Dashboard Access
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Create shareable URLs for school management (no login
                  required)
                </Typography>
              </Box>
            </Stack>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddOutlinedIcon />}
              onClick={() => setCreateOpen(true)}
              sx={{
                background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
                fontWeight: 700,
                textTransform: "none",
              }}
            >
              Create New URL
            </Button>
          </Stack>
        </Box>

        {/* ── INFO BANNER ── */}
        <Alert
          severity="info"
          icon={<InfoOutlinedIcon fontSize="small" />}
          sx={{
            borderRadius: 0,
            borderBottom: "1px solid",
            borderColor: "divider",
            "& .MuiAlert-message": { width: "100%" },
          }}
        >
          <Typography
            variant="caption"
            fontWeight={700}
            sx={{ display: "block" }}
          >
            How it works:
          </Typography>
          <Typography variant="caption" sx={{ display: "block", mt: 0.3 }}>
            • Generate a secret URL and share with school management
            <br />• They can view attendance dashboard{" "}
            <strong>without logging in</strong>
            <br />
            • Data auto-refreshes every hour
            <br />• Revoke access anytime if URL is compromised
          </Typography>
        </Alert>

        {/* ── URLS LIST ── */}
        {isLoading ? (
          <Box sx={{ p: 2 }}>
            {[1, 2].map((i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                height={80}
                sx={{ mb: 1, borderRadius: 1 }}
              />
            ))}
          </Box>
        ) : accessUrls.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <PublicOutlinedIcon
              sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary" gutterBottom>
              No management access URLs created yet
            </Typography>
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ display: "block", mb: 2 }}
            >
              Create your first URL to share with school management
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddOutlinedIcon />}
              onClick={() => setCreateOpen(true)}
              sx={{ fontWeight: 700, textTransform: "none" }}
            >
              Create First URL
            </Button>
          </Box>
        ) : (
          <Stack divider={<Divider />}>
            {accessUrls.map((access) => (
              <AccessUrlRow
                key={access._id}
                access={access}
                onCopy={handleCopy}
                onOpen={handleOpenInNewTab}
                onRevoke={setConfirmRevoke}
                onDelete={setConfirmDelete}
                buildFullUrl={buildFullUrl}
                formatDate={formatDate}
                isDark={isDark}
              />
            ))}
          </Stack>
        )}
      </Paper>

      {/* ═══════════════════════════════════════════════════════════
          CREATE URL DIALOG
      ═══════════════════════════════════════════════════════════ */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle component="div" sx={{ pt: 3, pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                bgcolor: isDark ? alpha("#8B5CF6", 0.15) : "#EDE9FE",
                color: isDark ? "#C4B5FD" : "#7C3AED",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LinkOutlinedIcon />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Create Access URL
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Generate a shareable URL for management
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              autoFocus
              label="Label (Optional)"
              placeholder="e.g., Board Meeting Access, Chairman View"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              fullWidth
              size="small"
              helperText="Helps you identify who this URL was shared with"
              inputProps={{ maxLength: 100 }}
            />
            <Alert severity="info" sx={{ borderRadius: 1.5 }}>
              <Typography variant="caption">
                A secure random URL will be generated. You can copy and share it
                after creation.
              </Typography>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setCreateOpen(false)}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={createMutation.isPending}
            startIcon={
              createMutation.isPending && (
                <CircularProgress size={14} sx={{ color: "white" }} />
              )
            }
            sx={{
              background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
              fontWeight: 700,
              textTransform: "none",
            }}
          >
            {createMutation.isPending ? "Creating..." : "Create URL"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════
          CONFIRM REVOKE
      ═══════════════════════════════════════════════════════════ */}
      <ConfirmDialog
        open={!!confirmRevoke}
        title="Revoke Access URL?"
        message={
          confirmRevoke
            ? `Revoke "${confirmRevoke.label}"? Users with this URL will lose access immediately. This can be undone by creating a new URL.`
            : ""
        }
        confirmText="Revoke"
        severity="warning"
        loading={revokeMutation.isPending}
        onConfirm={handleRevoke}
        onClose={() => setConfirmRevoke(null)}
      />

      {/* ═══════════════════════════════════════════════════════════
          CONFIRM DELETE
      ═══════════════════════════════════════════════════════════ */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Access URL?"
        message={
          confirmDelete
            ? `Permanently delete "${confirmDelete.label}"? This action cannot be undone. Users with this URL will lose access immediately.`
            : ""
        }
        confirmText="Delete"
        severity="error"
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════
//  Individual URL Row Component
// ═══════════════════════════════════════════════════════════════════

const AccessUrlRow = ({
  access,
  onCopy,
  onOpen,
  onRevoke,
  onDelete,
  buildFullUrl,
  formatDate,
  isDark,
}) => {
  const fullUrl = buildFullUrl(access.secretKey);

  return (
    <Box
      sx={{
        p: 2,
        transition: "background 0.15s",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      {/* Header row */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1}
        sx={{ mb: 1 }}
      >
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <Typography variant="body2" fontWeight={800}>
            {access.label}
          </Typography>
          {access.isActive ? (
            <Chip
              icon={<CheckCircleOutlineIcon sx={{ fontSize: 12 }} />}
              label="Active"
              size="small"
              sx={{
                height: 22,
                fontSize: "0.68rem",
                fontWeight: 700,
                bgcolor: isDark ? alpha("#16A34A", 0.15) : "#DCFCE7",
                color: isDark ? "#86EFAC" : "#15803D",
                "& .MuiChip-icon": { color: "inherit" },
              }}
            />
          ) : (
            <Chip
              icon={<CancelOutlinedIcon sx={{ fontSize: 12 }} />}
              label="Revoked"
              size="small"
              sx={{
                height: 22,
                fontSize: "0.68rem",
                fontWeight: 700,
                bgcolor: isDark ? alpha("#DC2626", 0.15) : "#FEE2E2",
                color: isDark ? "#FCA5A5" : "#B91C1C",
                "& .MuiChip-icon": { color: "inherit" },
              }}
            />
          )}
        </Stack>

        {/* Actions */}
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Copy URL">
            <IconButton
              size="small"
              onClick={() => onCopy(access.secretKey)}
              disabled={!access.isActive}
              sx={{
                color: "primary.main",
                "&:hover": {
                  bgcolor: isDark ? alpha("#3B82F6", 0.15) : "#EFF6FF",
                },
              }}
            >
              <ContentCopyOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Open in new tab">
            <IconButton
              size="small"
              onClick={() => onOpen(access.secretKey)}
              disabled={!access.isActive}
              sx={{
                color: "info.main",
                "&:hover": {
                  bgcolor: isDark ? alpha("#0EA5E9", 0.15) : "#F0F9FF",
                },
              }}
            >
              <OpenInNewOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {access.isActive && (
            <Tooltip title="Revoke (soft disable)">
              <IconButton
                size="small"
                onClick={() => onRevoke(access)}
                sx={{
                  color: "warning.dark",
                  "&:hover": {
                    bgcolor: isDark ? alpha("#F59E0B", 0.15) : "#FFFBEB",
                  },
                }}
              >
                <BlockOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Delete permanently">
            <IconButton
              size="small"
              onClick={() => onDelete(access)}
              sx={{
                color: "error.main",
                "&:hover": {
                  bgcolor: isDark ? alpha("#DC2626", 0.15) : "#FEF2F2",
                },
              }}
            >
              <DeleteOutlineOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* URL Display */}
      <Box
        sx={{
          p: 1.25,
          borderRadius: 1.5,
          bgcolor: isDark ? alpha("#fff", 0.03) : "#F8FAFC",
          border: "1px solid",
          borderColor: "divider",
          mb: 1,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <LinkOutlinedIcon
            sx={{ fontSize: 14, color: "text.secondary", flexShrink: 0 }}
          />
          <Typography
            variant="caption"
            sx={{
              fontFamily: "monospace",
              fontSize: "0.72rem",
              color: "text.primary",
              wordBreak: "break-all",
              flex: 1,
              opacity: access.isActive ? 1 : 0.5,
            }}
          >
            {fullUrl}
          </Typography>
        </Stack>
      </Box>

      {/* Meta Info */}
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: "0.7rem" }}
        >
          📊 <strong>{access.accessCount || 0}</strong> views
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: "0.7rem" }}
        >
          🕒 Last: <strong>{formatDate(access.lastAccessedAt)}</strong>
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: "0.7rem" }}
        >
          📅 Created: <strong>{formatDate(access.createdAt)}</strong>
        </Typography>
        {access.createdBy?.name && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: "0.7rem" }}
          >
            👤 By: <strong>{access.createdBy.name}</strong>
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

export default ManagementAccessSection;
