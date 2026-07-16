import { QueryClient } from "@tanstack/react-query";

/** Shared instance so `core` hooks and the realtime invalidation hook operate on the same cache
 * regardless of which app (phone, wall, future RN) constructs the provider. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
