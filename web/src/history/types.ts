import type { StrokeElement } from "@/elements/types";
import type { CanvasElement } from "@/data/models/canvas";

export type Action =
  | {
      type: "ADD_STROKE";
      stroke: StrokeElement;
    }
  | {
      type: "DELETE_STROKE";
      stroke: StrokeElement;
    }
  | {
      type: "ADD_BLOCK";
      block: CanvasElement;
    }
  | {
      type: "UPDATE_BLOCK";
      before: CanvasElement;
      after: CanvasElement;
    }
  | {
      type: "DELETE_BLOCK";
      block: CanvasElement;
    };
