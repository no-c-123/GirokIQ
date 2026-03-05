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
} from "../../utils/color";

export function ColorPicker({
  open,
  color,
  presets,
  recentColors,
  onChange,
  onClose,
}: {
  open: boolean;
  color: string;
  presets: string[];
  recentColors: string[];
  onChange: (color: string) => void;
  onClose: () => void;
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

  const swatches = [
    ...presets,
    ...recentColors.filter((c) => !presets.includes(c)),
  ].slice(0, 18);

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-85 rounded-2xl border border-white/10 bg-zinc-950/90 backdrop-blur-xl shadow-2xl overflow-hidden z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="text-sm text-zinc-200 font-medium">Color</div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-zinc-100 transition-colors"
          aria-label="Close color picker"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl border border-white/10 shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
            style={{ backgroundColor: normalizedColor }}
          />
          <div className="flex-1">
            <input
              type="color"
              value={normalizedColor}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-10 rounded-xl bg-transparent border border-white/10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <label className="flex items-center gap-3">
            <span className="w-10 text-xs text-zinc-500">HEX</span>
            <input
              value={hexInput}
              onChange={(e) => applyHex(e.target.value)}
              className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/40"
              inputMode="text"
              spellCheck={false}
            />
          </label>
          <label className="flex items-center gap-3">
            <span className="w-10 text-xs text-zinc-500">RGB</span>
            <input
              value={rgbInput}
              onChange={(e) => applyRgb(e.target.value)}
              className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/40"
              inputMode="text"
              spellCheck={false}
            />
          </label>
          <label className="flex items-center gap-3">
            <span className="w-10 text-xs text-zinc-500">HSL</span>
            <input
              value={hslInput}
              onChange={(e) => applyHsl(e.target.value)}
              className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500/40"
              inputMode="text"
              spellCheck={false}
            />
          </label>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-zinc-500">Presets + Recent</div>
          <div className="flex flex-wrap gap-2">
            {swatches.map((swatch) => {
              const isActive = swatch === normalizedColor;
              return (
                <button
                  key={swatch}
                  onClick={() => onChange(swatch)}
                  className="w-7 h-7 rounded-full border border-white/10 transition-all"
                  style={{
                    backgroundColor: swatch,
                    boxShadow: isActive
                      ? "0 0 0 2px rgba(167,139,250,0.35), 0 0 18px rgba(167,139,250,0.25)"
                      : undefined,
                  }}
                  aria-label={`Select ${swatch}`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
