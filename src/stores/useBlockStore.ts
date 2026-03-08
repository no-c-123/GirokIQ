import { create } from "zustand";
import { nanoid } from "nanoid";
import { db } from "@/db";
import type { CanvasElement } from "@/data/models/canvas";
import { useAppStore } from "@/store/useAppStore"; // To get userId if needed, or we can use placeholder

interface BlockState {
  blocks: CanvasElement[];
  selectedBlockId: string | null;
  dragMode: boolean;
  typingBlockId: string | null;

  addTextBlock: (pageId: string, x: number, y: number) => Promise<CanvasElement>;
  addImageBlock: (pageId: string, x: number, y: number, url: string, width: number, height: number) => Promise<CanvasElement>;
  updateBlock: (id: string, content: string) => Promise<void>;
  updateBlockPosition: (id: string, x: number, y: number) => void;
  updateBlocks: (updates: { id: string; x: number; y: number }[]) => Promise<void>;
  updateBlockSize: (id: string, width: number, height: number) => void;
  commitBlockPosition: (id: string) => Promise<void>;
  deleteBlock: (id: string) => Promise<void>;
  addExistingBlock: (block: CanvasElement) => Promise<void>;
  upsertBlock: (block: CanvasElement) => Promise<void>;
  selectBlock: (id: string | null) => void;
  setDragMode: (active: boolean) => void;
  setTypingBlock: (id: string | null) => void;
  loadBlocksForPage: (pageId: string, blocks: CanvasElement[]) => void;
  hydrateBlocksForPage: (pageId: string) => Promise<void>;
}

export const useBlockStore = create<BlockState>((set, get) => ({
  blocks: [],
  selectedBlockId: null,
  dragMode: false,
  typingBlockId: null,

  addTextBlock: async (pageId, x, y) => {
    // We need userId. For now, assume a default or fetch from somewhere.
    // In a real scenario, this should come from auth store.
    const userId = "00000000-0000-0000-0000-000000000000"; 
    
    const block: CanvasElement = {
      id: nanoid(),
      pageId,
      userId,
      type: "text",
      x,
      y,
      data: {
        content: "",
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.canvasElements.put(block);
    set((state) => ({ blocks: [...state.blocks, block] }));
    return block;
  },

  addImageBlock: async (pageId, x, y, url, width, height) => {
    const userId = "00000000-0000-0000-0000-000000000000";
    let blob: Blob | undefined;
    let finalUrl = url;

    // If it's a data URL, convert to Blob for efficient storage
    if (url.startsWith("data:")) {
        try {
            const res = await fetch(url);
            blob = await res.blob();
            // We don't store the huge data URL in 'url' field if we have a blob
            // But we keep it in the object for immediate display
        } catch (e) {
            console.error("Failed to convert data URL to blob", e);
        }
    }

    const block: CanvasElement = {
      id: nanoid(),
      pageId,
      userId,
      type: "image",
      x,
      y,
      width,
      height,
      data: {
        url: finalUrl,
        blob,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.canvasElements.put(block);

    // For local state, we use the blob directly if available (or the URL)
    // The component should handle Blob -> ObjectURL
    set((state) => ({ blocks: [...state.blocks, block] }));
    return block;
  },

  selectBlock: (id) => set({ selectedBlockId: id }),
  setDragMode: (active) => set({ dragMode: active }),
  setTypingBlock: (id) => set({ typingBlockId: id }),

  updateBlock: async (id, content) => {
    set((state) => ({
      blocks: state.blocks.map((b) => (b.id === id ? { ...b, data: { ...b.data, content }, updatedAt: Date.now() } : b)),
    }));

    const existing = await db.canvasElements.get(id);
    if (!existing) return;
    await db.canvasElements.put({ ...existing, data: { ...existing.data, content }, updatedAt: Date.now() });
  },

  updateBlockPosition: (id, x, y) =>
    set((state) => ({
      blocks: state.blocks.map((b) => (b.id === id ? { ...b, x, y, updatedAt: Date.now() } : b)),
    })),

  updateBlocks: async (updates) => {
    const blockMap = new Map(updates.map(u => [u.id, u]));
    set((state) => ({
      blocks: state.blocks.map((b) => 
        blockMap.has(b.id) ? { ...b, x: blockMap.get(b.id)!.x, y: blockMap.get(b.id)!.y, updatedAt: Date.now() } : b
      ),
    }));

    await db.transaction("rw", db.canvasElements, async () => {
      for (const update of updates) {
        const existing = await db.canvasElements.get(update.id);
        if (existing) {
          await db.canvasElements.put({ ...existing, x: update.x, y: update.y, updatedAt: Date.now() });
        }
      }
    });
  },

  updateBlockSize: (id, width, height) =>
    set((state) => ({
      blocks: state.blocks.map((b) => (b.id === id ? { ...b, width, height, updatedAt: Date.now() } : b)),
    })),

  commitBlockPosition: async (id) => {
    const block = get().blocks.find((b) => b.id === id);
    if (!block) return;
    await db.canvasElements.put(block);
  },

  deleteBlock: async (id) => {
    await db.canvasElements.delete(id);
    set((state) => {
      const nextBlocks = state.blocks.filter((b) => b.id !== id);
      const nextSelected =
        state.selectedBlockId === id ? null : state.selectedBlockId;
      return { blocks: nextBlocks, selectedBlockId: nextSelected };
    });
  },

  addExistingBlock: async (block) => {
    await db.canvasElements.put(block);
    set((state) => {
      const exists = state.blocks.some((b) => b.id === block.id);
      if (exists) {
        return {
          blocks: state.blocks.map((b) => (b.id === block.id ? block : b)),
        };
      }
      return { blocks: [...state.blocks, block] };
    });
  },

  upsertBlock: async (block) => {
    await db.canvasElements.put(block);
    set((state) => {
      const exists = state.blocks.some((b) => b.id === block.id);
      if (exists) {
        return {
          blocks: state.blocks.map((b) => (b.id === block.id ? block : b)),
        };
      }
      return { blocks: [...state.blocks, block] };
    });
  },

  loadBlocksForPage: (_pageId, blocks) => set({ blocks }),

  hydrateBlocksForPage: async (pageId) => {
    const blocks = await db.canvasElements.where("pageId").equals(pageId).toArray();
    
    // Convert Blobs to ObjectURLs for display if needed
    // Logic similar to previous implementation but using data.blob
    const processedBlocks = await Promise.all(blocks.map(async b => {
        if (b.type === "image" && !b.data.blob && b.data.url?.startsWith("data:")) {
             try {
                 const res = await fetch(b.data.url);
                 const blob = await res.blob();
                 // Update DB
                 const updated = { ...b, data: { ...b.data, blob } };
                 await db.canvasElements.put(updated); 
                 return updated;
             } catch (e) {
                 console.error("Migration failed for block", b.id);
                 return b;
             }
        }
        return b;
    }));

    get().loadBlocksForPage(pageId, processedBlocks);
  },
}));
