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
  LinearProgress,
  useTheme,
  useMediaQuery,
  alpha,
} from "@mui/material";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import HourglassBottomOutlinedIcon from "@mui/icons-material/HourglassBottomOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";

const ClassAttendanceDialog = ({ open, onClose, classData, date }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Group students by status
  const grouped = useMemo(() => {
    if (!classData?.students) return { present: [], absent: [], unmarked: [] };

    const present = [];
    const absent = [];
    const unmarked = [];

    classData.students.forEach((s) => {
      if (s.status === "Present") present.push(s);
      else if (s.status === "Absent") absent.push(s);
      else unmarked.push(s);
    });

    return { present, absent, unmarked };
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
      {/* ── HEADER ── */}
      <DialogTitle
        component="div"
        sx={{
          p: 0,
          background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
          color: "white",
        }}
      >
        <Box sx={{ p: { xs: 2, sm: 2.5 }, position: "relative" }}>
          {/* Close button */}
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

          {/* Class info */}
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

          {/* Stats row */}
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

      {/* ── CONTENT ── */}
      <DialogContent sx={{ p: 0, overflow: "auto" }}>
        {/* ── PRESENT STUDENTS ── */}
        {grouped.present.length > 0 && (
          <StudentSection
            title="Present"
            icon={CheckCircleOutlinedIcon}
            count={grouped.present.length}
            color="#16A34A"
            bg={isDark ? alpha("#16A34A", 0.08) : "#F0FDF4"}
            students={grouped.present}
            isDark={isDark}
            isMobile={isMobile}
          />
        )}

        {/* ── ABSENT STUDENTS ── */}
        {grouped.absent.length > 0 && (
          <StudentSection
            title="Absent"
            icon={CancelOutlinedIcon}
            count={grouped.absent.length}
            color="#DC2626"
            bg={isDark ? alpha("#DC2626", 0.08) : "#FEF2F2"}
            students={grouped.absent}
            isDark={isDark}
            isMobile={isMobile}
          />
        )}

        {/* ── UNMARKED STUDENTS ── */}
        {grouped.unmarked.length > 0 && (
          <StudentSection
            title="Unmarked"
            icon={HourglassBottomOutlinedIcon}
            count={grouped.unmarked.length}
            color="#F59E0B"
            bg={isDark ? alpha("#F59E0B", 0.08) : "#FFFBEB"}
            students={grouped.unmarked}
            isDark={isDark}
            isMobile={isMobile}
          />
        )}

        {/* ── ALL EMPTY ── */}
        {classData.total === 0 && (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <PersonOutlineIcon
              sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              No students in this class
            </Typography>
          </Box>
        )}

        {/* ── MARKED BY INFO ── */}
        {classData.markedBy && (
          <Box
            sx={{
              px: 2.5,
              py: 1.5,
              borderTop: "1px solid",
              borderColor: "divider",
              bgcolor: isDark ? alpha("#fff", 0.02) : "#FAFBFC",
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

// ═══════════════════════════════════════════════════════════════════
//  STUDENT SECTION (Present / Absent / Unmarked group)
// ═══════════════════════════════════════════════════════════════════

const StudentSection = ({
  title,
  icon: Icon,
  count,
  color,
  bg,
  students,
  isDark,
  isMobile,
}) => (
  <Box>
    {/* Section header */}
    <Box
      sx={{
        px: 2.5,
        py: 1.25,
        bgcolor: bg,
        borderBottom: "1px solid",
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        gap: 1,
      }}
    >
      <Icon sx={{ fontSize: 18, color }} />
      <Typography variant="body2" fontWeight={800} sx={{ color, flex: 1 }}>
        {title}
      </Typography>
      <Chip
        label={count}
        size="small"
        sx={{
          fontWeight: 800,
          height: 22,
          fontSize: "0.72rem",
          bgcolor: color,
          color: "white",
          minWidth: 32,
        }}
      />
    </Box>

    {/* Student list */}
    {isMobile ? (
      // ── MOBILE: Compact cards ──
      <Stack
        divider={
          <Divider
            sx={{
              borderColor: isDark ? alpha("#fff", 0.06) : alpha("#000", 0.06),
            }}
          />
        }
      >
        {students.map((s) => (
          <Box
            key={s._id}
            sx={{
              px: 2.5,
              py: 1.25,
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.25}>
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
                {String(s.rollNumber || "").padStart(2, "0")}
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
                  #{s.scholarNumber}
                </Typography>
              </Box>
            </Stack>
          </Box>
        ))}
      </Stack>
    ) : (
      // ── DESKTOP: Table ──
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: 800,
                  fontSize: "0.68rem",
                  textTransform: "uppercase",
                  width: 55,
                  py: 1,
                }}
              >
                Roll
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 800,
                  fontSize: "0.68rem",
                  textTransform: "uppercase",
                  width: 90,
                  py: 1,
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
                }}
              >
                Father Name
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 800,
                  fontSize: "0.68rem",
                  textTransform: "uppercase",
                  width: 100,
                  py: 1,
                }}
              >
                Mobile
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((s) => (
              <TableRow key={s._id} hover>
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
                    {String(s.rollNumber || "").padStart(2, "0")}
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
                    {s.scholarNumber}
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )}
  </Box>
);

// ═══════════════════════════════════════════════════════════════════
//  STAT ITEM (for dialog header)
// ═══════════════════════════════════════════════════════════════════

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
