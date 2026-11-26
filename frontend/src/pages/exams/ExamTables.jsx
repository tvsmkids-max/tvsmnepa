import { Box, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { gridTableSx } from "../../components/common/tableStyles";

const niceDate = (d) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC" });
const dayName = (d) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" });

/** Date | Day | Subject for one class. entries: [{date, subjectName}] */
export const TimetableTable = ({ entries, sx }) => (
  <Box sx={sx}>
    <Table size="small" sx={{ ...gridTableSx, tableLayout: "fixed", width: "100%", "& td, & th": { px: 1, py: 0.75, fontSize: { xs: "0.8rem", sm: "0.875rem" } } }}>
      <TableHead>
        <TableRow>
          <TableCell sx={{ width: "34%" }}>Date</TableCell>
          <TableCell sx={{ width: "22%" }}>Day</TableCell>
          <TableCell>Subject</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {entries.map((t) => (
          <TableRow key={t._id || `${t.date}|${t.subjectName}`}>
            <TableCell>{niceDate(t.date)}</TableCell>
            <TableCell>{dayName(t.date)}</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>{t.subjectName}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </Box>
);

const dash = "—";

/** Subject | Written | Internal | Oral | Total (| Passing when showPassing). Grade-only subjects show "Grade". */
export const SubjectMarksTable = ({ subjects, sx, showPassing = true }) => {
  const hasInternal = subjects.some((s) => (s.internalMax || 0) > 0);
  const hasOral = subjects.some((s) => (s.oralMax || 0) > 0);
  return (
    <Box sx={{ overflowX: "auto", ...sx }}>
      <Table size="small" sx={{ ...gridTableSx, "& td, & th": { px: 1, py: 0.75, fontSize: { xs: "0.8rem", sm: "0.875rem" } } }}>
        <TableHead>
          <TableRow>
            <TableCell>Subject</TableCell>
            <TableCell align="right">Written</TableCell>
            {hasInternal && <TableCell align="right">Internal</TableCell>}
            {hasOral && <TableCell align="right">Oral</TableCell>}
            <TableCell align="right">Total</TableCell>
            {showPassing && <TableCell align="right">Passing</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {subjects.map((s) => {
            const written = s.maxMarks - (s.internalMax || 0) - (s.oralMax || 0);
            return (
              <TableRow key={s._id || s.nameKey || s.name}>
                <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                {s.gradeOnly ? (
                  <TableCell align="center" colSpan={1 + (hasInternal ? 1 : 0) + (hasOral ? 1 : 0) + 1} sx={{ color: "text.secondary" }}>
                    Grade only
                  </TableCell>
                ) : (
                  <>
                    <TableCell align="right">{written}</TableCell>
                    {hasInternal && <TableCell align="right">{s.internalMax > 0 ? s.internalMax : dash}</TableCell>}
                    {hasOral && <TableCell align="right">{s.oralMax > 0 ? s.oralMax : dash}</TableCell>}
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{s.maxMarks}</TableCell>
                  </>
                )}
                {showPassing && <TableCell align="right">{s.gradeOnly ? dash : s.passingMarks}</TableCell>}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
};
