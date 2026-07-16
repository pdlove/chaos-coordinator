import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { CreateCalendarCategoryRequest, UpdateCalendarCategoryRequest } from "@chaos-coordinator/shared";

export function useCalendarCategories() {
  return useQuery({
    queryKey: ["calendarCategories"],
    queryFn: () => api.getCalendarCategories(),
  });
}

function useInvalidateCalendarCategories() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["calendarCategories"] });
}

export function useCreateCalendarCategory() {
  const invalidate = useInvalidateCalendarCategories();
  return useMutation({ mutationFn: (req: CreateCalendarCategoryRequest) => api.createCalendarCategory(req), onSuccess: invalidate });
}

export function useUpdateCalendarCategory() {
  const invalidate = useInvalidateCalendarCategories();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: UpdateCalendarCategoryRequest }) => api.updateCalendarCategory(id, req),
    onSuccess: invalidate,
  });
}

export function useDeleteCalendarCategory() {
  const invalidate = useInvalidateCalendarCategories();
  return useMutation({ mutationFn: (id: string) => api.deleteCalendarCategory(id), onSuccess: invalidate });
}
