import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return {
    ...ctx,
    isPrincipal: ctx.user?.role === "principal",
  };
};

export default useAuth;
