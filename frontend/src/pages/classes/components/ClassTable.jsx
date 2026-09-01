import React, { useState } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Button,
  Divider,
  useTheme,
  useMediaQuery,
  alpha,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import UnarchiveOutlinedIcon from "@mui/icons-material/UnarchiveOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import PasswordOutlinedIcon from "@mui/icons-material/PasswordOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

const ClassTable = ({
  classes,
  isAdmin,
  onViewStudents,
  onEdit,
  onArchive,
  onDelete,
  onResetPassword,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [activeClass, setActiveClass] = useState(null);
  const menuOpen = Boolean(menuAnchor);

  const handleMenuOpen = (e, cls) => {
    e.stopPropagation();
    setActiveClass(cls);
    setMenuAnchor(e.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setActiveClass(null);
  };

  const handleAction = (action) => {
    handleMenuClose();
    if (activeClass) action(activeClass);
  };

  const borderColor = "divider";
  const stickyBg = isDark ? theme.palette.background.paper : "#FFFFFF";
  const stickyHeaderBg = isDark ? "#111827" : "#F8FAFC";

  // Sticky helpers — mobile only, no vertical divider
  const stickySNo = (isHead) =>
    isMobile
      ? {
          position: "sticky",
          left: 0,
          zIndex: isHead ? 5 : 2,
          bgcolor: isHead ? stickyHeaderBg : stickyBg,
        }
      : {};

  const stickyClass = (isHead) =>
    isMobile
      ? {
          position: "sticky",
          left: 48, // match <col> width for S.No / "#" column
          zIndex: isHead ? 5 : 2,
          bgcolor: isHead ? stickyHeaderBg : stickyBg,
        }
      : {};
  const headSx = {
    fontWeight: 800,
    fontSize: "0.65rem",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "text.secondary",
    bgcolor: stickyHeaderBg,
    borderBottom: "1px solid",
    borderColor,
    py: 1.25,
    whiteSpace: "nowrap",
  };

  const bodySx = {
    borderBottom: "1px solid",
    borderColor,
    py: 1.15,
    bgcolor: stickyBg,
  };

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor,
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      <TableContainer
        sx={{
          maxHeight: { xs: "calc(100vh - 240px)", md: "calc(100vh - 280px)" },
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Table
          stickyHeader
          size="small"
          sx={{
            width: "100%",
            minWidth: { xs: 720, md: "100%" },
            tableLayout: "fixed",
          }}
        >
          <colgroup>
            <col style={{ width: 48 }} />
            <col style={{ width: isMobile ? 120 : "18%" }} />
            <col style={{ width: isMobile ? 72 : "10%" }} />
            <col style={{ width: isMobile ? 140 : "22%" }} />
            <col style={{ width: isMobile ? 72 : "10%" }} />
            <col style={{ width: isMobile ? 88 : "12%" }} />
            <col style={{ width: isMobile ? 150 : "18%" }} />
          </colgroup>

          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  ...headSx,
                  ...stickySNo(true),
                  width: 48,
                  pl: 1.5,
                  pr: 0.5,
                }}
              >
                S.No
              </TableCell>
              <TableCell
                sx={{
                  ...headSx,
                  ...stickyClass(true),
                  pl: 1.5,
                }}
              >
                Class
              </TableCell>
              <TableCell sx={{ ...headSx }} align="center">
                Sec
              </TableCell>
              <TableCell sx={{ ...headSx }}>Teacher</TableCell>
              <TableCell sx={{ ...headSx }} align="center">
                Students
              </TableCell>
              <TableCell sx={{ ...headSx }} align="center">
                Status
              </TableCell>
              <TableCell sx={{ ...headSx, pr: 1.5 }} align="right">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {classes.map((cls, idx) => {
              const teacherName = cls.teacherLabel
                ? String(cls.teacherLabel).trim().toUpperCase()
                : "";

              return (
                <TableRow
                  key={cls._id}
                  hover
                  sx={{
                    opacity: cls.isArchived ? 0.65 : 1,
                    "&:hover td": {
                      bgcolor: isDark
                        ? alpha("#fff", 0.04)
                        : alpha("#0F172A", 0.02),
                    },
                    // keep sticky cells opaque on hover
                    "&:hover td[data-sticky]": {
                      bgcolor: isDark ? alpha("#1e293b", 1) : "#F8FAFC",
                    },
                  }}
                >
                  <TableCell
                    data-sticky={isMobile ? "true" : undefined}
                    sx={{
                      ...bodySx,
                      ...stickySNo(false),
                      pl: 1.5,
                      pr: 0.5,
                    }}
                  >
                    <Typography
                      fontFamily="monospace"
                      fontWeight={700}
                      fontSize="0.75rem"
                      color="text.disabled"
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </Typography>
                  </TableCell>

                  <TableCell
                    data-sticky={isMobile ? "true" : undefined}
                    sx={{
                      ...bodySx,
                      ...stickyClass(false),
                      pl: 1.5,
                    }}
                  >
                    <Typography
                      fontWeight={800}
                      fontSize="0.8rem"
                      sx={{
                        textTransform: "uppercase",
                        letterSpacing: "-0.01em",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={cls.name}
                    >
                      {cls.name}
                    </Typography>
                  </TableCell>

                  <TableCell sx={bodySx} align="center">
                    <Typography
                      fontWeight={700}
                      fontSize="0.8rem"
                      fontFamily="monospace"
                      sx={{ textTransform: "uppercase" }}
                    >
                      {cls.section || "—"}
                    </Typography>
                  </TableCell>

                  <TableCell sx={bodySx}>
                    <Typography
                      fontWeight={teacherName ? 700 : 500}
                      fontSize="0.78rem"
                      color={teacherName ? "text.primary" : "text.disabled"}
                      fontStyle={teacherName ? "normal" : "italic"}
                      sx={{
                        textTransform: teacherName ? "uppercase" : "none",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={teacherName || "Not assigned"}
                    >
                      {teacherName || "Not assigned"}
                    </Typography>
                  </TableCell>

                  <TableCell sx={bodySx} align="center">
                    <Typography
                      fontWeight={800}
                      fontFamily="monospace"
                      fontSize="0.85rem"
                    >
                      {cls.studentCount ?? 0}
                    </Typography>
                  </TableCell>

                  <TableCell sx={bodySx} align="center">
                    <Chip
                      label={cls.isArchived ? "Archived" : "Active"}
                      size="small"
                      variant="outlined"
                      sx={{
                        height: 22,
                        fontWeight: 700,
                        fontSize: "0.62rem",
                        borderColor: cls.isArchived
                          ? "warning.main"
                          : "success.main",
                        color: cls.isArchived ? "warning.dark" : "success.dark",
                        bgcolor: "transparent",
                      }}
                    />
                  </TableCell>

                  <TableCell sx={{ ...bodySx, pr: 1 }} align="right">
                    <Stack
                      direction="row"
                      spacing={0.5}
                      justifyContent="flex-end"
                      alignItems="center"
                    >
                      <Button
                        size="small"
                        onClick={() => onViewStudents(cls)}
                        startIcon={
                          <VisibilityOutlinedIcon sx={{ fontSize: 15 }} />
                        }
                        sx={{
                          textTransform: "none",
                          fontWeight: 700,
                          fontSize: "0.7rem",
                          minWidth: 0,
                          px: 1,
                          color: "text.secondary",
                          border: "1px solid",
                          borderColor,
                          borderRadius: 1.5,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isMobile ? "View" : "Students"}
                      </Button>

                      {isAdmin && (
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, cls)}
                          sx={{
                            border: "1px solid",
                            borderColor,
                            borderRadius: 1.5,
                            width: 30,
                            height: 30,
                          }}
                        >
                          <MoreVertIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {isMobile && (
        <Box
          sx={{
            px: 1.5,
            py: 0.75,
            borderTop: "1px solid",
            borderColor,
            bgcolor: isDark ? alpha("#fff", 0.02) : "#FAFBFC",
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: "0.65rem" }}
          >
            Swipe sideways for Teacher & Actions · Class stays fixed
          </Typography>
        </Box>
      )}

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
            borderColor,
          },
        }}
      >
        <MenuItem onClick={() => handleAction(onEdit)} sx={{ py: 1 }}>
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Edit class"
            primaryTypographyProps={{ fontWeight: 600, fontSize: "0.85rem" }}
          />
        </MenuItem>
        <MenuItem onClick={() => handleAction(onResetPassword)} sx={{ py: 1 }}>
          <ListItemIcon>
            <PasswordOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Reset password"
            primaryTypographyProps={{ fontWeight: 600, fontSize: "0.85rem" }}
          />
        </MenuItem>
        <MenuItem onClick={() => handleAction(onArchive)} sx={{ py: 1 }}>
          <ListItemIcon>
            {activeClass?.isArchived ? (
              <UnarchiveOutlinedIcon fontSize="small" />
            ) : (
              <ArchiveOutlinedIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText
            primary={activeClass?.isArchived ? "Unarchive" : "Archive"}
            primaryTypographyProps={{ fontWeight: 600, fontSize: "0.85rem" }}
          />
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={() => handleAction(onDelete)}
          sx={{ py: 1, color: "error.main" }}
        >
          <ListItemIcon>
            <DeleteOutlineOutlinedIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText
            primary="Delete class"
            primaryTypographyProps={{
              fontWeight: 700,
              fontSize: "0.85rem",
              color: "error.main",
            }}
          />
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default ClassTable;
