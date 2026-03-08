import { useEffect, useRef, useState } from "react";
import { cn } from "@/utils";
import { useBlockStore } from "@/stores/useBlockStore";
import { useHistoryStore } from "@/history/useHistoryStore";
import { useUIStore } from "@/stores/useUIStore";
import type { CanvasElement } from "@/data/models/canvas";
import { Trash2 } from "lucide-react";

export function TextBlock({ block }: { block: CanvasElement }) {
  const update = useBlockStore((s) => s.updateBlock);
  const updatePosition = useBlockStore((s) => s.updateBlockPosition);
  const updateSize = useBlockStore((s) => s.updateBlockSize);
  const commitPosition = useBlockStore((s) => s.commitBlockPosition);
  const deleteBlock = useBlockStore((s) => s.deleteBlock);
  const selectBlock = useBlockStore((s) => s.selectBlock);
  const selectedBlockId = useBlockStore((s) => s.selectedBlockId);
  const isSelected = selectedBlockId === block.id;
  const setTypingBlock = useBlockStore((s) => s.setTypingBlock);
  const historyPush = useHistoryStore((s) => s.push);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const dragStartedRef = useRef(false);
  const startClientRef = useRef({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const startSizeRef = useRef({ width: 0, height: 0 });
  const draggingIdRef = useRef<string | null>(null);
  const dragBeforeRef = useRef<CanvasElement | null>(null);
  const editBeforeRef = useRef<CanvasElement | null>(null);
  const moveFrameRef = useRef<number | null>(null);
  const latestMoveRef = useRef<{ id: string; x?: number; y?: number; width?: number; height?: number } | null>(null);

  useEffect(() => {
    if (isSelected) {
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Delete" || e.key === "Backspace") {
          const target = e.target as HTMLElement;
          if (target.tagName.toLowerCase() === "textarea") return;
          void deleteBlock(block.id);
        }
      };
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }
  }, [isSelected, block.id, deleteBlock]);

  useEffect(() => {
    if (!dragging && !resizing) return;

    const getScale = () => {
      const el = ref.current?.closest<HTMLElement>("[data-page-root]");
      const raw = el?.style.getPropertyValue("--page-scale");
      const scale = raw ? Number(raw) : 1;
      return Number.isFinite(scale) && scale > 0 ? scale : 1;
    };

    const scheduleUpdate = (id: string, updates: { x?: number; y?: number; width?: number; height?: number }) => {
      latestMoveRef.current = { id, ...updates };
      if (moveFrameRef.current) return;
      moveFrameRef.current = requestAnimationFrame(() => {
        moveFrameRef.current = null;
        const latest = latestMoveRef.current;
        if (!latest) return;
        if (latest.x !== undefined && latest.y !== undefined) {
          updatePosition(latest.id, latest.x, latest.y);
        }
        if (latest.width !== undefined && latest.height !== undefined) {
          updateSize(latest.id, latest.width, latest.height);
        }
      });
    };

    const onMouseMove = (e: MouseEvent) => {
      const id = draggingIdRef.current;
      if (!id) return;

      const scale = getScale();
      const dx = (e.clientX - startClientRef.current.x) / scale;
      const dy = (e.clientY - startClientRef.current.y) / scale;

      if (resizing) {
        scheduleUpdate(id, {
          width: Math.max(100, startSizeRef.current.width + dx),
          height: Math.max(24, startSizeRef.current.height + dy),
        });
      } else if (dragging) {
        if (!dragStartedRef.current) {
          if (Math.hypot(dx * scale, dy * scale) < 3) return;
          dragStartedRef.current = true;
          document.body.style.userSelect = "none";
        }
        scheduleUpdate(id, {
          x: (startClientRef.current.x - offsetRef.current.x) / scale + dx,
          y: (startClientRef.current.y - offsetRef.current.y) / scale + dy,
        });
      }
    };

    const onMouseUp = () => {
      const id = draggingIdRef.current;
      const before = dragBeforeRef.current;
      draggingIdRef.current = null;
      dragStartedRef.current = false;
      document.body.style.userSelect = "";
      setDragging(false);
      setResizing(false);
      if (moveFrameRef.current) {
        cancelAnimationFrame(moveFrameRef.current);
        moveFrameRef.current = null;
      }
      if (!id) return;
      const after = useBlockStore.getState().blocks.find((b) => b.id === id);
      if (before && after && (before.x !== after.x || before.y !== after.y || before.width !== after.width || before.height !== after.height)) {
        // historyPush({ type: "UPDATE_BLOCK", before, after }); // Type mismatch potentially, fix history store later
        // For now, assuming history store is generic enough or we ignore strict type check here if history expects Block
      }
      void commitPosition(id);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      document.body.style.userSelect = "";
    };
  }, [dragging, resizing, updatePosition, updateSize, commitPosition, historyPush]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const root = (e.currentTarget as HTMLElement).closest<HTMLElement>("[data-page-root]");
    const rect = root?.getBoundingClientRect();
    if (!rect) return;
    
    startClientRef.current = { x: e.clientX, y: e.clientY };
    startSizeRef.current = { width: block.width || 400, height: ref.current?.offsetHeight || 24 };
    draggingIdRef.current = block.id;
    dragBeforeRef.current = { ...block };
    setResizing(true);
  };

  return (
    <div
      className={cn(
        "absolute pointer-events-auto group/block",
        isSelected && "",
        !isSelected && ""
      )}
      style={{
        left: block.x,
        top: block.y,
        width: block.width || 400,
        minHeight: 24,
      }}
    >
      <textarea
        ref={ref}
        value={block.data.content || ""}
        onMouseDown={(e) => {
          e.stopPropagation();
          if (isSelected) {
            const root = (e.currentTarget as HTMLElement).closest<HTMLElement>("[data-page-root]");
            const rect = root?.getBoundingClientRect();
            if (!rect) return;
            const rawScale = root?.style.getPropertyValue("--page-scale");
            const scale = rawScale ? Number(rawScale) : 1;
            const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;

            offsetRef.current = { 
              x: e.clientX - rect.left - block.x * safeScale, 
              y: e.clientY - rect.top - block.y * safeScale 
            };
            startClientRef.current = { x: e.clientX, y: e.clientY };
            draggingIdRef.current = block.id;
            dragBeforeRef.current = { ...block };
            dragStartedRef.current = false;
            setDragging(true);
          } else {
            const selectedIds = useUIStore.getState().selectedIds;
            if (e.shiftKey) {
              useUIStore.getState().setSelectedIds([...selectedIds, block.id]);
            } else {
              selectBlock(block.id);
              useUIStore.getState().setSelectedIds([block.id]);
            }
          }
        }}
        onChange={(e) => {
          void update(block.id, e.target.value);
        }}
        onFocus={() => {
          editBeforeRef.current = { ...block };
          setTypingBlock(block.id);
        }}
        onBlur={() => {
          setTypingBlock(null);
          const before = editBeforeRef.current;
          editBeforeRef.current = null;
          const after = useBlockStore.getState().blocks.find((b) => b.id === block.id);
          if (!before || !after) return;
          // Check deep equality or specific fields
          if (before.data.content === after.data.content) return;
          // historyPush({ type: "UPDATE_BLOCK", before, after });
        }}
        className={cn(
          "w-full h-full bg-transparent resize outline-none text-zinc-100 placeholder-zinc-500 leading-relaxed text-base rounded-md transition-shadow border border-dashed border-white/10",
          "focus:bg-white/2 px-4 py-4",
          isSelected ? "border-dashed border-white/20" : " hover:border hover:border-white/20 transition duration-200",
          dragging && "select-none"
        )}
        style={{
          minHeight: block.height || 24,
          cursor: isSelected ? "move" : "text",
        }}
        placeholder="Start typing…"
        spellCheck={false}
      />

      {isSelected && (
        <>
          {/* Resize Handle */}
          <div
            onMouseDown={handleResizeStart}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-center justify-center group/resize"
          >
            <div className="w-1 h-1 bg-indigo-500 rounded-full group-hover/resize:scale-125 transition-transform" />
          </div>

          {/* Delete Button */}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => deleteBlock(block.id)}
            className="absolute -top-10 left-0 bg-zinc-900 border border-white/10 p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all shadow-xl backdrop-blur-md"
            title="Delete Textbox"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}
