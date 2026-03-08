
import { create } from "zustand";
import type { CanvasElement } from "@/elements/types";
import { db } from "@/db";

interface CanvasState {
  elements: CanvasElement[];
  currentElement: CanvasElement | null;
  
  // Actions
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  reorderElement: (id: string, direction: 'front' | 'back') => void;
  removeElement: (id: string) => void;
  setElements: (elements: CanvasElement[]) => void;
  setCurrentElement: (element: CanvasElement | null) => void;
  loadStrokesForPage: (pageId: string) => Promise<void>;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  elements: [],
  currentElement: null,

  loadStrokesForPage: async (pageId) => {
    const strokes = await db.strokes.where("pageId").equals(pageId).toArray();
    set((state) => ({
      elements: [
        ...state.elements.filter(e => e.type !== 'stroke' || e.pageId !== pageId),
        ...strokes.map(s => ({ ...s, type: 'stroke' } as CanvasElement))
      ]
    }));
  },

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

  reorderElement: (id, direction) => {
    set((state) => {
        const index = state.elements.findIndex(e => e.id === id);
        if (index === -1) return state;
        
        const newElements = [...state.elements];
        const [element] = newElements.splice(index, 1);
        
        if (direction === 'front') {
            newElements.push(element);
        } else {
            newElements.unshift(element);
        }
        
        return { elements: newElements };
    });
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
