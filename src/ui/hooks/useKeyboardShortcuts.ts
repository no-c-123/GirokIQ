import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useCanvasStore } from "@/stores/useCanvasStore";
import { useUIStore } from "@/stores/useUIStore";
import { useHistoryStore } from "@/history/useHistoryStore";
import { useBlockStore } from "@/stores/useBlockStore";

export interface Shortcut {
  id: string;
  keys: string[]; // e.g., ["Control", "s"] or ["v"]
  description: string;
  action: () => void;
  category: "General" | "Tools" | "Editing" | "View";
}

export function useKeyboardShortcuts() {
  const { setSidebarVisible, sidebarVisible } = useAppStore();
  const { setTool, setSelectedIds, selectedIds } = useUIStore();
  const { elements, removeElement } = useCanvasStore();
  const { undo, redo } = useHistoryStore();
  const { deleteBlock, selectedBlockId } = useBlockStore();

  const shortcuts: Shortcut[] = [
    {
      id: "toggle-sidebar",
      keys: ["meta", "s"],
      description: "Toggle Sidebar",
      category: "General",
      action: () => setSidebarVisible(!sidebarVisible),
    },
    {
      id: "undo",
      keys: ["meta", "z"],
      description: "Undo",
      category: "Editing",
      action: () => undo(),
    },
    {
      id: "redo",
      keys: ["meta", "shift", "z"],
      description: "Redo",
      category: "Editing",
      action: () => redo(),
    },
    {
      id: "delete",
      keys: ["delete"],
      description: "Delete Selected",
      category: "Editing",
      action: () => {
        // Delete selected strokes
        if (selectedIds.length > 0) {
          selectedIds.forEach(id => {
            if (elements.some(s => s.id === id)) {
              void removeElement(id);
            } else {
              void deleteBlock(id);
            }
          });
          setSelectedIds([]);
        } else if (selectedBlockId) {
          void deleteBlock(selectedBlockId);
        }
      },
    },
    {
      id: "tool-pen",
      keys: ["p"],
      description: "Pen Tool",
      category: "Tools",
      action: () => setTool("pen"),
    },
    {
      id: "tool-eraser",
      keys: ["e"],
      description: "Eraser Tool",
      category: "Tools",
      action: () => setTool("eraser"),
    },
    {
      id: "tool-text",
      keys: ["t"],
      description: "Text Tool",
      category: "Tools",
      action: () => setTool("text"),
    },
    {
      id: "tool-lasso",
      keys: ["v"],
      description: "Lasso Tool",
      category: "Tools",
      action: () => setTool("lasso"),
    },
  ];

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing
      const target = e.target as HTMLElement;
      if (target.tagName.toLowerCase() === "input" || target.tagName.toLowerCase() === "textarea" || target.isContentEditable) {
        return;
      }

      const pressedKeys = new Set<string>();
      if (e.metaKey || e.ctrlKey) pressedKeys.add("meta");
      if (e.shiftKey) pressedKeys.add("shift");
      if (e.altKey) pressedKeys.add("alt");
      pressedKeys.add(e.key.toLowerCase());

      for (const shortcut of shortcuts) {
        if (shortcut.keys.length !== pressedKeys.size) continue;
        if (shortcut.keys.every(k => pressedKeys.has(k))) {
          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcuts]);

  return { shortcuts };
}
