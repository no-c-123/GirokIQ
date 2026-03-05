import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Palette, PenTool, Keyboard, Database, Search } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import { useUIStore } from "../../stores/useUIStore";
import { useKeyboardShortcuts } from "../../ui/hooks/useKeyboardShortcuts";
import { cn } from "../../utils";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"interface" | "drawing" | "shortcuts" | "system">("interface");
  const { settings, updateSettings } = useAppStore();
  const { 
    shapeRecognitionEnabled, 
    setShapeRecognitionEnabled,
    selectionFilter,
    setSelectionFilter
  } = useUIStore();
  const { shortcuts } = useKeyboardShortcuts();
  const [shortcutSearch, setShortcutSearch] = useState("");

  const filteredShortcuts = shortcuts.filter(s => 
    s.description.toLowerCase().includes(shortcutSearch.toLowerCase()) ||
    s.category.toLowerCase().includes(shortcutSearch.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl h-150 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl flex overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sidebar */}
            <div className="w-64 border-r border-white/5 bg-zinc-950/30 p-4 flex flex-col gap-1">
              <div className="px-3 py-4 mb-2">
                <h3 className="text-xl font-bold text-zinc-100">Settings</h3>
              </div>
              <TabButton 
                active={activeTab === "interface"} 
                onClick={() => setActiveTab("interface")}
                icon={Palette}
                label="Interface"
              />
              <TabButton 
                active={activeTab === "drawing"} 
                onClick={() => setActiveTab("drawing")}
                icon={PenTool}
                label="Drawing"
              />
              <TabButton 
                active={activeTab === "shortcuts"} 
                onClick={() => setActiveTab("shortcuts")}
                icon={Keyboard}
                label="Shortcuts"
              />
              <TabButton 
                active={activeTab === "system"} 
                onClick={() => setActiveTab("system")}
                icon={Database}
                label="System"
              />
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h4 className="text-lg font-medium text-zinc-200 capitalize">{activeTab}</h4>
                <button 
                  onClick={onClose}
                  className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                {activeTab === "interface" && (
                  <div className="space-y-8">
                    <section>
                      <h5 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Theme</h5>
                      <div className="grid grid-cols-3 gap-4">
                        <ThemeCard 
                          active={settings.theme === "dark"} 
                          onClick={() => updateSettings({ theme: "dark" })}
                          label="Dark"
                        />
                        <ThemeCard 
                          active={settings.theme === "light"} 
                          onClick={() => updateSettings({ theme: "light" })}
                          label="Light"
                        />
                        <ThemeCard 
                          active={settings.theme === "system"} 
                          onClick={() => updateSettings({ theme: "system" })}
                          label="System"
                        />
                      </div>
                    </section>
                  </div>
                )}

                {activeTab === "drawing" && (
                  <div className="space-y-8">
                    <section>
                      <h5 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Behaviors</h5>
                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                        <div>
                          <div className="text-zinc-100 font-medium">Shape Recognition</div>
                          <div className="text-sm text-zinc-500">Automatically convert sketches to geometric shapes</div>
                        </div>
                        <Switch 
                          checked={shapeRecognitionEnabled} 
                          onChange={setShapeRecognitionEnabled} 
                        />
                      </div>
                    </section>

                    <section>
                      <h5 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Selection Filters</h5>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                          <div>
                            <div className="text-zinc-100 font-medium">Select Images</div>
                            <div className="text-sm text-zinc-500">Allow lasso tool to select images</div>
                          </div>
                          <Switch 
                            checked={selectionFilter.images} 
                            onChange={(v) => setSelectionFilter({ images: v })} 
                          />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                          <div>
                            <div className="text-zinc-100 font-medium">Select Text</div>
                            <div className="text-sm text-zinc-500">Allow lasso tool to select text blocks</div>
                          </div>
                          <Switch 
                            checked={selectionFilter.text} 
                            onChange={(v) => setSelectionFilter({ text: v })} 
                          />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                          <div>
                            <div className="text-zinc-100 font-medium">Select Strokes</div>
                            <div className="text-sm text-zinc-500">Allow lasso tool to select handwriting</div>
                          </div>
                          <Switch 
                            checked={selectionFilter.strokes} 
                            onChange={(v) => setSelectionFilter({ strokes: v })} 
                          />
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {activeTab === "shortcuts" && (
                  <div className="space-y-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input 
                        type="text"
                        value={shortcutSearch}
                        onChange={(e) => setShortcutSearch(e.target.value)}
                        placeholder="Search shortcuts..."
                        className="w-full bg-black/20 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500/30 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      {filteredShortcuts.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-colors group">
                          <div>
                            <div className="text-zinc-200 font-medium">{s.description}</div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest">{s.category}</div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {s.keys.map((key, i) => (
                              <kbd key={i} className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-mono text-zinc-300 min-w-6 text-center border border-white/5">
                                {key === "meta" ? (navigator.platform.includes("Mac") ? "⌘" : "Ctrl") : key.toUpperCase()}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "system" && (
                  <div className="space-y-8">
                    <section>
                      <h5 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Storage & Cache</h5>
                      <button 
                        onClick={() => {
                          if (confirm("Are you sure you want to reset all settings?")) {
                            updateSettings({
                              theme: "dark",
                              autosaveInterval: 30,
                              defaultPenColor: "#a78bfa",
                              defaultPenWidth: 2,
                            });
                          }
                        }}
                        className="w-full p-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium transition-colors text-left"
                      >
                        Reset All Preferences
                      </button>
                    </section>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
        active 
          ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
          : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
      )}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}

function ThemeCard({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "aspect-video rounded-xl border p-3 flex flex-col justify-between transition-all",
        active 
          ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500" 
          : "border-white/5 bg-black/20 hover:border-white/10"
      )}
    >
      <div className="flex gap-1.5">
        <div className="w-2 h-2 rounded-full bg-zinc-700" />
        <div className="w-8 h-2 rounded-full bg-zinc-700" />
      </div>
      <div className="text-xs font-medium text-zinc-400">{label}</div>
    </button>
  );
}

function Switch({ checked, onChange }: { checked: boolean, onChange: (val: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "w-11 h-6 rounded-full transition-colors relative",
        checked ? "bg-indigo-500" : "bg-zinc-700"
      )}
    >
      <div className={cn(
        "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform",
        checked ? "translate-x-5" : "translate-x-0"
      )} />
    </button>
  );
}
