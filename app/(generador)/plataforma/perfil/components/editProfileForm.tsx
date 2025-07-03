'use client';

import { useSession } from "next-auth/react";
import { updateProfile } from "../actions/update";

export default function EditProfileForm({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession();

  return (
    <div className="relative max-w-md w-full bg-white/90 rounded-2xl p-8 space-y-6 border border-gray-200 text-gray-900">
      {/* Botón de cerrar */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-lg"
      >
        ✖
      </button>

      <div className="flex flex-col items-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-800">Editar Perfil</h1>
        <p className="text-sm text-gray-600">
          Actualiza tu información personal
        </p>
      </div>

      <form action={updateProfile} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Nombre
          </label>
          <input
            name="name"
            type="text"
            defaultValue={session?.user?.name ?? ""}
            className="mt-1 p-2 w-full bg-white text-gray-900 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300"
            placeholder="Tu nombre"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Teléfono
          </label>
          <input
            name="phone"
            type="text"
            placeholder="Ej: 3001234567"
            className="mt-1 p-2 w-full bg-white text-gray-900 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>

        <button
          type="submit"
          className="w-full px-4 py-2 bg-purple-600 text-white border border-purple-700 rounded-lg hover:bg-purple-700 transition"
        >
          Guardar Cambios
        </button>
      </form>

      <div className="text-center text-xs text-gray-500 pt-2">
        <p>Tu información se mantiene segura con nosotros.</p>
      </div>
    </div>
  );
}
