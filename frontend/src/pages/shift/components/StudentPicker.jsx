import React, { useState, useMemo } from "react";
import {
  Box,
  Paper,
  TextField,
  InputAdornment,
  Stack,
  Avatar,
  Typography,
  Checkbox,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import useThemeMode from "../../../hooks/useThemeMode";

const StudentPicker = ({
  students = [],
  selectedIds = new Set(),
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  loading = false,
  sourceLabel = "",
}) => {
  const { isDark } = useThemeMode();
  const [search, setSearch] = useState("");

  // Filter students by search
  const filteredStudents = useMemo(() => {
    if (!search) return students;
    const s = search.toLowerCase();
    return students.filter(
      (st) =>
        st.name?.toLowerCase().includes(s) ||
        st.scholarNumber?.toLowerCase().includes(s) ||
        st.rollNumber?.toString().includes(s) ||
        st.fatherName?.toLowerCase().includes(s),
    );
  }, [students, search]);

  const allFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedIds.has(s._id));

  const handleToggleAll = () => {
    if (allFilteredSelected) {
      onClearSelection();
    } else {
      onSelectAll(filteredStudents.map((s) => s._id));
    }
  };

  return (
    <Paper
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 1.5,
          bgcolor: isDark ? "rgba(255,255,255,0.03)" : "#F8F9FC",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={1}
          sx={{ mb: 1.5 }}
          flexWrap="wrap"
        >
          <Box>
            <Typography variant="body2" fontWeight={800}>
              {sourceLabel ? `Students in ${sourceLabel}` : "Students"}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: "0.72rem" }}
            >
              {selectedIds.size} of {students.length} selected
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={
                allFilteredSelected ? (
                  <CheckBoxIcon />
                ) : (
                  <CheckBoxOutlineBlankIcon />
                )
              }
              onClick={handleToggleAll}
              disabled={filteredStudents.length === 0}
              sx={{
                fontWeight: 700,
                fontSize: "0.72rem",
                textTransform: "none",
              }}
            >
              {allFilteredSelected ? "Unselect All" : "Select All"}
            </Button>
            {selectedIds.size > 0 && (
              <Button
                size="small"
                color="error"
                onClick={onClearSelection}
                sx={{
                  fontWeight: 700,
                  fontSize: "0.72rem",
                  textTransform: "none",
                }}
              >
                Clear
              </Button>
            )}
          </Stack>
        </Stack>

        {/* Search */}
        <TextField
          placeholder="Search by name, scholar #, roll..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: search && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearch("")}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Body */}
      {loading ? (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <CircularProgress size={28} />
        </Box>
      ) : students.length === 0 ? (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            No students in this class
          </Typography>
        </Box>
      ) : filteredStudents.length === 0 ? (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            No students match "{search}"
          </Typography>
        </Box>
      ) : (
        <Box sx={{ maxHeight: 500, overflowY: "auto" }}>
          {filteredStudents.map((student, idx) => {
            const isSelected = selectedIds.has(student._id);
            const isLast = idx === filteredStudents.length - 1;

            return (
              <Box
                key={student._id}
                onClick={() => onToggleSelect(student._id)}
                sx={{
                  p: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  cursor: "pointer",
                  borderBottom: isLast ? "none" : "1px solid",
                  borderColor: "divider",
                  bgcolor: isSelected
                    ? isDark
                      ? "rgba(59,130,246,0.12)"
                      : "primary.50"
                    : "transparent",
                  transition: "background-color 0.15s",
                  "&:hover": {
                    bgcolor: isSelected
                      ? isDark
                        ? "rgba(59,130,246,0.18)"
                        : "primary.100"
                      : "action.hover",
                  },
                }}
              >
                <Checkbox
                  checked={isSelected}
                  size="small"
                  sx={{ p: 0.5 }}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => onToggleSelect(student._id)}
                />

                <Chip
                  label={student.rollNumber}
                  size="small"
                  sx={{
                    minWidth: 40,
                    bgcolor: isDark ? "rgba(59,130,246,0.2)" : "#E0EBFF",
                    color: isDark ? "#93C5FD" : "#1E4D98",
                    fontWeight: 700,
                    fontSize: "0.72rem",
                  }}
                />

                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor:
                      student.gender === "Female" ? "#EC4899" : "#1E4D98",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {student.name?.[0]?.toUpperCase()}
                </Avatar>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{ fontSize: "0.88rem" }}
                    noWrap
                  >
                    {student.name}
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    flexWrap="wrap"
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontSize: "0.7rem",
                        fontFamily: "monospace",
                      }}
                    >
                      {student.scholarNumber}
                    </Typography>
                    {student.fatherName && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: "0.7rem" }}
                        noWrap
                      >
                        • F: {student.fatherName}
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Paper>
  );
};

export default StudentPicker;
