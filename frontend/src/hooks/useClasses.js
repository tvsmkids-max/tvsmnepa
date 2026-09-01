import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import classApi from "../api/classApi";
import useAuth from "./useAuth";

export const classKeys = {
  all: ["classes"],
  lists: () => [...classKeys.all, "list"],
  // ✅ Include userId + role so admin cache ≠ class cache
  list: (userId, role, filters) => [
    ...classKeys.lists(),
    userId || "anon",
    role || "none",
    filters,
  ],
  details: () => [...classKeys.all, "detail"],
  detail: (id) => [...classKeys.details(), id],
};

/**
 * Admin Classes page list only.
 * Class users must not open /classes (RoleRoute); this hook also refuses to fetch for them.
 */
export const useClassList = (params = {}, options = {}) => {
  const { user, isLoading: authLoading } = useAuth();
  const { enabled: optionEnabled = true, ...restOptions } = options;

  const isAdmin = user?.role === "admin";

  return useQuery({
    queryKey: classKeys.list(user?._id, user?.role, params),
    queryFn: async () => {
      const res = await classApi.list(params);
      return {
        data: res.data?.data || [],
        pagination: res.data?.pagination,
      };
    },
    enabled:
      optionEnabled && !authLoading && !!user && isAdmin && !!params.session, // same as your ClassListPage: wait for session
    keepPreviousData: true,
    staleTime: 60 * 1000,
    ...restOptions,
  });
};

/**
 * Lightweight class dropdown (Mark Attendance, filters, Shift, etc.).
 * Backend scopes class role to linkedClass; key still includes user so no bleed.
 * If your app already uses useClasses from useStudents.js, keep using that OR
 * switch imports to this — do not define two different hooks with same name in two files.
 */
export const useClasses = (params = {}, options = {}) => {
  const { user, isLoading: authLoading } = useAuth();
  const { enabled: optionEnabled = true, ...restOptions } = options;

  return useQuery({
    queryKey: classKeys.list(user?._id, user?.role, {
      limit: 500,
      isArchived: false,
      ...params,
      _use: "options",
    }),
    queryFn: async () => {
      const res = await classApi.list({
        limit: 500,
        isArchived: false,
        ...params,
      });
      return res.data?.data || [];
    },
    enabled: optionEnabled && !authLoading && !!user,
    staleTime: 60 * 1000,
    ...restOptions,
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
