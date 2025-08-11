"use client";

import * as React from 'react';

interface AlertModalProps {
  open: boolean;
  message: string;
  onClose: () => void;
}

export default function AlertModalComponent({ open, message, onClose }: AlertModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
        <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">⚠️ Alerta ⚠️</h2>
        <p className="text-gray-600 mb-4">{message}</p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}


