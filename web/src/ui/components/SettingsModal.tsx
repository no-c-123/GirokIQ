import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Palette, PenTool, Keyboard, Database, Search, Trash2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useUIStore } from "@/stores/useUIStore";
import { useKeyboardShortcuts } from "@/ui/hooks/useKeyboardShortcuts";
import { cn } from "@/utils";

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

  const toggleTheme = (theme: "dark" | "light" | "system") => {
    updateSettings({ theme });
    // Apply theme immediately
    if (theme === "system") {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

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
            className="relative w-full max-w-4xl h-150 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl flex overflow-hidden z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sidebar */}
            <div className="w-64 border-r border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-4 flex flex-col gap-1">
              <div className="px-3 py-4 mb-2">
                <h3 className="text-xl font-bold text-[var(--text-primary)]">Settings</h3>
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
            <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-panel)]">
              <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <h4 className="text-lg font-medium text-[var(--text-primary)] capitalize">{activeTab}</h4>
                <button 
                  onClick={onClose}
                  className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-canvas)] rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                {activeTab === "interface" && (
                  <div className="space-y-8">
                    <section>
                      <h5 className="text-sm font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-4">Theme</h5>
                      <div className="grid grid-cols-3 gap-4">
                        <ThemeCard 
                          active={settings.theme === "dark"} 
                          onClick={() => toggleTheme("dark")}
                          label="Dark"
                        />
                        <ThemeCard 
                          active={settings.theme === "light"} 
                          onClick={() => toggleTheme("light")}
                          label="Light"
                        />
                        <ThemeCard 
                          active={settings.theme === "system"} 
                          onClick={() => toggleTheme("system")}
                          label="System"
                        />
                      </div>
                    </section>
                  </div>
                )}

                {activeTab === "drawing" && (
                  <div className="space-y-8">
                    <section>
                      <h5 className="text-sm font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-4">Behaviors</h5>
                      <div className="flex items-center justify-between p-4 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)] transition-colors">
                        <div>
                          <div className="text-[var(--text-primary)] font-medium">Shape Recognition</div>
                          <div className="text-sm text-[var(--text-secondary)]">Automatically convert sketches to geometric shapes</div>
                        </div>
                        <Switch 
                          checked={shapeRecognitionEnabled} 
                          onChange={setShapeRecognitionEnabled} 
                        />
                      </div>
                    </section>

                    <section>
                      <h5 className="text-sm font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-4">Selection Filters</h5>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-4 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)] transition-colors">
                          <div>
                            <div className="text-[var(--text-primary)] font-medium">Select Images</div>
                            <div className="text-sm text-[var(--text-secondary)]">Allow lasso tool to select images</div>
                          </div>
                          <Switch 
                            checked={selectionFilter.images} 
                            onChange={(v) => setSelectionFilter({ images: v })} 
                          />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)] transition-colors">
                          <div>
                            <div className="text-[var(--text-primary)] font-medium">Select Text</div>
                            <div className="text-sm text-[var(--text-secondary)]">Allow lasso tool to select text blocks</div>
                          </div>
                          <Switch 
                            checked={selectionFilter.text} 
                            onChange={(v) => setSelectionFilter({ text: v })} 
                          />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)] transition-colors">
                          <div>
                            <div className="text-[var(--text-primary)] font-medium">Select Strokes</div>
                            <div className="text-sm text-[var(--text-secondary)]">Allow lasso tool to select handwriting</div>
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
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                      <input 
                        type="text"
                        value={shortcutSearch}
                        onChange={(e) => setShortcutSearch(e.target.value)}
                        placeholder="Search shortcuts..."
                        className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]/30 transition-all placeholder:text-[var(--text-tertiary)]"
                      />
                    </div>
                    <div className="space-y-2">
                      {filteredShortcuts.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-3 hover:bg-[var(--bg-canvas)] rounded-lg transition-colors group">
                          <div>
                            <div className="text-[var(--text-primary)] font-medium">{s.description}</div>
                            <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-widest">{s.category}</div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {s.keys.map((key, i) => (
                              <kbd key={i} className="px-1.5 py-0.5 bg-[var(--bg-panel)] rounded text-[10px] font-mono text-[var(--text-secondary)] min-w-6 text-center border border-[var(--border-subtle)]">
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
                      <h5 className="text-sm font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-4">Storage & Cache</h5>
                      <div className="space-y-3">
                        <button 
                          onClick={async () => {
                            if (confirm("Are you sure? This will delete all your notes and drawings permanently. This action cannot be undone.")) {
                              const { db } = await import("../../db");
                              await db.delete();
                              localStorage.clear();
                              window.location.reload();
                            }
                          }}
                          className="w-full p-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm font-medium transition-colors text-left flex items-center justify-between group"
                        >
                          <div>
                            <div className="font-bold">Clear All Data & Reset</div>
                            <div className="text-xs opacity-60">Permanently delete all notebooks and reset preferences</div>
                          </div>
                          <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        </button>

                        <button 
                          onClick={() => {
                            if (confirm("Are you sure you want to reset all settings? Your notes will be kept.")) {
                              updateSettings({
                                theme: "dark",
                                autosaveInterval: 30,
                                defaultPenColor: "#a78bfa",
                                defaultPenWidth: 2,
                              });
                            }
                          }}
                          className="w-full p-4 bg-[var(--bg-canvas)] hover:bg-[var(--bg-sidebar)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-secondary)] text-sm font-medium transition-colors text-left"
                        >
                          Reset Preferences Only
                        </button>
                      </div>
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
          ? "bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/20" 
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel)]"
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
          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 ring-1 ring-[var(--accent-primary)]" 
          : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--border-strong)]"
      )}
    >
      <div className="flex gap-1.5">
        <div className="w-2 h-2 rounded-full bg-[var(--text-tertiary)]" />
        <div className="w-8 h-2 rounded-full bg-[var(--text-tertiary)]" />
      </div>
      <div className="text-xs font-medium text-[var(--text-secondary)]">{label}</div>
    </button>
  );
}

function Switch({ checked, onChange }: { checked: boolean, onChange: (val: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "w-11 h-6 rounded-full transition-colors relative",
        checked ? "bg-[var(--accent-primary)]" : "bg-[var(--border-strong)]"
      )}
    >
      <div className={cn(
        "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform",
        checked ? "translate-x-5" : "translate-x-0"
      )} />
    </button>
  );
}
