
import { useUIStore } from "@/stores/useUIStore";
import { cn } from "@/utils";
import { ColorPicker } from "@/ui/properties/ColorPicker";
import { useState } from "react";
import { Sliders, Minimize2 } from "lucide-react";

export function PropertiesPanel() {
  const strokeWidth = useUIStore((s) => s.strokeWidth);
  const setStrokeWidth = useUIStore((s) => s.setStrokeWidth);
  const color = useUIStore((s) => s.color);
  const setColor = useUIStore((s) => s.setColor);
  const presets = useUIStore((s) => s.presets);
  const recentColors = useUIStore((s) => s.recentColors);
  const addPreset = useUIStore((s) => s.addPreset);
  const removePreset = useUIStore((s) => s.removePreset);

  const strokeStyle = useUIStore((s) => s.strokeStyle);
  const setStrokeStyle = useUIStore((s) => s.setStrokeStyle);
  const opacity = useUIStore((s) => s.opacity);
  const setOpacity = useUIStore((s) => s.setOpacity);

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="p-3 bg-(--bg-panel) border border-(--border-subtle) rounded-lg shadow-sm hover:bg-(--bg-canvas) transition-colors flex items-center justify-center"
        title="Show Properties"
      >
        <Sliders className="w-5 h-5 text-(--text-secondary)" />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-(--bg-panel) border border-(--border-subtle) rounded-lg shadow-sm w-64">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase text-(--text-secondary) tracking-wider">Properties</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCollapsed(true)}
            className="text-(--text-tertiary) hover:text-(--text-primary) transition-colors"
            title="Hide Properties"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <Sliders className="w-4 h-4 text-(--text-tertiary)" />
        </div>
      </div>

      {/* Stroke Color */}
      <div>
        <label className="text-xs text-(--text-tertiary) mb-2 block">Stroke Color</label>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <ColorButton
              key={preset}
              color={preset}
              active={preset === color}
              onClick={() => setColor(preset)}
            />
          ))}
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className={cn(
              "w-6 h-6 rounded-md border border-(--border-subtle) transition-all flex items-center justify-center text-xs text-(--text-tertiary) hover:bg-(--bg-canvas)",
              showColorPicker && "bg-(--accent-subtle)/20 text-(--accent-primary) border-(--accent-primary)/30"
            )}
            title="More colors"
          >
            +
          </button>
        </div>
        {showColorPicker && (
          <div className="mt-2 absolute z-50 left-full top-0 ml-2 bg-(--bg-panel) border border-(--border-subtle) rounded-lg shadow-xl p-2">
            <ColorPicker
              open={true}
              color={color}
              presets={presets}
              recentColors={recentColors}
              onChange={setColor}
              onClose={() => setShowColorPicker(false)}
              onAddPreset={addPreset}
              onRemovePreset={removePreset}
            />
          </div>
        )}
      </div>

      <div className="h-px bg-(--border-subtle)]" />

      {/* Stroke Width */}
      <div>
        <label className="text-xs text-(--text-tertiary)] mb-2 block">Stroke Width</label>
        <div className="flex items-center gap-2 mb-2">
           {[1, 2, 4, 8].map((w) => (
            <button
              key={w}
              onClick={() => setStrokeWidth(w)}
              className={cn(
                "flex-1 h-8 rounded-md border border-(--border-subtle) flex items-center justify-center hover:bg-(--bg-canvas) transition-colors",
                strokeWidth === w && "bg-(--accent-subtle)/20 border-(--accent-primary)/30"
              )}
              title={`${w}px`}
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
          min="1"
          max="20"
          step="1"
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
          className="w-full h-1 bg-(--border-subtle) rounded-full appearance-none cursor-pointer accent-(--accent-primary)"
        />
      </div>

      {/* Stroke Style */}
      <div>
        <label className="text-xs text-(--text-tertiary) mb-2 block">Stroke Style</label>
        <div className="flex gap-2">
           <button 
             onClick={() => setStrokeStyle("solid")}
             className={cn(
                "flex-1 h-8 rounded-md border border-(--border-subtle) flex items-center justify-center hover:bg-(--bg-canvas) transition-colors",
                strokeStyle === "solid" && "bg-(--accent-subtle)/20 border-(--accent-primary)/30"
             )}
            >
             <div className="w-4 h-0.5 bg-current rounded-full"></div>
           </button>
           <button 
             onClick={() => setStrokeStyle("dashed")}
             className={cn(
                "flex-1 h-8 rounded-md border border-(--border-subtle) flex items-center justify-center hover:bg-(--bg-canvas) transition-colors",
                strokeStyle === "dashed" && "bg-(--accent-subtle)/20 border-(--accent-primary)/30"
             )}
            >
             <div className="w-4 h-0.5 border-t-2 border-current border-dashed"></div>
           </button>
           <button 
             onClick={() => setStrokeStyle("dotted")}
             className={cn(
                "flex-1 h-8 rounded-md border border-(--border-subtle) flex items-center justify-center hover:bg-(--bg-canvas) transition-colors",
                strokeStyle === "dotted" && "bg-(--accent-subtle)/20 border-(--accent-primary)/30"
             )}
            >
             <div className="w-4 h-0.5 border-t-2 border-current border-dotted"></div>
           </button>
        </div>
      </div>

      {/* Opacity */}
      <div>
         <label className="text-xs text-(--text-tertiary) mb-2 block">Opacity</label>
         <input
          type="range"
          min="0"
          max="100"
          value={opacity}
          onChange={(e) => setOpacity(parseInt(e.target.value))}
          className="w-full h-1 bg-(--border-subtle) rounded-full appearance-none cursor-pointer accent-(--accent-primary)"
        />
      </div>

    </div>
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
      className={cn(
        "w-6 h-6 rounded-md border transition-all",
        active 
          ? "border-(--accent-primary) shadow-[0_0_0_2px_var(--accent-subtle)]" 
          : "border-(--border-subtle) hover:border-(--text-tertiary)"
      )}
      style={{ backgroundColor: color }}
      aria-label={`Select ${color}`}
      title={color}
    />
  );
}
