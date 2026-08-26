import type { ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({ title, onClose, children, maxWidth = "max-w-lg" }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`card mx-auto mt-8 w-full ${maxWidth} space-y-4 p-5`}>
        <div className="flex items-center justify-between">
          <h3 className="text-xl">{title}</h3>
          <button
            type="button"
            aria-label="Fechar"
            className="text-text-400 hover:text-text-900"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
