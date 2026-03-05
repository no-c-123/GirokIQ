import { useMemo } from "react";
import { Trash2 } from "lucide-react";
import { useBlockStore } from "../../stores/useBlockStore";
import { useUIStore } from "../../stores/useUIStore";

interface ViewState {
  position: { x: number; y: number };
}

interface ImageSelectionOverlayProps {
  view: ViewState;
  stageScale: number;
}

export function ImageSelectionOverlay({ view, stageScale }: ImageSelectionOverlayProps) {
  const blocks = useBlockStore((s) => s.blocks);
  const deleteBlock = useBlockStore((s) => s.deleteBlock);
  const selectedIds = useUIStore((s) => s.selectedIds);
  const setSelectedIds = useUIStore((s) => s.setSelectedIds);

  const selectedBlock = useMemo(
    () => (selectedIds.length === 1 ? blocks.find((b) => b.id === selectedIds[0]) : null),
    [selectedIds, blocks]
  );

  if (!selectedBlock || selectedBlock.type !== "image") {
    return null;
  }

  return (
    <div
      className="absolute"
      style={{
        left: selectedBlock.x * stageScale + view.position.x,
        top: (selectedBlock.y - 40) * stageScale + view.position.y,
        transformOrigin: "0 0",
        pointerEvents: "auto",
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          deleteBlock(selectedBlock.id);
          setSelectedIds([]);
        }}
        className="bg-zinc-900 border border-white/10 p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all shadow-xl backdrop-blur-md"
        title="Delete Image"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
