'use client';

import { useSession } from "next-auth/react";
import { updateProfile } from "../actions/update";

export default function EditProfileForm() {
  const { data: session } = useSession();

  return (
    <main className="min-h-screen bg-purple-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-md shadow-2xl rounded-2xl p-8 space-y-6 border border-white/20 text-white">
        <div className="flex flex-col items-center space-y-2">
          <h1 className="text-2xl font-bold">Editar Perfil</h1>
          <p className="text-sm text-white/80">
            Actualiza tu información personal
          </p>
        </div>

        <form action={updateProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80">Nombre</label>
            <input
              name="name"
              type="text"
              defaultValue={session?.user?.name ?? ""}
              className="mt-1 p-2 w-full bg-white/20 text-white border border-white/30 rounded-lg placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-300"
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80">Teléfono</label>
            <input
              name="phone"
              type="text"
              placeholder="Ej: 3001234567"
              className="mt-1 p-2 w-full bg-white/20 text-white border border-white/30 rounded-lg placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition"
          >
            Guardar Cambios
          </button>
        </form>

        <div className="text-center text-xs text-white/60 pt-2">
          <p>Tu información se mantiene segura con nosotros.</p>
        </div>
      </div>
    </main>
  );
}
