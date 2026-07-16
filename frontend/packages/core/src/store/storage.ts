import type { StateStorage } from "zustand/middleware";

/**
 * The one DOM-specific seam in `core`. A future React Native app swaps this single export for an
 * AsyncStorage-backed StateStorage — nothing else in `core/store` needs to change.
 */
export const webStorage: StateStorage = {
  getItem: (name) => localStorage.getItem(name),
  setItem: (name, value) => localStorage.setItem(name, value),
  removeItem: (name) => localStorage.removeItem(name),
};
