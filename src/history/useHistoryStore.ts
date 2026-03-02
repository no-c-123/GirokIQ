import { create } from "zustand";
import type { Action } from "./types";
import { applyRedo, applyUndo } from "./apply";

interface HistoryState {
  past: Action[];
  future: Action[];

  push: (action: Action) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],

  push: (action) =>
    set((state) => ({
      past: [...state.past, action],
      future: [],
    })),

  undo: async () => {
    const { past, future } = get();
    const action = past[past.length - 1];
    if (!action) return;

    await applyUndo(action);

    set({
      past: past.slice(0, -1),
      future: [action, ...future],
    });
  },

  redo: async () => {
    const { past, future } = get();
    const action = future[0];
    if (!action) return;

    await applyRedo(action);

    set({
      past: [...past, action],
      future: future.slice(1),
    });
  },

  clear: () => set({ past: [], future: [] }),
}));

