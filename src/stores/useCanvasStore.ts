
import { create } from "zustand";
import type { CanvasElement } from "../elements/types";
import { db } from "../db";

interface CanvasState {
  elements: CanvasElement[];
  currentElement: CanvasElement | null;
  
  // Actions
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  removeElement: (id: string) => void;
  setElements: (elements: CanvasElement[]) => void;
  setCurrentElement: (element: CanvasElement | null) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  elements: [],
  currentElement: null,

  addElement: (element) => {
    if (element.type === 'stroke') {
      void db.strokes.put(element as any);
    }
    set((state) => ({ elements: [...state.elements, element] }));
  },

  updateElement: (id, updates) => {
    set((state) => ({
      elements: state.elements.map((el) => {
        if (el.id === id) {
          const updated = { ...el, ...updates, updatedAt: Date.now() } as CanvasElement;
          if (updated.type === 'stroke') {
            void db.strokes.put(updated as any);
          }
          return updated;
        }
        return el;
      }),
    }));
  },

  removeElement: (id) => {
    void db.strokes.delete(id);
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
    }));
  },

  setElements: (elements) => set({ elements }),

  setCurrentElement: (element) => set({ currentElement: element }),
}));
