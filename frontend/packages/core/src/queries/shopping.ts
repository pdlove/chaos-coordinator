import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type {
  CreateItemRequest,
  CreateStoreRequest,
  PayItemRequest,
  UpdateItemRequest,
  UpdateStoreSettingsRequest,
} from "@chaos-coordinator/shared";

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

/** Re-sorts (and corrects departments for) a store's list into a likely store-walking order via
 * AI. The mutation's own return value is already the freshly sorted list; invalidating just keeps
 * every other view of the same store's items (if any) in sync. */
export function useOrganizeShoppingItems() {
  const invalidate = useInvalidateItems();
  return useMutation({
    mutationFn: (storeId: string) => api.organizeShoppingItems(storeId),
    onSuccess: invalidate,
  });
}

/** "Hide checked items" toggle — when on, a checked item drops out of the list once it's been
 * checked for a few seconds (see StoresController.HideCheckedItemsDelay server-side); this just
 * flips the store-level setting, not any individual item's visibility. */
export function useUpdateStoreSettings() {
  const queryClient = useQueryClient();
  const invalidateItems = useInvalidateItems();
  return useMutation({
    mutationFn: ({ storeId, req }: { storeId: string; req: UpdateStoreSettingsRequest }) => api.updateStoreSettings(storeId, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      invalidateItems();
    },
  });
}

/** "Delete checked items" — soft-deletes every currently-checked item in one shot, the same way
 * a single swipe-delete does (see ShoppingListItem.DeletedAt server-side), just for all of them. */
export function useDeleteCheckedShoppingItems() {
  const invalidate = useInvalidateItems();
  return useMutation({
    mutationFn: (storeId: string) => api.deleteCheckedShoppingItems(storeId),
    onSuccess: invalidate,
  });
}

/** Shares UploadsController's generic chore-photo endpoint (see api.uploadChorePhoto) — it just
 * writes a file and hands back a URL, with nothing chore-specific about it. The caller attaches
 * the returned URL to an item via useUpdateShoppingItem the same way chores attach it on
 * completion. */
export function useUploadShoppingItemPhoto() {
  return useMutation({ mutationFn: ({ file, fileName }: { file: Blob; fileName: string }) => api.uploadChorePhoto(file, fileName) });
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
