export interface Block {
  id: string;
  pageId: string;
  type: "text" | "image";
  x: number;
  y: number;
  width?: number;
  height?: number;
  content: string; // Text content or Image URL
  blob?: Blob; // Optional blob for optimized storage
}
