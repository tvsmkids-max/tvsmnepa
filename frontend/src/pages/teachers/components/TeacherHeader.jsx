import React from "react";
import {
  Box,
  Stack,
  Typography,
  Button,
  Tooltip,
  Breadcrumbs,
  Link,
  Chip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import AddIcon from "@mui/icons-material/Add";

const TeacherHeader = ({ total, onAdd }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box sx={{ mb: 2.5 }}>
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        sx={{ mb: 1 }}
      >
        <Link
          underline="hover"
          color="inherit"
          onClick={() => navigate("/dashboard")}
          sx={{ cursor: "pointer", fontSize: "0.82rem" }}
        >
          Dashboard
        </Link>
        <Typography
          color="text.primary"
          sx={{ fontSize: "0.82rem", fontWeight: 700 }}
        >
          Teachers
        </Typography>
      </Breadcrumbs>

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        sx={{ flexWrap: "wrap", gap: 1.5 }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography
              variant="h4"
              fontWeight={900}
              sx={{
                fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2rem" },
                lineHeight: 1.1,
                color: "text.primary",
              }}
            >
              Teachers
            </Typography>
            {total !== undefined && (
              <Chip
                label={`${total} total`}
                size="small"
                sx={{
                  bgcolor: "primary.50",
                  color: "primary.dark",
                  fontWeight: 800,
                  fontSize: "0.72rem",
                  height: 24,
                  px: 0.5,
                }}
              />
            )}
          </Stack>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.3,
              fontSize: { xs: "0.78rem", sm: "0.85rem" },
              display: { xs: "none", sm: "block" },
            }}
          >
            Manage teacher accounts and class assignments
          </Typography>
        </Box>

        <Tooltip title="Add new teacher">
          <Button
            variant="contained"
            size={isMobile ? "small" : "medium"}
            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
            onClick={onAdd}
            sx={{
              background: "linear-gradient(135deg, #0D1B3E 0%, #1E4D98 100%)",
              fontWeight: 700,
              textTransform: "none",
              px: { xs: 1.5, sm: 2.5 },
              boxShadow: "0 4px 12px rgba(13,27,62,0.2)",
              "&:hover": {
                boxShadow: "0 6px 16px rgba(13,27,62,0.3)",
              },
            }}
          >
            {isMobile ? "Add" : "Add Teacher"}
          </Button>
        </Tooltip>
      </Stack>
    </Box>
  );
};

export default TeacherHeader;
