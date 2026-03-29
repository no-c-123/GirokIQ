import { useBlockStore } from "@/stores/useBlockStore";
import { Trash2 } from "lucide-react";
import { useUIStore } from "@/stores/useUIStore";
import { useEffect } from "react";

interface DeleteButtonProps {
  block?: { id: string };
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  title?: string;
}

export default function DeleteButton({ block, onClick, className = "", title = "Delete" }: DeleteButtonProps) {
  const isSelected = useUIStore((s) => block ? s.selectedIds.includes(block.id) : false);
  const deleteBlock = useBlockStore((s) => s.deleteBlock);

  useEffect(() => {
    if (isSelected && block) {
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Delete" || e.key === "Backspace") {
          const target = e.target as HTMLElement;
          if (target.tagName.toLowerCase() === "textarea") return;
          void deleteBlock(block.id);
        }
      };
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }
  }, [isSelected, block?.id, deleteBlock]);
    
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(e);
    } else if (block) {
      void deleteBlock(block.id);
    }
  };

  return (
    <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={handleClick}
        className={`bg-zinc-900 border border-white/10 p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all shadow-xl backdrop-blur-md flex items-center justify-center ${block ? 'absolute -top-10 left-0' : ''} ${className}`}
        title={title}
    >
        <Trash2 className="w-4 h-4" />
    </button>
  )
}