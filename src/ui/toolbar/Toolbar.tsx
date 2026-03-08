
import { 
  Lock, 
  Hand, 
  MousePointer2, 
  Square, 
  Diamond, 
  Circle, 
  ArrowRight, 
  Minus, 
  Pen, 
  Type, 
  Image as ImageIcon, 
  Eraser 
} from "lucide-react";
import { useUIStore } from "@/stores/useUIStore";
import { cn } from "@/utils";

export function Toolbar() {
  const tool = useUIStore((s) => s.tool);
  const setTool = useUIStore((s) => s.setTool);
  const isLocked = useUIStore((s) => s.isToolLocked);
  const setIsToolLocked = useUIStore((s) => s.setIsToolLocked);
  
  return (
    <div className="flex items-center gap-1 p-1 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg shadow-sm">
      <ToolButton 
        icon={Lock} 
        active={isLocked}
        onClick={() => setIsToolLocked(!isLocked)}
        tooltip="Keep selected tool active after drawing"
      />
      <div className="w-px h-4 bg-[var(--border-subtle)] mx-1" />
      <ToolButton 
        icon={Hand} 
        active={tool === "hand"} 
        onClick={() => setTool("hand")}
        tooltip="Hand (Panning tool)"
      />
      <ToolButton 
        icon={MousePointer2} 
        active={tool === "lasso"} // Mapping "lasso" to selection for now
        onClick={() => setTool("lasso")}
        tooltip="Selection"
      />
      <ToolButton 
        icon={Square} 
        active={tool === "rectangle"} 
        onClick={() => setTool("rectangle")}
        tooltip="Rectangle"
      />
      <ToolButton 
        icon={Diamond} 
        active={tool === "diamond"} 
        onClick={() => setTool("diamond")}
        tooltip="Diamond"
      />
      <ToolButton 
        icon={Circle} 
        active={tool === "ellipse"} 
        onClick={() => setTool("ellipse")}
        tooltip="Ellipse"
      />
      <ToolButton 
        icon={ArrowRight} 
        active={tool === "arrow"} 
        onClick={() => setTool("arrow")}
        tooltip="Arrow"
      />
      <ToolButton 
        icon={Minus} 
        active={tool === "line"} 
        onClick={() => setTool("line")}
        tooltip="Line"
      />
      <ToolButton 
        icon={Pen} 
        active={tool === "pen"} 
        onClick={() => setTool("pen")}
        tooltip="Draw"
      />
      <ToolButton 
        icon={Type} 
        active={tool === "text"} 
        onClick={() => setTool("text")}
        tooltip="Text"
      />
      <ToolButton 
        icon={ImageIcon} 
        active={tool === "image"} 
        onClick={() => setTool("image")} // Need to handle file input trigger
        tooltip="Image"
      />
      <ToolButton 
        icon={Eraser} 
        active={tool === "eraser"} 
        onClick={() => setTool("eraser")}
        tooltip="Eraser"
      />
    </div>
  );
}

function ToolButton({
  icon: Icon,
  active,
  onClick,
  tooltip,
}: {
  icon: React.ElementType;
  active?: boolean;
  onClick?: () => void;
  tooltip?: string;
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-2 rounded-md transition-colors",
        active 
          ? "bg-[var(--accent-subtle)]/20 text-[var(--accent-primary)]" 
          : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-canvas)]"
      )}
      title={tooltip}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
