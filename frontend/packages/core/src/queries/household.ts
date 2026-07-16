import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

export function useHousehold() {
  return useQuery({
    queryKey: ["household"],
    queryFn: api.getHousehold,
  });
}

export function useUpdateBottomBarTabs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tabs: string[]) => api.updateBottomBarTabs({ tabs }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["household"] }),
  });
}
