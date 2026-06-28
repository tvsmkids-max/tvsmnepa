import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import studentApi from "../api/studentApi";
import classApi from "../api/classApi";

// ─── Query Keys (centralized) ───
export const studentKeys = {
  all: ["students"],
  lists: () => [...studentKeys.all, "list"],
  list: (filters) => [...studentKeys.lists(), filters],
  details: () => [...studentKeys.all, "detail"],
  detail: (id) => [...studentKeys.details(), id],
  sections: () => [...studentKeys.all, "sections"],
  classes: () => ["classes", "list"],
};

/**
 * Fetch student list with filters (server-side paginated)
 */
export const useStudentList = (params = {}, options = {}) => {
  return useQuery({
    queryKey: studentKeys.list(params),
    queryFn: async () => {
      const res = await studentApi.list(params);
      return {
        data: res.data?.data || [],
        pagination: res.data?.pagination || {
          page: 1,
          total: 0,
          totalPages: 0,
          limit: 24,
        },
      };
    },
    keepPreviousData: true, // Smooth pagination
    staleTime: 30 * 1000, // 30 sec
    ...options,
  });
};

/**
 * Fetch single student
 */
export const useStudent = (id, options = {}) => {
  return useQuery({
    queryKey: studentKeys.detail(id),
    queryFn: async () => {
      const res = await studentApi.getById(id);
      return res.data?.data;
    },
    enabled: !!id,
    staleTime: 60 * 1000,
    ...options,
  });
};

/**
 * Fetch all classes (cached, used in filters)
 */
export const useClasses = (options = {}) => {
  return useQuery({
    queryKey: studentKeys.classes(),
    queryFn: async () => {
      const res = await classApi.list({ limit: 500 });
      return res.data?.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 min (classes rarely change)
    ...options,
  });
};

/**
 * Fetch unique sections (for filter dropdown)
 */
export const useSections = (options = {}) => {
  return useQuery({
    queryKey: studentKeys.sections(),
    queryFn: async () => {
      const res = await studentApi.getSections();
      return res.data?.data || [];
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Create student mutation
 */
export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (data) => studentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: studentKeys.sections() });
      enqueueSnackbar("Student added successfully", { variant: "success" });
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || "Failed to add", {
        variant: "error",
      });
    },
  });
};

/**
 * Update student mutation
 */
export const useUpdateStudent = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ id, data }) => studentApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: studentKeys.detail(variables.id),
      });
      enqueueSnackbar("Student updated", { variant: "success" });
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || "Failed to update", {
        variant: "error",
      });
    },
  });
};

/**
 * Update status mutation
 */
export const useUpdateStudentStatus = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ id, data }) => studentApi.updateStatus(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: studentKeys.detail(variables.id),
      });
      enqueueSnackbar("Status updated", { variant: "success" });
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || "Failed", {
        variant: "error",
      });
    },
  });
};

/**
 * Delete student mutation
 */
export const useDeleteStudent = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (id) => studentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
      enqueueSnackbar("Student deleted", { variant: "success" });
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || "Failed", {
        variant: "error",
      });
    },
  });
};

/**
 * Bulk delete mutation
 */
export const useBulkDeleteStudents = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ ids, mode }) => studentApi.bulkDelete(ids, mode),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
      enqueueSnackbar(res.data?.message || "Bulk action completed", {
        variant: "success",
      });
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || "Bulk delete failed", {
        variant: "error",
      });
    },
  });
};

/**
 * Helper to manually invalidate all student data
 */
export const useInvalidateStudents = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: studentKeys.all });
  };
};
