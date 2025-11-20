"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { X, AlertCircle } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function PaymentModalComponent({
  isOpen,
  onClose,
  onConfirm,
}: PaymentModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center mb-4">
          <AlertCircle className="h-6 w-6 text-orange-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            Información importante
          </h3>
        </div>

        <div className="space-y-3 text-sm text-gray-700">
          <p>Se abrirá un modal de pago seguro de ePayco.</p>

          <p>
            <strong>Proceso de pago:</strong>
          </p>

          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Completa el pago directamente en el modal</li>
            <li>El modal se cerrará automáticamente al finalizar</li>
            <li>No necesitarás salir de esta página</li>
          </ul>

          <p className="text-green-600 font-medium">
            El proceso es rápido y seguro, todo queda en esta página.
          </p>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            Lo entiendo, proceder con el pago
          </Button>
        </div>
      </div>
    </div>
  );
}
