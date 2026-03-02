import type { Stroke } from "../canvas/useCanvasStore";
import type { Block } from "../data/models/block";

export type Action =
  | {
      type: "ADD_STROKE";
      stroke: Stroke;
    }
  | {
      type: "DELETE_STROKE";
      stroke: Stroke;
    }
  | {
      type: "ADD_BLOCK";
      block: Block;
    }
  | {
      type: "UPDATE_BLOCK";
      before: Block;
      after: Block;
    }
  | {
      type: "DELETE_BLOCK";
      block: Block;
    };

