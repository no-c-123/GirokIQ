import { useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  formatHsl,
  formatRgb,
  hexToRgb,
  hslToRgb,
  normalizeHex,
  parseHsl,
  parseRgb,
  rgbToHex,
  rgbToHsl,
} from "@/utils/color";

export function ColorPicker({
  open,
  color,
  presets,
  recentColors,
  onChange,
  onClose,
  onAddPreset,
  onRemovePreset,
}: {
  open: boolean;
  color: string;
  presets: string[];
  recentColors: string[];
  onChange: (color: string) => void;
  onClose: () => void;
  onAddPreset?: (color: string) => void;
  onRemovePreset?: (color: string) => void;
}) {
  const normalizedColor = normalizeHex(color) ?? "#a78bfa";
  const rgb = useMemo(() => hexToRgb(normalizedColor) ?? { r: 167, g: 139, b: 250 }, [
    normalizedColor,
  ]);
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);

  const [hexInput, setHexInput] = useState(() => normalizedColor);
  const [rgbInput, setRgbInput] = useState(() => formatRgb(rgb));
  const [hslInput, setHslInput] = useState(() => formatHsl(hsl));

  if (!open) return null;

  const applyHex = (value: string) => {
    setHexInput(value);
    const next = normalizeHex(value);
    if (next) onChange(next);
  };

  const applyRgb = (value: string) => {
    setRgbInput(value);
    const nextRgb = parseRgb(value);
    if (!nextRgb) return;
    onChange(rgbToHex(nextRgb));
  };

  const applyHsl = (value: string) => {
    setHslInput(value);
    const nextHsl = parseHsl(value);
    if (!nextHsl) return;
    onChange(rgbToHex(hslToRgb(nextHsl)));
  };

  return (
    <div className="w-64 flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <div className="text-sm font-medium text-[var(--text-secondary)]">Color</div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-[var(--bg-canvas)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Close color picker"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg border border-[var(--border-subtle)] shadow-sm"
            style={{ backgroundColor: normalizedColor }}
          />
          <div className="flex-1">
            <div className="relative w-full h-10 rounded-lg border border-[var(--border-subtle)] overflow-hidden">
                <input
                type="color"
                value={normalizedColor}
                onChange={(e) => onChange(e.target.value)}
                className="absolute -top-2 -left-2 w-[200%] h-[200%] cursor-pointer p-0 m-0 opacity-0"
                />
                <div className="w-full h-full flex items-center px-3 text-xs text-[var(--text-secondary)] font-mono">
                    {normalizedColor.toUpperCase()}
                </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <label className="flex items-center gap-3">
            <span className="w-8 text-xs text-[var(--text-tertiary)]">HEX</span>
            <input
              value={hexInput}
              onChange={(e) => applyHex(e.target.value)}
              className="flex-1 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-md px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
              inputMode="text"
              spellCheck={false}
            />
          </label>
          <label className="flex items-center gap-3">
            <span className="w-8 text-xs text-[var(--text-tertiary)]">RGB</span>
            <input
              value={rgbInput}
              onChange={(e) => applyRgb(e.target.value)}
              className="flex-1 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-md px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
              inputMode="text"
              spellCheck={false}
            />
          </label>
          <label className="flex items-center gap-3">
            <span className="w-8 text-xs text-[var(--text-tertiary)]">HSL</span>
            <input
              value={hslInput}
              onChange={(e) => applyHsl(e.target.value)}
              className="flex-1 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-md px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
              inputMode="text"
              spellCheck={false}
            />
          </label>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-[var(--text-tertiary)] flex justify-between items-center">
            <span>Presets</span>
            <span className="text-[10px] opacity-50">Right-click to delete</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((swatch) => {
              const isActive = swatch === normalizedColor;
              return (
                <button
                  key={swatch}
                  onClick={() => onChange(swatch)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onRemovePreset?.(swatch);
                  }}
                  className="w-6 h-6 rounded-md border border-[var(--border-subtle)] transition-all relative group"
                  style={{
                    backgroundColor: swatch,
                    borderColor: isActive ? "var(--accent-primary)" : undefined,
                    boxShadow: isActive ? "0 0 0 1px var(--accent-primary)" : undefined,
                  }}
                  aria-label={`Select ${swatch}`}
                  title="Right-click to delete"
                />
              );
            })}
             <button
              onClick={() => onAddPreset?.(normalizedColor)}
              className="w-6 h-6 rounded-md border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--bg-canvas)] hover:text-[var(--text-primary)] transition-colors"
              title="Add current color to presets"
            >
              <span className="text-lg leading-none">+</span>
            </button>
          </div>
        </div>
        
        {recentColors.length > 0 && (
            <div className="space-y-2">
            <div className="text-xs text-[var(--text-tertiary)]">Recent</div>
            <div className="flex flex-wrap gap-1.5">
                {recentColors.filter(c => !presets.includes(c)).slice(0, 10).map((swatch) => {
                const isActive = swatch === normalizedColor;
                return (
                    <button
                    key={swatch}
                    onClick={() => onChange(swatch)}
                    className="w-6 h-6 rounded-md border border-[var(--border-subtle)] transition-all"
                    style={{
                        backgroundColor: swatch,
                        borderColor: isActive ? "var(--accent-primary)" : undefined,
                        boxShadow: isActive ? "0 0 0 1px var(--accent-primary)" : undefined,
                    }}
                    aria-label={`Select ${swatch}`}
                    />
                );
                })}
            </div>
            </div>
        )}
      </div>
    </div>
  );
}
