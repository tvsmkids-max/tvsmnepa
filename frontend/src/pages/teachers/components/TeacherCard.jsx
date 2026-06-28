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
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import LockResetOutlinedIcon from "@mui/icons-material/LockResetOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import ClassOutlinedIcon from "@mui/icons-material/ClassOutlined";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import {
  formatMobile,
  getInitials,
  getGenderColor,
} from "../../../utils/formatters";

const TeacherCard = ({ teacher, onEdit, onResetPassword, onDelete }) => {
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
    action?.(teacher);
  };

  const assignedClasses = teacher.assignedClasses || [];

  return (
    <Card
      sx={{
        borderRadius: 2.5,
        transition: "all 0.2s ease",
        border: "1.5px solid",
        borderColor: teacher.isActive ? "divider" : "warning.light",
        bgcolor: "background.paper",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        opacity: teacher.isActive ? 1 : 0.7,
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
          label={teacher.isActive ? "Active" : "Inactive"}
          size="small"
          color={teacher.isActive ? "success" : "warning"}
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
        {/* Header */}
        <Stack direction="row" spacing={1.5} sx={{ mb: 1.5, pr: 9 }}>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              bgcolor: getGenderColor(teacher.gender),
              fontSize: "1rem",
              fontWeight: 800,
              flexShrink: 0,
              boxShadow: "0 3px 10px rgba(0,0,0,0.12)",
            }}
          >
            {getInitials(teacher.name)}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
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
                color: "text.primary",
              }}
              title={teacher.name}
            >
              {teacher.name}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <BadgeOutlinedIcon
                sx={{ fontSize: 12, color: "text.secondary" }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontFamily: "monospace",
                  fontWeight: 700,
                  fontSize: "0.72rem",
                  color: "text.secondary",
                }}
              >
                {teacher.employeeId}
              </Typography>
            </Stack>
          </Box>
        </Stack>

        {/* Designation */}
        {teacher.designation && (
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            sx={{ mb: 1 }}
          >
            <WorkOutlineOutlinedIcon
              sx={{ fontSize: 13, color: "text.secondary" }}
            />
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "text.secondary",
              }}
            >
              {teacher.designation}
            </Typography>
            {teacher.qualification && (
              <>
                <Typography
                  variant="caption"
                  sx={{ color: "text.disabled", fontSize: "0.7rem" }}
                >
                  •
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "text.secondary",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={teacher.qualification}
                >
                  {teacher.qualification}
                </Typography>
              </>
            )}
          </Stack>
        )}

        <Divider sx={{ mb: 1.2 }} />

        {/* Contact Info */}
        <Stack spacing={0.6} sx={{ mb: 1.2 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.8}
            sx={{ minWidth: 0 }}
          >
            <EmailOutlinedIcon
              sx={{ fontSize: 13, color: "text.secondary", flexShrink: 0 }}
            />
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "text.primary",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}
              title={teacher.email}
            >
              {teacher.email}
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={0.8}>
            <PhoneOutlinedIcon
              sx={{ fontSize: 13, color: "text.secondary", flexShrink: 0 }}
            />
            <Typography
              variant="caption"
              sx={{
                fontFamily: "monospace",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "text.primary",
                letterSpacing: "0.02em",
              }}
            >
              {formatMobile(teacher.mobile)}
            </Typography>
          </Stack>
        </Stack>

        {/* Assigned Classes */}
        <Box sx={{ mt: "auto", mb: 0.5 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            sx={{ mb: 0.6 }}
          >
            <ClassOutlinedIcon sx={{ fontSize: 13, color: "text.secondary" }} />
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.65rem",
                fontWeight: 800,
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Classes ({assignedClasses.length})
            </Typography>
          </Stack>

          {assignedClasses.length > 0 ? (
            <Stack direction="row" spacing={0.4} flexWrap="wrap" useFlexGap>
              {assignedClasses.slice(0, 4).map((cls) => (
                <Chip
                  key={cls._id}
                  label={`${cls.name}-${cls.section}`}
                  size="small"
                  sx={{
                    bgcolor: "#E0EBFF",
                    color: "#1E4D98",
                    fontSize: "0.65rem",
                    height: 20,
                    fontWeight: 700,
                  }}
                />
              ))}
              {assignedClasses.length > 4 && (
                <Chip
                  label={`+${assignedClasses.length - 4}`}
                  size="small"
                  sx={{
                    fontSize: "0.65rem",
                    height: 20,
                    fontWeight: 700,
                  }}
                />
              )}
            </Stack>
          ) : (
            <Typography
              variant="caption"
              sx={{
                fontStyle: "italic",
                color: "text.disabled",
                fontSize: "0.72rem",
              }}
            >
              No classes assigned
            </Typography>
          )}
        </Box>
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
          startIcon={<LockResetOutlinedIcon sx={{ fontSize: 16 }} />}
          onClick={(e) => handleAction(onResetPassword, e)}
          sx={{
            flex: 1,
            minWidth: 0,
            fontSize: "0.72rem",
            fontWeight: 700,
            textTransform: "none",
            color: "warning.dark",
            py: 0.6,
            "&:hover": { bgcolor: "warning.50" },
          }}
        >
          Reset
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
              primary="Delete Teacher"
              primaryTypographyProps={{
                fontWeight: 700,
                fontSize: "0.85rem",
                color: "error.main",
              }}
            />
          </MenuItem>
        </Menu>
      </Box>
    </Card>
  );
};

export default TeacherCard;
