import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type {
  ConfirmBillPhotoImportRequest,
  CreateBillTemplateRequest,
  CreateOneOffBillRequest,
  UpdateBillTemplateRequest,
} from "@chaos-coordinator/shared";

export function useBills(month: string) {
  return useQuery({ queryKey: ["bills", month], queryFn: () => api.getBills(month) });
}

export function useCreateBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateOneOffBillRequest) => api.createBill(req),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bills"] }),
  });
}

export function useExtractBillPhoto() {
  return useMutation({ mutationFn: (images: { blob: Blob; fileName: string }[]) => api.extractBillPhoto(images) });
}

export function useConfirmBillPhotoImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: ConfirmBillPhotoImportRequest) => api.confirmBillPhotoImport(req),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bills"] }),
  });
}

export function useMarkBillPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, confirmationNumber }: { id: string; confirmationNumber: string | null }) =>
      api.markBillPaid(id, { confirmationNumber }),
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
