"use client";

import * as React from "react";

interface ConfirmReenviarCorreoModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  nombreUsuario?: string | null;
  emailUsuario?: string | null;
}

export default function ConfirmReenviarCorreoModalComponent({
  open,
  onClose,
  onConfirm,
  loading = false,
  nombreUsuario,
  emailUsuario,
}: ConfirmReenviarCorreoModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          📧 Reenviar correo
        </h2>
        <p className="text-gray-600 mb-6">
          Confirma que le enviaremos de nuevo el correo al{" "}
          <strong>{nombreUsuario || "usuario"}</strong> dueño del acta y su
          correo <strong>{emailUsuario || "N/A"}</strong>.
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            )}
            Reenviar correo
          </button>
        </div>
      </div>
    </div>
  );
}
