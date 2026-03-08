import { create } from "zustand";
import { db } from "@/db";
import { seedIfEmpty } from "@/data/seed";
import type { Folder } from "@/data/types";
import type { Notebook } from "@/data/types";
import type { Page } from "@/pages/types";

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
  toggleStar: (id: string) => Promise<void>;

  addFolder: (folder: Folder) => Promise<void>;
  addNotebook: (notebook: Notebook) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  deleteNotebook: (id: string) => Promise<void>;
  renameFolder: (id: string, name: string) => Promise<void>;
  renameNotebook: (id: string, name: string) => Promise<void>;
  
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

  toggleStar: async (id) => {
    const existing = await db.pages.get(id);
    if (!existing) return;

    const updated: Page = { ...existing, starred: !existing.starred, updatedAt: Date.now() };
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

  deleteFolder: async (id) => {
    // 1. Delete the folder itself
    await db.folders.delete(id);

    // 2. Find all notebooks in this folder
    const notebooksToDelete = await db.notebooks.where("folderId").equals(id).toArray();
    const notebookIds = notebooksToDelete.map((n) => n.id);

    // 3. For each notebook, find all pages
    const pagesToDelete = await db.pages.where("notebookId").anyOf(notebookIds).toArray();
    const pageIds = pagesToDelete.map((p) => p.id);

    // 4. Delete notebooks and pages
    await db.notebooks.bulkDelete(notebookIds);
    await db.pages.bulkDelete(pageIds);

    // 5. Delete strokes and blocks for these pages
    if (pageIds.length > 0) {
      await db.strokes.where("pageId").anyOf(pageIds).delete();
      await db.blocks.where("pageId").anyOf(pageIds).delete();
    }

    set((state) => {
      const newFolders = state.folders.filter((f) => f.id !== id);
      const newNotebooks = state.notebooks.filter((n) => !notebookIds.includes(n.id));
      const newPages = state.pages.filter((p) => !pageIds.includes(p.id));

      // Handle active page deletion
      let newActiveId = state.activePageId;
      if (state.activePageId && pageIds.includes(state.activePageId)) {
        newActiveId = newPages.length > 0 ? newPages[0].id : null;
      }
      
      void db.appState.put({
        key: "activePageId",
        value: newActiveId,
        updatedAt: Date.now(),
      });

      return {
        folders: newFolders,
        notebooks: newNotebooks,
        pages: newPages,
        activePageId: newActiveId,
      };
    });
  },

  deleteNotebook: async (id) => {
    // 1. Delete the notebook itself
    await db.notebooks.delete(id);

    // 2. Find all pages in this notebook
    const pagesToDelete = await db.pages.where("notebookId").equals(id).toArray();
    const pageIds = pagesToDelete.map((p) => p.id);

    // 3. Delete pages
    await db.pages.bulkDelete(pageIds);

    // 4. Delete strokes and blocks for these pages
    if (pageIds.length > 0) {
      await db.strokes.where("pageId").anyOf(pageIds).delete();
      await db.blocks.where("pageId").anyOf(pageIds).delete();
    }

    set((state) => {
      const newNotebooks = state.notebooks.filter((n) => n.id !== id);
      const newPages = state.pages.filter((p) => !pageIds.includes(p.id));

      // Handle active page deletion
      let newActiveId = state.activePageId;
      if (state.activePageId && pageIds.includes(state.activePageId)) {
        newActiveId = newPages.length > 0 ? newPages[0].id : null;
      }

      void db.appState.put({
        key: "activePageId",
        value: newActiveId,
        updatedAt: Date.now(),
      });

      return {
        notebooks: newNotebooks,
        pages: newPages,
        activePageId: newActiveId,
      };
    });
  },

  renameFolder: async (id, name) => {
    const existing = await db.folders.get(id);
    if (!existing) return;

    const updated: Folder = { ...existing, name };
    await db.folders.put(updated);

    set((state) => ({
      folders: state.folders.map((f) => (f.id === id ? updated : f)),
    }));
  },

  renameNotebook: async (id, name) => {
    const existing = await db.notebooks.get(id);
    if (!existing) return;

    const updated: Notebook = { ...existing, name };
    await db.notebooks.put(updated);

    set((state) => ({
      notebooks: state.notebooks.map((n) => (n.id === id ? updated : n)),
    }));
  },

  setFolders: (folders) => set({ folders }),
  setNotebooks: (notebooks) => set({ notebooks }),
  setPages: (pages) => set({ pages }),
}));
