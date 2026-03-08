
import { create } from "zustand";
import type { Page } from "@/pages/types";

interface PageState {
  activePageId: string | null;
  pages: Page[];
  
  setActivePageId: (id: string | null) => void;
  setPages: (pages: Page[]) => void;
  addPage: (page: Page) => void;
  updatePage: (id: string, updates: Partial<Page>) => void;
  removePage: (id: string) => void;
}

export const usePageStore = create<PageState>((set) => ({
  activePageId: null,
  pages: [],
  
  setActivePageId: (id) => set({ activePageId: id }),
  setPages: (pages) => set({ pages }),
  addPage: (page) => set((state) => ({ pages: [...state.pages, page] })),
  updatePage: (id, updates) => set((state) => ({
    pages: state.pages.map((p) => (p.id === id ? { ...p, ...updates } : p)),
  })),
  removePage: (id) => set((state) => ({
    pages: state.pages.filter((p) => p.id !== id),
  })),
}));
