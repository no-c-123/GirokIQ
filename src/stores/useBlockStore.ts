import { create } from "zustand";
import { nanoid } from "nanoid";
import { db } from "@/db";
import type { Block } from "@/data/models/block";

interface BlockState {
  blocks: Block[];
  selectedBlockId: string | null;
  dragMode: boolean;
  typingBlockId: string | null;

  addTextBlock: (pageId: string, x: number, y: number) => Promise<Block>;
  addImageBlock: (pageId: string, x: number, y: number, url: string, width: number, height: number) => Promise<Block>;
  updateBlock: (id: string, content: string) => Promise<void>;
  updateBlockPosition: (id: string, x: number, y: number) => void;
  updateBlocks: (updates: { id: string; x: number; y: number }[]) => Promise<void>;
  updateBlockSize: (id: string, width: number, height: number) => void;
  commitBlockPosition: (id: string) => Promise<void>;
  deleteBlock: (id: string) => Promise<void>;
  addExistingBlock: (block: Block) => Promise<void>;
  upsertBlock: (block: Block) => Promise<void>;
  selectBlock: (id: string | null) => void;
  setDragMode: (active: boolean) => void;
  setTypingBlock: (id: string | null) => void;
  loadBlocksForPage: (pageId: string, blocks: Block[]) => void;
  hydrateBlocksForPage: (pageId: string) => Promise<void>;
}

export const useBlockStore = create<BlockState>((set, get) => ({
  blocks: [],
  selectedBlockId: null,
  dragMode: false,
  typingBlockId: null,

  addTextBlock: async (pageId, x, y) => {
    const block: Block = {
      id: nanoid(),
      pageId,
      type: "text",
      x,
      y,
      content: "",
    };

    await db.blocks.put(block);
    set((state) => ({ blocks: [...state.blocks, block] }));
    return block;
  },

  addImageBlock: async (pageId, x, y, url, width, height) => {
    let blob: Blob | undefined;
    let content = url;

    // If it's a data URL, convert to Blob for efficient storage
    if (url.startsWith("data:")) {
        try {
            const res = await fetch(url);
            blob = await res.blob();
            // Replace content with placeholder "blob" to avoid storing duplicates
            content = "blob"; 
        } catch (e) {
            console.error("Failed to convert data URL to blob", e);
        }
    }

    const block: Block = {
      id: nanoid(),
      pageId,
      type: "image",
      x,
      y,
      width,
      height,
      content,
      blob,
    };

    await db.blocks.put(block);

    // For local state, we use the blob directly if available, component will create URL
    const displayBlock = { 
        ...block, 
        content: blob ? "" : url // Component will handle blob rendering
    };

    set((state) => ({ blocks: [...state.blocks, displayBlock] }));
    return displayBlock;
  },

  selectBlock: (id) => set({ selectedBlockId: id }),
  setDragMode: (active) => set({ dragMode: active }),
  setTypingBlock: (id) => set({ typingBlockId: id }),

  updateBlock: async (id, content) => {
    set((state) => ({
      blocks: state.blocks.map((b) => (b.id === id ? { ...b, content } : b)),
    }));

    const existing = await db.blocks.get(id);
    if (!existing) return;
    await db.blocks.put({ ...existing, content });
  },

  updateBlockPosition: (id, x, y) =>
    set((state) => ({
      blocks: state.blocks.map((b) => (b.id === id ? { ...b, x, y } : b)),
    })),

  updateBlocks: async (updates) => {
    const blockMap = new Map(updates.map(u => [u.id, u]));
    set((state) => ({
      blocks: state.blocks.map((b) => 
        blockMap.has(b.id) ? { ...b, x: blockMap.get(b.id)!.x, y: blockMap.get(b.id)!.y } : b
      ),
    }));

    await db.transaction("rw", db.blocks, async () => {
      for (const update of updates) {
        const existing = await db.blocks.get(update.id);
        if (existing) {
          await db.blocks.put({ ...existing, x: update.x, y: update.y });
        }
      }
    });
  },

  updateBlockSize: (id, width, height) =>
    set((state) => ({
      blocks: state.blocks.map((b) => (b.id === id ? { ...b, width, height } : b)),
    })),

  commitBlockPosition: async (id) => {
    const block = get().blocks.find((b) => b.id === id);
    if (!block) return;
    await db.blocks.put(block);
  },

  deleteBlock: async (id) => {
    await db.blocks.delete(id);
    set((state) => {
      const nextBlocks = state.blocks.filter((b) => b.id !== id);
      const nextSelected =
        state.selectedBlockId === id ? null : state.selectedBlockId;
      return { blocks: nextBlocks, selectedBlockId: nextSelected };
    });
  },

  addExistingBlock: async (block) => {
    await db.blocks.put(block);
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
    await db.blocks.put(block);
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
    const blocks = await db.blocks.where("pageId").equals(pageId).toArray();
    
    // Convert Blobs to ObjectURLs for display
    const processedBlocks = await Promise.all(blocks.map(async b => {
        // Migration: If image has huge data URL but no blob, create blob now
        if (b.type === "image" && !b.blob && b.content.startsWith("data:")) {
             try {
                 const res = await fetch(b.content);
                 const blob = await res.blob();
                 // Update DB immediately
                 await db.blocks.update(b.id, { blob, content: "blob" }); 
                 // We replace content with "blob" placeholder to save space, 
                 // but for rendering we need a URL
                 return { ...b, blob, content: "" };
             } catch (e) {
                 console.error("Migration failed for block", b.id);
                 return b;
             }
        }

        if (b.type === "image" && b.blob) {
            // Don't create URL here, let component handle it
            return { ...b, content: "" };
        }
        return b;
    }));

    get().loadBlocksForPage(pageId, processedBlocks);
  },
}));
