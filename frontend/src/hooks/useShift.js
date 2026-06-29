import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import shiftApi from "../api/shiftApi";
import { studentKeys } from "./useStudents";

/**
 * Preview shift (no actual change)
 */
export const useShiftPreview = () => {
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (data) => shiftApi.preview(data),
    onError: (err) => {
      enqueueSnackbar(
        err.response?.data?.message || "Failed to preview shift",
        { variant: "error" },
      );
    },
  });
};

/**
 * Execute shift (actually moves students)
 */
export const useShiftExecute = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: (data) => shiftApi.execute(data),
    onSuccess: (res) => {
      // Invalidate student queries so list refreshes
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
      queryClient.invalidateQueries({ queryKey: ["classes"] });

      enqueueSnackbar(res.data?.message || "Students shifted successfully", {
        variant: "success",
      });
    },
    onError: (err) => {
      enqueueSnackbar(err.response?.data?.message || "Shift failed", {
        variant: "error",
      });
    },
  });
};
