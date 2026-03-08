import { Camera, Type } from "lucide-react";
import { useCanvasStore } from "@/stores/useCanvasStore";
import { useBlockStore } from "@/stores/useBlockStore";
import { Stage } from "konva/lib/Stage";

interface ViewState {
  position: { x: number; y: number };
}

interface LassoActionsOverlayProps {
  view: ViewState;
  stageScale: number;
  selectionBBox: { x: number; y: number; width: number; height: number } | null;
  selectedIds: string[];
  stageRef: React.RefObject<Stage | null>;
}

export function LassoActionsOverlay({ 
  view, 
  stageScale, 
  selectionBBox,
  selectedIds,
  stageRef
}: LassoActionsOverlayProps) {
  
  if (!selectionBBox) return null;

  return (
    <div
      className="absolute flex gap-2"
      style={{
        left: (selectionBBox.x + selectionBBox.width / 2) * stageScale + view.position.x,
        top: (selectionBBox.y + selectionBBox.height + 20) * stageScale + view.position.y,
        transform: "translateX(-50%)",
        pointerEvents: "auto",
        zIndex: 50 // Ensure it's above other overlays
      }}
    >
      <button
        onClick={async (e) => {
          e.stopPropagation();
          if (!selectionBBox || !stageRef.current) return;
          
          const stage = stageRef.current;
          
          // Use pixelRatio for high quality
          const dataUrl = stage.toDataURL({
            x: selectionBBox.x,
            y: selectionBBox.y,
            width: selectionBBox.width,
            height: selectionBBox.height,
            pixelRatio: 2
          });
          
          const activePageId = useCanvasStore.getState().elements.find(s => selectedIds.includes(s.id))?.pageId 
                              || useBlockStore.getState().blocks.find(b => selectedIds.includes(b.id))?.pageId;

          if (activePageId) {
            await useBlockStore.getState().addImageBlock(
              activePageId, 
              selectionBBox.x + selectionBBox.width + 20, 
              selectionBBox.y, 
              dataUrl, 
              selectionBBox.width, 
              selectionBBox.height
            );
          }
        }}
        className="flex items-center gap-1.5 bg-zinc-900 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 shadow-xl backdrop-blur-md transition-colors"
      >
        <Camera className="w-3.5 h-3.5" />
        <span>Screenshot</span>
      </button>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          alert("Convert to text feature coming soon!");
        }}
        className="flex items-center gap-1.5 bg-zinc-900 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 shadow-xl backdrop-blur-md transition-colors"
      >
        <Type className="w-3.5 h-3.5" />
        <span>To Text</span>
      </button>
    </div>
  );
}
