"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="modal-shell bg-black/75 backdrop-blur-sm z-[70]"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.92, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        className="modal-panel glass-panel rounded-2xl max-w-sm p-6 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center
              ${danger ? "bg-red-500/15 text-red-400" : "bg-[#81b64c]/15 text-[#81b64c]"}`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-white/50 text-sm mt-1">{message}</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="btn-ghost flex-1 py-3 rounded-xl text-sm font-medium"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors
              ${danger
                ? "bg-red-500/90 hover:bg-red-500 text-white"
                : "btn-primary"
              }`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
