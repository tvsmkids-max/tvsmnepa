import React from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Typography,
  Avatar,
} from "@mui/material";
import ClassOutlinedIcon from "@mui/icons-material/ClassOutlined";

const ClassSelector = ({
  label = "Class",
  value,
  onChange,
  classes = [],
  excludeId = null,
  helperText,
  color = "primary",
}) => {
  // Filter out the excluded class
  const availableClasses = excludeId
    ? classes.filter((c) => c._id !== excludeId)
    : classes;

  return (
    <FormControl fullWidth size="small">
      <InputLabel>{label}</InputLabel>
      <Select
        value={value || ""}
        label={label}
        onChange={(e) => onChange(e.target.value)}
      >
        <MenuItem value="">
          <em>— Select —</em>
        </MenuItem>
        {availableClasses.map((c) => (
          <MenuItem key={c._id} value={c._id}>
            <Stack
              direction="row"
              spacing={1.2}
              alignItems="center"
              sx={{ width: "100%" }}
            >
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  bgcolor: `${color}.light`,
                  fontSize: "0.75rem",
                }}
              >
                <ClassOutlinedIcon
                  sx={{ fontSize: 16, color: `${color}.dark` }}
                />
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  sx={{ fontSize: "0.88rem" }}
                >
                  {c.name} - {c.section}
                </Typography>
              </Box>
              {c.studentCount !== undefined && (
                <Chip
                  label={`${c.studentCount} students`}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                  }}
                />
              )}
            </Stack>
          </MenuItem>
        ))}
      </Select>
      {helperText && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 0.5, ml: 1.5, fontSize: "0.72rem" }}
        >
          {helperText}
        </Typography>
      )}
    </FormControl>
  );
};

export default ClassSelector;
