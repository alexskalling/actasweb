"use client";

import { useState, useEffect, useRef } from "react";
import {
  buscarUsuarioPorEmail,
  UsuarioEncontrado,
} from "../services/user/buscarUsuarioPorEmail";

interface SoporteSelectorProps {
  onUsuarioSeleccionado?: (usuario: UsuarioEncontrado | null) => void;
  onTipoAtencionSeleccionado?: (tipo: "acta_nueva" | "regeneracion_total" | null) => void;
  onIdTransaccionCambiado?: (idTransaccion: string) => void;
  precioActa?: number | null;
}

export default function SoporteSelectorComponent({
  onUsuarioSeleccionado,
  onTipoAtencionSeleccionado,
  onIdTransaccionCambiado,
  precioActa = null,
}: SoporteSelectorProps) {
  const [tipoAtencion, setTipoAtencion] = useState<"acta_nueva" | "regeneracion_total" | null>(null);
  const [busquedaEmail, setBusquedaEmail] = useState("");
  const [usuariosEncontrados, setUsuariosEncontrados] = useState<
    UsuarioEncontrado[]
  >([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] =
    useState<UsuarioEncontrado | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [idTransaccion, setIdTransaccion] = useState("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resultadosRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (busquedaEmail.trim().length < 3) {
      setUsuariosEncontrados([]);
      setMostrarResultados(false);
      return;
    }

    setBuscando(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        const resultado = await buscarUsuarioPorEmail(busquedaEmail);
        if (resultado.status === "success" && resultado.usuarios) {
          setUsuariosEncontrados(resultado.usuarios);
          setMostrarResultados(true);
        } else {
          setUsuariosEncontrados([]);
          setMostrarResultados(false);
        }
      } catch (error) {
        console.error("Error al buscar usuarios:", error);
        setUsuariosEncontrados([]);
        setMostrarResultados(false);
      } finally {
        setBuscando(false);
      }
    }, 500);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [busquedaEmail]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultadosRef.current &&
        !resultadosRef.current.contains(event.target as Node)
      ) {
        setMostrarResultados(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSeleccionarUsuario = (usuario: UsuarioEncontrado) => {
    setUsuarioSeleccionado(usuario);
    setBusquedaEmail(usuario.email || "");
    setMostrarResultados(false);
    onUsuarioSeleccionado?.(usuario);
  };

  const handleCambiarUsuario = () => {
    setUsuarioSeleccionado(null);
    setBusquedaEmail("");
    setUsuariosEncontrados([]);
    onUsuarioSeleccionado?.(null);
  };

  const handleCambiarTipoAtencion = (
    tipo: "acta_nueva" | "regeneracion_total"
  ) => {
    setTipoAtencion(tipo);
    onTipoAtencionSeleccionado?.(tipo);
    if (tipo !== "acta_nueva") {
      setIdTransaccion("");
      onIdTransaccionCambiado?.("");
    }
  };

  const handleIdTransaccionChange = (valor: string) => {
    setIdTransaccion(valor);
    onIdTransaccionCambiado?.(valor);
  };

  return (
    <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm mb-4">
      <h3 className="font-bold text-lg text-purple-600 mb-4 flex items-center gap-2">
        <span>👤</span> Soporte a Usuario
      </h3>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Atención
        </label>
        <select
          value={tipoAtencion || ""}
          onChange={(e) => {
            const valor = e.target.value as
              | "acta_nueva"
              | "regeneracion_total"
              | "";
            if (valor) {
              handleCambiarTipoAtencion(valor);
            } else {
              setTipoAtencion(null);
              onTipoAtencionSeleccionado?.(null);
              setIdTransaccion("");
              onIdTransaccionCambiado?.("");
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        >
          <option value="">Selecciona un tipo de atención</option>
          <option value="acta_nueva">Acta nueva</option>
          <option value="regeneracion_total">Regeneración total</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Buscar Usuario por Correo
        </label>
        <div className="relative" ref={resultadosRef}>
          <input
            type="text"
            value={busquedaEmail}
            onChange={(e) => {
              setBusquedaEmail(e.target.value);
              if (usuarioSeleccionado) {
                setUsuarioSeleccionado(null);
                onUsuarioSeleccionado?.(null);
              }
            }}
            placeholder="Ingresa correo o nombre del usuario..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            disabled={!!usuarioSeleccionado}
          />
          {buscando && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent"></div>
            </div>
          )}

          {mostrarResultados && usuariosEncontrados.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {usuariosEncontrados.map((usuario) => (
                <button
                  key={usuario.id}
                  onClick={() => handleSeleccionarUsuario(usuario)}
                  className="w-full text-left px-4 py-2 hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-gray-900">
                    {usuario.nombre}
                  </div>
                  <div className="text-sm text-gray-500">{usuario.email}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {usuarioSeleccionado && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-purple-900 mb-1">
                Usuario Seleccionado:
              </div>
              <div className="text-base font-semibold text-gray-900">
                {usuarioSeleccionado.nombre}
              </div>
              <div className="text-sm text-gray-600">
                {usuarioSeleccionado.email}
              </div>
            </div>
            <button
              onClick={handleCambiarUsuario}
              className="ml-2 text-purple-600 hover:text-purple-800 transition-colors"
              title="Cambiar usuario"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {tipoAtencion === "acta_nueva" &&
        precioActa !== null &&
        precioActa > 0 && (
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-purple-900">
                Valor del acta:
              </span>
              <span className="text-lg font-bold text-purple-700">
                ${precioActa.toLocaleString("es-CO")} COP
              </span>
            </div>

            <div className="pt-2 border-t border-purple-200">
              <p className="text-xs font-medium text-purple-900 mb-2">
                Envía este enlace al cliente para que realice el pago:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={
                    process.env.NEXT_PUBLIC_EPAYCO_CHECKOUTOPEN_URL ||
                    "https://secure.payco.co/checkoutopen/ef881d9d-2ec0-4cc8-a45b-ad246869a985"
                  }
                  className="flex-1 px-3 py-2 text-xs bg-white border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-700 font-mono"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={async () => {
                    const url =
                      process.env.NEXT_PUBLIC_EPAYCO_CHECKOUTOPEN_URL ||
                      "https://secure.payco.co/checkoutopen/ef881d9d-2ec0-4cc8-a45b-ad246869a985";
                    try {
                      await navigator.clipboard.writeText(url);
                      const button = document.getElementById(
                        "copy-payment-link-btn",
                      );
                      if (button) {
                        const originalText = button.innerHTML;
                        button.innerHTML = "✓ Copiado";
                        button.classList.add("bg-green-600");
                        setTimeout(() => {
                          button.innerHTML = originalText;
                          button.classList.remove("bg-green-600");
                        }, 2000);
                      }
                    } catch (err) {
                      console.error("Error al copiar:", err);
                    }
                  }}
                  id="copy-payment-link-btn"
                  className="px-3 py-2 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors flex items-center gap-1"
                  title="Copiar enlace"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect
                      x="9"
                      y="9"
                      width="13"
                      height="13"
                      rx="2"
                      ry="2"
                    ></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  Copiar
                </button>
              </div>
              <p className="mt-2 text-xs text-purple-600">
                El cliente debe ingresar el monto{" "}
                <strong>${precioActa.toLocaleString("es-CO")} COP</strong> en el
                formulario de pago.
              </p>
            </div>

            <p className="text-xs text-purple-600">
              Después del pago, el cliente debe proporcionar el ID de
              transacción para continuar.
            </p>
          </div>
        )}

      {tipoAtencion === "acta_nueva" && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ID de Transacción ePayco / Identificador de Pago
            {precioActa !== null && precioActa > 0 && (
              <span className="text-red-600 ml-1">*</span>
            )}
          </label>
          <input
            type="text"
            value={idTransaccion}
            onChange={(e) => handleIdTransaccionChange(e.target.value)}
            placeholder="Ingresa el ID de la transacción de ePayco o identificador del pago..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            required={precioActa !== null && precioActa > 0}
          />
          <p className="mt-1 text-xs text-gray-500">
            Este es el identificador único de la transacción de pago en ePayco
            {precioActa !== null && precioActa > 0 && (
              <span className="text-red-600 ml-1">
                (Requerido para generar el acta)
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
