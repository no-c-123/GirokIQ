import Dexie, { type Table } from "dexie";
import type { Folder } from "@/data/models/folder";
import type { Notebook } from "@/data/models/notebook";
import type { Page } from "@/data/models/page";
import type { Block } from "@/data/models/block";
import type { CanvasElement } from "@/data/models/canvas";

export interface StrokeRow {
  id: string;
  pageId: string;
  points: number[];
  color: string;
  width: number;
  pressures?: number[];
  shapeType?: string;
  originalPoints?: number[];
}

export interface AppStateRow {
  key: "activePageId" | "sidebarVisible" | "settings";
  value: any;
  updatedAt: number;
}

export class AppDB extends Dexie {
  folders!: Table<Folder, string>;
  notebooks!: Table<Notebook, string>;
  pages!: Table<Page, string>;
  blocks!: Table<Block, string>;
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
  }
}

export const db = new AppDB();
