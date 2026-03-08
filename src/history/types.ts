import type { StrokeElement } from "@/elements/types";
import type { Block } from "@/data/models/block";

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

