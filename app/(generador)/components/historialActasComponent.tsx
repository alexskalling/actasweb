"use client";


import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { getActasByUser } from '../services/actas_querys_services/getActasByUser';

interface Acta {
  id: string;
  nombre: string | null;
  tx: string | null;
  costo: string | null;
  duracion: string | null;
  urlTranscripcion: string | null;
  urlBorrador: string | null;
  idEstadoProceso: number | null;
  fechaProcesamiento: Date;
}
interface HistorialActasProps {
  reloadTrigger: boolean;
}

const ACTAS_POR_PAGINA = 5;

export default function HistorialActasComponent({ reloadTrigger }: HistorialActasProps) {
  const { data: session } = useSession();
  const [actas, setActas] = useState<Acta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [recargando, setRecargando] = useState(false);
  const [actasExpandidas, setActasExpandidas] = useState<Record<string, boolean>>({});

  const cargarActas = async () => {
    try {
      setLoading(true);
      const result = await getActasByUser();

      if (result.status === 'success') {
        setActas(result.data);
      } else {
        setError(result.message || 'Error al cargar las actas');
      }
    } catch (error) {
      console.error('Error al cargar actas:', error);
      setError('Error al cargar las actas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarActas();
  }, [reloadTrigger]);

  // Filtrar actas por búsqueda
  const actasFiltradas = useMemo(() => {
    if (!busqueda.trim()) {
      return actas;
    }
    return actas.filter(acta => 
      acta.nombre?.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [actas, busqueda]);

  // Calcular paginación
  const totalPaginas = Math.ceil(actasFiltradas.length / ACTAS_POR_PAGINA);
  const indiceInicio = (paginaActual - 1) * ACTAS_POR_PAGINA;
  const indiceFin = indiceInicio + ACTAS_POR_PAGINA;
  const actasPagina = actasFiltradas.slice(indiceInicio, indiceFin);

  // Resetear a página 1 cuando cambia la búsqueda
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda]);

  const downloadFile = (url: string, tipo: 'acta' | 'transcripcion') => {
    const proxyUrl = `/api/descarga?url=${encodeURIComponent(url)}`;
    window.open(proxyUrl, "_blank");
    console.log(`Descarga iniciada a través del proxy para ${tipo}:`, url);
  };

  const handleDownloadActa = async (acta: Acta) => {
    try {
      if (!acta.urlTranscripcion) {
        console.error("No se ha proporcionado la URL del acta");
        return;
      }

      // Track inicio descarga acta
      if (process.env.NEXT_PUBLIC_PAGO !== "soporte" && typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag('event', 'inicio_descarga_documento', {
          event_category: 'descarga',
          event_label: 'descarga_acta_historial',
          tipo_documento: 'acta',
          nombre_archivo: acta.nombre
        });
      }

      downloadFile(acta.urlTranscripcion, 'acta');
    } catch (error) {
      console.error("Error al descargar acta:", (error as Error).message);
    }
  };

  const handleDownloadTranscripcion = async (acta: Acta) => {
    try {
      if (!acta.urlBorrador) {
        console.error("No se ha proporcionado la URL de la transcripción");
        return;
      }

      // Track inicio descarga transcripción
      if (process.env.NEXT_PUBLIC_PAGO !== "soporte" && typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag('event', 'inicio_descarga_documento', {
          event_category: 'descarga',
          event_label: 'descarga_transcripcion_historial',
          tipo_documento: 'transcripcion',
          nombre_archivo: acta.nombre
        });
      }

      downloadFile(acta.urlBorrador, 'transcripcion');
    } catch (error) {
      console.error("Error al descargar transcripción:", (error as Error).message);
    }
  };

  const handleRecargarConsulta = async () => {
    setRecargando(true);
    await cargarActas();
    setRecargando(false);
  };

  const handleSoporteWhatsApp = (acta: Acta) => {
    const nombreUsuario = session?.user?.name || 'Usuario';
    const nombreActa = acta.nombre || 'Sin nombre';
    const transaccion = acta.tx || 'Sin transacción';
    const monto = acta.costo ? `$${parseInt(acta.costo).toLocaleString('es-CO')} COP` : 'Sin monto';
    const duracion = acta.duracion || 'N/A';

    const mensaje = `Hola, soy ${nombreUsuario}. Necesito ayuda para poder descargar los datos del acta.

Información del acta:
• Nombre: ${nombreActa}
• Transacción: ${transaccion}
• Monto: ${monto}
• Duración: ${duracion}

Por favor, ¿pueden ayudarme con la descarga?`;

    const numeroWhatsApp = '573122995191'; // Sin espacios ni signos
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    window.open(urlWhatsApp, '_blank');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
        <span className="ml-2 text-gray-600">Cargando actas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (actas.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No tienes actas generadas aún.</p>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-0">
      {/* Buscador */}
      <div className="mb-3 sm:mb-6">
        <label htmlFor="busqueda" className="block text-sm font-medium text-gray-700 mb-2">
          Buscar por nombre de acta
        </label>
        <input
          id="busqueda"
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Escribe el nombre de la acta..."
          className="w-full px-2 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm sm:text-base"
        />
      </div>

      {/* Resultados de búsqueda */}
      {busqueda && (
        <div className="mb-4 text-sm text-gray-600">
          {actasFiltradas.length === 0 ? (
            <p>No se encontraron actas con ese nombre.</p>
          ) : (
            <p>
              {actasFiltradas.length} {actasFiltradas.length === 1 ? 'acta encontrada' : 'actas encontradas'}
            </p>
          )}
        </div>
      )}

      {/* Lista de actas */}
      {actasPagina.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No hay actas para mostrar.</p>
        </div>
      ) : (
        <>
          <ul role="list" className="divide-y divide-gray-100">
            {actasPagina.map((acta) => {
              const mostrarDetalles = actasExpandidas[acta.id] || false;
              
              return (
                <li key={acta.id} className="relative p-1.5 sm:p-4 mb-2 sm:mb-0 sm:border-0 sm:rounded-none">
                  <div className="flex flex-row items-start justify-between gap-1.5 sm:gap-6">
                    <div className="flex min-w-0 gap-x-1.5 sm:gap-x-4 flex-1">
                    <div className="min-w-0 flex-auto">
                      <p className="text-sm sm:text-base font-semibold text-gray-900 break-words line-clamp-2">
                        {acta.nombre || 'Sin nombre'}
                      </p>
                      <p className="mt-1 text-xs sm:text-sm text-gray-500">
                        TX: {acta.tx || 'Sin transacción'}
                      </p>
                      
                      {/* Detalles expandibles en mobile */}
                      {mostrarDetalles && (
                        <div className="mt-3 sm:hidden space-y-1 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-700">
                            <span className="font-semibold">Costo:</span> ${parseInt(acta.costo || '0').toLocaleString('es-CO')} COP
                          </p>
                          <p className="text-xs text-gray-700">
                            <span className="font-semibold">Duración:</span> {acta.duracion || 'N/A'}
                          </p>
                        </div>
                      )}
                      
                      {/* Botón para expandir/colapsar en mobile */}
                      <button
                        onClick={() => setActasExpandidas(prev => ({ ...prev, [acta.id]: !prev[acta.id] }))}
                        className="mt-2 sm:hidden flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700"
                      >
                        {mostrarDetalles ? (
                          <>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="size-4"
                              width={24}
                              height={24}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="18 15 12 9 6 15" />
                            </svg>
                            Ocultar detalles
                          </>
                        ) : (
                          <>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="size-4"
                              width={24}
                              height={24}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                            Ver detalles
                          </>
                        )}
                      </button>
                    </div>
                    </div>
                  
                    <div className="flex shrink-0 items-start sm:items-center justify-end gap-2 sm:gap-x-4">
                    {/* Ocultar en mobile, mostrar en desktop */}
                    <div className="hidden sm:flex sm:flex-col sm:items-end">
                      <p className="text-sm text-gray-900">
                        ${parseInt(acta.costo || '0').toLocaleString('es-CO')} COP
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Duración: {acta.duracion || 'N/A'}
                      </p>
                    </div>
                  
                  {/* Verificar si existen los links */}
                  {acta.urlBorrador && acta.urlTranscripcion ? (
                    /* Si existen ambos links, mostrar dos botones de descarga */
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handleDownloadTranscripcion(acta)}
                        className="group relative flex items-center justify-center w-10 h-10 text-white rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors flex-shrink-0"
                        aria-label="Descargar transcripción"
                        title="Descargar transcripción"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="size-5"
                          width={24}
                          height={24}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                        {/* Tooltip */}
                        <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                          Descargar transcripción
                          <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 -mb-1 w-2 h-2 bg-gray-900 rotate-45"></span>
                        </span>
                      </button>
                      <button
                        onClick={() => handleDownloadActa(acta)}
                        className="group relative flex items-center justify-center w-10 h-10 text-white rounded-lg bg-purple-700 hover:bg-purple-600 transition-colors flex-shrink-0"
                        aria-label="Descargar acta"
                        title="Descargar acta de reunión"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="size-5"
                          width={24}
                          height={24}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        {/* Tooltip */}
                        <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                          Descargar acta
                          <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 -mb-1 w-2 h-2 bg-gray-900 rotate-45"></span>
                        </span>
                      </button>
                    </div>
                  ) : (
                    /* Si no existen los links, mostrar botones de recargar y soporte */
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handleSoporteWhatsApp(acta)}
                        className="group relative flex items-center justify-center w-10 h-10 text-white rounded-lg bg-green-500 hover:bg-green-400 transition-colors flex-shrink-0"
                        aria-label="Contactar soporte por WhatsApp"
                        title="Contactar soporte por WhatsApp"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="size-5"
                          width={24}
                          height={24}
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214l-3.741.982l.998-3.648l-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884c2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                        {/* Tooltip */}
                        <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                          Contactar soporte
                          <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 -mb-1 w-2 h-2 bg-gray-900 rotate-45"></span>
                        </span>
                      </button>
                      <button
                        onClick={handleRecargarConsulta}
                        disabled={recargando}
                        className="group relative flex items-center justify-center w-10 h-10 text-white rounded-lg bg-orange-600 hover:bg-orange-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                        aria-label="Recargar consulta"
                        title="Recargar para verificar si ya está disponible"
                      >
                        {recargando ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="size-5"
                            width={24}
                            height={24}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="23 4 23 10 17 10" />
                            <polyline points="1 20 1 14 7 14" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                          </svg>
                        )}
                        {/* Tooltip */}
                        {!recargando && (
                          <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            Recargar consulta
                            <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 -mb-1 w-2 h-2 bg-gray-900 rotate-45"></span>
                          </span>
                        )}
                      </button>
                    </div>
                  )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Controles de paginación */}
          {totalPaginas > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs sm:text-sm text-gray-600">
                {indiceInicio + 1} - {Math.min(indiceFin, actasFiltradas.length)} de {actasFiltradas.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPaginaActual(prev => Math.max(1, prev - 1))}
                  disabled={paginaActual === 1}
                  className="flex items-center justify-center w-10 h-10 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Página anterior"
                  title="Página anterior"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="size-5"
                    width={24}
                    height={24}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button
                  onClick={() => setPaginaActual(prev => Math.min(totalPaginas, prev + 1))}
                  disabled={paginaActual === totalPaginas}
                  className="flex items-center justify-center w-10 h-10 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Página siguiente"
                  title="Página siguiente"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="size-5"
                    width={24}
                    height={24}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
