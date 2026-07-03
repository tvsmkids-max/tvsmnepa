import React, { useState } from "react";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TableSortLabel,
  Paper,
  Checkbox,
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
  alpha,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import {
  formatRollNumber,
  formatMobile,
  formatClassLabel,
} from "../../../utils/formatters";
import StatusChip from "../../../components/common/StatusChip";
import useThemeMode from "../../../hooks/useThemeMode";

// ═══════════════════════════════════════════════════════════════════
//  Compact date format: "15-Nov-18" (fits in one line)
// ═══════════════════════════════════════════════════════════════════
const formatDOB = (dob) => {
  if (!dob) return "—";
  try {
    const date = new Date(dob);
    if (isNaN(date.getTime())) return "—";
    const day = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleDateString("en-GB", { month: "short" });
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  } catch {
    return "—";
  }
};

// ═══════════════════════════════════════════════════════════════════
//  Row Menu (unchanged)
// ═══════════════════════════════════════════════════════════════════

const RowMenu = ({
  student,
  isAdmin,
  onView,
  onEdit,
  onAttendance,
  onStatus,
  onQuickToggleStatus,
  onDelete,
}) => {
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
    <>
      <Tooltip title="More actions">
        <IconButton
          size="small"
          onClick={handleOpen}
          sx={{
            width: 26,
            height: 26,
            color: "text.secondary",
            "&:hover": { bgcolor: "action.hover", color: "text.primary" },
          }}
        >
          <MoreVertIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
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
              secondary="Transfer, TC, etc."
              secondaryTypographyProps={{ fontSize: "0.68rem" }}
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
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════
//  MAIN TABLE
// ═══════════════════════════════════════════════════════════════════

const StudentTable = ({
  students,
  isAdmin,
  selectionMode,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allPageSelected,
  onRowClick,
  onView,
  onEdit,
  onStatus,
  onQuickToggleStatus,
  onDelete,
  onAttendance,
  sortBy,
  sortOrder,
  onSort,
}) => {
  const { isDark } = useThemeMode();
  const headerBg = isDark ? alpha("#fff", 0.04) : "#F8FAFC";

  // ✅ TIGHT CELL STYLES — smaller padding
  const cellStyles = {
    py: 0.9,
    px: 1.2, // ← Reduced from default 16px
    fontSize: "0.8rem",
    borderColor: "divider",
    whiteSpace: "nowrap", // ← Prevents wrapping
  };

  const headerCellStyles = {
    fontWeight: 800,
    fontSize: "0.68rem", // ← Slightly smaller
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    bgcolor: headerBg,
    color: "text.secondary",
    borderBottom: "1px solid",
    borderColor: "divider",
    py: 1,
    px: 1.2, // ← Reduced padding
    whiteSpace: "nowrap",
  };

  // ✅ Sortable header (compact)
  const SortableHeader = ({
    field,
    label,
    width,
    minWidth,
    align = "left",
  }) => (
    <TableCell
      sx={{
        ...headerCellStyles,
        width,
        minWidth,
        textAlign: align,
      }}
    >
      <TableSortLabel
        active={sortBy === field}
        direction={sortBy === field ? sortOrder : "asc"}
        onClick={() => onSort(field)}
        sx={{
          "& .MuiTableSortLabel-icon": {
            fontSize: 14,
            opacity: sortBy === field ? 1 : 0.4,
            marginLeft: "2px !important",
          },
          fontSize: "0.68rem",
          fontWeight: 800,
          color: "inherit !important",
        }}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 2,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <TableContainer sx={{ maxHeight: "calc(100vh - 300px)" }}>
        <Table stickyHeader size="small" sx={{ tableLayout: "auto" }}>
          <TableHead>
            <TableRow>
              {selectionMode && isAdmin && (
                <TableCell
                  padding="checkbox"
                  sx={{ ...headerCellStyles, width: 40, px: 0.5 }}
                >
                  <Checkbox
                    size="small"
                    checked={allPageSelected}
                    indeterminate={selectedIds.size > 0 && !allPageSelected}
                    onChange={onToggleSelectAll}
                  />
                </TableCell>
              )}

              {/* ✅ TIGHT COLUMN WIDTHS */}
              <SortableHeader field="rollNumber" label="Roll" width={55} />
              <SortableHeader
                field="scholarNumber"
                label="Scholar"
                width={80}
              />
              <SortableHeader field="name" label="Name" minWidth={140} />
              <SortableHeader
                field="fatherName"
                label="Father Name"
                minWidth={130}
              />
              <SortableHeader
                field="motherName"
                label="Mother Name"
                minWidth={130}
              />
              <SortableHeader field="dob" label="DOB" width={80} />
              <SortableHeader field="mobile" label="Mobile" width={100} />
              <SortableHeader field="class" label="Class" width={70} />
              <SortableHeader field="status" label="Status" width={75} />

              <TableCell
                sx={{
                  ...headerCellStyles,
                  width: 40,
                  textAlign: "center",
                  px: 0.5,
                }}
              >
                ⋮
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {students.map((student) => {
              const isSelected = selectedIds.has(student._id);
              return (
                <TableRow
                  key={student._id}
                  hover
                  onClick={() => onRowClick?.(student)}
                  selected={isSelected}
                  sx={{
                    cursor: "pointer",
                    bgcolor: isSelected
                      ? isDark
                        ? alpha("#1E4D98", 0.1)
                        : alpha("#1E4D98", 0.04)
                      : "transparent",
                    "&:hover": {
                      bgcolor: isDark
                        ? alpha("#fff", 0.03)
                        : alpha("#000", 0.02),
                    },
                    transition: "background 0.15s",
                  }}
                >
                  {selectionMode && isAdmin && (
                    <TableCell
                      padding="checkbox"
                      onClick={(e) => e.stopPropagation()}
                      sx={{ px: 0.5 }}
                    >
                      <Checkbox
                        size="small"
                        checked={isSelected}
                        onChange={() => onToggleSelect?.(student._id)}
                      />
                    </TableCell>
                  )}

                  {/* Roll */}
                  <TableCell sx={cellStyles}>
                    <Typography
                      component="span"
                      fontWeight={800}
                      sx={{
                        fontFamily: "monospace",
                        fontSize: "0.8rem",
                        color: isDark ? "#93C5FD" : "#1E4D98",
                      }}
                    >
                      {formatRollNumber(student.rollNumber)}
                    </Typography>
                  </TableCell>

                  {/* Scholar # */}
                  <TableCell sx={cellStyles}>
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: "monospace",
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        color: "text.secondary",
                      }}
                    >
                      {student.scholarNumber}
                    </Typography>
                  </TableCell>

                  {/* Name — allow wrap only if very long */}
                  <TableCell
                    sx={{
                      ...cellStyles,
                      whiteSpace: "normal",
                      maxWidth: 200,
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      sx={{
                        fontSize: "0.82rem",
                        textTransform: "uppercase",
                        color: "text.primary",
                        lineHeight: 1.25,
                      }}
                    >
                      {student.name}
                    </Typography>
                  </TableCell>

                  {/* Father Name — allow wrap */}
                  <TableCell
                    sx={{
                      ...cellStyles,
                      whiteSpace: "normal",
                      maxWidth: 180,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: "0.78rem",
                        color: "text.primary",
                        lineHeight: 1.25,
                      }}
                    >
                      {student.fatherName || "—"}
                    </Typography>
                  </TableCell>

                  {/* Mother Name — allow wrap */}
                  <TableCell
                    sx={{
                      ...cellStyles,
                      whiteSpace: "normal",
                      maxWidth: 180,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: "0.78rem",
                        color: "text.primary",
                        lineHeight: 1.25,
                      }}
                    >
                      {student.motherName || "—"}
                    </Typography>
                  </TableCell>

                  {/* DOB — compact single line */}
                  <TableCell sx={cellStyles}>
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: "monospace",
                        fontSize: "0.73rem",
                        color: "text.secondary",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDOB(student.dob)}
                    </Typography>
                  </TableCell>

                  {/* Mobile — no wrap */}
                  <TableCell sx={cellStyles}>
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: "monospace",
                        fontWeight: 600,
                        fontSize: "0.75rem",
                        color:
                          student.mobile === "0000000000"
                            ? "text.disabled"
                            : "text.primary",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatMobile(student.mobile)}
                    </Typography>
                  </TableCell>

                  {/* Class chip — compact */}
                  <TableCell sx={cellStyles}>
                    <Chip
                      label={formatClassLabel(student.class)}
                      size="small"
                      sx={{
                        bgcolor: isDark ? alpha("#3B82F6", 0.15) : "#E0EBFF",
                        color: isDark ? "#93C5FD" : "#1E4D98",
                        fontWeight: 800,
                        height: 20,
                        fontSize: "0.65rem",
                        "& .MuiChip-label": { px: 0.75 },
                      }}
                    />
                  </TableCell>

                  {/* Status chip */}
                  <TableCell sx={cellStyles}>
                    <StatusChip status={student.status} size="small" />
                  </TableCell>

                  {/* Actions */}
                  <TableCell
                    sx={{ ...cellStyles, textAlign: "center", px: 0.5 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <RowMenu
                      student={student}
                      isAdmin={isAdmin}
                      onView={onView}
                      onEdit={onEdit}
                      onAttendance={onAttendance}
                      onStatus={onStatus}
                      onQuickToggleStatus={onQuickToggleStatus}
                      onDelete={onDelete}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default StudentTable;
