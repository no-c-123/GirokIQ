export interface CanvasElement {
  id: string;
  pageId: string;
  userId: string;
  type: "stroke" | "text" | "image" | "shape";
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  zIndex?: number;
  data: {
    content?: string;
    url?: string; 
    blob?: Blob; 
    points?: number[]; 
    color?: string;
    [key: string]: any;
  };
  updatedAt: number;
  deleted?: boolean;
  syncedAt?: number;
}
