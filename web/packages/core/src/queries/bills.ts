import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { CreateBillTemplateRequest, UpdateBillTemplateRequest } from "@chaos-coordinator/shared";

export function useBills(month: string) {
  return useQuery({ queryKey: ["bills", month], queryFn: () => api.getBills(month) });
}

export function useMarkBillPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.markBillPaid(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bills"] }),
  });
}

export function useBillTemplates() {
  return useQuery({ queryKey: ["billTemplates"], queryFn: api.getBillTemplates });
}

function useInvalidateBillTemplates() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["billTemplates"] });
    queryClient.invalidateQueries({ queryKey: ["bills"] });
  };
}

export function useCreateBillTemplate() {
  const invalidate = useInvalidateBillTemplates();
  return useMutation({ mutationFn: (req: CreateBillTemplateRequest) => api.createBillTemplate(req), onSuccess: invalidate });
}

export function useUpdateBillTemplate() {
  const invalidate = useInvalidateBillTemplates();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: UpdateBillTemplateRequest }) => api.updateBillTemplate(id, req),
    onSuccess: invalidate,
  });
}

export function useDeleteBillTemplate() {
  const invalidate = useInvalidateBillTemplates();
  return useMutation({ mutationFn: (id: string) => api.deleteBillTemplate(id), onSuccess: invalidate });
}
