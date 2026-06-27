import React from "react";
import { Box, Typography, Button, Breadcrumbs, Link } from "@mui/material";
import { useNavigate } from "react-router-dom";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import AddIcon from "@mui/icons-material/Add";

const PageHeader = ({
  title,
  subtitle,
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
          alignItems: { xs: "flex-start", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            {title}
          </Typography>
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
                sx={{
                  background:
                    "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
                }}
              >
                {actionLabel}
              </Button>
            )}
      </Box>
    </Box>
  );
};

export default PageHeader;
