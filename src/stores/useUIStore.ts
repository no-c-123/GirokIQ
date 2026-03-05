
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ToolType = "pen" | "eraser" | "text" | "lasso" | "image" | "shape";

interface UIState {
  tool: ToolType;
  strokeWidth: number;
  color: string;
  presets: string[];
  recentColors: string[];
  sidebarVisible: boolean;
  selectedIds: string[];
  shapeRecognitionEnabled: boolean;
  selectionFilter: {
    images: boolean;
    text: boolean;
    strokes: boolean;
  };
  
  setTool: (tool: ToolType) => void;
  setStrokeWidth: (width: number) => void;
  setColor: (color: string) => void;
  setSidebarVisible: (visible: boolean) => void;
  addRecentColor: (color: string) => void;
  setSelectedIds: (ids: string[]) => void;
  setShapeRecognitionEnabled: (enabled: boolean) => void;
  setSelectionFilter: (filter: Partial<{ images: boolean; text: boolean; strokes: boolean }>) => void;
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
  "#000000"
];

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      tool: "pen",
      strokeWidth: 2,
      color: "#a78bfa",
      presets: DEFAULT_PRESETS,
      recentColors: [],
      sidebarVisible: true,
      selectedIds: [],
      shapeRecognitionEnabled: true,
      selectionFilter: { images: true, text: true, strokes: true },

      setTool: (tool) => set({ tool }),
      setStrokeWidth: (width) => set({ strokeWidth: width }),
      setColor: (color) => set({ color }),
      setSidebarVisible: (visible) => set({ sidebarVisible: visible }),
      setSelectedIds: (ids) => set({ selectedIds: ids }),
      setShapeRecognitionEnabled: (enabled) => set({ shapeRecognitionEnabled: enabled }),
      setSelectionFilter: (filter) => set((state) => ({ selectionFilter: { ...state.selectionFilter, ...filter } })),
      addRecentColor: (color) =>
        set((state) => {
            const normalized = color.startsWith("#") ? color : `#${color}`;
            const nextRecents = [
              normalized,
              ...state.recentColors.filter((c) => c !== normalized),
            ].slice(0, 8);
            return { recentColors: nextRecents };
        }),
    }),
    {
      name: "syllabus-ui-preferences",
      partialize: (state) => ({
        tool: state.tool,
        strokeWidth: state.strokeWidth,
        color: state.color,
        presets: state.presets,
        recentColors: state.recentColors,
        sidebarVisible: state.sidebarVisible,
        shapeRecognitionEnabled: state.shapeRecognitionEnabled,
        // selectionFilter // maybe not persist selection filter? or yes.
      }),
    }
  )
);
