import { db } from "@/lib/db/db";
import { invitaciones } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface InvitacionPageProps {
  params: {
    token: string;
  };
}

export default async function InvitacionPage({ params }: InvitacionPageProps) {
  const { token } = params;

  // Buscar la invitación en la BD
  const invitacion = await db
    .select()
    .from(invitaciones)
    .where(eq(invitaciones.token, token))
    .then((res) => res[0]);

  if (!invitacion) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-red-500">
          Invitación no encontrada o expirada
        </h1>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Invitación válida 🎉</h1>
      <p>Has sido invitado con el correo: {invitacion.email}</p>
      <p>Perteneces a la empresa: {invitacion.empresaId}</p>
      {/* Aquí puedes poner un botón para registrarse o aceptar */}
      <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
        Aceptar invitación
      </button>
    </div>
  );
}
