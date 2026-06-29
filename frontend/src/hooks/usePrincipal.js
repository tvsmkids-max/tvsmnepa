import { useQuery } from "@tanstack/react-query";
import principalApi from "../api/principalApi";

export const principalKeys = {
  all: ["principal"],
  dashboard: () => [...principalKeys.all, "dashboard"],
};

export const usePrincipalDashboard = (options = {}) => {
  return useQuery({
    queryKey: principalKeys.dashboard(),
    queryFn: async () => {
      const res = await principalApi.getDashboard();
      return res.data?.data || null;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    ...options,
  });
};
