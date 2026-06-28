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

const TYPE_OPTIONS = ["National", "School", "Vacation"];
const TIME_OPTIONS = [
  { value: "all", label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "today", label: "Today" },
];

const HolidayFilterBar = ({ filters, onChange, onReset }) => {
  const handleChange = (field, value) => {
    onChange({ ...filters, [field]: value });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.type) count++;
    if (filters.timeframe && filters.timeframe !== "all") count++;
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
          placeholder="Search holiday name or description..."
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
            <InputLabel>Type</InputLabel>
            <Select
              value={filters.type || ""}
              label="Type"
              onChange={(e) => handleChange("type", e.target.value)}
            >
              <MenuItem value="">All Types</MenuItem>
              {TYPE_OPTIONS.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
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
            <InputLabel>Timeframe</InputLabel>
            <Select
              value={filters.timeframe || "all"}
              label="Timeframe"
              onChange={(e) => handleChange("timeframe", e.target.value)}
            >
              {TIME_OPTIONS.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
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
              {filters.type && (
                <Chip
                  label={`Type: ${filters.type}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  onDelete={() => handleChange("type", "")}
                  sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600 }}
                />
              )}
              {filters.timeframe && filters.timeframe !== "all" && (
                <Chip
                  label={
                    TIME_OPTIONS.find((t) => t.value === filters.timeframe)
                      ?.label || ""
                  }
                  size="small"
                  color="info"
                  variant="outlined"
                  onDelete={() => handleChange("timeframe", "all")}
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

export default HolidayFilterBar;
