"use client";

import * as React from 'react';

interface SimplePaymentModalProps {
  open: boolean;
  onConfirm: () => void;
}

export default function SimplePaymentModalComponent({ open, onConfirm }: SimplePaymentModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-4">💳 Recuerda</h2>
          <p className="text-gray-600 mb-6">
            Serás enviado a la pasarela de pago de Wompi. Recuerda al finalizar el pago dar clic en
            <span className="font-bold text-purple-600"> &quot;Finalizar Proceso&quot; </span> o
            <span className="font-bold text-purple-600"> &quot;Redirigir al Comercio&quot; </span>
            para generar tu acta. Si es que no se da de manera automática.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onConfirm}
              className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              Entiendo, continuar con el pago
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
