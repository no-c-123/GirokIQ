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
        ...strokes.map(s => {
            // Convert binary points to number array if needed
            let points: number[] = [];
            if (s.points instanceof Uint8Array) {
                // Assuming simple encoding or fallback for now
                // For now, let's assume it's number[] in dexie for simplicity unless we implemented binary packing
                // If it is Uint8Array, we need a way to decode it. 
                // Given the error, points can be number[] | Uint8Array.
                // CanvasElement requires number[].
                points = Array.from(s.points); 
            } else {
                points = s.points;
            }

            // Calculate bounding box for x, y, width, height
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (let i = 0; i < points.length; i += 2) {
                minX = Math.min(minX, points[i]);
                minY = Math.min(minY, points[i+1]);
                maxX = Math.max(maxX, points[i]);
                maxY = Math.max(maxY, points[i+1]);
            }
            
            if (minX === Infinity) {
                minX = 0; minY = 0; maxX = 0; maxY = 0;
            }

            return {
                ...s,
                type: 'stroke',
                points,
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY,
                rotation: 0
            } as CanvasElement;
        })
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
