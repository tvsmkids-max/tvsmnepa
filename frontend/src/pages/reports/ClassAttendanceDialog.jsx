import React, { useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Stack,
  Typography,
  Chip,
  IconButton,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  useTheme,
  useMediaQuery,
  alpha,
} from "@mui/material";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";

// Defensive Scholar Number formatting to guarantee undefined-safe outputs
const formatScholarNo = (student) => {
  if (!student || !student.scholarNumber) return "—";
  return String(student.scholarNumber).trim();
};

const ClassAttendanceDialog = ({
  open,
  onClose,
  classData,
  date,
  mode = "admin",
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Sort students alphabetically by name (A-Z)
  const sortedStudents = useMemo(() => {
    if (!classData?.students) return [];
    return [...classData.students].sort((a, b) =>
      (a.name || "").localeCompare(b.name || ""),
    );
  }, [classData]);

  if (!classData) return null;

  const dateStr = date
    ? new Date(date).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  const pctColor =
    classData.percentage >= 90
      ? "#16A34A"
      : classData.percentage >= 75
        ? "#F59E0B"
        : "#DC2626";

  const getStatusChip = (status) => {
    if (status === "Present") {
      return {
        label: "P",
        color: "#16A34A",
        bg: isDark ? alpha("#16A34A", 0.18) : "#DCFCE7",
        textColor: isDark ? "#86EFAC" : "#15803D",
      };
    }
    if (status === "Absent") {
      return {
        label: "A",
        color: "#DC2626",
        bg: isDark ? alpha("#DC2626", 0.18) : "#FEE2E2",
        textColor: isDark ? "#FCA5A5" : "#B91C1C",
      };
    }
    return {
      label: "—",
      color: "#F59E0B",
      bg: isDark ? alpha("#F59E0B", 0.18) : "#FEF3C7",
      textColor: isDark ? "#FCD34D" : "#B45309",
    };
  };

  const getRowBg = (status) => {
    if (status === "Present") {
      return isDark ? alpha("#16A34A", 0.05) : "#F0FDF4";
    }
    if (status === "Absent") {
      return isDark ? alpha("#DC2626", 0.05) : "#FEF2F2";
    }
    return "transparent";
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          maxHeight: isMobile ? "100vh" : "85vh",
        },
      }}
    >
      <DialogTitle
        component="div"
        sx={{
          p: 0,
          background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
          color: "white",
        }}
      >
        <Box sx={{ p: { xs: 2, sm: 2.5 }, position: "relative" }}>
          <IconButton
            onClick={onClose}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              color: "white",
              bgcolor: "rgba(255,255,255,0.1)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
            }}
            size="small"
          >
            <CloseOutlinedIcon fontSize="small" />
          </IconButton>

          <Typography
            variant="caption"
            sx={{
              color: "rgba(255,255,255,0.7)",
              fontSize: "0.65rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Daily Attendance · {dateStr}
          </Typography>

          <Typography
            variant="h5"
            fontWeight={900}
            sx={{
              fontSize: { xs: "1.2rem", sm: "1.4rem" },
              mt: 0.5,
              pr: 4,
            }}
          >
            Class {classData.name} - {classData.section}
          </Typography>

          {classData.classTeacher && (
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255,255,255,0.8)",
                fontSize: "0.75rem",
                display: "block",
                mt: 0.3,
              }}
            >
              Teacher: {classData.classTeacher}
            </Typography>
          )}

          <Stack
            direction="row"
            spacing={2}
            sx={{
              mt: 2,
              p: 1.25,
              borderRadius: 2,
              bgcolor: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
            justifyContent="space-around"
          >
            <StatItem value={classData.total} label="Total" color="white" />
            <StatItem
              value={classData.present}
              label="Present"
              color="#86EFAC"
            />
            <StatItem value={classData.absent} label="Absent" color="#FCA5A5" />
            <StatItem
              value={classData.unmarked}
              label="Unmarked"
              color="#FCD34D"
            />
            <StatItem
              value={`${classData.percentage}%`}
              label="Rate"
              color={pctColor}
            />
          </Stack>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, overflow: "auto" }}>
        {classData.total === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <PersonOutlineIcon
              sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              No students in this class
            </Typography>
          </Box>
        ) : isMobile ? (
          /* ── MOBILE: Compact cards ── */
          <Stack
            divider={
              <Divider
                sx={{
                  borderColor: isDark
                    ? alpha("#fff", 0.06)
                    : alpha("#000", 0.06),
                }}
              />
            }
          >
            {sortedStudents.map((s, idx) => {
              const chip = getStatusChip(s.status);
              return (
                <Box
                  key={s._id}
                  sx={{
                    px: 2,
                    py: 1.25,
                    bgcolor: getRowBg(s.status),
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1.25}>
                    {/* Replaced Roll with S.No. Badge */}
                    <Typography
                      sx={{
                        minWidth: 26,
                        fontWeight: 800,
                        fontSize: "0.78rem",
                        color: isDark ? "#93C5FD" : "#1E4D98",
                        fontFamily: "monospace",
                        textAlign: "center",
                        flexShrink: 0,
                      }}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </Typography>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        noWrap
                        sx={{
                          fontSize: "0.85rem",
                          textTransform: "uppercase",
                        }}
                      >
                        {s.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        sx={{ fontSize: "0.68rem", display: "block" }}
                      >
                        F: {s.fatherName || "—"}
                        <Box component="span" sx={{ mx: 0.5, opacity: 0.5 }}>
                          ·
                        </Box>
                        Scholar: {formatScholarNo(s)}
                      </Typography>
                    </Box>
                    <Chip
                      label={chip.label}
                      size="small"
                      sx={{
                        fontWeight: 900,
                        fontSize: "0.75rem",
                        height: 26,
                        minWidth: 32,
                        bgcolor: chip.bg,
                        color: chip.textColor,
                        border: `1.5px solid ${chip.color}`,
                        flexShrink: 0,
                      }}
                    />
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        ) : (
          /* ── DESKTOP: Table ── */
          <TableContainer>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {/* Replaced "Roll" header with "S.NO." */}
                  <TableCell
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.68rem",
                      textTransform: "uppercase",
                      width: 65,
                      py: 1,
                      bgcolor: isDark ? "#1E293B" : "#F8FAFC",
                    }}
                  >
                    S.NO.
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.68rem",
                      textTransform: "uppercase",
                      width: 100,
                      py: 1,
                      bgcolor: isDark ? "#1E293B" : "#F8FAFC",
                    }}
                  >
                    Scholar
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.68rem",
                      textTransform: "uppercase",
                      py: 1,
                      bgcolor: isDark ? "#1E293B" : "#F8FAFC",
                    }}
                  >
                    Name
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.68rem",
                      textTransform: "uppercase",
                      py: 1,
                      bgcolor: isDark ? "#1E293B" : "#F8FAFC",
                    }}
                  >
                    Father Name
                  </TableCell>
                  {mode !== "management" && (
                    <TableCell
                      sx={{
                        fontWeight: 800,
                        fontSize: "0.68rem",
                        textTransform: "uppercase",
                        width: 110,
                        py: 1,
                        bgcolor: isDark ? "#1E293B" : "#F8FAFC",
                      }}
                    >
                      Mobile
                    </TableCell>
                  )}
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.68rem",
                      textTransform: "uppercase",
                      width: 70,
                      py: 1,
                      bgcolor: isDark ? "#1E293B" : "#F8FAFC",
                    }}
                  >
                    Status
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedStudents.map((s, idx) => {
                  const chip = getStatusChip(s.status);
                  return (
                    <TableRow
                      key={s._id}
                      hover
                      sx={{ bgcolor: getRowBg(s.status) }}
                    >
                      {/* S.No column */}
                      <TableCell sx={{ py: 0.9 }}>
                        <Typography
                          variant="body2"
                          fontWeight={800}
                          sx={{
                            fontFamily: "monospace",
                            fontSize: "0.8rem",
                            color: isDark ? "#93C5FD" : "#1E4D98",
                          }}
                        >
                          {String(idx + 1).padStart(2, "0")}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 0.9 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            fontSize: "0.72rem",
                            color: "text.secondary",
                          }}
                        >
                          {formatScholarNo(s)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 0.9 }}>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          sx={{
                            fontSize: "0.82rem",
                            textTransform: "uppercase",
                          }}
                        >
                          {s.name}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 0.9 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: "0.78rem",
                            color: "text.secondary",
                          }}
                        >
                          {s.fatherName || "—"}
                        </Typography>
                      </TableCell>
                      {mode !== "management" && (
                        <TableCell sx={{ py: 0.9 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontFamily: "monospace",
                              fontSize: "0.75rem",
                              color:
                                s.mobile === "0000000000"
                                  ? "text.disabled"
                                  : "text.primary",
                            }}
                          >
                            {s.mobile || "—"}
                          </Typography>
                        </TableCell>
                      )}
                      <TableCell align="center" sx={{ py: 0.9 }}>
                        <Chip
                          label={chip.label}
                          size="small"
                          sx={{
                            fontWeight: 900,
                            fontSize: "0.78rem",
                            height: 26,
                            minWidth: 36,
                            bgcolor: chip.bg,
                            color: chip.textColor,
                            border: `1.5px solid ${chip.color}`,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {mode !== "management" && classData.markedBy && (
          <Box
            sx={{
              px: 2.5,
              py: 1.5,
              borderTop: "1px solid",
              borderColor: "divider",
              bgcolor: isDark ? alpha("#fff", 0.02) : "#FAFBFC",
              position: "sticky",
              bottom: 0,
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: "0.72rem" }}
            >
              ✏️ Marked by:{" "}
              <Box
                component="span"
                sx={{ fontWeight: 700, color: "text.primary" }}
              >
                {classData.markedBy}
              </Box>
              {classData.hasEdits && classData.editedBy && (
                <>
                  {" · Edited by: "}
                  <Box
                    component="span"
                    sx={{ fontWeight: 700, color: "warning.main" }}
                  >
                    {classData.editedBy}
                  </Box>
                </>
              )}
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

const StatItem = ({ value, label, color }) => (
  <Stack alignItems="center">
    <Typography
      variant="body2"
      fontWeight={900}
      sx={{ fontSize: "1rem", color, lineHeight: 1 }}
    >
      {value}
    </Typography>
    <Typography
      variant="caption"
      sx={{
        fontSize: "0.6rem",
        fontWeight: 700,
        color: "rgba(255,255,255,0.7)",
        textTransform: "uppercase",
      }}
    >
      {label}
    </Typography>
  </Stack>
);

export default ClassAttendanceDialog;
