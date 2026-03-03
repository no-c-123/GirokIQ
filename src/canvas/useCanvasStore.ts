import { create } from "zustand";
import { persist } from "zustand/middleware";
import { db } from "../db";

export interface Stroke {
  id: string;
  pageId: string;
  points: number[];
  color: string;
  width: number;
  pressures?: number[];
  shapeType?: string;
  originalPoints?: number[];
}

export const ERASE_RADIUS = 10;

interface CanvasState {
  strokes: Stroke[];
  currentStroke: Stroke | null;
  tool: "pen" | "eraser" | "text" | "lasso";
  strokeWidth: number;
  shapeRecognitionEnabled: boolean;
  selectedIds: string[];
  selectionFilter: {
    images: boolean;
    text: boolean;
    strokes: boolean;
  };
  color: string;
  presets: string[];
  recentColors: string[];

  setTool: (tool: "pen" | "eraser" | "text" | "lasso") => void;
  setStrokeWidth: (width: number) => void;
  setShapeRecognitionEnabled: (enabled: boolean) => void;
  setSelectedIds: (ids: string[]) => void;
  setSelectionFilter: (filter: Partial<{ images: boolean; text: boolean; strokes: boolean }>) => void;
  setColor: (color: string) => void;
  startStroke: (stroke: Stroke) => void;
  addPoint: (point: [number, number, number]) => void;
  endStroke: (finalPoints?: number[]) => void;
  addStroke: (stroke: Stroke) => Promise<void>;
  removeStroke: (id: string) => Promise<void>;
  updateStrokes: (updates: { id: string; points: number[] }[]) => Promise<void>;
  loadStrokesForPage: (pageId: string, strokes: Stroke[]) => void;
  hydrateStrokesForPage: (pageId: string) => Promise<void>;
  eraseAtPoint: (pageId: string, point: { x: number; y: number }) => Stroke | null;
}

const DEFAULT_PRESETS = [
  "#e5e7eb",
  "#a78bfa",
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#f97316",
  "#22d3ee",
  "#f472b6",
];

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      strokes: [],
      currentStroke: null,
      tool: "pen",
      strokeWidth: 2,
      shapeRecognitionEnabled: true,
      selectedIds: [],
      color: "#a78bfa",
      presets: DEFAULT_PRESETS,
      recentColors: [],
      selectionFilter: { images: true, text: true, strokes: true },

      setTool: (tool) => set({ tool, selectedIds: [] }),
      setStrokeWidth: (width) => set({ strokeWidth: width }),
      setShapeRecognitionEnabled: (enabled) => set({ shapeRecognitionEnabled: enabled }),
      setSelectedIds: (ids) => set({ selectedIds: ids }),
      setSelectionFilter: (filter) => set((state) => ({ selectionFilter: { ...state.selectionFilter, ...filter } })),

      setColor: (color) =>
        set((state) => {
          const normalized = color.startsWith("#") ? color : `#${color}`;
          const nextRecents = [
            normalized,
            ...state.recentColors.filter((c) => c !== normalized),
          ].slice(0, 8);
          return { color: normalized, recentColors: nextRecents };
        }),

      startStroke: (stroke) => set({ currentStroke: stroke }),

      addPoint: (point) =>
        set((state) => ({
          currentStroke: state.currentStroke
            ? {
                ...state.currentStroke,
                points: [...state.currentStroke.points, point[0], point[1]],
                pressures: [
                  ...(state.currentStroke.pressures ?? []),
                  point[2] ?? 0.5,
                ],
              }
            : null,
        })),

      endStroke: (finalPoints) =>
        set((state) => {
          if (!state.currentStroke) return state;
          const stroke = { 
            ...state.currentStroke, 
            points: finalPoints || state.currentStroke.points,
            pressures: finalPoints ? new Array(finalPoints.length / 2).fill(0.5) : state.currentStroke.pressures
          };
          void db.strokes.put(stroke);
          return {
            strokes: [...state.strokes, stroke],
            currentStroke: null,
          };
        }),

      addStroke: async (stroke) => {
        await db.strokes.put(stroke);
        set((state) => ({
          strokes: state.strokes.some((s) => s.id === stroke.id)
            ? state.strokes.map((s) => (s.id === stroke.id ? stroke : s))
            : [...state.strokes, stroke],
        }));
      },

      removeStroke: async (id) => {
        await db.strokes.delete(id);
        set((state) => ({
          strokes: state.strokes.filter((s) => s.id !== id),
        }));
      },

      updateStrokes: async (updates) => {
        const strokeMap = new Map(updates.map(u => [u.id, u.points]));
        set((state) => ({
          strokes: state.strokes.map((s) => 
            strokeMap.has(s.id) ? { ...s, points: strokeMap.get(s.id)! } : s
          ),
        }));

        await db.transaction("rw", db.strokes, async () => {
          for (const update of updates) {
            const existing = await db.strokes.get(update.id);
            if (existing) {
              await db.strokes.put({ ...existing, points: update.points });
            }
          }
        });
      },

      loadStrokesForPage: (pageId: string, strokes: Stroke[]) =>
        set((state) => ({
          strokes: [
            ...state.strokes.filter((stroke) => stroke.pageId !== pageId),
            ...strokes,
          ],
        })),

      hydrateStrokesForPage: async (pageId) => {
        const strokes = await db.strokes.where("pageId").equals(pageId).toArray();
        set((state) => ({
          strokes: [
            ...state.strokes.filter((stroke) => stroke.pageId !== pageId),
            ...strokes,
          ],
        }));
      },

      eraseAtPoint: (pageId, point) => {
        const state = get();
        const eraseRadiusSquared = ERASE_RADIUS * ERASE_RADIUS;

        const strokeToErase = state.strokes.find((stroke) => {
          if (stroke.pageId !== pageId) return false;
          for (let index = 0; index < stroke.points.length; index += 2) {
            const dx = stroke.points[index] - point.x;
            const dy = stroke.points[index + 1] - point.y;
            if (dx * dx + dy * dy <= eraseRadiusSquared) return true;
          }
          return false;
        });

        if (!strokeToErase) return null;

        void db.strokes.delete(strokeToErase.id);
        set((prev) => ({
          ...prev,
          strokes: prev.strokes.filter((stroke) => stroke.id !== strokeToErase.id),
          currentStroke:
            prev.currentStroke?.id === strokeToErase.id ? null : prev.currentStroke,
        }));
        return strokeToErase;
      },
    }),
    {
      name: "syllabus-canvas-preferences",
      partialize: (state) => ({
        tool: state.tool,
        strokeWidth: state.strokeWidth,
        shapeRecognitionEnabled: state.shapeRecognitionEnabled,
        color: state.color,
        presets: state.presets,
        recentColors: state.recentColors,
      }),
    },
  ),
);
