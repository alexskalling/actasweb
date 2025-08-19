
import { getServerSession } from "next-auth";
import GuardarNuevaEmpresaComponent from "./components/guardarNuevaEmpresaComponent";

export default async function EmpresasPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return <div>No has iniciado sesión</div>;
  }

  let adminId: string | null = null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    adminId = await (session.user.email);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    // ❌ acceso restringido
    return <div className="text-red-600 font-bold">Acceso denegado </div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Gestión de Empresas</h1>

      <GuardarNuevaEmpresaComponent/>
    </div>
  );
}
