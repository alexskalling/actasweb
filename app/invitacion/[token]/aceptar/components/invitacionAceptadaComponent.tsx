// app/modules/invitaciones/components/InvitacionAceptada.tsx
"use client";

import { CheckCircle } from "lucide-react";

export default function InvitacionAceptadaComponent() {
  return (
    <div className="flex flex-col items-center justify-center h-[80vh] text-center">
      <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
      <h2 className="text-xl font-semibold text-green-600">
        🎉 Invitación aceptada
      </h2>
      <p className="text-sm text-gray-600 mt-2">
        Ya formas parte de la empresa. En unos segundos serás redirigido a la
        plataforma.
      </p>
    </div>
  );
}