"use client";


import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { getActasByUser } from '../services/actas_querys_services/getActasByUser';
import { createClient } from '@/utils/client';
import { processAction } from '../services/generacion_contenido_services/processAction';
import { ActualizarProceso } from '../services/actas_querys_services/actualizarProceso';
import EPaycoOnPageComponent from './epaycoOnPageComponent';
import { validarCodigo } from '../services/codigos_atencion/validarCodigo';
import { reservarMinutos } from '../services/codigos_atencion/reservarMinutos';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Acta {
  id: string;
  nombre: string | null;
  tx: string | null;
  costo: string | null;
  duracion: string | null;
  urlTranscripcion: string | null;
  urlBorrador: string | null;
  urlAssembly: string | null;
  idEstadoProceso: number | null;
  fechaProcesamiento: Date;
  nombreEstado: string | null;
}
interface HistorialActasProps {
  reloadTrigger: boolean;
  silentReload?: boolean; // Para actualizaciones silenciosas sin mostrar loader
}

const ACTAS_POR_PAGINA = 5;

export default function HistorialActasComponent({ reloadTrigger, silentReload = false }: HistorialActasProps) {
  const { data: session } = useSession();
  const [actas, setActas] = useState<Acta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [recargando, setRecargando] = useState(false);
  const [actasExpandidas, setActasExpandidas] = useState<Record<string, boolean>>({});
  const estadosAnterioresRef = useRef<Record<string, number | null>>({});
  const primeraCargaRef = useRef<boolean>(true);
  const cargarActasRef = useRef<((silent?: boolean) => Promise<void>) | null>(null);
  const subscriptionRef = useRef<any>(null);
  const userIdRef = useRef<string | null>(null);
  const [actaParaRelanzar, setActaParaRelanzar] = useState<Acta | null>(null);
  const [procesandoRelanzamiento, setProcesandoRelanzamiento] = useState(false);
  const [tieneCodigoAtencion, setTieneCodigoAtencion] = useState(false);
  const [codigoAtencion, setCodigoAtencion] = useState('');
  const [validandoCodigo, setValidandoCodigo] = useState(false);
  const [mensajeCodigo, setMensajeCodigo] = useState('');
  const [codigoValido, setCodigoValido] = useState(false);
  const [codigoValidado, setCodigoValidado] = useState<{ id: string; codigo: string } | null>(null);

  const cargarActas = useCallback(async (silent = false) => {
    try {
      // Solo mostrar loading si NO es una actualización silenciosa
      if (!silent) {
        setLoading(true);
      }

      const result = await getActasByUser();

      if (result.status === 'success') {
        // Verificar si alguna acta cambió de estado 5 a 6 o 7
        const estadosAnteriores = estadosAnterioresRef.current;
        let huboCambio = false;

        // Solo verificar cambios en las actas del usuario actual (result.data ya viene filtrado por usuario)
        result.data.forEach((acta: Acta) => {
          const estadoAnterior = estadosAnteriores[acta.id];
          const estadoActual = acta.idEstadoProceso;

          // Si estaba en estado 5 y ahora está en 6 o 7, hubo un cambio (proceso terminó)
          if (estadoAnterior === 5 && (estadoActual === 6 || estadoActual === 7)) {
            huboCambio = true;
          }

          // Actualizar el estado anterior solo para las actas del usuario actual
          estadosAnteriores[acta.id] = estadoActual;
        });

        // Limpiar estados anteriores de actas que ya no existen (del usuario actual)
        const idsActuales = new Set(result.data.map((acta: Acta) => acta.id));
        Object.keys(estadosAnterioresRef.current).forEach(id => {
          if (!idsActuales.has(id)) {
            delete estadosAnterioresRef.current[id];
          }
        });

        // REEMPLAZAR los datos (no sumar ni duplicar)
        setActas(result.data);
      } else {
        // Solo mostrar error si NO es una actualización silenciosa
        if (!silent) {
          setError(result.message || 'Error al cargar las actas');
        }
      }
    } catch (error) {
      console.error('Error al cargar actas:', error);
      // Solo mostrar error si NO es una actualización silenciosa
      if (!silent) {
        setError('Error al cargar las actas');
      }
    } finally {
      // Solo ocultar loading si NO es una actualización silenciosa
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  // Mantener la referencia más reciente de cargarActas en el ref
  useEffect(() => {
    cargarActasRef.current = cargarActas;
  }, [cargarActas]);

  useEffect(() => {
    // Si es la primera carga, mostrar loader. Si no, actualización silenciosa
    const esPrimeraCarga = primeraCargaRef.current;
    const esActualizacion = !esPrimeraCarga || silentReload;

    if (esPrimeraCarga) {
      primeraCargaRef.current = false;
    }

    cargarActas(esActualizacion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadTrigger, silentReload]);

  // Inicializar estados anteriores cuando se cargan las actas
  // Esto permite detectar cambios de estado cuando se actualiza la lista
  useEffect(() => {
    actas.forEach(acta => {
      if (!estadosAnterioresRef.current[acta.id]) {
        estadosAnterioresRef.current[acta.id] = acta.idEstadoProceso;
      }
    });
  }, [actas]);

  // Suscripción a cambios en tiempo real en la tabla de actas
  useEffect(() => {
    if (!session?.user?.email) {
      return;
    }

    // Obtener el user_id del usuario actual
    const setupSubscription = async () => {
      try {
        const response = await fetch('/api/user/get-user-id');
        if (response.ok) {
          const data = await response.json();
          const userId = data.userId;

          if (!userId) {
            console.log('No se pudo obtener user_id para la suscripción');
            return;
          }

          userIdRef.current = userId;

          // Crear cliente de Supabase
          const supabase = createClient();

          // Limpiar suscripción anterior si existe
          if (subscriptionRef.current) {
            await supabase
              .channel('actas-changes')
              .unsubscribe();
            subscriptionRef.current = null;
          }

          // Suscribirse a cambios en la tabla actas para este usuario
          const channel = supabase
            .channel('actas-changes')
            .on(
              'postgres_changes',
              {
                event: '*', // INSERT, UPDATE, DELETE
                schema: 'public',
                table: 'actas',
                filter: `id_usuario=eq.${userId}`, // Solo cambios en actas del usuario actual
              },
              (payload) => {
                console.log('🔄 Cambio detectado en tabla actas:', payload);
                // Recargar las actas cuando hay un cambio
                if (cargarActasRef.current) {
                  cargarActasRef.current(true); // silent=true para no mostrar loading
                }
              }
            )
            .subscribe((status) => {
              console.log('📡 Estado de suscripción:', status);
            });

          subscriptionRef.current = channel;
        }
      } catch (error) {
        console.error('Error al configurar suscripción:', error);
      }
    };

    setupSubscription();

    // Limpiar suscripción al desmontar
    return () => {
      if (subscriptionRef.current) {
        const supabase = createClient();
        supabase
          .channel('actas-changes')
          .unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [session?.user?.email]);

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

  const downloadFile = (url: string, tipo: 'acta' | 'transcripcion' | 'borrador') => {
    const proxyUrl = `/api/descarga?url=${encodeURIComponent(url)}`;

    // Crear un elemento temporal <a> para forzar la descarga
    // Esto suele funcionar mejor que window.open para múltiples descargas
    const link = document.createElement('a');
    link.href = proxyUrl;
    link.target = '_blank';
    link.download = url.split('/').pop() || 'archivo';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`Descarga iniciada a través del proxy para ${tipo}:`, url);
  };

  const handleDownloadBorrador = async (acta: Acta) => {
    try {
      if (!acta.urlBorrador) {
        console.error("No se ha proporcionado la URL del borrador");
        return;
      }

      // Track inicio descarga borrador
      if (process.env.NEXT_PUBLIC_PAGO !== "soporte" && typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag('event', 'inicio_descarga_documento', {
          event_category: 'descarga',
          event_label: 'descarga_borrador_historial',
          tipo_documento: 'borrador',
          nombre_archivo: acta.nombre
        });
      }

      downloadFile(acta.urlBorrador, 'borrador');
    } catch (error) {
      console.error("Error al descargar borrador:", (error as Error).message);
    }
  };

  const handleDownloadTranscripcion = async (acta: Acta) => {
    try {
      if (!acta.urlTranscripcion) {
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

      downloadFile(acta.urlTranscripcion, 'transcripcion');
    } catch (error) {
      console.error("Error al descargar transcripción:", (error as Error).message);
    }
  };

  const handleDescargarAmbos = async (acta: Acta) => {
    try {
      // 1. Descargar Borrador (Prioridad)
      if (acta.urlBorrador) {
        // Track inicio descarga borrador
        if (process.env.NEXT_PUBLIC_PAGO !== "soporte" && typeof window !== "undefined" && typeof window.gtag === "function") {
          window.gtag('event', 'inicio_descarga_documento', {
            event_category: 'descarga',
            event_label: 'descarga_borrador_historial',
            tipo_documento: 'borrador',
            nombre_archivo: acta.nombre
          });
        }

        downloadFile(acta.urlBorrador, 'borrador');
      }

      // 2. Descargar Transcripción (con delay)
      const urlTranscripcion = acta.urlTranscripcion;
      if (urlTranscripcion) {
        setTimeout(() => {
          // Track inicio descarga transcripción
          if (process.env.NEXT_PUBLIC_PAGO !== "soporte" && typeof window !== "undefined" && typeof window.gtag === "function") {
            window.gtag('event', 'inicio_descarga_documento', {
              event_category: 'descarga',
              event_label: 'descarga_transcripcion_historial',
              tipo_documento: 'transcripcion',
              nombre_archivo: acta.nombre
            });
          }

          downloadFile(urlTranscripcion, 'transcripcion');
        }, 1500); // Esperar 1.5s entre descargas para asegurar que el navegador acepte ambas
      }
    } catch (error) {
      console.error("Error al descargar archivos:", (error as Error).message);
    }
  };

  const handleRecargarConsulta = async () => {
    setRecargando(true);
    await cargarActas();
    setRecargando(false);
  };

  // Convertir duración a segundos
  const duracionASegundos = (duracion: string | null): number => {
    if (!duracion) return 0;

    // Si es un número (segundos), retornarlo
    const numero = parseFloat(duracion);
    if (!isNaN(numero) && !duracion.includes(':')) {
      return numero;
    }

    // Si tiene formato HH:MM:SS
    if (duracion.includes(':')) {
      const partes = duracion.split(':');
      if (partes.length === 3) {
        const horas = parseInt(partes[0], 10) || 0;
        const minutos = parseInt(partes[1], 10) || 0;
        const segundos = parseInt(partes[2], 10) || 0;
        return horas * 3600 + minutos * 60 + segundos;
      }
    }

    return 0;
  };

  // Calcular precio
  const calculatePrice = (durationInSeconds: number): number => {
    const segments = Math.ceil(durationInSeconds / 60 / 15);
    return segments * 2500;
  };

  // Verificar si puede relanzar (menos de 20 horas desde la creación)
  const puedeRelanzar = (fechaProcesamiento: Date): boolean => {
    const ahora = new Date();
    const fechaCreacion = new Date(fechaProcesamiento);
    const diferenciaHoras = (ahora.getTime() - fechaCreacion.getTime()) / (1000 * 60 * 60);
    return diferenciaHoras < 20;
  };

  // Manejar relanzamiento de acta
  const handleRelanzarActa = (acta: Acta) => {
    // Validar que no hayan pasado más de 20 horas
    if (!puedeRelanzar(acta.fechaProcesamiento)) {
      toast.error("El relanzamiento solo está disponible para actas creadas hace menos de 20 horas");
      return;
    }

    if (!acta.urlAssembly || !acta.nombre || !acta.duracion) {
      alert("Error: Faltan datos necesarios para relanzar el acta.");
      return;
    }
    // Resetear estados de código de atención
    setTieneCodigoAtencion(false);
    setCodigoAtencion('');
    setCodigoValido(false);
    setCodigoValidado(null);
    setMensajeCodigo('');
    setActaParaRelanzar(acta);
  };

  // Validar código de atención
  const handleValidarCodigoRelanzamiento = async () => {
    if (!actaParaRelanzar || !actaParaRelanzar.duracion) {
      return;
    }

    if (!codigoAtencion.trim()) {
      setMensajeCodigo("Por favor ingresa un código");
      setCodigoValido(false);
      return;
    }

    setValidandoCodigo(true);
    setMensajeCodigo("");

    try {
      const duracionSegundos = duracionASegundos(actaParaRelanzar.duracion);
      const resultado = await validarCodigo(codigoAtencion.trim().toLowerCase(), duracionSegundos);

      if (resultado.valido && resultado.codigo) {
        setCodigoValido(true);
        setMensajeCodigo("✓ Código válido");
        setCodigoValidado({
          id: resultado.codigo.id,
          codigo: resultado.codigo.codigo,
        });
      } else {
        setCodigoValido(false);
        setMensajeCodigo(resultado.mensaje || "Código inválido");
        setCodigoValidado(null);
      }
    } catch (error) {
      console.error("Error al validar código:", error);
      setCodigoValido(false);
      setMensajeCodigo("Error al validar el código. Por favor, intenta nuevamente.");
      setCodigoValidado(null);
    } finally {
      setValidandoCodigo(false);
    }
  };

  const handleCodigoChangeRelanzamiento = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setCodigoAtencion(valor);
    // Resetear validación cuando el usuario cambia el código
    if (codigoValido) {
      setCodigoValido(false);
      setMensajeCodigo("");
      setCodigoValidado(null);
    }
  };

  // Función para cerrar el modal y resetear estados
  const cerrarModalRelanzamiento = () => {
    setActaParaRelanzar(null);
    setTieneCodigoAtencion(false);
    setCodigoAtencion('');
    setCodigoValido(false);
    setCodigoValidado(null);
    setMensajeCodigo('');
    setProcesandoRelanzamiento(false);
  };

  // Manejar pago exitoso para relanzamiento
  const handlePaymentRelanzamiento = async (codigoAtencionUsado?: string | null) => {
    if (!actaParaRelanzar || !actaParaRelanzar.urlAssembly || !actaParaRelanzar.nombre || !actaParaRelanzar.duracion) {
      toast.error("Error", {
        description: "Faltan datos necesarios para procesar el acta.",
        duration: 5000,
      });
      cerrarModalRelanzamiento();
      return;
    }

    const codigoFinal = codigoAtencionUsado || codigoValidado?.codigo || null;
    const duracionSegundos = duracionASegundos(actaParaRelanzar.duracion);

    // Si hay código de atención, VALIDAR NUEVAMENTE antes de procesar
    if (codigoFinal && codigoValidado) {
      try {
        const resultadoValidacion = await validarCodigo(codigoFinal, duracionSegundos);
        if (!resultadoValidacion.valido) {
          toast.error("Error", {
            description: resultadoValidacion.mensaje || "Código inválido o saldo insuficiente",
            duration: 5000,
          });
          setCodigoValido(false);
          setMensajeCodigo(resultadoValidacion.mensaje || "Código inválido");
          setCodigoValidado(null);
          return;
        }
      } catch (error) {
        console.error("Error al validar código antes de procesar:", error);
        toast.error("Error", {
          description: "Error al validar el código. Por favor, intenta nuevamente.",
          duration: 5000,
        });
        return;
      }
    }

    setProcesandoRelanzamiento(true);

    try {
      const carpeta = actaParaRelanzar.nombre.replace(/\.[^/.]+$/, "");

      // Si hay código de atención válido, reservar minutos antes de iniciar
      if (codigoFinal && codigoValidado) {
        try {
          const reservaResult = await reservarMinutos(codigoValidado.id, duracionSegundos);
          if (!reservaResult.success) {
            setProcesandoRelanzamiento(false);
            toast.error("Error", {
              description: "Error al reservar minutos: " + (reservaResult.message || "Error desconocido"),
              duration: 5000,
            });
            return;
          }
        } catch (error) {
          console.error("Error al reservar minutos:", error);
          setProcesandoRelanzamiento(false);
          toast.error("Error", {
            description: "Error al reservar minutos. Por favor, intenta nuevamente.",
            duration: 5000,
          });
          return;
        }
      }

      // Actualizar estado a 5 (en generación)
      await ActualizarProceso(
        actaParaRelanzar.nombre,
        5, // Estado: En generación
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        false,
        codigoFinal || undefined
      );

      // CERRAR EL MODAL INMEDIATAMENTE después de actualizar el estado
      cerrarModalRelanzamiento();

      // Mostrar toast de éxito
      toast.success("Acta relanzada", {
        description: "El acta se está procesando. Se actualizará automáticamente cuando esté lista.",
        duration: 5000,
      });

      // Recargar actas
      await cargarActas(true);

      // Continuar con el proceso usando la URL de Assembly existente (en segundo plano)
      processAction(
        carpeta,
        actaParaRelanzar.nombre,
        actaParaRelanzar.urlAssembly,
        session?.user?.email || '',
        session?.user?.name || '',
        false, // automation
        codigoFinal || undefined // codigoAtencion
      ).then((result) => {
        if (result.status === "success") {
          // Recargar actas cuando termine
          cargarActas(true);
        } else {
          toast.error("Error al procesar el acta", {
            description: result.message || "Ocurrió un error inesperado",
            duration: 5000,
          });
        }
      }).catch((error) => {
        console.error("Error al procesar el acta:", error);
        toast.error("Error al procesar el acta", {
          description: "Por favor, intenta nuevamente.",
          duration: 5000,
        });
      });
    } catch (error) {
      console.error("Error al relanzar acta:", error);
      toast.error("Error al procesar el acta", {
        description: "Por favor, intenta nuevamente.",
        duration: 5000,
      });
      setProcesandoRelanzamiento(false);
    }
  };

  const handleSoporteWhatsApp = () => {
    const nombreUsuario = session?.user?.name || 'Usuario';
    const emailUsuario = session?.user?.email || 'Sin email';

    const mensaje = `Hola, soy ${nombreUsuario}. Necesito ayuda con mi cuenta.

Información del usuario:
• Nombre: ${nombreUsuario}
• Email: ${emailUsuario}

Por favor, ¿pueden ayudarme?`;

    const numeroWhatsApp = '573122995191'; // Sin espacios ni signos
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    window.open(urlWhatsApp, '_blank');
  };

  // Función para obtener el texto del estado desde la base de datos
  const getEstadoTexto = (acta: Acta): string => {
    if (acta.nombreEstado) {
      return acta.nombreEstado;
    }
    if (acta.idEstadoProceso === null) return 'Sin estado';
    return 'Sin estado';
  };

  // Función para obtener el color del badge según el estado
  const getEstadoColor = (idEstadoProceso: number | null): string => {
    if (idEstadoProceso === null) return 'bg-gray-100 text-gray-700';
    if (idEstadoProceso <= 4) return 'bg-yellow-100 text-yellow-700';
    if (idEstadoProceso === 5) return 'bg-blue-100 text-blue-700';
    if (idEstadoProceso === 6) return 'bg-green-100 text-green-700';
    if (idEstadoProceso === 7) return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  // Solo mostrar loading en la carga inicial (cuando no hay actas y no es una actualización silenciosa)
  if (loading && actas.length === 0) {
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
    <div className="w-full sm:px-0">
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

      {/* Cabecera con botones de soporte y refrescar */}
      <div className="mb-4 flex justify-end gap-2 flex-shrink-0">
        <button
          onClick={handleSoporteWhatsApp}
          className="group relative flex items-center justify-center w-10 h-10 min-w-[40px] text-green-500 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors flex-shrink-0 shadow-sm"
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
        </button>
        <button
          onClick={handleRecargarConsulta}
          disabled={recargando}
          className="group relative flex items-center justify-center w-10 h-10 min-w-[40px] text-orange-600 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex-shrink-0 shadow-sm"
          aria-label="Refrescar actas"
          title="Refrescar lista de actas"
        >
          {recargando ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-600 border-t-transparent"></div>
          ) : (
            <>
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
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M3 21v-5h5" />
              </svg>

            </>
          )}
        </button>
      </div>

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
                <li key={acta.id} className="relative sm:py-2 mb-2 sm:mb-0 sm:border-0 sm:rounded-none">
                  <div className="flex flex-row items-start gap-2 sm:gap-4">
                    <div className="flex min-w-0 flex-1 pr-2">
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
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-gray-700">Estado:</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-normal ${getEstadoColor(acta.idEstadoProceso)}`}>
                                {getEstadoTexto(acta)}
                              </span>
                            </div>
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

                    <div className="flex shrink-0 items-start sm:items-center gap-2 sm:gap-4">
                      {/* Ocultar en mobile, mostrar en desktop */}
                      <div className="hidden sm:flex sm:flex-col sm:items-end gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-normal ${getEstadoColor(acta.idEstadoProceso)}`}>
                          {getEstadoTexto(acta)}
                        </span>
                        <p className="text-xs text-gray-500">
                          Duración: {acta.duracion || 'N/A'}
                        </p>
                      </div>

                      {/* Verificar estado y mostrar botones apropiados */}
                      <div className="flex justify-end">
                        {acta.idEstadoProceso === 5 ? (
                          /* Si está en estado 5 (En generación), mostrar botón morado con icono girando */
                          <button
                            disabled
                            className="group relative flex items-center justify-center w-10 h-10 min-w-[40px] text-purple-600 rounded-lg bg-white border border-gray-200 cursor-not-allowed transition-colors flex-shrink-0 shadow-sm"
                            aria-label="En generación"
                            title="El acta se está generando"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="size-5 animate-spin"
                              width={24}
                              height={24}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                            <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                              En generación
                              <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 -mb-1 w-2 h-2 bg-gray-900 rotate-45"></span>
                            </span>
                          </button>
                        ) : acta.idEstadoProceso !== null && acta.idEstadoProceso < 5 && acta.urlAssembly ? (
                          /* Si está en estado < 5 y tiene urlAssembly, mostrar solo botón de relanzar */
                          <button
                            onClick={() => handleRelanzarActa(acta)}
                            disabled={procesandoRelanzamiento || !puedeRelanzar(acta.fechaProcesamiento)}
                            className={`group relative flex items-center justify-center w-10 h-10 min-w-[40px] rounded-lg transition-colors flex-shrink-0 shadow-sm ${puedeRelanzar(acta.fechaProcesamiento) && !procesandoRelanzamiento
                              ? 'text-purple-600 bg-white border border-gray-200 hover:bg-gray-50'
                              : 'text-gray-400 bg-gray-100 cursor-not-allowed border border-gray-200'
                              }`}
                            aria-label="Relanzar acta"
                            title={puedeRelanzar(acta.fechaProcesamiento)
                              ? "Relanzar acta y continuar con el pago"
                              : "El relanzamiento solo está disponible para actas creadas hace menos de 20 horas"}
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
                              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                            <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                              Relanzar acta
                              <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 -mb-1 w-2 h-2 bg-gray-900 rotate-45"></span>
                            </span>
                          </button>
                        ) : acta.urlBorrador && acta.urlTranscripcion ? (
                          /* Si existen ambos links, mostrar 2 botones separados - Transcripción primero (izquierda), Borrador segundo (derecha) */
                          <button
                            onClick={() => handleDescargarAmbos(acta)}
                            className="group relative flex items-center justify-center w-10 h-10 min-w-[40px] text-purple-600 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors flex-shrink-0 shadow-sm"
                            aria-label="Descargar archivos"
                            title="Descargar Acta y Transcripción"
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
                            <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                              Descargar Todo
                              <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 -mb-1 w-2 h-2 bg-gray-900 rotate-45"></span>
                            </span>
                          </button>
                        ) : null}
                      </div>
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

      {/* Componente de pago para relanzar acta */}
      {actaParaRelanzar && actaParaRelanzar.urlAssembly && actaParaRelanzar.nombre && actaParaRelanzar.duracion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Relanzar acta: {actaParaRelanzar.nombre}</h3>
            <p className="text-sm text-gray-600 mb-4">
              Duración: {actaParaRelanzar.duracion} |
              Costo: ${calculatePrice(duracionASegundos(actaParaRelanzar.duracion)).toLocaleString('es-CO')} COP
            </p>

            {/* Checkbox para código de atención */}
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tieneCodigoAtencion}
                  onChange={(e) => {
                    setTieneCodigoAtencion(e.target.checked);
                    if (!e.target.checked) {
                      setCodigoAtencion('');
                      setCodigoValido(false);
                      setCodigoValidado(null);
                      setMensajeCodigo('');
                    }
                  }}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">¿Tienes código de atención?</span>
              </label>
            </div>

            {/* Input y validación de código */}
            {tieneCodigoAtencion && (
              <div className="mb-4 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={codigoAtencion}
                    onChange={handleCodigoChangeRelanzamiento}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleValidarCodigoRelanzamiento();
                      }
                    }}
                    placeholder="Ingresa el código"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm"
                  />
                  <Button
                    onClick={handleValidarCodigoRelanzamiento}
                    disabled={validandoCodigo || !codigoAtencion.trim()}
                    className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {validandoCodigo ? "Validando..." : "Validar"}
                  </Button>
                </div>
                {mensajeCodigo && (
                  <p className={`text-sm ${codigoValido ? 'text-green-600' : 'text-red-600'}`}>
                    {mensajeCodigo}
                  </p>
                )}
              </div>
            )}

            {/* Mostrar ePayco solo si no hay código válido */}
            {!tieneCodigoAtencion || !codigoValido ? (
              <EPaycoOnPageComponent
                costo={calculatePrice(duracionASegundos(actaParaRelanzar.duracion))}
                file={actaParaRelanzar.nombre}
                folder={actaParaRelanzar.nombre.replace(/\.[^/.]+$/, "")}
                fileid={actaParaRelanzar.urlAssembly}
                duration={duracionASegundos(actaParaRelanzar.duracion).toString()}
                handlePayment={() => handlePaymentRelanzamiento()}
                nombreUsuario={session?.user?.name || undefined}
                emailUsuario={session?.user?.email || undefined}
              />
            ) : (
              // Botón para generar con código
              <Button
                className="w-full rounded-sm bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => handlePaymentRelanzamiento(codigoValidado?.codigo || null)}
                disabled={procesandoRelanzamiento}
              >
                {procesandoRelanzamiento ? "Generando acta..." : "Generar con código"}
              </Button>
            )}

            <button
              onClick={cerrarModalRelanzamiento}
              disabled={procesandoRelanzamiento}
              className="mt-4 w-full px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
