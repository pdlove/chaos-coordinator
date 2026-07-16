import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type {
  CompleteChoreRequest,
  CreateChoreGroupRequest,
  CreateChoreRequest,
  UpdateChoreGroupRequest,
  UpdateChoreRequest,
} from "@chaos-coordinator/shared";

export function useChoreGroups(date: string) {
  return useQuery({
    queryKey: ["choreGroups", date],
    queryFn: () => api.getChoreGroups(date),
  });
}

function useInvalidateChores() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["choreGroups"] });
}

export function useCreateChoreGroup() {
  const invalidate = useInvalidateChores();
  return useMutation({ mutationFn: (req: CreateChoreGroupRequest) => api.createChoreGroup(req), onSuccess: invalidate });
}

export function useUpdateChoreGroup() {
  const invalidate = useInvalidateChores();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: UpdateChoreGroupRequest }) => api.updateChoreGroup(id, req),
    onSuccess: invalidate,
  });
}

export function useDeleteChoreGroup() {
  const invalidate = useInvalidateChores();
  return useMutation({ mutationFn: (id: string) => api.deleteChoreGroup(id), onSuccess: invalidate });
}

export function useCreateChore() {
  const invalidate = useInvalidateChores();
  return useMutation({ mutationFn: (req: CreateChoreRequest) => api.createChore(req), onSuccess: invalidate });
}

export function useUpdateChore() {
  const invalidate = useInvalidateChores();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: UpdateChoreRequest }) => api.updateChore(id, req),
    onSuccess: invalidate,
  });
}

export function useDeleteChore() {
  const invalidate = useInvalidateChores();
  return useMutation({ mutationFn: (id: string) => api.deleteChore(id), onSuccess: invalidate });
}

export function useCompleteChore() {
  const invalidate = useInvalidateChores();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: CompleteChoreRequest }) => api.completeChore(id, req),
    onSuccess: invalidate,
  });
}

export function useUncompleteChore() {
  const invalidate = useInvalidateChores();
  return useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) => api.uncompleteChore(id, date),
    onSuccess: invalidate,
  });
}

export function useUploadChorePhoto() {
  return useMutation({ mutationFn: ({ file, fileName }: { file: Blob; fileName: string }) => api.uploadChorePhoto(file, fileName) });
}
