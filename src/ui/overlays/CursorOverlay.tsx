import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/stores/useUIStore";
import { Pen, Eraser, MousePointer2, Type, Hand, Image as ImageIcon } from "lucide-react";
import { cn } from "@/utils";

export function CursorOverlay() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isVisible, setIsVisible] = useState(false);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [isPenPointer, setIsPenPointer] = useState(false);
  const tool = useUIStore((s) => s.tool);
  const color = useUIStore((s) => s.color);
  const strokeWidth = useUIStore((s) => s.strokeWidth);

  useEffect(() => {
    let hideTimeout: number;

    const onPointerMove = (e: PointerEvent) => {
      // Only show custom cursor for pen/touch when drawing
      if (e.pointerType === "mouse") {
        setIsVisible(false);
        return;
      }
      
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
      setIsPenPointer(e.pointerType === "pen");
      
      clearTimeout(hideTimeout);
      hideTimeout = window.setTimeout(() => {
        setIsVisible(false);
      }, 2000); // Hide after 2s of inactivity
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      setIsPointerDown(true);
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
      clearTimeout(hideTimeout);
    };

    const onPointerUp = () => {
      setIsPointerDown(false);
      clearTimeout(hideTimeout);
      hideTimeout = window.setTimeout(() => {
        setIsVisible(false);
      }, 2000);
    };
    
    const onPointerLeave = () => {
      setIsVisible(false);
      setIsPointerDown(false);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointerleave", onPointerLeave);
    
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointerleave", onPointerLeave);
      clearTimeout(hideTimeout);
    };
  }, []);

  if (!isVisible) return null;

  const renderToolIcon = () => {
    const props = { className: "w-4 h-4 text-white drop-shadow-md" };
    switch (tool) {
      case "pen": return <Pen {...props} />;
      case "eraser": return <Eraser {...props} />;
      case "text": return <Type {...props} />;
      case "select": return <MousePointer2 {...props} />;
      case "image": return <ImageIcon {...props} />;
      case "hand": return <Hand {...props} />;
      default: return null;
    }
  };

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
    >
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              scale: isPointerDown ? 0.9 : 1,
              x: position.x,
              y: position.y
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ 
              type: "spring", 
              damping: 50, 
              stiffness: 400,
              mass: 0.5,
              opacity: { duration: 0.15 }
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ willChange: "transform" }}
          >
            {/* Main Cursor Dot */}
            <div 
              className={cn(
                "rounded-full flex items-center justify-center transition-all duration-200 shadow-sm",
                tool === "eraser" ? "bg-white/90 border border-zinc-200" : "bg-zinc-900/80 backdrop-blur-sm border border-white/20"
              )}
              style={{
                width: tool === "pen" ? Math.max(16, strokeWidth * 2) : 28,
                height: tool === "pen" ? Math.max(16, strokeWidth * 2) : 28,
                backgroundColor: tool === "pen" ? color : undefined
              }}
            >
              {tool !== "pen" && renderToolIcon()}
            </div>
            
            {/* Tool indicator badge (for pen tool to show active state) */}
            {tool === "pen" && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/80 backdrop-blur-md px-1.5 py-0.5 rounded-md text-[10px] font-medium text-white border border-white/10 shadow-lg flex items-center gap-1 whitespace-nowrap"
              >
                <Pen className="w-3 h-3" />
                {isPenPointer && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}