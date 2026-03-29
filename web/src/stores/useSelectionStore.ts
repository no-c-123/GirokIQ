import { create } from "zustand";

interface SelectionState {
  selectedIds: string[];
  isInteracting: boolean;
  setSelectedIds: (ids: string[]) => void;
  setIsInteracting: (isInteracting: boolean) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedIds: [],
  isInteracting: false,
  setSelectedIds: (ids) => set({ selectedIds: ids }),
  setIsInteracting: (isInteracting) => set({ isInteracting }),
  clearSelection: () => set({ selectedIds: [], isInteracting: false }),
}));
