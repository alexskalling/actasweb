"use client";

import * as React from 'react';

interface AlertModalProps {
  open: boolean;
  message: string;
  onClose: () => void;
  allowRename?: boolean;
  onRename?: (newName: string) => void;
  currentFileName?: string;
}

export default function AlertModalComponent({ 
  open, 
  message, 
  onClose, 
  allowRename = false,
  onRename,
  currentFileName = ""
}: AlertModalProps) {
  const [newName, setNewName] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (open && allowRename && currentFileName) {
      const nameWithoutExt = currentFileName.replace(/\.[^/.]+$/, "");
      setNewName(nameWithoutExt);
      setError("");
    }
  }, [open, allowRename, currentFileName]);

  if (!open) return null;

  const handleRename = () => {
    if (!newName || newName.trim() === "") {
      setError("Por favor ingresa un nombre válido.");
      return;
    }

    if (newName.trim().length < 3) {
      setError("El nombre debe tener al menos 3 caracteres.");
      return;
    }

    const extension = currentFileName.includes(".") 
      ? currentFileName.substring(currentFileName.lastIndexOf("."))
      : "";
    
    const finalName = newName.trim() + extension;
    
    if (onRename) {
      onRename(finalName);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
        <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">
          {allowRename ? "⚠️ Nombre duplicado ⚠️" : "⚠️ Alerta ⚠️"}
        </h2>
        <p className="text-gray-600 mb-4">{message}</p>
        
        {allowRename && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ingresa un nuevo nombre para el archivo:
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setError("");
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Nombre del archivo"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRename();
                }
              }}
            />
            {error && (
              <p className="text-red-500 text-sm mt-1">{error}</p>
            )}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          {allowRename ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={handleRename}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Usar este nombre
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


