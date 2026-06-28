import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import holidayApi from "../api/holidayApi";

export const holidayKeys = {
  all: ["holidays"],
  lists: () => [...holidayKeys.all, "list"],
  list: (filters) => [...holidayKeys.lists(), filters],
  details: () => [...holidayKeys.all, "detail"],
  detail: (id) => [...holidayKeys.details(), id],
};

export const useHolidayList = (params = {}, options = {}) => {
  return useQuery({
    queryKey: holidayKeys.list(params),
    queryFn: async () => {
      const res = await holidayApi.list(params);
      return res.data?.data || [];
    },
    keepPreviousData: true,
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useCreateHoliday = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (data) => holidayApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.lists() });
      enqueueSnackbar("Holiday created", { variant: "success" });
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || "Failed", {
        variant: "error",
      });
    },
  });
};

export const useUpdateHoliday = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ id, data }) => holidayApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.lists() });
      enqueueSnackbar("Holiday updated", { variant: "success" });
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || "Failed", {
        variant: "error",
      });
    },
  });
};

export const useDeleteHoliday = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (id) => holidayApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.lists() });
      enqueueSnackbar("Holiday deleted", { variant: "success" });
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || "Failed", {
        variant: "error",
      });
    },
  });
};
