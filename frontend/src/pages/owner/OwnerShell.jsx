import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { AppBar, Box, Button, Container, Stack, Toolbar, Typography } from "@mui/material";
import { ownerToken } from "../../api/ownerApi";
import usePlatformBrand from "../../hooks/usePlatformBrand";

const TABS = [
  ["Schools", "/owner/schools"],
  ["Brand settings", "/owner/platform"],
  ["Account", "/owner/account"],
];

export default function OwnerShell() {
  const navigate = useNavigate();
  const { brand } = usePlatformBrand();
  if (!ownerToken.get()) return <Navigate to="/owner/login" replace />;
  const logout = () => {
    ownerToken.clear();
    navigate("/owner/login", { replace: true });
  };
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Toolbar sx={{ gap: 2, flexWrap: "wrap" }}>
          {brand.logo && <Box component="img" src={brand.logo} alt="" sx={{ height: 30, objectFit: "contain" }} />}
          <Typography fontWeight={700}>{brand.productName || "Platform"} · Owner</Typography>
          <Stack direction="row" spacing={0.5} sx={{ flexGrow: 1 }}>
            {TABS.map(([label, to]) => (
              <Button
                key={to}
                component={NavLink}
                to={to}
                size="small"
                color="inherit"
                sx={{ "&.active": { fontWeight: 700, bgcolor: "action.selected" } }}
              >
                {label}
              </Button>
            ))}
          </Stack>
          <Button size="small" onClick={logout}>
            Sign out
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
