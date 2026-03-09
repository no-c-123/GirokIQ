
export type ElementType = "stroke" | "text" | "image" | "shape";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BaseElement {
  id: string;
  pageId: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  createdAt: number;
  updatedAt?: number;
}

export interface StrokeElement extends BaseElement {
  type: "stroke";
  points: number[];
  color: string;
  strokeWidth: number; // Changed from width to avoid conflict with BaseElement.width (bbox)
  width: number; // Bounding box width
  pressures?: number[];
  shapeType?: string; // "rectangle" | "circle" | "diamond" | "arrow" | "line" | "ellipse"
  originalPoints?: number[];
  strokeStyle?: "solid" | "dashed" | "dotted";
  backgroundColor?: string;
  opacity?: number;
  edges?: "sharp" | "round";
  sloppiness?: number;
}

export interface TextElement extends BaseElement {
  type: "text";
  content: string;
  fontSize?: number;
  fontFamily?: string;
}

export interface ImageElement extends BaseElement {
  type: "image";
  content: string; // URL or base64
  blob?: Blob;
}

export interface ShapeElement extends BaseElement {
  type: "shape";
  shapeType: "rectangle" | "circle" | "triangle" | "arrow" | "line";
  points?: number[]; // For lines/arrows
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export type CanvasElement = StrokeElement | TextElement | ImageElement | ShapeElement;
