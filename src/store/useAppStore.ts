import { create } from "zustand";
import { db } from "../db";
import { seedIfEmpty } from "../data/seed";
import type { Folder } from "../data/types";
import type { Notebook } from "../data/types";
import type { Page } from "../pages/types";

interface AppState {
  folders: Folder[];
  notebooks: Notebook[];
  pages: Page[];

  activePageId: string | null;
  sidebarVisible: boolean;
  settings: {
    theme: "dark" | "light" | "system";
    autosaveInterval: number;
    defaultPenColor: string;
    defaultPenWidth: number;
  };

  hydrate: () => Promise<void>;
  updateSettings: (settings: Partial<AppState["settings"]>) => void;
  setActivePage: (id: string | null) => void;
  setSidebarVisible: (visible: boolean) => void;
  addPage: (page: Page) => Promise<void>;
  deletePage: (id: string) => Promise<void>;
  renamePage: (id: string, title: string) => Promise<void>;

  addFolder: (folder: Folder) => Promise<void>;
  addNotebook: (notebook: Notebook) => Promise<void>;
  
  // Actions to populate data
  setFolders: (folders: Folder[]) => void;
  setNotebooks: (notebooks: Notebook[]) => void;
  setPages: (pages: Page[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  folders: [],
  notebooks: [],
  pages: [],

  activePageId: null,
  sidebarVisible: true,
  settings: {
    theme: "dark",
    autosaveInterval: 30,
    defaultPenColor: "#a78bfa",
    defaultPenWidth: 2,
  },

  hydrate: async () => {
    await seedIfEmpty();

    const [folders, notebooks, pages, persistedActive, persistedSidebar, persistedSettings] = await Promise.all([
      db.folders.toArray(),
      db.notebooks.toArray(),
      db.pages.toArray(),
      db.appState.get("activePageId"),
      db.appState.get("sidebarVisible"),
      db.appState.get("settings"),
    ]);

    const fallbackActivePageId = pages[0]?.id ?? null;
    const hydratedActivePageId =
      persistedActive?.value &&
      pages.some((p) => p.id === persistedActive.value)
        ? persistedActive.value
        : fallbackActivePageId;

    const hydratedSidebarVisible = persistedSidebar ? !!persistedSidebar.value : true;
    const hydratedSettings = persistedSettings?.value || {
      theme: "dark",
      autosaveInterval: 30,
      defaultPenColor: "#a78bfa",
      defaultPenWidth: 2,
    };

    set({
      folders,
      notebooks,
      pages,
      activePageId: hydratedActivePageId,
      sidebarVisible: hydratedSidebarVisible,
      settings: hydratedSettings,
    });
  },

  updateSettings: (newSettings) =>
    set((state) => {
      const settings = { ...state.settings, ...newSettings };
      void db.appState.put({
        key: "settings",
        value: settings,
        updatedAt: Date.now(),
      });
      return { settings };
    }),

  setActivePage: (id) => 
    set(() => {
      void db.appState.put({
        key: "activePageId",
        value: id,
        updatedAt: Date.now(),
      });
      return { activePageId: id };
    }),

  setSidebarVisible: (visible) =>
    set(() => {
      void db.appState.put({
        key: "sidebarVisible",
        value: visible,
        updatedAt: Date.now(),
      });
      return { sidebarVisible: visible };
    }),

  addPage: async (page) => {
    await db.pages.put(page);
    await db.appState.put({
      key: "activePageId",
      value: page.id,
      updatedAt: Date.now(),
    });

    set((state) => ({
      pages: [...state.pages, page],
      activePageId: page.id,
    }));
  },

  deletePage: async (id) => {
    await db.pages.delete(id);
    await db.strokes.where("pageId").equals(id).delete();
    await db.blocks.where("pageId").equals(id).delete();

    set((state) => {
      const newPages = state.pages.filter((p) => p.id !== id);
      // If the active page is deleted, select another one or deselect
      const newActiveId = state.activePageId === id 
        ? (newPages.length > 0 ? newPages[0].id : null) 
        : state.activePageId;
      
      void db.appState.put({
        key: "activePageId",
        value: newActiveId,
        updatedAt: Date.now(),
      });

      return {
        pages: newPages,
        activePageId: newActiveId,
      };
    });
  },

  renamePage: async (id, title) => {
    const existing = await db.pages.get(id);
    if (!existing) return;

    const updated: Page = { ...existing, title, updatedAt: Date.now() };
    await db.pages.put(updated);

    set((state) => ({
      pages: state.pages.map((p) => (p.id === id ? updated : p)),
    }));
  },

  addFolder: async (folder) => {
    await db.folders.put(folder);
    set((state) => ({ folders: [...state.folders, folder] }));
  },

  addNotebook: async (notebook) => {
    await db.notebooks.put(notebook);
    set((state) => ({ notebooks: [...state.notebooks, notebook] }));
  },

  setFolders: (folders) => set({ folders }),
  setNotebooks: (notebooks) => set({ notebooks }),
  setPages: (pages) => set({ pages }),
}));
