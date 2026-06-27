import React from "react";
import { Chip } from "@mui/material";

const cfg = {
  Active: { bg: "#E6F4EA", text: "#1E7E34" },
  Inactive: { bg: "#FFF4E5", text: "#B45309" },
  TC: { bg: "#FEE2E2", text: "#991B1B" },
  Transferred: { bg: "#F3F4F6", text: "#6B7280" },
  Present: { bg: "#E6F4EA", text: "#1E7E34" },
  Absent: { bg: "#FEE2E2", text: "#991B1B" },
};

const StatusChip = ({ status, size = "small" }) => {
  const c = cfg[status] || { bg: "#F3F4F6", text: "#374151" };
  return (
    <Chip
      label={status}
      size={size}
      sx={{
        bgcolor: c.bg,
        color: c.text,
        fontWeight: 700,
        fontSize: "0.72rem",
        border: `1px solid ${c.text}20`,
      }}
    />
  );
};

export default StatusChip;
