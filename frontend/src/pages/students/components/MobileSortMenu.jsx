import React, { useState } from "react";
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Chip,
  useTheme,
  alpha,
} from "@mui/material";
import SortIcon from "@mui/icons-material/Sort";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import CheckIcon from "@mui/icons-material/Check";
import useThemeMode from "../../../hooks/useThemeMode";

// ═══════════════════════════════════════════════════════════════════
//  Sort Options
// ═══════════════════════════════════════════════════════════════════

const SORT_OPTIONS = [
  { field: "name", label: "Name", numeric: false },
  { field: "rollNumber", label: "Roll Number", numeric: true },
  { field: "scholarNumber", label: "Scholar #", numeric: false },
  { field: "fatherName", label: "Father Name", numeric: false },
  { field: "motherName", label: "Mother Name", numeric: false },
  { field: "dob", label: "Date of Birth", numeric: true },
  { field: "class", label: "Class", numeric: false },
  { field: "status", label: "Status", numeric: false },
];

// Human-readable sort direction labels
const getDirectionLabel = (option, order) => {
  if (option.numeric) {
    return order === "asc" ? "Low → High" : "High → Low";
  }
  return order === "asc" ? "A → Z" : "Z → A";
};

const MobileSortMenu = ({ sortBy, sortOrder, onSort, totalCount }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const { isDark } = useThemeMode();

  const currentOption =
    SORT_OPTIONS.find((o) => o.field === sortBy) || SORT_OPTIONS[0];

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleSelect = (field) => {
    onSort(field);
    handleClose();
  };

  const handleToggleDirection = () => {
    // Re-trigger current field to flip direction
    onSort(sortBy);
    handleClose();
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1.5,
          px: 0.5,
        }}
      >
        {/* Student count */}
        <Typography
          variant="caption"
          sx={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "text.secondary",
          }}
        >
          {totalCount} student{totalCount !== 1 ? "s" : ""}
        </Typography>

        {/* Sort button */}
        <Button
          variant="outlined"
          size="small"
          onClick={handleOpen}
          startIcon={<SortIcon sx={{ fontSize: 16 }} />}
          endIcon={
            sortOrder === "asc" ? (
              <ArrowUpwardIcon sx={{ fontSize: 14 }} />
            ) : (
              <ArrowDownwardIcon sx={{ fontSize: 14 }} />
            )
          }
          sx={{
            fontWeight: 700,
            fontSize: "0.72rem",
            textTransform: "none",
            py: 0.5,
            px: 1.25,
            borderRadius: 2,
            borderColor: "divider",
            color: "text.primary",
            bgcolor: "background.paper",
            "&:hover": {
              borderColor: "primary.main",
              bgcolor: isDark ? alpha("#3B82F6", 0.08) : alpha("#1E4D98", 0.04),
            },
          }}
        >
          Sort: {currentOption.label}
        </Button>
      </Box>

      {/* Sort Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{
          elevation: 0,
          sx: {
            mt: 0.5,
            minWidth: 240,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 2,
            py: 1.25,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: isDark ? alpha("#fff", 0.02) : "#FAFBFC",
          }}
        >
          <Typography
            variant="caption"
            fontWeight={800}
            sx={{
              fontSize: "0.68rem",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "text.secondary",
            }}
          >
            Sort By
          </Typography>
        </Box>

        {/* Toggle direction (if already sorted by this field) */}
        <MenuItem
          onClick={handleToggleDirection}
          sx={{
            py: 1,
            fontSize: "0.85rem",
            bgcolor: isDark ? alpha("#3B82F6", 0.08) : alpha("#1E4D98", 0.04),
          }}
        >
          <ListItemIcon>
            {sortOrder === "asc" ? (
              <ArrowUpwardIcon fontSize="small" color="primary" />
            ) : (
              <ArrowDownwardIcon fontSize="small" color="primary" />
            )}
          </ListItemIcon>
          <ListItemText
            primary={`${currentOption.label} · ${getDirectionLabel(currentOption, sortOrder)}`}
            secondary="Click to reverse direction"
            primaryTypographyProps={{
              fontWeight: 700,
              fontSize: "0.82rem",
              color: "primary.main",
            }}
            secondaryTypographyProps={{
              fontSize: "0.7rem",
            }}
          />
        </MenuItem>

        <Divider />

        {/* Sort options */}
        {SORT_OPTIONS.map((option) => {
          const isActive = sortBy === option.field;
          return (
            <MenuItem
              key={option.field}
              onClick={() => handleSelect(option.field)}
              sx={{
                py: 0.9,
                fontSize: "0.85rem",
                ...(isActive && {
                  bgcolor: isDark
                    ? alpha("#16A34A", 0.08)
                    : alpha("#16A34A", 0.04),
                }),
              }}
            >
              <ListItemIcon>
                {isActive ? (
                  <CheckIcon fontSize="small" color="success" />
                ) : (
                  <Box sx={{ width: 20 }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={option.label}
                secondary={
                  isActive
                    ? getDirectionLabel(option, sortOrder)
                    : `Default: ${getDirectionLabel(option, "asc")}`
                }
                primaryTypographyProps={{
                  fontWeight: isActive ? 700 : 600,
                  fontSize: "0.82rem",
                  color: isActive ? "success.main" : "text.primary",
                }}
                secondaryTypographyProps={{
                  fontSize: "0.68rem",
                  color: "text.disabled",
                }}
              />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

export default MobileSortMenu;
