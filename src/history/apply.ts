import type { Action } from "./types";
import { useBlockStore } from "../blocks/useBlockStore";
import { useCanvasStore } from "../canvas/useCanvasStore";

export async function applyUndo(action: Action) {
  const blocks = useBlockStore.getState();
  const canvas = useCanvasStore.getState();

  switch (action.type) {
    case "ADD_BLOCK":
      await blocks.deleteBlock(action.block.id);
      break;
    case "UPDATE_BLOCK":
      await blocks.upsertBlock(action.before);
      break;
    case "DELETE_BLOCK":
      await blocks.addExistingBlock(action.block);
      break;
    case "ADD_STROKE":
      await canvas.removeStroke(action.stroke.id);
      break;
    case "DELETE_STROKE":
      await canvas.addStroke(action.stroke);
      break;
  }
}

export async function applyRedo(action: Action) {
  const blocks = useBlockStore.getState();
  const canvas = useCanvasStore.getState();

  switch (action.type) {
    case "ADD_BLOCK":
      await blocks.addExistingBlock(action.block);
      break;
    case "UPDATE_BLOCK":
      await blocks.upsertBlock(action.after);
      break;
    case "DELETE_BLOCK":
      await blocks.deleteBlock(action.block.id);
      break;
    case "ADD_STROKE":
      await canvas.addStroke(action.stroke);
      break;
    case "DELETE_STROKE":
      await canvas.removeStroke(action.stroke.id);
      break;
  }
}

