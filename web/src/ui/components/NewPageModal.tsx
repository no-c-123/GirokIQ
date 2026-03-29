import { motion, AnimatePresence } from "framer-motion";
import { FileText, PenTool, X } from "lucide-react";

interface NewPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: "canvas" | "document") => void;
}

export function NewPageModal({ isOpen, onClose, onSelect }: NewPageModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-zinc-100">Create New Page</h3>
              <button 
                onClick={onClose}
                className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-2 gap-4">
              <OptionButton
                icon={FileText}
                title="Typing Document"
                description="Text-based note interface"
                onClick={() => onSelect("document")}
                color="text-blue-400"
                bg="bg-blue-500/10"
              />
              <OptionButton
                icon={PenTool}
                title="Writing Canvas"
                description="Free-form sketching"
                onClick={() => onSelect("canvas")}
                color="text-indigo-400"
                bg="bg-indigo-500/10"
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function OptionButton({ 
  icon: Icon, 
  title, 
  description, 
  onClick, 
  color, 
  bg 
}: { 
  icon: any, 
  title: string, 
  description: string, 
  onClick: () => void,
  color: string,
  bg: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-4 p-6 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 transition-all group text-center"
    >
      <div className={`w-12 h-12 ${bg} ${color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="font-medium text-zinc-100 mb-1">{title}</div>
        <div className="text-xs text-zinc-500 leading-relaxed">{description}</div>
      </div>
    </button>
  );
}
