import React, { useMemo } from "react";
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
  Box,
  Chip,
  Divider,
  Typography,
  Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import CloseIcon from "@mui/icons-material/Close";

const TeacherFilterBar = ({ filters, onChange, onReset }) => {
  const handleChange = (field, value) => {
    onChange({ ...filters, [field]: value });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status && filters.status !== "all") count++;
    if (filters.gender) count++;
    return count;
  }, [filters]);

  return (
    <Paper
      sx={{
        p: { xs: 1.5, sm: 2 },
        mb: 2,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Stack spacing={1.2}>
        <TextField
          placeholder="Search by name, employee ID, email, mobile..."
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
        />

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <FormControl
            size="small"
            sx={{
              flex: { xs: "1 1 calc(50% - 4px)", sm: 1 },
              minWidth: 0,
            }}
          >
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status || "all"}
              label="Status"
              onChange={(e) => handleChange("status", e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>

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
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Male">Male</MenuItem>
              <MenuItem value="Female">Female</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {activeFilterCount > 0 && (
          <>
            <Divider />
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

              {filters.status && filters.status !== "all" && (
                <Chip
                  label={filters.status === "active" ? "Active" : "Inactive"}
                  size="small"
                  color={filters.status === "active" ? "success" : "warning"}
                  variant="outlined"
                  onDelete={() => handleChange("status", "all")}
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

              <Box sx={{ flex: 1 }} />

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
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  );
};

export default TeacherFilterBar;
