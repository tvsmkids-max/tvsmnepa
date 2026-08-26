import React, { useState, useMemo } from "react";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
  Chip,
  Tooltip,
  Stack,
  alpha,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import BeachAccessOutlinedIcon from "@mui/icons-material/BeachAccessOutlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import useThemeMode from "../../../../hooks/useThemeMode";

const TYPE_CONFIG = {
  National: {
    bg: "#FEE2E2",
    text: "#991B1B",
    icon: <FlagOutlinedIcon fontSize="small" />,
  },
  School: {
    bg: "#E0EBFF",
    text: "#1E4D98",
    icon: <SchoolOutlinedIcon fontSize="small" />,
  },
  Vacation: {
    bg: "#FEF3C7",
    text: "#92400E",
    icon: <BeachAccessOutlinedIcon fontSize="small" />,
  },
};

// ═══════════════════════════════════════════════════════════════════
//  ROW ACTIONS MENU (Admin Only)
// ═══════════════════════════════════════════════════════════════════
const RowMenu = ({ holiday, onEdit, onDelete }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleClose = (e) => {
    e?.stopPropagation();
    setAnchorEl(null);
  };

  const handleAction = (action, e) => {
    e.stopPropagation();
    handleClose();
    action?.(holiday);
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={handleOpen}
        sx={{ color: "text.secondary" }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{
          elevation: 0,
          sx: {
            mt: 0.5,
            minWidth: 160,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          },
        }}
      >
        <MenuItem
          onClick={(e) => handleAction(onEdit, e)}
          sx={{ py: 1, fontSize: "0.82rem" }}
        >
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText primary="Edit Holiday" />
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={(e) => handleAction(onDelete, e)}
          sx={{ py: 1, color: "error.main" }}
        >
          <ListItemIcon>
            <DeleteOutlineOutlinedIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText
            primary="Delete"
            primaryTypographyProps={{ fontWeight: 700 }}
          />
        </MenuItem>
      </Menu>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════
//  MAIN TABLE COMPONENT
// ═══════════════════════════════════════════════════════════════════
const HolidayTable = ({ holidays, isAdmin, onEdit, onDelete }) => {
  const { isDark } = useThemeMode();

  const headerStyles = {
    fontWeight: 800,
    fontSize: "0.68rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    bgcolor: isDark ? "#1E293B" : "#F8FAFC",
    color: "text.secondary",
    borderBottom: "1px solid",
    borderColor: "divider",
    py: 1.2,
  };

  const cellStyles = {
    py: 1,
    borderColor: "divider",
  };

  // Helper to format dates
  const formatShortDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  const getHolidayState = (h) => {
    const today = new Date().setHours(0, 0, 0, 0);
    const start = new Date(h.date).setHours(0, 0, 0, 0);
    const end = h.endDate
      ? new Date(h.endDate).setHours(23, 59, 59, 999)
      : new Date(h.date).setHours(23, 59, 59, 999);

    if (today >= start && today <= end)
      return { label: "Today", color: "success", opacity: 1 };
    if (start < today) return { label: "Past", color: "default", opacity: 0.6 };

    const diff = Math.ceil((start - today) / 86400000);
    if (diff <= 7)
      return { label: `In ${diff}d`, color: "warning", opacity: 1 };
    return { label: "Upcoming", color: "info", opacity: 1 };
  };

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
      }}
    >
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headerStyles, width: 250 }}>
                Holiday Name
              </TableCell>
              <TableCell sx={headerStyles}>Type</TableCell>
              <TableCell sx={headerStyles}>Date Range</TableCell>
              <TableCell sx={headerStyles}>Status</TableCell>
              <TableCell sx={headerStyles}>Attendance</TableCell>
              {isAdmin && (
                <TableCell align="center" sx={{ ...headerStyles, width: 60 }}>
                  ⋮
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {holidays.map((h, idx) => {
              const state = getHolidayState(h);
              const config = TYPE_CONFIG[h.type] || TYPE_CONFIG.School;
              const duration = h.endDate
                ? Math.ceil(
                    (new Date(h.endDate).setHours(0, 0, 0, 0) -
                      new Date(h.date).setHours(0, 0, 0, 0)) /
                      86400000,
                  ) + 1
                : 1;

              return (
                <TableRow
                  key={h._id}
                  hover
                  sx={{
                    bgcolor:
                      idx % 2 === 1
                        ? isDark
                          ? alpha("#fff", 0.02)
                          : alpha("#0F172A", 0.02)
                        : "transparent",
                    opacity: state.opacity,
                  }}
                >
                  {/* Holiday Name */}
                  <TableCell sx={cellStyles}>
                    <Typography
                      variant="body2"
                      fontWeight={800}
                      sx={{ color: "text.primary" }}
                    >
                      {h.name}
                    </Typography>
                    {h.description && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 220,
                        }}
                      >
                        {h.description}
                      </Typography>
                    )}
                  </TableCell>

                  {/* Type */}
                  <TableCell sx={cellStyles}>
                    <Chip
                      icon={config.icon}
                      label={h.type}
                      size="small"
                      sx={{
                        bgcolor: config.bg,
                        color: config.text,
                        fontWeight: 700,
                        fontSize: "0.65rem",
                        height: 22,
                        "& .MuiChip-icon": { color: config.text },
                      }}
                    />
                  </TableCell>

                  {/* Date Range */}
                  <TableCell sx={cellStyles}>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      sx={{ fontSize: "0.8rem" }}
                    >
                      {h.endDate
                        ? `${formatShortDate(h.date)} → ${formatShortDate(h.endDate)}`
                        : formatShortDate(h.date)}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block" }}
                    >
                      {new Date(h.date).toLocaleDateString("en-IN", {
                        weekday: "short",
                      })}{" "}
                      {duration > 1 && `• ${duration} days`}
                    </Typography>
                  </TableCell>

                  {/* Timing Status */}
                  <TableCell sx={cellStyles}>
                    <Chip
                      label={state.label}
                      size="small"
                      color={state.color}
                      sx={{ fontWeight: 800, fontSize: "0.65rem", height: 22 }}
                    />
                  </TableCell>

                  {/* Attendance Allowance */}
                  <TableCell sx={cellStyles}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      {h.allowAttendance ? (
                        <>
                          <EventAvailableOutlinedIcon
                            sx={{ fontSize: 14, color: "success.main" }}
                          />
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 700, color: "success.main" }}
                          >
                            Allowed
                          </Typography>
                        </>
                      ) : (
                        <>
                          <EventBusyOutlinedIcon
                            sx={{ fontSize: 14, color: "text.secondary" }}
                          />
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 600, color: "text.secondary" }}
                          >
                            Blocked
                          </Typography>
                        </>
                      )}
                    </Stack>
                  </TableCell>

                  {/* Actions */}
                  {isAdmin && (
                    <TableCell align="center" sx={cellStyles}>
                      <RowMenu
                        holiday={h}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default HolidayTable;
