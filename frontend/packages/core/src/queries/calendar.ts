import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type {
  CancelEventOccurrenceRequest,
  CreateEventRequest,
  EditEventOccurrenceRequest,
  SplitEventSeriesRequest,
  TruncateEventSeriesRequest,
  UpdateEventRequest,
} from "@chaos-coordinator/shared";

/** category: a CategoryDto id, not a name. */
export function useEvents(from: Date, to: Date, category?: string) {
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

export function useCancelEventOccurrence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: CancelEventOccurrenceRequest }) =>
      api.cancelEventOccurrence(id, req),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });
}

/** "This event only" edit for one occurrence of a recurring event. */
export function useEditEventOccurrence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: EditEventOccurrenceRequest }) =>
      api.editEventOccurrence(id, req),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });
}

/** "This and following" edit — truncates the original series and continues it as a new one. */
export function useSplitEventSeries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: SplitEventSeriesRequest }) =>
      api.splitEventSeries(id, req),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });
}

/** "This and following" delete — truncates the series with no continuation. */
export function useTruncateEventSeries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: TruncateEventSeriesRequest }) =>
      api.truncateEventSeries(id, req),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });
}
