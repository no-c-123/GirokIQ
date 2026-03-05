import { useState, useRef, useEffect } from "react";
import { 
  Folder as FolderIcon, 
  Book, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  Search, 
  Plus, 
  Settings,
  MoreHorizontal,
  Trash2,
  Edit2,
  FolderPlus,
  BookPlus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../utils";
import type { Folder } from "../../data/types";
import type { Notebook } from "../../data/types";
import type { Page } from "../../pages/types";
import { useAppStore } from "../../store/useAppStore";
import { NamingModal } from "./NamingModal";
import { SettingsModal } from "./SettingsModal";

export function Sidebar() {
  const folders = useAppStore((s) => s.folders);
  const notebooks = useAppStore((s) => s.notebooks);
  const pages = useAppStore((s) => s.pages);
  const activePageId = useAppStore((s) => s.activePageId);
  const setActivePage = useAppStore((s) => s.setActivePage);
  const addPage = useAppStore((s) => s.addPage);
  const deletePage = useAppStore((s) => s.deletePage);
  const addFolder = useAppStore((s) => s.addFolder);
  const addNotebook = useAppStore((s) => s.addNotebook);
  const deleteFolder = useAppStore((s) => s.deleteFolder);
  const deleteNotebook = useAppStore((s) => s.deleteNotebook);

  const [namingModal, setNamingModal] = useState<{
    isOpen: boolean;
    type: "folder" | "notebook";
    parentId?: string;
  }>({ isOpen: false, type: "folder" });
  const [showSettings, setShowSettings] = useState(false);

  const handleDeletePage = (id: string) => {
    if (confirm("Are you sure you want to delete this page?")) {
        void deletePage(id);
    }
  };

  const handleDeleteFolder = (id: string) => {
    if (confirm("Are you sure you want to delete this folder? All notebooks and pages inside will be deleted.")) {
        void deleteFolder(id);
    }
  };

  const handleDeleteNotebook = (id: string) => {
    if (confirm("Are you sure you want to delete this notebook? All pages inside will be deleted.")) {
        void deleteNotebook(id);
    }
  };

  const handleCreateNaming = (name: string) => {
    if (namingModal.type === "folder") {
      const newFolder: Folder = {
        id: crypto.randomUUID(),
        name,
        parentId: null,
        createdAt: Date.now(),
      };
      void addFolder(newFolder);
    } else {
      const newNotebook: Notebook = {
        id: crypto.randomUUID(),
        name,
        folderId: namingModal.parentId || null,
        createdAt: Date.now(),
      };
      void addNotebook(newNotebook);
    }
    setNamingModal({ ...namingModal, isOpen: false });
  };

  const handleNewPage = (notebookId?: string) => {
    const targetNotebookId = notebookId || (notebooks.length > 0 ? notebooks[0].id : null);
    
    if (targetNotebookId) {
      const newPage: Page = {
        id: crypto.randomUUID(),
        notebookId: targetNotebookId,
        title: "Untitled Page",
        type: "canvas",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        settings: {
          size: "A4",
          orientation: "portrait",
          grid: "dotted",
          zoom: 1,
        }
      };
      void addPage(newPage);
    } else {
      alert("Please create a notebook first.");
    }
  };

  return (
    <>
      <aside className="h-full w-70 flex flex-col bg-zinc-900/30 backdrop-blur-xl border-r border-white/5 text-zinc-400">
        {/* Header */}
        <div className="p-4 pt-6">
          <div className="flex items-center gap-2 mb-6 px-2">
            <div className="w-6 h-6 rounded-md bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            </div>
            <span className="font-medium text-zinc-100 tracking-tight">Syllabus</span>
          </div>

          {/* Search */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full bg-black/20 border border-white/5 rounded-lg py-2 pl-9 pr-3 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/30 focus:bg-indigo-500/5 transition-all placeholder:text-zinc-600"
            />
          </div>
        </div>

        {/* Navigation Tree */}
        <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          <div className="space-y-0.5">
            <div className="px-3 py-1.5 text-xs font-medium text-zinc-600 uppercase tracking-wider mb-1">
              Library
            </div>
            
            {/* Folders */}
            {folders.map(folder => (
              <FolderItem 
                key={folder.id} 
                folder={folder} 
                notebooks={notebooks.filter(n => n.folderId === folder.id)}
                pages={pages}
                activePageId={activePageId || undefined}
                onPageSelect={setActivePage}
                onDeletePage={handleDeletePage}
                onDeleteFolder={handleDeleteFolder}
                onDeleteNotebook={handleDeleteNotebook}
                onAddNotebook={(folderId) => setNamingModal({ isOpen: true, type: "notebook", parentId: folderId })}
                onAddPage={handleNewPage}
              />
            ))}

            {/* Uncategorized Notebooks (if any) */}
            {notebooks.filter(n => !n.folderId).map(notebook => (
              <NotebookItem 
                key={notebook.id} 
                notebook={notebook} 
                pages={pages.filter(p => p.notebookId === notebook.id)}
                activePageId={activePageId || undefined}
                onPageSelect={setActivePage}
                onDeletePage={handleDeletePage}
                onDeleteNotebook={handleDeleteNotebook}
                onAddPage={handleNewPage}
              />
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/5 space-y-1">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button 
              onClick={() => setNamingModal({ isOpen: true, type: "folder" })}
              className="flex items-center justify-center gap-2 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-white/5 border border-white/5 rounded-lg transition-colors group"
              title="New Folder"
            >
              <FolderPlus className="w-3.5 h-3.5 group-hover:text-indigo-400 transition-colors" />
              <span>Folder</span>
            </button>
            <button 
              onClick={() => setNamingModal({ isOpen: true, type: "notebook" })}
              className="flex items-center justify-center gap-2 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-white/5 border border-white/5 rounded-lg transition-colors group"
              title="New Notebook"
            >
              <BookPlus className="w-3.5 h-3.5 group-hover:text-indigo-400 transition-colors" />
              <span>Notebook</span>
            </button>
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-white/5 rounded-lg transition-colors group"
          >
            <Settings className="w-4 h-4 group-hover:text-indigo-400 transition-colors" />
            <span>Settings</span>
          </button>
          <button 
            onClick={() => handleNewPage()}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-white/5 rounded-lg transition-colors group"
          >
            <Plus className="w-4 h-4 group-hover:text-indigo-400 transition-colors" />
            <span>New Page</span>
          </button>
        </div>

        <NamingModal
          isOpen={namingModal.isOpen}
          onClose={() => setNamingModal({ ...namingModal, isOpen: false })}
          onConfirm={handleCreateNaming}
          title={`Create New ${namingModal.type === "folder" ? "Folder" : "Notebook"}`}
          placeholder={`Enter ${namingModal.type} name...`}
        />
      </aside>
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}

function FolderItem({ folder, notebooks, pages, activePageId, onPageSelect, onDeletePage, onDeleteFolder, onDeleteNotebook, onAddNotebook, onAddPage }: { 
  folder: Folder, 
  notebooks: Notebook[],
  pages: Page[],
  activePageId?: string,
  onPageSelect: (id: string) => void,
  onDeletePage: (id: string) => void,
  onDeleteFolder: (id: string) => void,
  onDeleteNotebook: (id: string) => void,
  onAddNotebook: (folderId: string) => void,
  onAddPage: (notebookId: string) => void
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [isOverflowHidden, setIsOverflowHidden] = useState(true);

  return (
    <div className="mb-1">
      <div className="flex items-center group/folder">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center flex-1 px-2 py-1.5 text-sm rounded-md hover:bg-white/5 text-zinc-300 hover:text-zinc-100 transition-colors group"
        >
          <span className="mr-1 opacity-50 group-hover:opacity-100 transition-opacity text-zinc-500">
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
          <FolderIcon className="w-4 h-4 mr-2 text-zinc-400 group-hover:text-indigo-300 transition-colors" />
          <span className="truncate font-medium">{folder.name}</span>
        </button>
        <div className="flex items-center opacity-0 group-hover/folder:opacity-100 transition-opacity">
            <button
            onClick={() => onAddNotebook(folder.id)}
            className="p-1.5 text-zinc-500 hover:text-zinc-200 transition-all"
            title="New Notebook in Folder"
            >
            <BookPlus className="w-3.5 h-3.5" />
            </button>
            <button
            onClick={() => onDeleteFolder(folder.id)}
            className="p-1.5 text-zinc-500 hover:text-rose-400 transition-all"
            title="Delete Folder"
            >
            <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
      </div>

      <AnimatePresence 
        initial={false}
        onExitComplete={() => setIsOverflowHidden(true)}
      >
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            onAnimationStart={() => setIsOverflowHidden(true)}
            onAnimationComplete={() => setIsOverflowHidden(false)}
            className={cn(isOverflowHidden ? "overflow-hidden" : "overflow-visible")}
          >
            <div className="pl-4 border-l border-white/5 ml-3.5 mt-0.5 space-y-0.5">
              {notebooks.map(notebook => (
                <NotebookItem 
                  key={notebook.id} 
                  notebook={notebook} 
                  pages={pages.filter(p => p.notebookId === notebook.id)}
                  activePageId={activePageId}
                  onPageSelect={onPageSelect}
                  onDeletePage={onDeletePage}
                  onDeleteNotebook={onDeleteNotebook}
                  onAddPage={onAddPage}
                />
              ))}
              {notebooks.length === 0 && (
                <div className="px-2 py-1 text-xs text-zinc-700 italic">Empty folder</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotebookItem({ notebook, pages, activePageId, onPageSelect, onDeletePage, onDeleteNotebook, onAddPage }: { 
  notebook: Notebook, 
  pages: Page[],
  activePageId?: string,
  onPageSelect: (id: string) => void,
  onDeletePage: (id: string) => void,
  onDeleteNotebook: (id: string) => void,
  onAddPage: (notebookId: string) => void
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [isOverflowHidden, setIsOverflowHidden] = useState(true);

  return (
    <div className="mb-0.5">
      <div className="flex items-center group/notebook">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center flex-1 px-2 py-1.5 text-sm rounded-md hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors group"
        >
          <span className="mr-1 opacity-50 group-hover:opacity-100 transition-opacity">
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
          <Book className="w-3.5 h-3.5 mr-2 text-zinc-500 group-hover:text-indigo-400/70 transition-colors" />
          <span className="truncate">{notebook.name}</span>
        </button>
        <div className="flex items-center opacity-0 group-hover/notebook:opacity-100 transition-opacity">
            <button
            onClick={() => onAddPage(notebook.id)}
            className="p-1.5 text-zinc-500 hover:text-zinc-200 transition-all"
            title="New Page in Notebook"
            >
            <Plus className="w-3.5 h-3.5" />
            </button>
            <button
            onClick={() => onDeleteNotebook(notebook.id)}
            className="p-1.5 text-zinc-500 hover:text-rose-400 transition-all"
            title="Delete Notebook"
            >
            <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
      </div>

      <AnimatePresence 
        initial={false}
        onExitComplete={() => setIsOverflowHidden(true)}
      >
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onAnimationStart={() => setIsOverflowHidden(true)}
            onAnimationComplete={() => setIsOverflowHidden(false)}
            className={cn(isOverflowHidden ? "overflow-hidden" : "overflow-visible")}
          >
            <div className="pl-4 ml-3.5 mt-0.5 space-y-0.5">
              {pages.map(page => (
                <PageItem 
                  key={page.id} 
                  page={page} 
                  isActive={activePageId === page.id}
                  onSelect={() => onPageSelect(page.id)}
                  onDelete={() => onDeletePage(page.id)}
                />
              ))}
              {pages.length === 0 && (
                <div className="px-2 py-1 text-xs text-zinc-700 italic">No pages</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PageItem({ page, isActive, onSelect, onDelete }: { 
  page: Page, 
  isActive: boolean, 
  onSelect: () => void,
  onDelete: () => void 
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex items-center w-full px-2 py-1.5 rounded-md transition-all group relative cursor-pointer select-none",
        isActive 
          ? "bg-indigo-500/10 text-indigo-100 font-medium" 
          : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5",
        showMenu && "bg-white/5 text-zinc-200"
      )}
    >
      {isActive && (
        <motion.div 
          layoutId="active-indicator"
          className="absolute left-0 w-0.5 h-4 bg-indigo-400 rounded-full shadow-[0_0_12px_rgba(129,140,248,0.8)]"
        />
      )}
      <FileText className={cn(
        "w-3.5 h-3.5 mr-2 transition-colors",
        isActive ? "text-indigo-300" : "text-zinc-600 group-hover:text-zinc-500"
      )} />
      <span className="truncate text-[13px]">{page.title}</span>
      
      {/* Three dots button */}
      <div 
        className={cn(
          "ml-auto p-1 rounded hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100",
          (isActive || showMenu) && "opacity-100",
          showMenu && "bg-white/10 text-zinc-200"
        )}
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
      >
        <MoreHorizontal className="w-3 h-3 text-zinc-600 hover:text-zinc-300" />
      </div>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-full mt-1 w-32 bg-zinc-900 border border-white/10 rounded-lg shadow-xl overflow-hidden z-50"
            style={{ 
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)', 
              right: '0', // Align with right edge to avoid clipping
              zIndex: 50
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-1">
              <button className="flex items-center w-full px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-white/5 rounded transition-colors text-left">
                <Edit2 className="w-3 h-3 mr-2" />
                Rename
              </button>
              <button 
                onClick={() => {
                  onDelete();
                  setShowMenu(false);
                }}
                className="flex items-center w-full px-2 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors text-left"
              >
                <Trash2 className="w-3 h-3 mr-2" />
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
