import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import teacherApi from "../api/teacherApi";

export const teacherKeys = {
  all: ["teachers"],
  lists: () => [...teacherKeys.all, "list"],
  list: (filters) => [...teacherKeys.lists(), filters],
  details: () => [...teacherKeys.all, "detail"],
  detail: (id) => [...teacherKeys.details(), id],
  myProfile: () => [...teacherKeys.all, "me"],
};

export const useTeacherList = (params = {}, options = {}) => {
  return useQuery({
    queryKey: teacherKeys.list(params),
    queryFn: async () => {
      const res = await teacherApi.list(params);
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

export const useTeacher = (id, options = {}) => {
  return useQuery({
    queryKey: teacherKeys.detail(id),
    queryFn: async () => {
      const res = await teacherApi.getById(id);
      return res.data?.data;
    },
    enabled: !!id,
    ...options,
  });
};

export const useCreateTeacher = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (data) => teacherApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() });
      enqueueSnackbar("Teacher created", { variant: "success" });
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || "Failed to create", {
        variant: "error",
      });
    },
  });
};

export const useUpdateTeacher = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ id, data }) => teacherApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() });
      enqueueSnackbar("Teacher updated", { variant: "success" });
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || "Failed", {
        variant: "error",
      });
    },
  });
};

export const useDeleteTeacher = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (id) => teacherApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() });
      enqueueSnackbar("Teacher deleted", { variant: "success" });
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || "Failed", {
        variant: "error",
      });
    },
  });
};

export const useAssignClasses = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ id, classIds }) => teacherApi.assignClasses(id, classIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() });
      enqueueSnackbar("Classes assigned", { variant: "success" });
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || "Failed", {
        variant: "error",
      });
    },
  });
};

export const useResetTeacherPassword = () => {
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ id, newPassword }) =>
      teacherApi.resetPassword(id, newPassword),
    onSuccess: () => {
      enqueueSnackbar("Password reset successfully", { variant: "success" });
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || "Failed", {
        variant: "error",
      });
    },
  });
};
