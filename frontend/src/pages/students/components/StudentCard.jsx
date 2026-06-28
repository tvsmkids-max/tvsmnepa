import React, { useState } from "react";
import {
  Card,
  CardContent,
  Avatar,
  Box,
  Typography,
  Stack,
  Chip,
  Button,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Checkbox,
  Tooltip,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import {
  formatRollNumber,
  formatMobile,
  formatClassLabel,
  getGenderColor,
  getInitials,
} from "../../../utils/formatters";
import StatusChip from "../../../components/common/StatusChip";

const StudentCard = ({
  student,
  isSelected = false,
  selectionMode = false,
  isAdmin = false,
  onView,
  onEdit,
  onStatus,
  onDelete,
  onAttendance,
  onToggleSelect,
  onCardClick,
}) => {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const menuOpen = Boolean(menuAnchor);

  const handleMenuOpen = (e) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  };
  const handleMenuClose = () => setMenuAnchor(null);

  const handleAction = (action, e) => {
    e?.stopPropagation();
    handleMenuClose();
    action?.(student);
  };

  return (
    <Card
      onClick={() => onCardClick?.(student)}
      sx={{
        borderRadius: 2.5,
        cursor: "pointer",
        transition: "all 0.2s ease",
        border: "1.5px solid",
        borderColor: isSelected ? "primary.main" : "divider",
        bgcolor: isSelected ? "primary.50" : "background.paper",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        "&:hover": {
          borderColor: "primary.main",
          transform: selectionMode ? "scale(0.99)" : "translateY(-2px)",
          boxShadow: "0 8px 16px rgba(13,27,62,0.12)",
        },
        "&:active": {
          transform: "translateY(0)",
        },
      }}
    >
      {/* ─── SELECTION CHECKBOX (only in selection mode) ─── */}
      {isAdmin && selectionMode && (
        <Box
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            zIndex: 2,
            bgcolor: "background.paper",
            borderRadius: "50%",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(student._id);
          }}
        >
          <Checkbox
            checked={isSelected}
            size="small"
            sx={{
              color: "primary.main",
              "&.Mui-checked": { color: "primary.main" },
              p: 0.5,
            }}
          />
        </Box>
      )}

      {/* ─── STATUS BADGE (top-right) ─── */}
      <Box
        sx={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 1,
        }}
      >
        <StatusChip status={student.status} size="small" />
      </Box>

      <CardContent
        sx={{
          p: 2,
          pb: "0 !important",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ─── HEADER (Avatar + Name + Scholar) ─── */}
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            mb: 1.5,
            pr: 8, // Space for status badge
            pl: selectionMode ? 4 : 0,
            transition: "padding 0.2s",
          }}
        >
          <Avatar
            sx={{
              width: 44,
              height: 44,
              bgcolor: getGenderColor(student.gender),
              fontSize: "0.95rem",
              fontWeight: 800,
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            }}
          >
            {getInitials(student.name)}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Student Name — LARGEST */}
            <Typography
              variant="body1"
              fontWeight={800}
              sx={{
                fontSize: "0.95rem",
                lineHeight: 1.2,
                mb: 0.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                textTransform: "uppercase",
                color: "text.primary",
              }}
              title={student.name}
            >
              {student.name}
            </Typography>

            {/* Scholar Number — SECONDARY */}
            <Typography
              variant="caption"
              sx={{
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: "0.72rem",
                color: "text.secondary",
                display: "block",
                lineHeight: 1.3,
              }}
            >
              #{student.scholarNumber}
            </Typography>
          </Box>
        </Stack>

        {/* ─── KEY INFO ROW ─── */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ mb: 1 }}
          flexWrap="wrap"
          useFlexGap
        >
          {/* Class chip */}
          <Chip
            label={formatClassLabel(student.class)}
            size="small"
            sx={{
              bgcolor: "#E0EBFF",
              color: "#1E4D98",
              fontWeight: 800,
              height: 22,
              fontSize: "0.7rem",
            }}
          />

          {/* Roll Number */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.4,
              bgcolor: "#F0F4FF",
              px: 0.8,
              py: 0.3,
              borderRadius: 1,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.65rem",
                fontWeight: 700,
                color: "text.secondary",
                textTransform: "uppercase",
              }}
            >
              Roll
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontFamily: "monospace",
                fontWeight: 800,
                fontSize: "0.78rem",
                color: "primary.main",
              }}
            >
              {formatRollNumber(student.rollNumber)}
            </Typography>
          </Box>
        </Stack>

        {/* ─── PARENT INFO (Medium emphasis) ─── */}
        <Typography
          variant="body2"
          sx={{
            fontSize: "0.78rem",
            color: "text.primary",
            mb: 0.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontWeight: 600,
          }}
        >
          <Box
            component="span"
            sx={{
              color: "text.secondary",
              fontWeight: 500,
              fontSize: "0.72rem",
              mr: 0.5,
            }}
          >
            Father:
          </Box>
          {student.fatherName}
        </Typography>

        {/* ─── MOBILE ─── */}
        <Stack direction="row" alignItems="center" spacing={0.6}>
          <PhoneOutlinedIcon sx={{ fontSize: 13, color: "text.secondary" }} />
          <Typography
            variant="caption"
            sx={{
              fontFamily: "monospace",
              fontWeight: 600,
              fontSize: "0.75rem",
              color:
                student.mobile === "0000000000"
                  ? "text.disabled"
                  : "text.primary",
              letterSpacing: "0.02em",
            }}
          >
            {formatMobile(student.mobile)}
          </Typography>
        </Stack>
      </CardContent>

      {/* ─── ACTIONS FOOTER (hidden in selection mode) ─── */}
      {!selectionMode && (
        <Box
          sx={{
            mt: 1.5,
            borderTop: "1px solid",
            borderColor: "divider",
            bgcolor: "#FAFBFD",
            display: "flex",
            gap: 0.5,
            p: 0.5,
          }}
        >
          <Button
            size="small"
            startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={(e) => handleAction(onView, e)}
            sx={{
              flex: 1,
              minWidth: 0,
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "none",
              color: "info.dark",
              py: 0.6,
              "&:hover": { bgcolor: "info.50" },
            }}
          >
            View
          </Button>

          <Button
            size="small"
            startIcon={<EditOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={(e) => handleAction(onEdit, e)}
            sx={{
              flex: 1,
              minWidth: 0,
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "none",
              color: "primary.main",
              py: 0.6,
              "&:hover": { bgcolor: "primary.50" },
            }}
          >
            Edit
          </Button>

          <Button
            size="small"
            startIcon={<EventNoteOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={(e) => handleAction(onAttendance, e)}
            sx={{
              flex: 1,
              minWidth: 0,
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "none",
              color: "success.dark",
              py: 0.6,
              "&:hover": { bgcolor: "success.50" },
            }}
          >
            Att.
          </Button>

          {isAdmin && (
            <Tooltip title="More actions">
              <IconButton
                size="small"
                onClick={handleMenuOpen}
                sx={{
                  width: 32,
                  height: 32,
                  color: "text.secondary",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <MoreVertIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}

          {/* More Actions Menu */}
          <Menu
            anchorEl={menuAnchor}
            open={menuOpen}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            PaperProps={{
              elevation: 0,
              sx: {
                mt: 0.5,
                minWidth: 180,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
              },
            }}
          >
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

            <Divider sx={{ my: 0.5 }} />

            <MenuItem
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
            </MenuItem>
          </Menu>
        </Box>
      )}
    </Card>
  );
};

export default StudentCard;
