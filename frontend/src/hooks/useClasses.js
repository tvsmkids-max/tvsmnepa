import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import classApi from "../api/classApi";

export const classKeys = {
  all: ["classes"],
  lists: () => [...classKeys.all, "list"],
  list: (filters) => [...classKeys.lists(), filters],
  details: () => [...classKeys.all, "detail"],
  detail: (id) => [...classKeys.details(), id],
};

export const useClassList = (params = {}, options = {}) => {
  return useQuery({
    queryKey: classKeys.list(params),
    queryFn: async () => {
      const res = await classApi.list(params);
      return {
        data: res.data?.data || [],
        pagination: res.data?.pagination,
      };
    },
    keepPreviousData: true,
    staleTime: 60 * 1000,
    ...options,
  });
};

export const useCreateClass = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (data) => classApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
      enqueueSnackbar("Class created", { variant: "success" });
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || "Failed to create", {
        variant: "error",
      });
    },
  });
};

export const useUpdateClass = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ id, data }) => classApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
      enqueueSnackbar("Class updated", { variant: "success" });
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || "Failed to update", {
        variant: "error",
      });
    },
  });
};

export const useDeleteClass = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (id) => classApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
      enqueueSnackbar("Class deleted", { variant: "success" });
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || "Failed", {
        variant: "error",
      });
    },
  });
};

export const useArchiveClass = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ id, isArchived }) => classApi.archive(id, isArchived),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
      enqueueSnackbar(
        variables.isArchived ? "Class archived" : "Class unarchived",
        { variant: "success" },
      );
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || "Failed", {
        variant: "error",
      });
    },
  });
};
