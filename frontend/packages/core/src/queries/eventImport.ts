import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { ConfirmEventImportRequest } from "@chaos-coordinator/shared";

export function useExtractEventImport() {
  return useMutation({
    mutationFn: (params: Parameters<typeof api.extractEventImport>[0]) => api.extractEventImport(params),
  });
}

export function useConfirmEventImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: ConfirmEventImportRequest) => api.confirmEventImport(req),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });
}
