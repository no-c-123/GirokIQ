import { Layer } from "react-konva";
import { ImageBlock } from "../../ui/blocks/ImageBlock";
import { useBlockStore } from "../../stores/useBlockStore";
import { useMemo, memo } from "react";
import { useUIStore } from "../../stores/useUIStore";
import { useAppStore } from "../../store/useAppStore";

export const ImageLayer = memo(function ImageLayer() {
  const activePageId = useAppStore((s) => s.activePageId);
  const blocks = useBlockStore((s) => s.blocks);
  const selectedIds = useUIStore((s) => s.selectedIds);
  const setSelectedIds = useUIStore((s) => s.setSelectedIds);

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
          listening={selectedIds.includes(block.id)} // Only interactive when selected
          onSelect={() => {
            setSelectedIds([block.id]);
          }}
        />
      ))}
    </Layer>
  );
});
