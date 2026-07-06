import React, { useState, useEffect, useMemo } from "react";
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
  FormControl,
  Select,
  MenuItem,
  useTheme,
  useMediaQuery,
  alpha,
} from "@mui/material";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import reportApi from "../../api/reportApi";

const MonthlyClassDialog = ({ open, onClose, classData, year, month }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("rollNumber");

  // ─── Fetch student-wise data when dialog opens ───
  useEffect(() => {
    if (!open || !classData?._id) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await reportApi.getMonthlyClassDetail(classData._id, {
          year,
          month,
        });
        if (!cancelled) {
          setDetail(res.data?.data || null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setDetail(null);
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, classData, year, month]);

  // ─── Sorted students ───
  const sortedStudents = useMemo(() => {
    if (!detail?.students) return [];
    const list = [...detail.students];

    list.sort((a, b) => {
      switch (sortBy) {
        case "rollNumber":
          return (
            (parseInt(a.rollNumber, 10) || 0) -
            (parseInt(b.rollNumber, 10) || 0)
          );
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "percentage-asc":
          return (a.percentage || 0) - (b.percentage || 0);
        case "percentage-desc":
          return (b.percentage || 0) - (a.percentage || 0);
        case "absent-desc":
          return (b.absent || 0) - (a.absent || 0);
        default:
          return 0;
      }
    });

    return list;
  }, [detail, sortBy]);

  if (!classData) return null;

  const monthName = detail?.monthName || "";
  const summary = detail?.summary || {};
  const lowCount = summary.lowAttendanceStudents || 0;

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
            Monthly Attendance · {monthName} {year}
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
          {!loading && detail && (
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
              <StatItem
                value={summary.totalStudents || 0}
                label="Students"
                color="white"
              />
              <StatItem
                value={detail.workingDays || 0}
                label="Working Days"
                color="#93C5FD"
              />
              <StatItem
                value={summary.totalPresent || 0}
                label="Present"
                color="#86EFAC"
              />
              <StatItem
                value={summary.totalAbsent || 0}
                label="Absent"
                color="#FCA5A5"
              />
              <StatItem
                value={`${summary.overallPercentage || 0}%`}
                label="Rate"
                color={
                  (summary.overallPercentage || 0) >= 75 ? "#86EFAC" : "#FCD34D"
                }
              />
            </Stack>
          )}
        </Box>
      </DialogTitle>

      {/* ── CONTENT ── */}
      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Loading student data...
            </Typography>
          </Box>
        ) : !detail || sortedStudents.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <PersonOutlineIcon
              sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              No student data available
            </Typography>
          </Box>
        ) : (
          <>
            {/* Sort + Low attendance info */}
            <Box
              sx={{
                px: 2.5,
                py: 1.25,
                borderBottom: "1px solid",
                borderColor: "divider",
                bgcolor: isDark ? alpha("#fff", 0.02) : "#FAFBFC",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{ fontSize: "0.72rem" }}
                >
                  {sortedStudents.length} students
                </Typography>
                {lowCount > 0 && (
                  <Chip
                    icon={<WarningAmberOutlinedIcon sx={{ fontSize: 12 }} />}
                    label={`${lowCount} below 75%`}
                    size="small"
                    color="warning"
                    sx={{ height: 22, fontSize: "0.68rem", fontWeight: 700 }}
                  />
                )}
              </Stack>

              <FormControl size="small" sx={{ minWidth: 140 }}>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  sx={{ height: 30, fontSize: "0.75rem", fontWeight: 700 }}
                >
                  <MenuItem value="rollNumber">Roll Number</MenuItem>
                  <MenuItem value="name">Name (A-Z)</MenuItem>
                  <MenuItem value="percentage-asc">Att % (Low → High)</MenuItem>
                  <MenuItem value="percentage-desc">
                    Att % (High → Low)
                  </MenuItem>
                  <MenuItem value="absent-desc">Most Absent</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Student list */}
            {isMobile ? (
              // ── MOBILE: Compact cards ──
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
                {sortedStudents.map((s) => {
                  const pctColor =
                    s.percentage >= 90
                      ? "#16A34A"
                      : s.percentage >= 75
                        ? "#F59E0B"
                        : "#DC2626";
                  return (
                    <Box
                      key={s._id}
                      sx={{
                        px: 2,
                        py: 1.25,
                        bgcolor: s.isLowAttendance
                          ? isDark
                            ? alpha("#DC2626", 0.05)
                            : "#FEF2F2"
                          : "transparent",
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 0.5 }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography
                            sx={{
                              minWidth: 24,
                              fontWeight: 800,
                              fontSize: "0.78rem",
                              color: isDark ? "#93C5FD" : "#1E4D98",
                              fontFamily: "monospace",
                            }}
                          >
                            {String(s.rollNumber || "").padStart(2, "0")}
                          </Typography>
                          <Box>
                            <Typography
                              variant="body2"
                              fontWeight={700}
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
                              sx={{ fontSize: "0.68rem" }}
                            >
                              F: {s.fatherName || "—"}
                            </Typography>
                          </Box>
                        </Stack>
                        <Typography
                          variant="body2"
                          fontWeight={900}
                          sx={{
                            fontSize: "1rem",
                            color: pctColor,
                            fontFamily: "monospace",
                          }}
                        >
                          {s.percentage}%
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1.5} sx={{ pl: 4 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: "0.7rem",
                            color: "#16A34A",
                            fontWeight: 700,
                          }}
                        >
                          P: {s.present}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: "0.7rem",
                            color: "#DC2626",
                            fontWeight: 700,
                          }}
                        >
                          A: {s.absent}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ fontSize: "0.7rem", color: "text.secondary" }}
                        >
                          of {s.workingDays} days
                        </Typography>
                      </Stack>
                    </Box>
                  );
                })}
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
                        Father
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.68rem",
                          textTransform: "uppercase",
                          py: 1,
                          color: "#16A34A",
                          width: 70,
                        }}
                      >
                        Present
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.68rem",
                          textTransform: "uppercase",
                          py: 1,
                          color: "#DC2626",
                          width: 70,
                        }}
                      >
                        Absent
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.68rem",
                          textTransform: "uppercase",
                          py: 1,
                          width: 80,
                        }}
                      >
                        Att %
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedStudents.map((s) => {
                      const pctColor =
                        s.percentage >= 90
                          ? "#16A34A"
                          : s.percentage >= 75
                            ? "#F59E0B"
                            : "#DC2626";
                      return (
                        <TableRow
                          key={s._id}
                          hover
                          sx={{
                            bgcolor: s.isLowAttendance
                              ? isDark
                                ? alpha("#DC2626", 0.05)
                                : "#FEF2F2"
                              : "transparent",
                          }}
                        >
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
                          <TableCell align="center" sx={{ py: 0.9 }}>
                            <Typography
                              variant="body2"
                              fontWeight={800}
                              sx={{
                                fontSize: "0.82rem",
                                color: "#16A34A",
                                fontFamily: "monospace",
                              }}
                            >
                              {s.present}
                            </Typography>
                          </TableCell>
                          <TableCell align="center" sx={{ py: 0.9 }}>
                            <Typography
                              variant="body2"
                              fontWeight={800}
                              sx={{
                                fontSize: "0.82rem",
                                color: "#DC2626",
                                fontFamily: "monospace",
                              }}
                            >
                              {s.absent}
                            </Typography>
                          </TableCell>
                          <TableCell align="center" sx={{ py: 0.9 }}>
                            <Chip
                              label={`${s.percentage}%`}
                              size="small"
                              sx={{
                                fontWeight: 800,
                                height: 24,
                                fontSize: "0.75rem",
                                bgcolor: alpha(pctColor, isDark ? 0.2 : 0.1),
                                color: pctColor,
                                minWidth: 52,
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ── Stat item for header ──
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

export default MonthlyClassDialog;
