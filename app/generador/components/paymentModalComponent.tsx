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
            Importante sobre el pago
          </h3>
        </div>
        
        <div className="space-y-3 text-sm text-gray-700">
          <p>
            Serás redirigido a la plataforma de pagos y
          
            <strong> Dependiendo del método de pago:</strong>
          </p>
          
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Algunos métodos regresan automáticamente a generar tu acta</li>
            <li className="text-purple-600 font-bold">Otros requieren que hagas clic en "Volver al comercio"</li>
          </ul>
          
          <p className="text-orange-600 font-medium">
            Si ves un botón "Volver al comercio" o similar, haz clic en él para continuar con la generación de tu acta.
          </p>
        </div>
        
        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
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