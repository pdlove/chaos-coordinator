import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { webStorage } from "./storage";

interface SessionState {
  /** "Who is using this browser" — a UI convenience for defaults (event ownership, chore
   * assignment), cached locally and reconciled against GET /api/auth/session on load. Not a
   * security boundary; see PIN elevation below for that. */
  currentUserId: string | null;
  /** Mirrors the server-side PIN elevation flag for optimistic UI (enabling/disabling gated
   * actions without a round trip); the server is always the source of truth. */
  pinElevated: boolean;
  setCurrentUserId: (id: string | null) => void;
  setPinElevated: (elevated: boolean) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      currentUserId: null,
      pinElevated: false,
      setCurrentUserId: (id) => set({ currentUserId: id }),
      setPinElevated: (elevated) => set({ pinElevated: elevated }),
    }),
    {
      name: "cc-session",
      storage: createJSONStorage(() => webStorage),
      partialize: (state) => ({ currentUserId: state.currentUserId }), // pinElevated is never persisted, only ever trusted fresh from the server
    }
  )
);
