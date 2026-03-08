import Dexie, { type Table } from "dexie";
import type { Folder } from "@/data/models/folder";
import type { Notebook } from "@/data/models/notebook";
import type { Page } from "@/data/models/page";
import type { CanvasElement } from "@/data/models/canvas";

export interface StrokeRow {
  id: string;
  pageId: string;
  userId: string;
  points: number[] | Uint8Array; // Support binary points
  color: string;
  width: number;
  pressures?: number[];
  shapeType?: string;
  originalPoints?: number[];
  createdAt: number;
}

export interface AppStateRow {
  key: string;
  value: any;
  updatedAt: number;
}

export class AppDB extends Dexie {
  folders!: Table<Folder, string>;
  notebooks!: Table<Notebook, string>;
  pages!: Table<Page, string>;
  canvasElements!: Table<CanvasElement, string>;
  strokes!: Table<StrokeRow, string>;
  appState!: Table<AppStateRow, string>;

  constructor() {
    super("syllabus-db");

    this.version(1).stores({
      folders: "id, parentId, createdAt",
      notebooks: "id, folderId, createdAt",
      pages: "id, notebookId, createdAt, updatedAt",
      blocks: "id, pageId, createdAt",
      canvasElements: "id, pageId, createdAt",
      appState: "key, updatedAt",
    });

    this.version(2).stores({
      folders: "id, parentId, createdAt",
      notebooks: "id, folderId, createdAt",
      pages: "id, notebookId, createdAt, updatedAt",
      blocks: "id, pageId, createdAt",
      canvasElements: "id, pageId, createdAt",
      strokes: "id, pageId",
      appState: "key, updatedAt",
    });

    this.version(3).stores({
      folders: "id, parentId, createdAt",
      notebooks: "id, folderId, createdAt",
      pages: "id, notebookId, createdAt, updatedAt",
      blocks: "id, pageId",
      canvasElements: "id, pageId, createdAt",
      strokes: "id, pageId",
      appState: "key, updatedAt",
    });

    // V4: Refactor schema - Remove blocks, consolidate to canvasElements, add userId
    this.version(4).stores({
      folders: "id, parentId, userId, createdAt",
      notebooks: "id, folderId, userId, createdAt",
      pages: "id, notebookId, userId, createdAt, updatedAt",
      blocks: null, // Drop table
      canvasElements: "id, pageId, userId, type, createdAt",
      strokes: "id, pageId, userId",
      appState: "key, updatedAt",
    }).upgrade(async tx => {
      // Migrate blocks to canvasElements
      const blocks = await tx.table("blocks").toArray();
      if (blocks.length > 0) {
        // We might not have userId here, use a placeholder or try to find it
        // In a real app, we might need to prompt user or get from auth state if stored in DB
        // For now, use a placeholder that Sync service can fix
        const placeholderUserId = "00000000-0000-0000-0000-000000000000"; 
        
        const newElements = blocks.map(b => ({
          id: b.id,
          pageId: b.pageId,
          userId: placeholderUserId,
          type: b.type,
          x: b.x,
          y: b.y,
          width: b.width,
          height: b.height,
          data: {
            content: b.content,
            blob: b.blob
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }));
        
        await tx.table("canvasElements").bulkAdd(newElements);
      }
    });
  }
}

export const db = new AppDB();
