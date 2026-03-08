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
    content?: string; // For text
    url?: string; // For image
    blob?: Blob; // Local blob for image
    points?: number[]; // For stroke if stored here (though strokes table exists)
    color?: string;
    // Add other properties as needed
    [key: string]: any;
  };
  createdAt: number;
  updatedAt: number;
}
