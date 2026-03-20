import { Layer } from "react-konva";
import { ImageBlock } from "@/ui/blocks/ImageBlock";
import { useBlockStore } from "@/stores/useBlockStore";
import { useMemo, memo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useSelectionStore } from "@/stores/useSelectionStore";

export const ImageLayer = memo(function ImageLayer() {
  const activePageId = useAppStore((s) => s.activePageId);
  const blocks = useBlockStore((s) => s.blocks);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const setSelectedIds = useSelectionStore((s) => s.setSelectedIds);

  const imageBlocks = useMemo(
    () => blocks.filter((b) => b.pageId === activePageId && b.type === "image"),
    [blocks, activePageId]
  );

  return (
    <Layer>
      {imageBlocks.map((block) => (
        <ImageBlock
          key={block.id}
          block={block}
          isSelected={selectedIds.includes(block.id)}
          listening={selectedIds.includes(block.id)}
          onSelect={() => {
            setSelectedIds([block.id]);
          }}
          />
        ))}
    </Layer>
  );
});
