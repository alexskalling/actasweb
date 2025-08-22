// app/modules/invitaciones/components/InvitacionExpirada.tsx
"use client";
import Link from "next/link";

export default function InvitacionExpiradaComponent() {
  return (
    <div className="flex flex-col items-center justify-center h-[80vh] text-center">
      <h2 className="text-2xl font-bold mb-2 text-red-600">Invitación expirada ❌</h2>
      <p className="mb-4 text-gray-600">La invitación ya no es válida.</p>
      <Link href="/">
        <button className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800">
          Volver al inicio
        </button>
      </Link>
    </div>
  );
}
