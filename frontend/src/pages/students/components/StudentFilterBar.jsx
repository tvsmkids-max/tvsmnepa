import React, { useState, useMemo } from "react";
import {
  Paper,
  Stack,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Button,
  Box,
  Chip,
  Collapse,
  Divider,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import TuneIcon from "@mui/icons-material/Tune";
import CloseIcon from "@mui/icons-material/Close";
import useAuth from "../../../hooks/useAuth";

const STATUS_OPTIONS = ["Active", "Inactive", "TC", "Transferred"];
const GENDER_OPTIONS = ["Male", "Female", "Other"];
const CATEGORY_OPTIONS = ["General", "OBC", "SC", "ST", "EWS"];
const BLOOD_GROUP_OPTIONS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const StudentFilterBar = ({
  filters,
  onChange,
  onReset,
  classes = [],
  sections = [],
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ✅ AUTO-HIDE: Class/Section filters when teacher has only 1 class
  const hideClassSection = isTeacher && classes.length === 1;

  const handleChange = (field, value) => {
    onChange({ ...filters, [field]: value, page: 0 });
  };

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.class && !hideClassSection) count++;
    if (filters.section && !hideClassSection) count++;
    if (filters.status && filters.status !== "Active") count++;
    if (filters.gender) count++;
    if (filters.category) count++;
    if (filters.bloodGroup) count++;
    return count;
  }, [filters, hideClassSection]);

  const hasAnyFilter = activeFilterCount > 0;

  return (
    <Paper
      sx={{
        p: { xs: 1.2, sm: 1.5 }, // ✅ Compact padding
        mb: 2,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Stack spacing={1}>
        {" "}
        {/* ✅ Tight spacing */}
        {/* Search Input */}
        <TextField
          placeholder="Search by name, scholar no., or mobile..." // ✅ Improved placeholder
          value={filters.search || ""}
          onChange={(e) => handleChange("search", e.target.value)}
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            endAdornment: filters.search && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => handleChange("search", "")}
                  edge="end"
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              bgcolor: "background.paper",
            },
          }}
        />
        {/* Filter Selection Grid */}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {/* Class Selector */}
          {!hideClassSection && (
            <FormControl
              size="small"
              sx={{
                flex: { xs: "1 1 calc(50% - 4px)", sm: 1 },
                minWidth: 0,
              }}
            >
              <InputLabel>Class</InputLabel>
              <Select
                value={filters.class || ""}
                label="Class"
                onChange={(e) => handleChange("class", e.target.value)}
              >
                <MenuItem value="">
                  <em>All Classes</em>
                </MenuItem>
                {classes.map((c) => (
                  <MenuItem key={c._id} value={c._id}>
                    {c.name} - {c.section}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Section Selector */}
          {!hideClassSection && (
            <FormControl
              size="small"
              sx={{
                flex: { xs: "1 1 calc(50% - 4px)", sm: 1 },
                minWidth: 0,
              }}
            >
              <InputLabel>Section</InputLabel>
              <Select
                value={filters.section || ""}
                label="Section"
                onChange={(e) => handleChange("section", e.target.value)}
              >
                <MenuItem value="">
                  <em>All Sections</em>
                </MenuItem>
                {sections.map((s) => (
                  <MenuItem key={s} value={s}>
                    Section {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Status Selector */}
          <FormControl
            size="small"
            sx={{
              flex: { xs: "1 1 calc(50% - 4px)", sm: 1 },
              minWidth: 0,
            }}
          >
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status || "Active"}
              label="Status"
              onChange={(e) => handleChange("status", e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Advanced Filter Button */}
          <Button
            variant={showAdvanced ? "contained" : "outlined"}
            size="small"
            startIcon={<TuneIcon />}
            onClick={() => setShowAdvanced((p) => !p)}
            sx={{
              flex: { xs: "1 1 calc(50% - 4px)", sm: "0 0 auto" },
              fontWeight: 700,
              textTransform: "none",
              minWidth: { sm: 130 },
            }}
          >
            More{" "}
            {activeFilterCount > (hideClassSection ? 1 : 3) &&
              `(${activeFilterCount - (hideClassSection ? 1 : 3)})`}
          </Button>
        </Stack>
        {/* Advanced Section Dropdown */}
        <Collapse in={showAdvanced}>
          <Box>
            <Divider sx={{ my: 1 }} />
            <Typography
              variant="caption"
              fontWeight={800}
              color="text.secondary"
              sx={{
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontSize: "0.68rem",
                display: "block",
                mb: 1,
              }}
            >
              Advanced Filters
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <FormControl
                size="small"
                sx={{
                  flex: { xs: "1 1 calc(50% - 4px)", sm: 1 },
                  minWidth: 0,
                }}
              >
                <InputLabel>Gender</InputLabel>
                <Select
                  value={filters.gender || ""}
                  label="Gender"
                  onChange={(e) => handleChange("gender", e.target.value)}
                >
                  <MenuItem value="">
                    <em>All</em>
                  </MenuItem>
                  {GENDER_OPTIONS.map((g) => (
                    <MenuItem key={g} value={g}>
                      {g}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl
                size="small"
                sx={{
                  flex: { xs: "1 1 calc(50% - 4px)", sm: 1 },
                  minWidth: 0,
                }}
              >
                <InputLabel>Category</InputLabel>
                <Select
                  value={filters.category || ""}
                  label="Category"
                  onChange={(e) => handleChange("category", e.target.value)}
                >
                  <MenuItem value="">
                    <em>All</em>
                  </MenuItem>
                  {CATEGORY_OPTIONS.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl
                size="small"
                sx={{
                  flex: { xs: "1 1 calc(50% - 4px)", sm: 1 },
                  minWidth: 0,
                }}
              >
                <InputLabel>Blood Group</InputLabel>
                <Select
                  value={filters.bloodGroup || ""}
                  label="Blood Group"
                  onChange={(e) => handleChange("bloodGroup", e.target.value)}
                >
                  <MenuItem value="">
                    <em>All</em>
                  </MenuItem>
                  {BLOOD_GROUP_OPTIONS.map((b) => (
                    <MenuItem key={b} value={b}>
                      {b}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Box>
        </Collapse>
        {/* Filter Chips Toolbar */}
        {hasAnyFilter && (
          <>
            <Divider sx={{ mt: 0.5 }} />
            <Stack
              direction="row"
              spacing={0.6}
              flexWrap="wrap"
              useFlexGap
              alignItems="center"
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 700, fontSize: "0.7rem" }}
              >
                Active:
              </Typography>

              {filters.search && (
                <Chip
                  label={`Search: ${filters.search}`}
                  size="small"
                  onDelete={() => handleChange("search", "")}
                  sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600 }}
                />
              )}
              {filters.class && !hideClassSection && (
                <Chip
                  label={`Class: ${classes.find((c) => c._id === filters.class)?.name || ""}-${classes.find((c) => c._id === filters.class)?.section || ""}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  onDelete={() => handleChange("class", "")}
                  sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600 }}
                />
              )}
              {filters.section && !hideClassSection && (
                <Chip
                  label={`Section ${filters.section}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  onDelete={() => handleChange("section", "")}
                  sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600 }}
                />
              )}
              {filters.status && filters.status !== "Active" && (
                <Chip
                  label={`Status: ${filters.status}`}
                  size="small"
                  color="warning"
                  variant="outlined"
                  onDelete={() => handleChange("status", "Active")}
                  sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600 }}
                />
              )}
              {filters.gender && (
                <Chip
                  label={filters.gender}
                  size="small"
                  variant="outlined"
                  onDelete={() => handleChange("gender", "")}
                  sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600 }}
                />
              )}
              {filters.category && (
                <Chip
                  label={filters.category}
                  size="small"
                  variant="outlined"
                  onDelete={() => handleChange("category", "")}
                  sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600 }}
                />
              )}
              {filters.bloodGroup && (
                <Chip
                  label={`Blood: ${filters.bloodGroup}`}
                  size="small"
                  variant="outlined"
                  onDelete={() => handleChange("bloodGroup", "")}
                  sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600 }}
                />
              )}

              <Box sx={{ flex: 1 }} />

              <Tooltip title="Reset all filters">
                <Button
                  size="small"
                  startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
                  onClick={onReset}
                  color="error"
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    textTransform: "none",
                    minWidth: "auto",
                    px: 1,
                  }}
                >
                  Reset
                </Button>
              </Tooltip>
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  );
};

export default StudentFilterBar;
