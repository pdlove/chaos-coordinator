import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { CreateHouseholdTaskRequest } from "@chaos-coordinator/shared";

export function useHouseholdTasks() {
  return useQuery({ queryKey: ["tasks"], queryFn: api.getHouseholdTasks });
}

function useInvalidateTasks() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["tasks"] });
}

export function useCreateHouseholdTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({ mutationFn: (req: CreateHouseholdTaskRequest) => api.createHouseholdTask(req), onSuccess: invalidate });
}

export function useClaimHouseholdTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({ mutationFn: (id: string) => api.claimHouseholdTask(id), onSuccess: invalidate });
}

export function useUnclaimHouseholdTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({ mutationFn: (id: string) => api.unclaimHouseholdTask(id), onSuccess: invalidate });
}

export function useCompleteHouseholdTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({ mutationFn: (id: string) => api.completeHouseholdTask(id), onSuccess: invalidate });
}

export function useDeleteHouseholdTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({ mutationFn: (id: string) => api.deleteHouseholdTask(id), onSuccess: invalidate });
}
