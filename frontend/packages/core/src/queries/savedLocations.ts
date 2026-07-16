import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { CreateSavedLocationRequest, UpdateSavedLocationRequest } from "@chaos-coordinator/shared";

export function useSavedLocations() {
  return useQuery({
    queryKey: ["savedLocations"],
    queryFn: () => api.getSavedLocations(),
  });
}

function useInvalidateSavedLocations() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["savedLocations"] });
}

export function useCreateSavedLocation() {
  const invalidate = useInvalidateSavedLocations();
  return useMutation({ mutationFn: (req: CreateSavedLocationRequest) => api.createSavedLocation(req), onSuccess: invalidate });
}

export function useUpdateSavedLocation() {
  const invalidate = useInvalidateSavedLocations();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: UpdateSavedLocationRequest }) => api.updateSavedLocation(id, req),
    onSuccess: invalidate,
  });
}

export function useDeleteSavedLocation() {
  const invalidate = useInvalidateSavedLocations();
  return useMutation({ mutationFn: (id: string) => api.deleteSavedLocation(id), onSuccess: invalidate });
}
