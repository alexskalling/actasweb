// app/modules/invitaciones/components/InvitacionNoSesion.tsx
"use client";
import Link from "next/link";

export default function InvitacionNoSesionComponent() {
  return (
    <div className="flex flex-col items-center justify-center h-[80vh] text-center">
      <h2 className="text-2xl font-bold mb-2">Debes iniciar sesión 🔑</h2>
      <p className="mb-4 text-gray-600">Para aceptar la invitación, primero inicia sesión en la plataforma.</p>
      <Link href="/login">
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Ir a iniciar sesión
        </button>
      </Link>
    </div>
  );
}
