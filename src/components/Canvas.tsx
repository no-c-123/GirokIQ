import { useState, useEffect, useRef, type ElementType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MoreHorizontal, 
  Share, 
  Star, 
  Clock, 
  Maximize2, 
  Minimize2, 
  Type, 
  PenTool, 
  Eraser, 
  Image as ImageIcon, 
  Sidebar as SidebarIcon,
  MousePointer2
} from "lucide-react";
import { cn } from "../lib/utils";
import CanvasPage from "../canvas/CanvasPage";
import { useAppStore } from "../store/useAppStore";
import { useCanvasStore } from "../canvas/useCanvasStore";
import { ColorPicker } from "../canvas/ColorPicker";
import { useBlockStore } from "../blocks/useBlockStore";
import { TextBlock } from "../blocks/TextBlock";
import { useHistoryStore } from "../history/useHistoryStore";
import type { Page } from "../data/models/page";
import type { Notebook } from "../data/models/notebook";

interface CanvasProps {
  page?: Page;
  notebook?: Notebook;
}

export function Canvas({ page, notebook }: CanvasProps) {
  const [title, setTitle] = useState(page?.title || "");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageId = page?.id;

  const sidebarVisible = useAppStore((s) => s.sidebarVisible);
  const setSidebarVisible = useAppStore((s) => s.setSidebarVisible);

  const tool = useCanvasStore((s) => s.tool);
  const setTool = useCanvasStore((s) => s.setTool);
  const color = useCanvasStore((s) => s.color);
  const strokeWidth = useCanvasStore((s) => s.strokeWidth);
  const setStrokeWidth = useCanvasStore((s) => s.setStrokeWidth);
  const presets = useCanvasStore((s) => s.presets);
  const recentColors = useCanvasStore((s) => s.recentColors);
  const setColor = useCanvasStore((s) => s.setColor);
  const blocks = useBlockStore((s) => s.blocks);
  const hydrateBlocksForPage = useBlockStore((s) => s.hydrateBlocksForPage);
  const addTextBlock = useBlockStore((s) => s.addTextBlock);
  const addImageBlock = useBlockStore((s) => s.addImageBlock);
  const loadBlocksForPage = useBlockStore((s) => s.loadBlocksForPage);
  const selectedBlockId = useBlockStore((s) => s.selectedBlockId);
  const deleteBlock = useBlockStore((s) => s.deleteBlock);
  const historyPush = useHistoryStore((s) => s.push);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);
  const historyClear = useHistoryStore((s) => s.clear);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pageId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        const img = new window.Image();
        img.src = result;
        img.onload = async () => {
           // Calculate reasonable initial size
           let width = img.width;
           let height = img.height;
           const maxSize = 500;
           if (width > maxSize || height > maxSize) {
             const ratio = Math.min(maxSize / width, maxSize / height);
             width *= ratio;
             height *= ratio;
           }
           
           // Center on screen? We don't have view info here easily unless we pull it from CanvasPage or store.
           // For now, let's put it at 100, 100 or center if we can.
           // Actually, we can just put it at a default location.
           await addImageBlock(pageId, 100, 100, result, width, height);
        };
      }
    };
    reader.readAsDataURL(file);
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;
      const tag = target.tagName.toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select";
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          void redo();
        } else {
          void undo();
        }
        return;
      }

      if (e.key >= "1" && e.key <= "9") {
        const index = Number(e.key) - 1;
        const next = presets[index];
        if (next) setColor(next);
      }
      if (e.key.toLowerCase() === "c") {
        setShowColorPicker(true);
      }
      if (e.key === "Escape") {
        setShowColorPicker(false);
      }
      if ((e.key === "Backspace" || e.key === "Delete") && selectedBlockId) {
        e.preventDefault();
        const block = useBlockStore
          .getState()
          .blocks.find((b) => b.id === selectedBlockId);
        if (block) historyPush({ type: "DELETE_BLOCK", block });
        void deleteBlock(selectedBlockId);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    presets,
    setColor,
    selectedBlockId,
    deleteBlock,
    historyPush,
    undo,
    redo,
  ]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  // Handle file input change
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleImageUpload(e);
  };

  useEffect(() => {
    if (!page) {
      loadBlocksForPage("", []);
      return;
    }
    void hydrateBlocksForPage(page.id);
  }, [page, hydrateBlocksForPage, loadBlocksForPage]);

  useEffect(() => {
    if (!pageId) return;
    historyClear();
  }, [pageId, historyClear]);

  if (!page) {
    return (
      <div className="flex-1 h-full flex items-center justify-center text-zinc-600">
        <div className="text-center">
          <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
            <Type className="w-8 h-8 opacity-20" />
          </div>
          <p>Select a page to start writing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col relative overflow-hidden bg-zinc-950">
      {/* Top Bar */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-white/5 bg-zinc-900/10 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <ToolbarButton 
            icon={SidebarIcon} 
            onClick={() => setSidebarVisible(!sidebarVisible)}
            tooltip="Toggle Sidebar (Cmd+S)"
            active={sidebarVisible}
          />
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span className="hover:text-zinc-300 cursor-pointer transition-colors">
              {notebook?.name || "Notebook"}
            </span>
            <span className="text-zinc-700">/</span>
            <span className="text-zinc-300 font-medium">{title}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-zinc-600 mr-4">Last edited just now</span>
          <ToolbarButton icon={Clock} tooltip="History" />
          <ToolbarButton icon={Star} tooltip="Star" />
          <ToolbarButton icon={Share} tooltip="Share" />
          <div className="w-px h-4 bg-white/10 mx-2" />
          <ToolbarButton 
            icon={isFullscreen ? Minimize2 : Maximize2} 
            onClick={() => setIsFullscreen(!isFullscreen)}
            tooltip="Toggle Fullscreen" 
          />
          <div className="relative">
            <ToolbarButton 
              icon={MoreHorizontal} 
              tooltip="More" 
              onClick={() => setShowMenu(!showMenu)}
            />
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  ref={menuRef}
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-white/10 rounded-lg shadow-xl overflow-hidden z-50"
                  style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                >
                  <div className="p-1">
                    <button className="flex items-center w-full px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-white/5 rounded transition-colors text-left">
                      <span className="flex-1">Export PDF</span>
                    </button>
                    <button className="flex items-center w-full px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-white/5 rounded transition-colors text-left">
                      <span className="flex-1">Copy Link</span>
                    </button>
                    <div className="h-px bg-white/5 my-1" />
                    <button className="flex items-center w-full px-3 py-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors text-left">
                      <span className="flex-1">Delete Page</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Canvas Area */}
      <div className="flex-1 relative overflow-hidden bg-zinc-950">
        {/* Floating Toolbar (Mockup) */}
        {page.type === "canvas" && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-4 shadow-xl shadow-black/50 hover:shadow-indigo-500/20 z-20 transition-all hover:scale-105 hover:-translate-y-1">
            <ToolButton
              icon={MousePointer2}
              active={tool === "lasso"}
              onClick={() => setTool("lasso")}
            />
            <ToolButton
              icon={PenTool}
              active={tool === "pen"}
              onClick={() => setTool("pen")}
            />
            <ToolButton
              icon={Eraser}
              active={tool === "eraser"}
              onClick={() => setTool("eraser")}
            />
            <ToolButton
              icon={Type}
              active={tool === "text"}
              onClick={() => setTool("text")}
            />
            <ToolButton 
                icon={ImageIcon} 
                onClick={() => fileInputRef.current?.click()}
            />
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={onFileChange}
            />
            <div className="w-px h-4 bg-white/10" />
            
            {/* Stroke Width Control */}
            <div className="flex items-center gap-3 px-2 group/width">
              <div className="flex items-center gap-1.5">
                {[1, 4, 10].map((w) => (
                  <button
                    key={w}
                    onClick={() => setStrokeWidth(w)}
                    className={cn(
                      "w-6 h-6 rounded flex items-center justify-center transition-all hover:bg-white/10",
                      strokeWidth === w ? "text-indigo-400 bg-white/5" : "text-zinc-500"
                    )}
                  >
                    <div 
                      className="bg-current rounded-full" 
                      style={{ width: Math.max(2, w/2), height: Math.max(2, w/2) }} 
                    />
                  </button>
                ))}
              </div>
              <input
                type="range"
                min="0.5"
                max="20"
                step="0.5"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(parseFloat(e.target.value))}
                className="w-20 accent-indigo-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
              />
              <span className="text-[10px] text-zinc-500 tabular-nums w-6">{strokeWidth}px</span>
            </div>

            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2">
              {presets.slice(0, 9).map((preset) => (
                <ColorButton
                  key={preset}
                  color={preset}
                  active={preset === color}
                  onClick={() => setColor(preset)}
                />
              ))}
              <button
                onClick={() => setShowColorPicker(true)}
                className={cn(
                  "w-5 h-5 rounded-full border border-white/10 transition-all",
                  color === "#000000" && "border-white/20",
                )}
                style={{
                  background:
                    "conic-gradient(from 180deg, #f472b6, #a78bfa, #60a5fa, #34d399, #fbbf24, #f97316, #fb7185, #f472b6)",
                  boxShadow:
                    showColorPicker || (!presets.includes(color) && recentColors.includes(color))
                      ? "0 0 0 2px rgba(167,139,250,0.35), 0 0 18px rgba(167,139,250,0.25)"
                      : undefined,
                }}
                aria-label="Open color picker"
                title="Color picker (C)"
              />
            </div>
          </div>
        )}

        {page.type === "canvas" && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30">
            <ColorPicker
              key={color}
              open={showColorPicker}
              color={color}
              presets={presets}
              recentColors={recentColors}
              onChange={(next) => setColor(next)}
              onClose={() => setShowColorPicker(false)}
            />
          </div>
        )}

        <div className="absolute inset-0">
          {page.type === "document" ? (
            <div className="h-full w-full max-w-4xl mx-auto p-12 md:p-24 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              <textarea
                className="w-full h-full bg-transparent text-zinc-100 placeholder:text-zinc-800 text-lg leading-relaxed outline-none resize-none"
                placeholder="Start typing your notes here..."
                value={blocks[0]?.content || ""}
                onChange={async (e) => {
                  if (blocks.length === 0) {
                    const block = await addTextBlock(page.id, 0, 0);
                    void useBlockStore.getState().updateBlock(block.id, e.target.value);
                  } else {
                    void useBlockStore.getState().updateBlock(blocks[0].id, e.target.value);
                  }
                }}
              />
            </div>
          ) : (
            <CanvasPage
              onDoubleClickPage={(pageId, x, y) => {
                void addTextBlock(pageId, x, y).then((block) => {
                  historyPush({ type: "ADD_BLOCK", block });
                });
              }}
            >
              {blocks.map((block) => {
                if (block.type === "text") {
                  return <TextBlock key={block.id} block={block} />;
                }
                return null;
              })}
            </CanvasPage>
          )}
        </div>

        {/* Title Overlay */}
        <div className="absolute top-6 left-6 right-6 pointer-events-none z-[5] w-1/2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
            className="w-full bg-transparent text-3xl font-bold text-zinc-100/20 hover:text-zinc-100/60 focus:text-zinc-100 focus:placeholder:text-zinc-600 placeholder:text-zinc-800 border-none outline-none transition-all pointer-events-auto"
          />
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  onClick,
  tooltip,
  active,
}: {
  icon: ElementType<{ className?: string }>;
  onClick?: () => void;
  tooltip?: string;
  active?: boolean;
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-2 rounded-md transition-colors",
        active 
          ? "text-indigo-400 bg-indigo-500/10" 
          : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
      )}
      title={tooltip}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function ToolButton({
  icon: Icon,
  active,
  onClick,
}: {
  icon: ElementType<{ className?: string }>;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-2 rounded-lg transition-all",
        active ? "text-indigo-400 bg-indigo-500/10" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
      )}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}

function ColorButton({
  color,
  active,
  onClick,
}: {
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-5 h-5 rounded-full border border-white/10 transition-all hover:scale-110"
      style={{
        backgroundColor: color,
        boxShadow: active
          ? "0 0 0 2px rgba(167,139,250,0.35), 0 0 18px rgba(167,139,250,0.25)"
          : undefined,
      }}
      aria-label={`Select ${color}`}
      title={color}
    />
  );
}
