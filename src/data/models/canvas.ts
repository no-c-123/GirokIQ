export interface CanvasElement {
  id: string;
  pageId: string;
  createdAt: number;
  type: "stroke" | "shape";
  x: number;
  y: number;
}
