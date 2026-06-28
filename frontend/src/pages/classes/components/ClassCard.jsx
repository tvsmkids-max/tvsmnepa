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
  Tooltip,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import UnarchiveOutlinedIcon from "@mui/icons-material/UnarchiveOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ClassOutlinedIcon from "@mui/icons-material/ClassOutlined";
import { useNavigate } from "react-router-dom";

const getClassColor = (name) => {
  const colors = [
    {
      bg: "#E0EBFF",
      text: "#1E4D98",
      grad: "linear-gradient(135deg, #1E4D98, #3B82F6)",
    },
    {
      bg: "#FCE7F3",
      text: "#9F1239",
      grad: "linear-gradient(135deg, #9F1239, #EC4899)",
    },
    {
      bg: "#D1FAE5",
      text: "#065F46",
      grad: "linear-gradient(135deg, #065F46, #10B981)",
    },
    {
      bg: "#FEF3C7",
      text: "#92400E",
      grad: "linear-gradient(135deg, #92400E, #F59E0B)",
    },
    {
      bg: "#EDE9FE",
      text: "#5B21B6",
      grad: "linear-gradient(135deg, #5B21B6, #8B5CF6)",
    },
    {
      bg: "#FEE2E2",
      text: "#991B1B",
      grad: "linear-gradient(135deg, #991B1B, #EF4444)",
    },
    {
      bg: "#CFFAFE",
      text: "#155E75",
      grad: "linear-gradient(135deg, #155E75, #06B6D4)",
    },
  ];
  if (!name) return colors[0];
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const ClassCard = ({ cls, isAdmin = false, onEdit, onArchive, onDelete }) => {
  const navigate = useNavigate();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const menuOpen = Boolean(menuAnchor);
  const color = getClassColor(cls.name);

  const handleMenuOpen = (e) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  };
  const handleMenuClose = () => setMenuAnchor(null);

  const handleAction = (action, e) => {
    e?.stopPropagation();
    handleMenuClose();
    action?.(cls);
  };

  const handleViewStudents = (e) => {
    e?.stopPropagation();
    navigate(`/students?class=${cls._id}`);
  };

  return (
    <Card
      sx={{
        borderRadius: 2.5,
        transition: "all 0.2s ease",
        border: "1.5px solid",
        borderColor: cls.isArchived ? "warning.light" : "divider",
        bgcolor: "background.paper",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        opacity: cls.isArchived ? 0.7 : 1,
        "&:hover": {
          borderColor: "primary.main",
          transform: "translateY(-2px)",
          boxShadow: "0 8px 16px rgba(13,27,62,0.12)",
        },
      }}
    >
      {/* Status Badge */}
      <Box
        sx={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 1,
        }}
      >
        <Chip
          label={cls.isArchived ? "Archived" : "Active"}
          size="small"
          color={cls.isArchived ? "warning" : "success"}
          sx={{
            fontWeight: 700,
            fontSize: "0.66rem",
            height: 20,
          }}
        />
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
        {/* Header: Avatar + Class info */}
        <Stack direction="row" spacing={1.5} sx={{ mb: 1.5, pr: 9 }}>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              background: color.grad,
              fontSize: "1.1rem",
              fontWeight: 800,
              flexShrink: 0,
              boxShadow: "0 3px 10px rgba(0,0,0,0.12)",
            }}
          >
            <ClassOutlinedIcon />
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body1"
              fontWeight={900}
              sx={{
                fontSize: "1.05rem",
                lineHeight: 1.2,
                mb: 0.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: "text.primary",
              }}
              title={cls.name}
            >
              Class {cls.name}
            </Typography>
            <Chip
              label={`Section ${cls.section}`}
              size="small"
              sx={{
                bgcolor: color.bg,
                color: color.text,
                fontWeight: 800,
                height: 20,
                fontSize: "0.68rem",
              }}
            />
          </Box>
        </Stack>

        <Divider sx={{ mb: 1.2 }} />

        {/* Stats */}
        <Stack spacing={0.8} sx={{ flex: 1 }}>
          {/* Students Count */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <PeopleOutlinedIcon
              sx={{ fontSize: 16, color: "text.secondary" }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontSize: "0.7rem",
                fontWeight: 700,
                textTransform: "uppercase",
                minWidth: 70,
              }}
            >
              Students
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 800,
                fontSize: "0.85rem",
                color: "primary.main",
              }}
            >
              {cls.studentCount || 0}
            </Typography>
          </Stack>

          {/* Class Teacher */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <PersonOutlinedIcon
              sx={{ fontSize: 16, color: "text.secondary" }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontSize: "0.7rem",
                fontWeight: 700,
                textTransform: "uppercase",
                minWidth: 70,
              }}
            >
              Teacher
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                fontSize: "0.78rem",
                color: cls.classTeacher?.name
                  ? "text.primary"
                  : "text.disabled",
                fontStyle: cls.classTeacher?.name ? "normal" : "italic",
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={cls.classTeacher?.name || "Not assigned"}
            >
              {cls.classTeacher?.name || "Not assigned"}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>

      {/* Actions Footer */}
      <Box
        sx={{
          mt: 1.5,
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: "action.hover",
          display: "flex",
          gap: 0.5,
          p: 0.5,
        }}
      >
        <Button
          size="small"
          startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 16 }} />}
          onClick={handleViewStudents}
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
          Students
        </Button>

        {isAdmin && (
          <>
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
                onClick={(e) => handleAction(onArchive, e)}
                sx={{ py: 1, fontSize: "0.85rem" }}
              >
                <ListItemIcon>
                  {cls.isArchived ? (
                    <UnarchiveOutlinedIcon fontSize="small" color="warning" />
                  ) : (
                    <ArchiveOutlinedIcon fontSize="small" color="warning" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={cls.isArchived ? "Unarchive" : "Archive"}
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
          </>
        )}
      </Box>
    </Card>
  );
};

export default ClassCard;
