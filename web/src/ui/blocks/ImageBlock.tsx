import { useEffect, useRef, useState } from "react";
import { Image as KonvaImage } from "react-konva";
import Konva from "konva";
import type { CanvasElement } from "@/data/models/canvas";
import DeleteButton from "../components/DeleteButton";

export function ImageBlock({ 
  block, 
  isSelected, 
  onSelect,
  listening = true
}: { 
  block: CanvasElement; 
  isSelected: boolean; 
  onSelect: () => void;
  listening?: boolean;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const imageRef = useRef<Konva.Image>(null);

  useEffect(() => {
    let url = block.data.url || "";
    let isBlobUrl = false;

    if (block.data.blob) {
        url = URL.createObjectURL(block.data.blob);
        isBlobUrl = true;
    }

    if (!url) return;

    const img = new window.Image();
    img.src = url;
    img.onload = () => setImage(img);

    return () => {
        if (isBlobUrl) {
            URL.revokeObjectURL(url);
        }
    };
  }, [block.data.url, block.data.blob]);

  return (
    <>
      <KonvaImage
        ref={imageRef}
        image={image || undefined}
        x={block.x}
        y={block.y}
        width={block.width || 200}
        height={block.height || 200}
        listening={listening}
        // Let SelectionLayer handle dragging when selected to avoid duplicate drag handlers
        draggable={false}
        onClick={(e) => {
             e.cancelBubble = true;
             onSelect();
        }}
        onTap={(e) => {
             e.cancelBubble = true;
             onSelect();
        }}
        onMouseDown={(e) => {
            if (isSelected) e.cancelBubble = true;
        }}
        onTouchStart={(e) => {
            if (isSelected) e.cancelBubble = true;
        }}
      />
      <DeleteButton block={block} />
    </>
  );
}
