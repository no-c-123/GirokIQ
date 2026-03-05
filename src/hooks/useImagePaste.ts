import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { useBlockStore } from "../stores/useBlockStore";

interface ViewState {
  zoom: number;
  position: { x: number; y: number };
}

interface StageSize {
  width: number;
  height: number;
}

export function useImagePaste(
  stageSize: StageSize,
  view: ViewState
) {
  const activePageId = useAppStore((s) => s.activePageId);
  const addImageBlock = useBlockStore((s) => s.addImageBlock);

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!activePageId) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.indexOf("image") !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = async (event) => {
              const result = event.target?.result;
              if (typeof result === "string") {
                // Get image dimensions
                const img = new window.Image();
                img.src = result;
                img.onload = async () => {
                  // Calculate center of viewport
                  const centerX = (stageSize.width / 2 - view.position.x) / view.zoom;
                  const centerY = (stageSize.height / 2 - view.position.y) / view.zoom;
                  
                  // Scale down large images
                  let width = img.width;
                  let height = img.height;
                  const maxSize = 500;
                  if (width > maxSize || height > maxSize) {
                    const ratio = Math.min(maxSize / width, maxSize / height);
                    width *= ratio;
                    height *= ratio;
                  }

                  await addImageBlock(
                    activePageId,
                    centerX - width / 2,
                    centerY - height / 2,
                    result,
                    width,
                    height
                  );
                };
              }
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [activePageId, stageSize, view, addImageBlock]);
}
