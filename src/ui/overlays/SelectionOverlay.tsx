import { useMemo } from "react";
import DeleteButton from "@/ui/components/DeleteButton";
import type { StrokeElement } from "@/elements/types";

interface ViewState {
  position: { x: number; y: number };
}

interface SelectionOverlayProps {
  view: ViewState;
  stageScale: number;
  selectedStrokes: StrokeElement[];
  selectedBlocks: any[];
  onDelete: () => void;
}

export function SelectionOverlay({ view, stageScale, selectedStrokes, selectedBlocks, onDelete }: SelectionOverlayProps) {
  const boundingBox = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;

    selectedStrokes.forEach(stroke => {
      for (let i = 0; i < stroke.points.length; i += 2) {
        minX = Math.min(minX, stroke.points[i]);
        minY = Math.min(minY, stroke.points[i + 1]);
      }
    });

    selectedBlocks.forEach(block => {
      minX = Math.min(minX, block.x);
      minY = Math.min(minY, block.y);
    });

    if (minX === Infinity || minY === Infinity) return null;

    return { x: minX, y: minY };
  }, [selectedStrokes, selectedBlocks]);

  if (!boundingBox || (selectedStrokes.length === 0 && selectedBlocks.length === 0)) {
    return null;
  }

  return (
    <div
      className="absolute"
      style={{
        left: boundingBox.x * stageScale + view.position.x,
        top: boundingBox.y * stageScale + view.position.y - 45,
        transformOrigin: "0 0",
        pointerEvents: "auto",
        zIndex: 50,
      }}
    >
      <DeleteButton
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="Delete Selected"
      />
    </div>
  );
}