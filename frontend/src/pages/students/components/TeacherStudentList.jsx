import {
  Box, Chip, CircularProgress, IconButton, InputAdornment, LinearProgress, Paper, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import { gridTableSx } from "../../../components/common/tableStyles";

const STATUS_TABS = [
  { label: "Active", value: "Active" },
  { label: "Inactive", value: "Inactive" },
  { label: "All", value: "" },
];

/** Phone layout of the student list for a class teacher: search, status chips, compact table. */
const TeacherStudentList = ({
  students,
  classLabel,
  search,
  status,
  onSearch,
  onStatus,
  loading,
  fetching,
  exporting,
  onExportPdf,
  onOpen,
}) => (
  <Box sx={{ pb: 10 }}>
    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
      <Box>
        <Typography component="h1" sx={{ fontWeight: 700, fontSize: "1.4rem", lineHeight: 1.2 }}>
          Students
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {classLabel ? `${classLabel} · ` : ""}
          {students.length} {students.length === 1 ? "student" : "students"}
        </Typography>
      </Box>
      <Button
        variant="outlined"
        size="small"
        onClick={onExportPdf}
        disabled={exporting || students.length === 0}
        startIcon={exporting ? <CircularProgress size={14} /> : <PictureAsPdfOutlinedIcon />}
        sx={{ textTransform: "none", fontWeight: 700 }}
      >
        PDF
      </Button>
    </Stack>

    <TextField
      fullWidth
      size="small"
      placeholder="Search name, scholar no. or mobile"
      value={search}
      onChange={(e) => onSearch(e.target.value)}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        },
      }}
      sx={{ mb: 1.25, bgcolor: "background.paper" }}
    />
    <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
      {STATUS_TABS.map((t) => (
        <Chip
          key={t.label}
          label={t.label}
          clickable
          color={status === t.value ? "primary" : "default"}
          variant={status === t.value ? "filled" : "outlined"}
          onClick={() => onStatus(t.value)}
        />
      ))}
    </Stack>

    {(loading || fetching) && <LinearProgress sx={{ mb: 1 }} />}
    {!loading && students.length === 0 && (
      <Paper variant="outlined" sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
        No students found.
      </Paper>
    )}
    {students.length > 0 && (
      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Table size="small" sx={{ ...gridTableSx, border: 0, tableLayout: "fixed" }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 38, px: 1 }} align="center">#</TableCell>
              <TableCell>Student</TableCell>
              <TableCell sx={{ width: 66 }} align="center">Sch. No.</TableCell>
              <TableCell sx={{ width: 44, px: 0.5 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((s, i) => {
              const hasPhone = s.mobile && s.mobile !== "0000000000";
              return (
                <TableRow key={s._id} hover onClick={() => onOpen(s)} sx={{ cursor: "pointer" }}>
                  <TableCell align="center" sx={{ px: 1, color: "text.secondary" }}>{i + 1}</TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", lineHeight: 1.25, textTransform: "uppercase" }}>
                      {s.name}
                      {s.status === "Inactive" && (
                        <Chip label="Inactive" size="small" sx={{ ml: 0.75, height: 18, fontSize: "0.65rem" }} />
                      )}
                    </Typography>
                    {s.fatherName && (
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", textTransform: "uppercase" }}>
                        {s.fatherName}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>{s.scholarNumber || "—"}</TableCell>
                  <TableCell sx={{ px: 0.5 }} align="center">
                    {hasPhone && (
                      <IconButton
                        size="small"
                        component="a"
                        href={`tel:${s.mobile}`}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Call ${s.name}`}
                      >
                        <PhoneOutlinedIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>
    )}
  </Box>
);

export default TeacherStudentList;
