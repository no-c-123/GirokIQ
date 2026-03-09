import { create } from "zustand";
import type { CanvasElement, StrokeElement } from "@/elements/types";
import { db } from "@/db";
import { spatialIndex } from "@/spatial/SpatialIndex";

// Persistence debounce configuration
const DEBOUNCE_MS = 1000;
let persistenceTimeout: ReturnType<typeof setTimeout> | null = null;
const pendingWrites = new Set<string>();

interface CanvasState {
  elements: CanvasElement[];
  currentElement: CanvasElement | null;
  
  // Actions
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  updateElements: (updates: { id: string; changes: Partial<CanvasElement> }[]) => void;
  reorderElement: (id: string, direction: 'front' | 'back') => void;
  removeElement: (id: string) => void;
  setElements: (elements: CanvasElement[]) => void;
  setCurrentElement: (element: CanvasElement | null) => void;
  loadStrokesForPage: (pageId: string) => Promise<void>;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  elements: [],
  currentElement: null,

  loadStrokesForPage: async (pageId) => {
    const strokes = await db.strokes.where("pageId").equals(pageId).toArray();
    // console.log(`[Load] Loading ${strokes.length} strokes for page ${pageId}`);
    
    // if (strokes.length > 0) {
    //     console.log(`[Load] First stroke points type:`, typeof strokes[0].points);
    //     console.log(`[Load] First stroke points sample:`, strokes[0].points.slice(0, 10));
    //     if (strokes[0].points instanceof Uint8Array) {
    //         console.log(`[Load] First stroke is Uint8Array`);
    //     } else if (Array.isArray(strokes[0].points)) {
    //         console.log(`[Load] First stroke is Array`);
    //     } else {
    //         console.log(`[Load] First stroke is something else:`, Object.prototype.toString.call(strokes[0].points));
    //     }
    // }

    const loadedElements: CanvasElement[] = [
      ...get().elements.filter(e => e.type !== 'stroke' || e.pageId !== pageId),
      ...strokes.map(s => {
          // Convert binary points to number array if needed
          let points: number[] = [];
          if (s.points instanceof Uint8Array) {
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

          // Sanitize stroke width: Clamp huge values or NaN
          let strokeWidth = s.width;
          if (!Number.isFinite(strokeWidth) || strokeWidth <= 0) strokeWidth = 2;
          if (strokeWidth > 100) {
             console.warn(`[Load] Stroke ${s.id} has massive width: ${strokeWidth}. Clamping to 50.`);
             strokeWidth = 50; 
          }

          return {
              ...s,
              type: 'stroke',
              points,
              x: minX,
              y: minY,
              width: maxX - minX,
              height: maxY - minY,
              strokeWidth: strokeWidth, // Use sanitized width for rendering style
              rotation: 0
          } as CanvasElement;
      })
    ];

    // Initialize spatial index with loaded strokes
    spatialIndex.initialize(loadedElements.filter(e => e.type === 'stroke') as StrokeElement[]);

    set({ elements: loadedElements });
  },

  addElement: (element) => {
    if (element.type === 'stroke') {
      void db.strokes.put(element as any);
      spatialIndex.insert(element as StrokeElement);
    }
    set((state) => ({ elements: [...state.elements, element] }));
  },

  updateElement: (id, updates) => {
    set((state) => {
      const newElements = state.elements.map((el) => {
        if (el.id === id) {
          const updated = { ...el, ...updates, updatedAt: Date.now() } as CanvasElement;
          
          if (updated.type === 'stroke') {
            spatialIndex.update(updated as StrokeElement);
            pendingWrites.add(id);
          }
          return updated;
        }
        return el;
      });

      // Schedule persistence
      if (pendingWrites.size > 0) {
        if (persistenceTimeout) clearTimeout(persistenceTimeout);
        persistenceTimeout = setTimeout(async () => {
            const currentElements = get().elements;
            const idsToSave = Array.from(pendingWrites);
            pendingWrites.clear();
            
            const strokesToSave = idsToSave
                .map(id => currentElements.find(e => e.id === id))
                .filter(e => e && e.type === 'stroke');

            if (strokesToSave.length > 0) {
                await db.strokes.bulkPut(strokesToSave as any[]);
            }
        }, DEBOUNCE_MS);
      }

      return { elements: newElements };
    });
  },

  updateElements: (updates) => {
    set((state) => {
      const newElements = [...state.elements];
      const updateMap = new Map(updates.map(u => [u.id, u.changes]));
      
      let hasStrokes = false;

      for (let i = 0; i < newElements.length; i++) {
        const el = newElements[i];
        const changes = updateMap.get(el.id);
        if (changes) {
            const updated = { ...el, ...changes, updatedAt: Date.now() } as CanvasElement;
            newElements[i] = updated;
            
            if (updated.type === 'stroke') {
                spatialIndex.update(updated as StrokeElement);
                pendingWrites.add(updated.id);
                hasStrokes = true;
            }
        }
      }

      if (hasStrokes && pendingWrites.size > 0) {
        if (persistenceTimeout) clearTimeout(persistenceTimeout);
        persistenceTimeout = setTimeout(async () => {
            const currentElements = get().elements;
            const idsToSave = Array.from(pendingWrites);
            pendingWrites.clear();
            
            const strokesToSave = idsToSave
                .map(id => currentElements.find(e => e.id === id))
                .filter(e => e && e.type === 'stroke');

            if (strokesToSave.length > 0) {
                await db.strokes.bulkPut(strokesToSave as any[]);
            }
        }, DEBOUNCE_MS);
      }

      return { elements: newElements };
    });
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
    spatialIndex.remove(id);
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
    }));
  },

  setElements: (elements) => set({ elements }),

  setCurrentElement: (element) => set({ currentElement: element }),
}));
