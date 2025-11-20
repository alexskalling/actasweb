"use client";

import { useSession } from "next-auth/react";
import { updateProfile } from "../actions/update";
import { useState, useEffect } from "react";
import { getUserData } from "../actions/getUserData";
import {
  getDepartamentos,
  getMunicipiosPorDepartamento,
} from "@/lib/services/getColombiaData";
import { getIndustrias } from "@/app/(generador)/services/industria_querys_services/getIndustriaAction";

export default function EditProfileForm({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession();

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [departamentos, setDepartamentos] = useState<string[]>([]);
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [industrias, setIndustrias] = useState<
    Array<{ id: number; nombre: string }>
  >([]);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [tipoUsuario, setTipoUsuario] = useState<"natural" | "juridica">(
    "natural",
  );

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const data = await getUserData();
        setUserData(data);

        if (data?.tipoUsuario) {
          setTipoUsuario(data.tipoUsuario as "natural" | "juridica");
        }

        if (data?.departamento) {
          const municipiosData = getMunicipiosPorDepartamento(
            data.departamento,
          );

          const municipiosUnicos = Array.from(new Set(municipiosData));
          setMunicipios(municipiosUnicos);
        }
      } catch (error) {
        console.error("Error al cargar datos del usuario:", error);
        setError(
          "Error al cargar los datos. Por favor, intenta recargar la página.",
        );
      }
    };
    const loadIndustrias = async () => {
      try {
        const result = await getIndustrias();
        if (result.status === "success") {
          setIndustrias(result.data);
        } else {
          console.error("Error al cargar industrias:", result.message);
        }
      } catch (error) {
        console.error("Error al cargar industrias:", error);
      }
    };
    setDepartamentos(getDepartamentos());
    loadIndustrias();
    loadUserData();
  }, []);

  const handleDepartamentoChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const dept = e.target.value;
    const municipiosData = getMunicipiosPorDepartamento(dept);

    const municipiosUnicos = Array.from(new Set(municipiosData));
    setMunicipios(municipiosUnicos);

    if (userData) {
      setUserData({ ...userData, departamento: dept, municipio: "" });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const phone = formData.get("phone")?.toString() || "";
    const emailFacturacion = formData.get("email")?.toString() || "";
    const nombre = formData.get("nombre")?.toString() || "";
    const apellido = formData.get("apellido")?.toString() || "";
    const departamento = formData.get("departamento")?.toString() || "";
    const municipio = formData.get("municipio")?.toString() || "";
    const direccion = formData.get("direccion")?.toString() || "";
    const tipoDocumento = formData.get("tipoDocumento")?.toString() || "";
    const numeroDocumento = formData.get("numeroDocumento")?.toString() || "";

    formData.append("tipoUsuario", tipoUsuario);

    if (!nombre.trim()) {
      setError("El nombre es requerido.");
      setLoading(false);
      return;
    }

    if (!apellido.trim()) {
      setError("El apellido es requerido.");
      setLoading(false);
      return;
    }

    if (phone) {
      const cleanPhone = phone.replace(/\s/g, "");
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(cleanPhone)) {
        setError("El teléfono debe tener exactamente 10 dígitos.");
        setLoading(false);
        return;
      }
    } else {
      setError("El teléfono es requerido.");
      setLoading(false);
      return;
    }

    if (emailFacturacion) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailFacturacion)) {
        setError("El email no es válido.");
        setLoading(false);
        return;
      }
    } else {
      setError("El email es requerido.");
      setLoading(false);
      return;
    }

    if (!departamento) {
      setError("El departamento es requerido.");
      setLoading(false);
      return;
    }

    if (!municipio) {
      setError("El municipio es requerido.");
      setLoading(false);
      return;
    }

    if (!direccion.trim()) {
      setError("La dirección es requerida.");
      setLoading(false);
      return;
    }

    if (numeroDocumento) {
      const cleanNumeroDoc = numeroDocumento.replace(/\s/g, "");
      if (cleanNumeroDoc.length < 8) {
        setError("El número de documento debe tener al menos 8 caracteres.");
        setLoading(false);
        return;
      }
    }

    if (tipoDocumento && !numeroDocumento.trim()) {
      setError(
        "Si seleccionas un tipo de documento, debes ingresar el número.",
      );
      setLoading(false);
      return;
    }

    if (!acceptPrivacy) {
      setError("Debes aceptar las políticas de uso de datos para continuar.");
      setLoading(false);
      return;
    }

    try {
      await updateProfile(formData);

      try {
        const updatedData = await getUserData();
        setUserData(updatedData);
      } catch (loadError) {
        console.error("Error al recargar datos:", loadError);
      }
      setModalMessage("Gracias por actualizar tus datos.");
      setShowModal(true);
      setError(null);
    } catch (err) {
      console.error(err);
      let errorMessage = "Ocurrió un error al actualizar tus datos.";

      if (err instanceof Error) {
        errorMessage = err.message;

        if (
          err.message.includes("CONNECT_TIMEOUT") ||
          err.message.includes("timeout")
        ) {
          errorMessage =
            "Error de conexión con la base de datos. Por favor, intenta de nuevo en unos momentos.";
        }
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    if (modalMessage.includes("Gracias")) {
      onClose();
    }
  };

  return (
    <>
      <div className="relative max-w-5xl w-full bg-white rounded-xl p-6 sm:p-8">
        {}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
          aria-label="Cerrar"
        >
          ×
        </button>

        {}
        <div className="mb-6 pb-4 border-b border-gray-200">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
            Información de contacto y facturación
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Completa tus datos para facilitar el proceso de pago
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {}
          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded-r-md">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="ml-3 flex-shrink-0 text-red-400 hover:text-red-600"
                >
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-purple-700 uppercase tracking-wide">
              Tipo de Usuario
            </h2>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipoUsuario"
                  value="natural"
                  checked={tipoUsuario === "natural"}
                  onChange={(e) =>
                    setTipoUsuario(e.target.value as "natural" | "juridica")
                  }
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                />
                <span className="text-sm text-gray-700">Persona Natural</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipoUsuario"
                  value="juridica"
                  checked={tipoUsuario === "juridica"}
                  onChange={(e) =>
                    setTipoUsuario(e.target.value as "natural" | "juridica")
                  }
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                />
                <span className="text-sm text-gray-700">Persona Jurídica</span>
              </label>
            </div>
          </div>

          {}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-purple-700 uppercase tracking-wide">
              Información Personal
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Nombre *
                </label>
                <input
                  name="nombre"
                  type="text"
                  defaultValue={userData?.nombre || ""}
                  className="w-full px-3 py-2 text-sm bg-white text-gray-900 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Apellido *
                </label>
                <input
                  name="apellido"
                  type="text"
                  defaultValue={userData?.apellido || ""}
                  className="w-full px-3 py-2 text-sm bg-white text-gray-900 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Tipo de Documento
                </label>
                <select
                  key={`tipoDocumento-${userData?.tipoDocumento || "empty"}`}
                  name="tipoDocumento"
                  defaultValue={userData?.tipoDocumento || ""}
                  className="w-full px-3 py-2 text-sm bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                >
                  <option value="">Seleccione...</option>
                  <option value="CC">Cédula de Ciudadanía (CC)</option>
                  <option value="CE">Cédula de Extranjería (CE)</option>
                  <option value="NIT">
                    Número de Identificación Tributaria (NIT)
                  </option>
                  <option value="TI">Tarjeta de Identidad (TI)</option>
                  <option value="PP">Pasaporte (PP)</option>
                  <option value="NIP">
                    Número de Identificación Personal (NIP)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Número de Documento
                </label>
                <input
                  name="numeroDocumento"
                  type="text"
                  placeholder="Mínimo 8 caracteres"
                  defaultValue={userData?.numeroDocumento || ""}
                  minLength={8}
                  className="w-full px-3 py-2 text-sm bg-white text-gray-900 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Teléfono *
                </label>
                <input
                  name="phone"
                  type="text"
                  placeholder="3001234567"
                  defaultValue={userData?.telefono || ""}
                  className="w-full px-3 py-2 text-sm bg-white text-gray-900 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Correo Electrónico *
                </label>
                <input
                  name="email"
                  type="email"
                  defaultValue={userData?.email || session?.user?.email || ""}
                  className="w-full px-3 py-2 text-sm bg-white text-gray-900 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>
            </div>
          </div>

          {}
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-semibold text-purple-700 uppercase tracking-wide">
              Ubicación
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  País
                </label>
                <input
                  type="text"
                  value="Colombia"
                  disabled
                  className="w-full px-3 py-2 text-sm bg-gray-50 text-gray-600 border border-gray-300 rounded-md cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Departamento *
                </label>
                <select
                  name="departamento"
                  key={`dept-${userData?.departamento || "empty"}`}
                  defaultValue={userData?.departamento || ""}
                  onChange={handleDepartamentoChange}
                  className="w-full px-3 py-2 text-sm bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                >
                  <option value="">Seleccione...</option>
                  {departamentos.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Municipio *
                </label>
                <select
                  name="municipio"
                  key={`mun-${userData?.municipio || "empty"}-${municipios.length}`}
                  defaultValue={userData?.municipio || ""}
                  disabled={!userData?.departamento && municipios.length === 0}
                  className="w-full px-3 py-2 text-sm bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition disabled:bg-gray-50 disabled:text-gray-500"
                >
                  <option value="">
                    {userData?.departamento
                      ? "Seleccione..."
                      : "Seleccione departamento primero"}
                  </option>
                  {municipios.map((mun, index) => (
                    <option key={`${mun}-${index}`} value={mun}>
                      {mun}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Dirección *
                </label>
                <input
                  name="direccion"
                  type="text"
                  placeholder="Calle, número, barrio..."
                  defaultValue={userData?.direccion || ""}
                  className="w-full px-3 py-2 text-sm bg-white text-gray-900 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Industria
                </label>
                <select
                  name="industria"
                  key={`ind-${userData?.idIndustria || "empty"}-${industrias.length}`}
                  defaultValue={userData?.idIndustria || ""}
                  className="w-full px-3 py-2 text-sm bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                >
                  <option value="">Seleccione una industria</option>
                  {industrias.map((industria) => (
                    <option key={industria.id} value={industria.id}>
                      {industria.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="acceptPrivacy"
                checked={acceptPrivacy}
                onChange={(e) => setAcceptPrivacy(e.target.checked)}
                className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label
                htmlFor="acceptPrivacy"
                className="text-sm text-gray-700 flex-1"
              >
                Acepto las{" "}
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-purple-600 hover:text-purple-700 underline font-medium"
                >
                  políticas de uso de datos
                </button>{" "}
                y autorizo el uso de mi información de contacto para los fines
                descritos.
              </label>
            </div>
            {error && error.includes("políticas") && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          {}
          <div className="pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-md hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Guardando...
                </span>
              ) : (
                "Guardar Cambios"
              )}
            </button>
          </div>
        </form>

        {}
        <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm text-blue-700">
                <span className="font-medium">Importante:</span> Estos datos son
                necesarios para la eventual generación de facturas. Puedes
                actualizarlos cuando lo consideres necesario desde tu perfil.
              </p>
            </div>
          </div>
        </div>
      </div>

      {}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">
              Perfil Actualizado
            </h2>
            <p className="text-gray-600 mb-4 text-center">{modalMessage}</p>
            <button
              onClick={handleCloseModal}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 mx-auto block"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                Políticas de Uso de Datos de Contacto
              </h2>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  1. Finalidad del Tratamiento
                </h3>
                <p className="mb-2">
                  Los datos de contacto proporcionados (nombre, apellido,
                  teléfono, correo electrónico, dirección, departamento,
                  municipio e industria) serán utilizados exclusivamente para
                  los siguientes fines:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>
                    <strong>Facturación:</strong> Generación y envío de facturas
                    electrónicas correspondientes a los servicios contratados.
                  </li>
                  <li>
                    <strong>Contacto comercial:</strong> Comunicaciones
                    relacionadas con nuestros productos, servicios, promociones
                    y ofertas comerciales.
                  </li>
                  <li>
                    <strong>Contacto operacional:</strong> Notificaciones sobre
                    el uso de la plataforma, actualizaciones de estado de
                    procesos, cambios en términos y condiciones, y
                    comunicaciones técnicas necesarias para la prestación del
                    servicio.
                  </li>
                  <li>
                    <strong>Soporte al cliente:</strong> Atención de consultas,
                    solicitudes y resolución de incidencias relacionadas con
                    nuestros servicios.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  2. Responsable del Tratamiento
                </h3>
                <p>
                  El responsable del tratamiento de sus datos personales es{" "}
                  <strong>Skalling.com</strong>, empresa operadora de la
                  plataforma de actas, junto con su equipo técnico y
                  administrativo. Todos los datos serán tratados con estricta
                  confidencialidad y seguridad.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  3. Base Legal
                </h3>
                <p>
                  El tratamiento de sus datos se fundamenta en su consentimiento
                  explícito, otorgado al aceptar estas políticas, así como en la
                  ejecución del contrato de servicios y el cumplimiento de
                  obligaciones legales en materia fiscal y contable.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  4. Conservación de Datos
                </h3>
                <p>
                  Sus datos de contacto se conservarán mientras mantenga una
                  relación contractual con nosotros y durante los plazos
                  legalmente establecidos para el cumplimiento de obligaciones
                  fiscales y contables. Una vez finalizado el plazo de
                  conservación, los datos serán eliminados de forma segura.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  5. Sus Derechos
                </h3>
                <p className="mb-2">Usted tiene derecho a:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Acceder, rectificar y suprimir sus datos personales.</li>
                  <li>
                    Oponerse al tratamiento de sus datos para fines comerciales.
                  </li>
                  <li>Limitar el tratamiento de sus datos.</li>
                  <li>Portabilidad de sus datos.</li>
                  <li>Revocar su consentimiento en cualquier momento.</li>
                </ul>
                <p className="mt-2">
                  Para ejercer estos derechos, puede contactarnos a través de
                  los canales de comunicación proporcionados en la plataforma.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  6. Seguridad
                </h3>
                <p>
                  Implementamos medidas técnicas y organizativas apropiadas para
                  proteger sus datos personales contra el acceso no autorizado,
                  la pérdida, destrucción o alteración accidental.
                </p>
              </div>

              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
                <p className="text-sm font-medium text-purple-900">
                  Al aceptar estas políticas, usted confirma que ha leído,
                  entendido y acepta el tratamiento de sus datos de contacto
                  para los fines descritos anteriormente.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowPrivacyModal(false);
                  setAcceptPrivacy(true);
                }}
                className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium"
              >
                Aceptar y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
