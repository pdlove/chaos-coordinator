import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { CreateEventRequest, EventCategory, UpdateEventRequest } from "@chaos-coordinator/shared";

export function useEvents(from: Date, to: Date, category?: EventCategory) {
  return useQuery({
    queryKey: ["events", from.toISOString(), to.toISOString(), category ?? null],
    queryFn: () => api.getEvents(from, to, category),
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateEventRequest) => api.createEvent(req),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: UpdateEventRequest }) => api.updateEvent(id, req),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteEvent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });
}
