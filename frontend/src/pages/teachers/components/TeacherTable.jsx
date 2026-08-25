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
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
  Stack,
  Chip,
  Tooltip,
  Avatar,
  alpha,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LockResetOutlinedIcon from "@mui/icons-material/LockResetOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import {
  formatMobile,
  getInitials,
  getGenderColor,
} from "../../../utils/formatters";
import useThemeMode from "../../../hooks/useThemeMode";

// ═══════════════════════════════════════════════════════════════════
//  ROW ACTIONS MENU
// ═══════════════════════════════════════════════════════════════════
const RowMenu = ({ teacher, onEdit, onResetPassword, onDelete }) => {
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
    action?.(teacher);
  };

  return (
    <>
      <Tooltip title="Actions">
        <IconButton
          size="small"
          onClick={handleOpen}
          sx={{
            width: 28,
            height: 28,
            color: "text.secondary",
            "&:hover": { bgcolor: "action.hover", color: "text.primary" },
          }}
        >
          <MoreVertIcon sx={{ fontSize: 18 }} />
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
            minWidth: 180,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
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
          <ListItemText
            primary="Edit Details"
            primaryTypographyProps={{ fontWeight: 600, fontSize: "0.82rem" }}
          />
        </MenuItem>

        <MenuItem
          onClick={(e) => handleAction(onResetPassword, e)}
          sx={{ py: 1, fontSize: "0.82rem" }}
        >
          <ListItemIcon>
            <LockResetOutlinedIcon fontSize="small" color="warning" />
          </ListItemIcon>
          <ListItemText
            primary="Reset Password"
            primaryTypographyProps={{ fontWeight: 600, fontSize: "0.82rem" }}
          />
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        <MenuItem
          onClick={(e) => handleAction(onDelete, e)}
          sx={{
            py: 1,
            fontSize: "0.82rem",
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
              fontSize: "0.82rem",
              color: "error.main",
            }}
          />
        </MenuItem>
      </Menu>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════
//  MAIN TABLE COMPONENT
// ═══════════════════════════════════════════════════════════════════
const TeacherTable = ({
  teachers,
  onEdit,
  onResetPassword,
  onDelete,
  sortBy,
  sortOrder,
  onSort,
}) => {
  const { isDark } = useThemeMode();
  const headerBg = isDark ? alpha("#fff", 0.04) : "#F8FAFC";

  const cellStyles = {
    py: 0.7,
    px: 1.5,
    fontSize: "0.8rem",
    borderColor: "divider",
    whiteSpace: "nowrap",
  };

  const headerCellStyles = {
    fontWeight: 800,
    fontSize: "0.68rem",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    bgcolor: headerBg,
    color: "text.secondary",
    borderBottom: "1px solid",
    borderColor: "divider",
    py: 0.9,
    px: 1.5,
    whiteSpace: "nowrap",
  };

  const SortableHeader = ({ field, label, width, minWidth }) => (
    <TableCell sx={{ ...headerCellStyles, width, minWidth }}>
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
      <TableContainer>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headerCellStyles, width: 60 }}>
                S.No
              </TableCell>
              <SortableHeader
                field="name"
                label="Teacher Name"
                minWidth={160}
              />
              <SortableHeader field="employeeId" label="Emp ID" width={100} />
              <SortableHeader
                field="class"
                label="Assigned Classes"
                minWidth={160}
              />
              <TableCell sx={headerCellStyles}>Contact Info</TableCell>
              <TableCell
                sx={{ ...headerCellStyles, width: 80, textAlign: "center" }}
              >
                Status
              </TableCell>
              <TableCell
                sx={{ ...headerCellStyles, width: 40, textAlign: "center" }}
              >
                ⋮
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {teachers.map((teacher, index) => {
              const assignedClasses = teacher.assignedClasses || [];
              return (
                <TableRow
                  key={teacher._id}
                  hover
                  sx={{
                    bgcolor: "transparent",
                    transition: "background 0.15s",
                    opacity: teacher.isActive ? 1 : 0.7,
                  }}
                >
                  {/* S.No column */}
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
                      {String(index + 1).padStart(2, "0")}
                    </Typography>
                  </TableCell>

                  {/* Name with Avatar */}
                  <TableCell sx={{ ...cellStyles, whiteSpace: "normal" }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Avatar
                        sx={{
                          width: 30,
                          height: 30,
                          bgcolor: getGenderColor(teacher.gender),
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                        }}
                      >
                        {getInitials(teacher.name)}
                      </Avatar>
                      <Box>
                        <Typography
                          variant="body2"
                          fontWeight={800}
                          sx={{
                            fontSize: "0.82rem",
                            textTransform: "uppercase",
                            color: "text.primary",
                            lineHeight: 1.1,
                          }}
                        >
                          {teacher.name}
                        </Typography>
                        {teacher.designation && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: "0.68rem" }}
                          >
                            {teacher.designation}{" "}
                            {teacher.qualification &&
                              `• ${teacher.qualification}`}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </TableCell>

                  {/* Employee ID */}
                  <TableCell sx={cellStyles}>
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: "monospace",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        color: "text.secondary",
                      }}
                    >
                      {teacher.employeeId}
                    </Typography>
                  </TableCell>

                  {/* Assigned Classes */}
                  <TableCell sx={{ ...cellStyles, whiteSpace: "normal" }}>
                    {assignedClasses.length > 0 ? (
                      <Stack
                        direction="row"
                        spacing={0.5}
                        flexWrap="wrap"
                        useFlexGap
                      >
                        {assignedClasses.map((cls) => (
                          <Chip
                            key={cls._id}
                            label={`${cls.name}-${cls.section}`}
                            size="small"
                            sx={{
                              bgcolor: isDark
                                ? "rgba(59, 130, 246, 0.15)"
                                : "#E0EBFF",
                              color: isDark ? "#93C5FD" : "#1E4D98",
                              fontSize: "0.65rem",
                              height: 18,
                              fontWeight: 700,
                            }}
                          />
                        ))}
                      </Stack>
                    ) : (
                      <Typography
                        variant="caption"
                        sx={{
                          fontStyle: "italic",
                          color: "text.disabled",
                          fontSize: "0.75rem",
                        }}
                      >
                        Unassigned
                      </Typography>
                    )}
                  </TableCell>

                  {/* Contact Info */}
                  <TableCell sx={cellStyles}>
                    <Stack spacing={0.2}>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <EmailOutlinedIcon
                          sx={{ fontSize: 11, color: "text.secondary" }}
                        />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: "0.7rem" }}
                        >
                          {teacher.email}
                        </Typography>
                      </Stack>
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: "monospace",
                          fontWeight: 700,
                          fontSize: "0.72rem",
                          pl: 2,
                        }}
                      >
                        {formatMobile(teacher.mobile)}
                      </Typography>
                    </Stack>
                  </TableCell>

                  {/* Status */}
                  <TableCell sx={{ ...cellStyles, textAlign: "center" }}>
                    <Chip
                      label={teacher.isActive ? "Active" : "Inactive"}
                      size="small"
                      color={teacher.isActive ? "success" : "warning"}
                      sx={{
                        fontWeight: 800,
                        height: 18,
                        fontSize: "0.62rem",
                        textTransform: "uppercase",
                      }}
                    />
                  </TableCell>

                  {/* Actions */}
                  <TableCell
                    sx={{ ...cellStyles, textAlign: "center", px: 0.5 }}
                  >
                    <RowMenu
                      teacher={teacher}
                      onEdit={onEdit}
                      onResetPassword={onResetPassword}
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

export default TeacherTable;
