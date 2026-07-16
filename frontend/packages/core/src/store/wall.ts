import { create } from "zustand";

interface WallState {
  /** True once the idle timer has fired and the wall display has dropped to the ambient clock screen. */
  idle: boolean;
  setIdle: (idle: boolean) => void;
}

export const useWallStore = create<WallState>((set) => ({
  idle: false,
  setIdle: (idle) => set({ idle }),
}));
