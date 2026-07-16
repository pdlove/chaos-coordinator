import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { CreateItemRequest, CreateStoreRequest, PayItemRequest, UpdateItemRequest } from "@chaos-coordinator/shared";

export function useStores() {
  return useQuery({ queryKey: ["stores"], queryFn: api.getStores });
}

export function useCreateStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateStoreRequest) => api.createStore(req),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stores"] }),
  });
}

export function useShoppingItems(storeId: string | undefined) {
  return useQuery({
    queryKey: ["shoppingItems", storeId],
    queryFn: () => api.getShoppingItems(storeId!),
    enabled: !!storeId,
  });
}

function useInvalidateItems() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["shoppingItems"] });
}

export function useCreateShoppingItem() {
  const invalidate = useInvalidateItems();
  return useMutation({
    mutationFn: ({ storeId, req }: { storeId: string; req: CreateItemRequest }) => api.createShoppingItem(storeId, req),
    onSuccess: invalidate,
  });
}

export function useUpdateShoppingItem() {
  const invalidate = useInvalidateItems();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: UpdateItemRequest }) => api.updateShoppingItem(id, req),
    onSuccess: invalidate,
  });
}

export function usePayShoppingItem() {
  const invalidate = useInvalidateItems();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: PayItemRequest }) => api.payShoppingItem(id, req),
    onSuccess: invalidate,
  });
}

export function useDeleteShoppingItem() {
  const invalidate = useInvalidateItems();
  return useMutation({ mutationFn: (id: string) => api.deleteShoppingItem(id), onSuccess: invalidate });
}

export function useItemPriceHistory(id: string | undefined) {
  return useQuery({
    queryKey: ["itemPriceHistory", id],
    queryFn: () => api.getItemPriceHistory(id!),
    enabled: !!id,
  });
}

export function useSearchItems(query: string) {
  return useQuery({
    queryKey: ["itemSearch", query],
    queryFn: () => api.searchItems(query),
    enabled: query.trim().length > 0,
  });
}
