import React from "react";
import { Box, Typography, Button } from "@mui/material";
import InboxIcon from "@mui/icons-material/Inbox";

const EmptyState = ({
  icon = <InboxIcon sx={{ fontSize: 64 }} />,
  title = "No data found",
  message = "Nothing to display yet.",
  actionLabel,
  onAction,
}) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      py: 8,
      px: 3,
      textAlign: "center",
    }}
  >
    <Box sx={{ color: "text.disabled", mb: 2 }}>{icon}</Box>
    <Typography variant="h6" fontWeight={600} gutterBottom>
      {title}
    </Typography>
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ mb: 3, maxWidth: 400 }}
    >
      {message}
    </Typography>
    {actionLabel && onAction && (
      <Button variant="contained" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </Box>
);

export default EmptyState;
