import React from "react";
import { Box, Typography, Button, Breadcrumbs, Link, Chip, Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import AddIcon from "@mui/icons-material/Add";

const PageHeader = ({
  title,
  subtitle,
  count,
  breadcrumbs = [],
  action,
  actionLabel = "Add New",
  actionIcon = <AddIcon />,
  onAction,
}) => {
  const navigate = useNavigate();
  return (
    <Box sx={{ mb: 3 }}>
      {breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          sx={{ mb: 1 }}
        >
          {breadcrumbs.map((c, i) =>
            c.path ? (
              <Link
                key={i}
                underline="hover"
                color="inherit"
                onClick={() => navigate(c.path)}
                sx={{ cursor: "pointer", fontSize: "0.85rem" }}
              >
                {c.label}
              </Link>
            ) : (
              <Typography
                key={i}
                color="text.primary"
                sx={{ fontSize: "0.85rem", fontWeight: 600 }}
              >
                {c.label}
              </Typography>
            ),
          )}
        </Breadcrumbs>
      )}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="h4" fontWeight={700}>
              {title}
            </Typography>
            {count !== undefined && count !== null && (
              <Chip label={`${count} total`} size="small" variant="outlined" />
            )}
          </Stack>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action
          ? action
          : onAction && (
              <Button
                variant="contained"
                startIcon={actionIcon}
                onClick={onAction}
              >
                {actionLabel}
              </Button>
            )}
      </Box>
    </Box>
  );
};

export default PageHeader;
