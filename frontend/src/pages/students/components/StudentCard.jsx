import React, { useState } from "react";
import {
  Card,
  Box,
  Typography,
  Stack,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Checkbox,
  Tooltip,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import CakeOutlinedIcon from "@mui/icons-material/CakeOutlined";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import {
  formatRollNumber,
  formatMobile,
  formatClassLabel,
} from "../../../utils/formatters";
import StatusChip from "../../../components/common/StatusChip";
import useThemeMode from "../../../hooks/useThemeMode";
import { alpha } from "@mui/material/styles";

const formatDOB = (dob) => {
  if (!dob) return "—";
  try {
    const date = new Date(dob);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const StudentCard = ({
  student,
  isSelected = false,
  selectionMode = false,
  isAdmin = false,
  onView,
  onEdit,
  onStatus,
  onQuickToggleStatus,
  onDelete,
  onAttendance,
  onToggleSelect,
  onCardClick,
}) => {
  const { isDark } = useThemeMode();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const menuOpen = Boolean(menuAnchor);

  const handleMenuOpen = (e) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  };
  const handleMenuClose = (e) => {
    e?.stopPropagation();
    setMenuAnchor(null);
  };

  const handleAction = (action, e) => {
    e?.stopPropagation();
    handleMenuClose();
    action?.(student);
  };

  const canQuickToggle =
    student.status === "Active" || student.status === "Inactive";
  const nextStatus = student.status === "Active" ? "Inactive" : "Active";
  const toggleLabel = `Mark ${nextStatus}`;
  const ToggleIcon =
    student.status === "Active"
      ? PauseCircleOutlineIcon
      : PlayCircleOutlineIcon;
  const toggleColor = student.status === "Active" ? "warning" : "success";

  return (
    <Card
      onClick={() => onCardClick?.(student)}
      sx={{
        borderRadius: 2,
        cursor: "pointer",
        transition: "all 0.15s ease",
        border: "1.5px solid",
        borderColor: isSelected ? "primary.main" : "divider",
        bgcolor: isSelected
          ? isDark
            ? alpha("#1E4D98", 0.12)
            : alpha("#1E4D98", 0.04)
          : "background.paper",
        overflow: "hidden",
        "&:hover": {
          borderColor: isDark ? "primary.light" : "primary.main",
        },
        "&:active": { transform: "scale(0.99)" },
      }}
    >
      <Box sx={{ p: 1.5 }}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          {isAdmin && selectionMode && (
            <Checkbox
              checked={isSelected}
              size="small"
              onClick={(e) => e.stopPropagation()}
              onChange={() => onToggleSelect?.(student._id)}
              sx={{ p: 0.5, mt: -0.25 }}
            />
          )}

          <Box
            sx={{
              minWidth: 32,
              height: 32,
              borderRadius: 1,
              bgcolor: isDark ? alpha("#3B82F6", 0.15) : alpha("#1E4D98", 0.08),
              color: isDark ? "#93C5FD" : "#1E4D98",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "0.75rem",
              fontFamily: "monospace",
              flexShrink: 0,
            }}
          >
            {formatRollNumber(student.rollNumber)}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              fontWeight={800}
              noWrap
              sx={{
                fontSize: "0.9rem",
                textTransform: "uppercase",
                color: "text.primary",
                lineHeight: 1.3,
              }}
            >
              {student.name}
            </Typography>

            <Stack
              direction="row"
              alignItems="center"
              spacing={0.75}
              sx={{ mt: 0.25 }}
              flexWrap="wrap"
              useFlexGap
            >
              <Typography
                variant="caption"
                sx={{
                  fontFamily: "monospace",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  color: "text.secondary",
                }}
              >
                #{student.scholarNumber}
              </Typography>
              <Box
                sx={{
                  width: 3,
                  height: 3,
                  borderRadius: "50%",
                  bgcolor: "text.disabled",
                }}
              />
              <Chip
                label={formatClassLabel(student.class)}
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  bgcolor: isDark ? alpha("#3B82F6", 0.15) : "#E0EBFF",
                  color: isDark ? "#93C5FD" : "#1E4D98",
                  "& .MuiChip-label": { px: 0.75 },
                }}
              />
              <StatusChip status={student.status} size="small" />
            </Stack>
          </Box>

          <Tooltip title="More actions">
            <IconButton
              size="small"
              onClick={handleMenuOpen}
              sx={{
                width: 28,
                height: 28,
                color: "text.secondary",
                flexShrink: 0,
              }}
            >
              <MoreVertIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>

        <Box sx={{ mt: 1.25, pl: selectionMode && isAdmin ? 4.5 : 0 }}>
          <Stack spacing={0.5}>
            {student.fatherName && (
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <PersonOutlineIcon
                  sx={{ fontSize: 14, color: "text.disabled" }}
                />
                <Typography
                  variant="caption"
                  sx={{ fontSize: "0.75rem", color: "text.secondary" }}
                >
                  <Box component="span" sx={{ fontWeight: 700, mr: 0.5 }}>
                    F:
                  </Box>
                  {student.fatherName}
                </Typography>
              </Stack>
            )}

            {student.motherName && (
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <PersonOutlineIcon
                  sx={{ fontSize: 14, color: "text.disabled" }}
                />
                <Typography
                  variant="caption"
                  sx={{ fontSize: "0.75rem", color: "text.secondary" }}
                >
                  <Box component="span" sx={{ fontWeight: 700, mr: 0.5 }}>
                    M:
                  </Box>
                  {student.motherName}
                </Typography>
              </Stack>
            )}

            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              {student.dob && (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <CakeOutlinedIcon
                    sx={{ fontSize: 13, color: "text.disabled" }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: "0.72rem",
                      color: "text.secondary",
                      fontFamily: "monospace",
                    }}
                  >
                    {formatDOB(student.dob)}
                  </Typography>
                </Stack>
              )}

              {student.mobile && (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <PhoneOutlinedIcon
                    sx={{ fontSize: 13, color: "text.disabled" }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: "monospace",
                      fontWeight: 600,
                      fontSize: "0.72rem",
                      color:
                        student.mobile === "0000000000"
                          ? "text.disabled"
                          : "text.primary",
                    }}
                  >
                    {formatMobile(student.mobile)}
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Stack>
        </Box>
      </Box>

      {/* ─── 3-DOT MENU ─── */}
      <Menu
        anchorEl={menuAnchor}
        open={menuOpen}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{
          elevation: 0,
          sx: {
            mt: 0.5,
            minWidth: 200,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          },
        }}
      >
        <MenuItem
          onClick={(e) => handleAction(onView, e)}
          sx={{ py: 1, fontSize: "0.85rem" }}
        >
          <ListItemIcon>
            <VisibilityOutlinedIcon fontSize="small" color="info" />
          </ListItemIcon>
          <ListItemText
            primary="View Details"
            primaryTypographyProps={{ fontWeight: 600, fontSize: "0.85rem" }}
          />
        </MenuItem>

        <MenuItem
          onClick={(e) => handleAction(onEdit, e)}
          sx={{ py: 1, fontSize: "0.85rem" }}
        >
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText
            primary="Edit Details"
            primaryTypographyProps={{ fontWeight: 600, fontSize: "0.85rem" }}
          />
        </MenuItem>

        <MenuItem
          onClick={(e) => handleAction(onAttendance, e)}
          sx={{ py: 1, fontSize: "0.85rem" }}
        >
          <ListItemIcon>
            <EventNoteOutlinedIcon fontSize="small" color="success" />
          </ListItemIcon>
          <ListItemText
            primary="View Attendance"
            primaryTypographyProps={{ fontWeight: 600, fontSize: "0.85rem" }}
          />
        </MenuItem>

        {(canQuickToggle || isAdmin) && <Divider sx={{ my: 0.5 }} />}

        {canQuickToggle && (
          <MenuItem
            onClick={(e) => handleAction(onQuickToggleStatus, e)}
            sx={{ py: 1, fontSize: "0.85rem" }}
          >
            <ListItemIcon>
              <ToggleIcon fontSize="small" color={toggleColor} />
            </ListItemIcon>
            <ListItemText
              primary={toggleLabel}
              primaryTypographyProps={{
                fontWeight: 600,
                fontSize: "0.85rem",
              }}
            />
          </MenuItem>
        )}

        {isAdmin && (
          <MenuItem
            onClick={(e) => handleAction(onStatus, e)}
            sx={{ py: 1, fontSize: "0.85rem" }}
          >
            <ListItemIcon>
              <SwapHorizOutlinedIcon fontSize="small" color="warning" />
            </ListItemIcon>
            <ListItemText
              primary="Change Status"
              primaryTypographyProps={{
                fontWeight: 600,
                fontSize: "0.85rem",
              }}
            />
          </MenuItem>
        )}

        {isAdmin && [
          <Divider key="divider2" sx={{ my: 0.5 }} />,
          <MenuItem
            key="delete"
            onClick={(e) => handleAction(onDelete, e)}
            sx={{
              py: 1,
              fontSize: "0.85rem",
              color: "error.main",
              "&:hover": { bgcolor: "error.50" },
            }}
          >
            <ListItemIcon>
              <DeleteOutlineOutlinedIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText
              primary="Delete"
              primaryTypographyProps={{
                fontWeight: 700,
                fontSize: "0.85rem",
                color: "error.main",
              }}
            />
          </MenuItem>,
        ]}
      </Menu>
    </Card>
  );
};

export default StudentCard;
