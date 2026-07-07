import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { CreateRecipeRequest, CreateSubstitutionRequest, UpdateRecipeRequest, UpsertMenuEntryRequest } from "@chaos-coordinator/shared";

export function useMenu(from: string, to: string) {
  return useQuery({ queryKey: ["menu", from, to], queryFn: () => api.getMenu(from, to) });
}

function useInvalidateMenu() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["menu"] });
}

export function useUpsertMenuEntry() {
  const invalidate = useInvalidateMenu();
  return useMutation({ mutationFn: (req: UpsertMenuEntryRequest) => api.upsertMenuEntry(req), onSuccess: invalidate });
}

export function useAddSubstitution() {
  const invalidate = useInvalidateMenu();
  return useMutation({
    mutationFn: ({ menuEntryId, req }: { menuEntryId: string; req: CreateSubstitutionRequest }) => api.addSubstitution(menuEntryId, req),
    onSuccess: invalidate,
  });
}

export function useDeleteSubstitution() {
  const invalidate = useInvalidateMenu();
  return useMutation({ mutationFn: (id: string) => api.deleteSubstitution(id), onSuccess: invalidate });
}

export function useRecipes() {
  return useQuery({ queryKey: ["recipes"], queryFn: api.getRecipes });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateRecipeRequest) => api.createRecipe(req),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recipes"] }),
  });
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: UpdateRecipeRequest }) => api.updateRecipe(id, req),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recipes"] }),
  });
}
