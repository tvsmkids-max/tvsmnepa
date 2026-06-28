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

const ClassFilterBar = ({ filters, onChange, onReset, sessions = [] }) => {
  const handleChange = (field, value) => {
    onChange({ ...filters, [field]: value });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.isArchived === "true") count++;
    return count;
  }, [filters]);

  const sessionLabel = useMemo(() => {
    const s = sessions.find((x) => x._id === filters.session);
    return s ? s.name : "";
  }, [sessions, filters.session]);

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
          placeholder="Search class, section, or teacher..."
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
            <InputLabel>Session</InputLabel>
            <Select
              value={filters.session || ""}
              label="Session"
              onChange={(e) => handleChange("session", e.target.value)}
            >
              {sessions.map((s) => (
                <MenuItem key={s._id} value={s._id}>
                  {s.name} {s.isActive && "(Active)"}
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
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.isArchived || "false"}
              label="Status"
              onChange={(e) => handleChange("isArchived", e.target.value)}
            >
              <MenuItem value="false">Active</MenuItem>
              <MenuItem value="true">Archived</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {(activeFilterCount > 0 || filters.session) && (
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
                Filters:
              </Typography>

              {sessionLabel && (
                <Chip
                  label={`Session: ${sessionLabel}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600 }}
                />
              )}

              {filters.search && (
                <Chip
                  label={`Search: ${filters.search}`}
                  size="small"
                  onDelete={() => handleChange("search", "")}
                  sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600 }}
                />
              )}

              {filters.isArchived === "true" && (
                <Chip
                  label="Archived"
                  size="small"
                  color="warning"
                  variant="outlined"
                  onDelete={() => handleChange("isArchived", "false")}
                  sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600 }}
                />
              )}

              <Box sx={{ flex: 1 }} />

              {activeFilterCount > 0 && (
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
              )}
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  );
};

export default ClassFilterBar;
