"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { getActasByUser } from "../services/actas_querys_services/getActasByUser";
import { createClient } from "@/utils/client";
import { processAction } from "../services/generacion_contenido_services/processAction";
import { ActualizarProceso } from "../services/actas_querys_services/actualizarProceso";
import { ActualizarProcesoPorId } from "../services/actas_querys_services/actualizarProcesoPorId";
import EPaycoOnPageComponent from "./epaycoOnPageComponent";
import { validarCodigo } from "../services/codigos_atencion/validarCodigo";
import { reservarMinutos } from "../services/codigos_atencion/reservarMinutos";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ConfirmRelanzarModalComponent from "./confirmRelanzarModalComponent";
import { relanzarDesdeTranscripcion } from "../services/actas_querys_services/relanzarDesdeTranscripcion";
import ConfirmReenviarCorreoModalComponent from "./confirmReenviarCorreoModalComponent";
import { reenviarCorreoActa } from "../services/actas_querys_services/reenviarCorreoActa";
import { getUsuarioDeActa } from "../services/actas_querys_services/getUsuarioDeActa";
import { calculatePrice } from "../utils/price";
import { getUserData } from "../plataforma/perfil/actions/getUserData";
import { relanzarDesdeContenido } from "../services/actas_querys_services/relanzarDesdeContenido";

interface Acta {
  id: string;
  nombre: string | null;
  tx: string | null;
  costo: string | null;
  duracion: string | null;
  urlTranscripcion: string | null;
  urlBorrador: string | null;
  urlContenido: string | null;
  urlAssembly: string | null;
  idEstadoProceso: number | null;
  fechaProcesamiento: Date;
  nombreEstado: string | null;
  emailUsuario?: string | null;
  telefonoUsuario?: string | null;
  idUsuario?: string | null;
}
interface HistorialActasProps {
  reloadTrigger: boolean;
  silentReload?: boolean;
  isSupportUser?: boolean;
}

const ACTAS_POR_PAGINA = 5;

export default function HistorialActasComponent({
  reloadTrigger,
  silentReload = false,
  isSupportUser = false,
}: HistorialActasProps) {
  const { data: session } = useSession();
  const [actas, setActas] = useState<Acta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaCorreo, setBusquedaCorreo] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [paginaActual, setPaginaActual] = useState(1);
  const [recargando, setRecargando] = useState(false);
  const [actasExpandidas, setActasExpandidas] = useState<
    Record<string, boolean>
  >({});
  const estadosAnterioresRef = useRef<Record<string, number | null>>({});
  const primeraCargaRef = useRef<boolean>(true);
  const cargarActasRef = useRef<((silent?: boolean) => Promise<void>) | null>(
    null,
  );
  const subscriptionRef = useRef<any>(null);
  const userIdRef = useRef<string | null>(null);
  const [actaParaRelanzar, setActaParaRelanzar] = useState<Acta | null>(null);
  const [procesandoRelanzamiento, setProcesandoRelanzamiento] = useState(false);
  const [tieneCodigoAtencion, setTieneCodigoAtencion] = useState(false);
  const [codigoAtencion, setCodigoAtencion] = useState("");
  const [validandoCodigo, setValidandoCodigo] = useState(false);
  const [mensajeCodigo, setMensajeCodigo] = useState("");
  const [codigoValido, setCodigoValido] = useState(false);
  const [codigoValidado, setCodigoValidado] = useState<{
    id: string;
    codigo: string;
  } | null>(null);
  const [
    actaParaRelanzarDesdeTranscripcion,
    setActaParaRelanzarDesdeTranscripcion,
  ] = useState<Acta | null>(null);
  const [
    actaParaRelanzarDesdeContenido,
    setActaParaRelanzarDesdeContenido,
  ] = useState<Acta | null>(null);
  const [
    procesandoRelanzamientoDesdeContenido,
    setProcesandoRelanzamientoDesdeContenido,
  ] = useState(false);
  const [
    procesandoRelanzamientoDesdeTranscripcion,
    setProcesandoRelanzamientoDesdeTranscripcion,
  ] = useState(false);
  const [actaParaReenviarCorreo, setActaParaReenviarCorreo] =
    useState<Acta | null>(null);
  const [procesandoReenvioCorreo, setProcesandoReenvioCorreo] = useState(false);
  const [usuarioActaReenvio, setUsuarioActaReenvio] = useState<{
    nombreUsuario: string | null;
    emailUsuario: string | null;
  } | null>(null);
  const [tipoDocumento, setTipoDocumento] = useState<string | null>(null);
  const [numeroDocumento, setNumeroDocumento] = useState<string | null>(null);

  const cargarActas = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      const result = await getActasByUser();

      if (result.status === "success") {
        const estadosAnteriores = estadosAnterioresRef.current;
        let huboCambio = false;

        result.data.forEach((acta: Acta) => {
          const estadoAnterior = estadosAnteriores[acta.id];
          const estadoActual = acta.idEstadoProceso;

          if (
            estadoAnterior === 5 &&
            (estadoActual === 6 || estadoActual === 7)
          ) {
            huboCambio = true;
          }

          estadosAnteriores[acta.id] = estadoActual;
        });

        const idsActuales = new Set(result.data.map((acta: Acta) => acta.id));
        Object.keys(estadosAnterioresRef.current).forEach((id) => {
          if (!idsActuales.has(id)) {
            delete estadosAnterioresRef.current[id];
          }
        });

        setActas(result.data);
      } else {
        if (!silent) {
          setError(result.message || "Error al cargar las actas");
        }
      }
    } catch (error) {
      console.error("Error al cargar actas:", error);

      if (!silent) {
        setError("Error al cargar las actas");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    cargarActasRef.current = cargarActas;
  }, [cargarActas]);

  useEffect(() => {
    const esPrimeraCarga = primeraCargaRef.current;
    const esActualizacion = !esPrimeraCarga || silentReload;

    if (esPrimeraCarga) {
      primeraCargaRef.current = false;
    }

    cargarActas(esActualizacion);
  }, [reloadTrigger, silentReload]);

  useEffect(() => {
    actas.forEach((acta) => {
      if (!estadosAnterioresRef.current[acta.id]) {
        estadosAnterioresRef.current[acta.id] = acta.idEstadoProceso;
      }
    });
  }, [actas]);

  useEffect(() => {
    const loadUserDocumentData = async () => {
      if (session) {
        try {
          const userData = await getUserData();
          if (userData?.tipoDocumento) {
            setTipoDocumento(userData.tipoDocumento);
          }
          if (userData?.numeroDocumento) {
            setNumeroDocumento(userData.numeroDocumento);
          }
        } catch (error) {
          console.error("Error al cargar datos de documento del usuario:", error);
        }
      }
    };

    loadUserDocumentData();
  }, [session]);

  useEffect(() => {
    if (!session?.user?.email) {
      return;
    }

    const setupSubscription = async () => {
      try {
        const response = await fetch("/api/user/get-user-id");
        if (response.ok) {
          const data = await response.json();
          const userId = data.userId;

          if (!userId) {
            return;
          }

          userIdRef.current = userId;

          const supabase = createClient();

          if (subscriptionRef.current) {
            await supabase.channel("actas-changes").unsubscribe();
            subscriptionRef.current = null;
          }

          const channel = supabase
            .channel("actas-changes")
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "actas",
                filter: `id_usuario=eq.${userId}`,
              },
              (payload) => {

                if (cargarActasRef.current) {
                  cargarActasRef.current(true);
                }
              },
            )
            .subscribe((status) => {
            });

          subscriptionRef.current = channel;
        }
      } catch (error) {
        console.error("Error al configurar suscripción:", error);
      }
    };

    setupSubscription();

    return () => {
      if (subscriptionRef.current) {
        const supabase = createClient();
        supabase.channel("actas-changes").unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [session?.user?.email]);

  const estadosUnicos = useMemo(() => {
    const estados = new Set<string>();
    actas.forEach((acta) => {
      if (acta.nombreEstado) {
        estados.add(acta.nombreEstado);
      }
    });
    return Array.from(estados).sort();
  }, [actas]);

  const actasFiltradas = useMemo(() => {
    let filtradas = actas;

    if (filtroEstado !== "todos") {
      filtradas = filtradas.filter(
        (acta) => acta.nombreEstado === filtroEstado,
      );
    }

    if (busqueda.trim()) {
      filtradas = filtradas.filter((acta) =>
        acta.nombre?.toLowerCase().includes(busqueda.toLowerCase()),
      );
    }

    if (isSupportUser && busquedaCorreo.trim()) {
      filtradas = filtradas.filter((acta) =>
        acta.emailUsuario?.toLowerCase().includes(busquedaCorreo.toLowerCase()),
      );
    }

    return filtradas;
  }, [actas, busqueda, busquedaCorreo, filtroEstado, isSupportUser]);

  const totalPaginas = Math.ceil(actasFiltradas.length / ACTAS_POR_PAGINA);
  const indiceInicio = (paginaActual - 1) * ACTAS_POR_PAGINA;
  const indiceFin = indiceInicio + ACTAS_POR_PAGINA;
  const actasPagina = actasFiltradas.slice(indiceInicio, indiceFin);

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, busquedaCorreo, filtroEstado]);

  const downloadFile = (
    url: string,
    tipo: "acta" | "transcripcion" | "borrador",
  ) => {
    const proxyUrl = `/api/descarga?url=${encodeURIComponent(url)}`;

    const link = document.createElement("a");
    link.href = proxyUrl;
    link.target = "_blank";
    link.download = url.split("/").pop() || "archivo";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  };
//necesito aqui para los usuarios con permisos para relanzar desde transcripcion tambien tengan un boton para relanzar desde contenido 
  const handleDownloadBorrador = async (acta: Acta) => {
    try {
      if (!acta.urlBorrador) {
        console.error("No se ha proporcionado la URL del borrador");
        return;
      }

      if (
        process.env.NEXT_PUBLIC_PAGO !== "soporte" &&
        typeof window !== "undefined" &&
        typeof window.gtag === "function"
      ) {
        window.gtag("event", "inicio_descarga_documento", {
          event_category: "descarga",
          event_label: "descarga_borrador_historial",
          tipo_documento: "borrador",
          nombre_archivo: acta.nombre,
        });
      }

      downloadFile(acta.urlBorrador, "borrador");
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

      if (
        process.env.NEXT_PUBLIC_PAGO !== "soporte" &&
        typeof window !== "undefined" &&
        typeof window.gtag === "function"
      ) {
        window.gtag("event", "inicio_descarga_documento", {
          event_category: "descarga",
          event_label: "descarga_transcripcion_historial",
          tipo_documento: "transcripcion",
          nombre_archivo: acta.nombre,
        });
      }

      downloadFile(acta.urlTranscripcion, "transcripcion");
    } catch (error) {
      console.error(
        "Error al descargar transcripción:",
        (error as Error).message,
      );
    }
  };

  const handleDescargarAmbos = async (acta: Acta) => {
    try {
      if (acta.urlBorrador) {
        if (
          process.env.NEXT_PUBLIC_PAGO !== "soporte" &&
          typeof window !== "undefined" &&
          typeof window.gtag === "function"
        ) {
          window.gtag("event", "inicio_descarga_documento", {
            event_category: "descarga",
            event_label: "descarga_borrador_historial",
            tipo_documento: "borrador",
            nombre_archivo: acta.nombre,
          });
        }

        downloadFile(acta.urlBorrador, "borrador");
      }

      const urlTranscripcion = acta.urlTranscripcion;
      if (urlTranscripcion) {
        setTimeout(() => {
          if (
            process.env.NEXT_PUBLIC_PAGO !== "soporte" &&
            typeof window !== "undefined" &&
            typeof window.gtag === "function"
          ) {
            window.gtag("event", "inicio_descarga_documento", {
              event_category: "descarga",
              event_label: "descarga_transcripcion_historial",
              tipo_documento: "transcripcion",
              nombre_archivo: acta.nombre,
            });
          }

          downloadFile(urlTranscripcion, "transcripcion");
        }, 1500);
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

  const duracionASegundos = (duracion: string | null): number => {
    if (!duracion) return 0;

    const numero = parseFloat(duracion);
    if (!isNaN(numero) && !duracion.includes(":")) {
      return numero;
    }

    if (duracion.includes(":")) {
      const partes = duracion.split(":");
      if (partes.length === 3) {
        const horas = parseInt(partes[0], 10) || 0;
        const minutos = parseInt(partes[1], 10) || 0;
        const segundos = parseInt(partes[2], 10) || 0;
        return horas * 3600 + minutos * 60 + segundos;
      }
    }

    return 0;
  };


  const puedeRelanzar = (fechaProcesamiento: Date): boolean => {
    const ahora = new Date();
    const fechaCreacion = new Date(fechaProcesamiento);
    const diferenciaHoras =
      (ahora.getTime() - fechaCreacion.getTime()) / (1000 * 60 * 60);
    return diferenciaHoras < 20;
  };

  const handleRelanzarActa = (acta: Acta) => {
    if (!puedeRelanzar(acta.fechaProcesamiento)) {
      toast.error(
        "El relanzamiento solo está disponible para actas creadas hace menos de 20 horas",
      );
      return;
    }

    if (!acta.urlAssembly || !acta.nombre || !acta.duracion) {
      alert("Error: Faltan datos necesarios para relanzar el acta.");
      return;
    }

    setTieneCodigoAtencion(false);
    setCodigoAtencion("");
    setCodigoValido(false);
    setCodigoValidado(null);
    setMensajeCodigo("");
    setActaParaRelanzar(acta);
  };

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
      const resultado = await validarCodigo(
        codigoAtencion.trim().toLowerCase(),
        duracionSegundos,
      );

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
      setMensajeCodigo(
        "Error al validar el código. Por favor, intenta nuevamente.",
      );
      setCodigoValidado(null);
    } finally {
      setValidandoCodigo(false);
    }
  };

  const handleCodigoChangeRelanzamiento = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const valor = e.target.value;
    setCodigoAtencion(valor);

    if (codigoValido) {
      setCodigoValido(false);
      setMensajeCodigo("");
      setCodigoValidado(null);
    }
  };

  const cerrarModalRelanzamiento = () => {
    setActaParaRelanzar(null);
    setTieneCodigoAtencion(false);
    setCodigoAtencion("");
    setCodigoValido(false);
    setCodigoValidado(null);
    setMensajeCodigo("");
    setProcesandoRelanzamiento(false);
  };

  const handleRelanzarDesdeTranscripcion = (acta: Acta) => {
    setActaParaRelanzarDesdeTranscripcion(acta);
  };

  const cerrarModalRelanzamientoDesdeTranscripcion = () => {
    setActaParaRelanzarDesdeTranscripcion(null);
    setProcesandoRelanzamientoDesdeTranscripcion(false);
  };

  const handleRelanzarDesdeContenido = (acta: Acta) => {
    setActaParaRelanzarDesdeContenido(acta);
  };

  const cerrarModalRelanzamientoDesdeContenido = () => {
    setActaParaRelanzarDesdeContenido(null);
    setProcesandoRelanzamientoDesdeContenido(false);
  };

  const handleConfirmarRelanzamientoDesdeContenido = async () => {
    if (!actaParaRelanzarDesdeContenido) {
      return;
    }

    setProcesandoRelanzamientoDesdeContenido(true);
    cerrarModalRelanzamientoDesdeContenido();

    try {
      // Actualizar estado a 5 (En generación)
      await ActualizarProcesoPorId(
        actaParaRelanzarDesdeContenido.id,
        5,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        "regeneracion desde contenido",
      );

      await cargarActas(true);

      toast.success("Regeneración de borrador iniciada", {
        description:
          "El borrador se está regenerando. Se actualizará automáticamente cuando esté listo.",
        duration: 5000,
      });

      // Iniciar proceso en background
      relanzarDesdeContenido(actaParaRelanzarDesdeContenido.id)
        .then((resultado) => {
          if (resultado.status === "success") {
            cargarActas(true);
          } else {
            toast.error("Error en regeneración", {
              description: resultado.message || "Error al regenerar el borrador",
              duration: 5000,
            });
            cargarActas(true);
          }
        })
        .catch((error) => {
          console.error("Error al regenerar desde contenido:", error);
          toast.error("Error", {
            description: "Ocurrió un error al regenerar el borrador.",
            duration: 5000,
          });
          cargarActas(true);
        });
    } catch (error) {
      // ... manejo de error ...
    }
  };
  const handleConfirmarRelanzamientoDesdeTranscripcion = async () => {
    if (!actaParaRelanzarDesdeTranscripcion) {
      return;
    }

    setProcesandoRelanzamientoDesdeTranscripcion(true);
    cerrarModalRelanzamientoDesdeTranscripcion();

    try {
      // PRIMERO: Actualizar estado a 5 (En generación) INMEDIATAMENTE en la base de datos
      console.log(`[REGENERACION] Actualizando estado a 5 para acta: ${actaParaRelanzarDesdeTranscripcion.id}`);
      const resultadoEstado = await ActualizarProcesoPorId(
        actaParaRelanzarDesdeTranscripcion.id,
        5, // Estado 5: En generación
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        "regeneracion desde transcripcion",
      );

      if (resultadoEstado.status !== "success") {
        console.error(`[REGENERACION] Error al actualizar estado: ${resultadoEstado.message}`);
        toast.error("Error", {
          description: "No se pudo actualizar el estado del acta. Por favor, intenta nuevamente.",
          duration: 5000,
        });
        setProcesandoRelanzamientoDesdeTranscripcion(false);
        return;
      }

      console.log(`[REGENERACION] Estado actualizado a 5 exitosamente. Recargando actas...`);
      
      // Recargar actas INMEDIATAMENTE para mostrar el estado 5 (En generación)
      await cargarActas(true);

      toast.success("Regeneración iniciada", {
        description:
          "El acta está siendo regenerada. Se actualizará automáticamente cuando esté lista.",
        duration: 5000,
      });

      // Ahora iniciar el proceso completo de regeneración en background
      console.log(`[REGENERACION] Iniciando proceso completo de regeneración...`);
      relanzarDesdeTranscripcion(actaParaRelanzarDesdeTranscripcion.id)
        .then((resultado) => {
          console.log(`[REGENERACION] Proceso completado:`, resultado.status);
          if (resultado.status === "success") {
            // Recargar actas nuevamente cuando termine para mostrar el estado final
            cargarActas(true);
          } else {
            toast.error("Error en regeneración", {
              description: resultado.message || "Error al regenerar el acta",
              duration: 5000,
            });
            // Recargar actas para actualizar el estado
            cargarActas(true);
          }
        })
        .catch((error) => {
          console.error("[REGENERACION] Error al regenerar acta:", error);
          toast.error("Error", {
            description:
              "Error al regenerar el acta. Por favor, intenta nuevamente.",
            duration: 5000,
          });
          // Recargar actas para actualizar el estado
          cargarActas(true);
        })
        .finally(() => {
          setProcesandoRelanzamientoDesdeTranscripcion(false);
        });
    } catch (error) {
      console.error("[REGENERACION] Error al iniciar regeneración:", error);
      setProcesandoRelanzamientoDesdeTranscripcion(false);
      toast.error("Error", {
        description:
          "Error al iniciar la regeneración. Por favor, intenta nuevamente.",
        duration: 5000,
      });
    }
  };

  const handleReenviarCorreo = async (acta: Acta) => {
    setActaParaReenviarCorreo(acta);

    try {
      const usuarioData = await getUsuarioDeActa(acta.id);
      if (usuarioData.status === "success") {
        setUsuarioActaReenvio({
          nombreUsuario: usuarioData.nombreUsuario,
          emailUsuario: usuarioData.emailUsuario,
        });
      } else {
        setUsuarioActaReenvio({
          nombreUsuario: null,
          emailUsuario: null,
        });
      }
    } catch (error) {
      console.error("Error al obtener datos del usuario:", error);
      setUsuarioActaReenvio({
        nombreUsuario: null,
        emailUsuario: null,
      });
    }
  };

  const cerrarModalReenvioCorreo = () => {
    setActaParaReenviarCorreo(null);
    setProcesandoReenvioCorreo(false);
    setUsuarioActaReenvio(null);
  };

  const handleConfirmarReenvioCorreo = async () => {
    if (!actaParaReenviarCorreo) {
      return;
    }

    setProcesandoReenvioCorreo(true);

    try {
      const resultado = await reenviarCorreoActa(actaParaReenviarCorreo.id);

      if (resultado.status === "success") {
        toast.success("Correo reenviado", {
          description:
            "El correo ha sido reenviado exitosamente y el acta ha pasado al estado 7.",
          duration: 5000,
        });
        cerrarModalReenvioCorreo();

        await cargarActas(true);
      } else {
        console.error(`❌ [CLIENTE] Error en reenvío:`, resultado.message);
        toast.error("Error", {
          description: resultado.message || "Error al reenviar el correo",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error(`❌ [CLIENTE] Error al reenviar correo:`, error);
      toast.error("Error", {
        description:
          "Error al reenviar el correo. Por favor, intenta nuevamente.",
        duration: 5000,
      });
    } finally {
      setProcesandoReenvioCorreo(false);
    }
  };

  const handlePaymentRelanzamiento = async (
    codigoAtencionUsado?: string | null,
  ) => {
    if (
      !actaParaRelanzar ||
      !actaParaRelanzar.urlAssembly ||
      !actaParaRelanzar.nombre ||
      !actaParaRelanzar.duracion
    ) {
      toast.error("Error", {
        description: "Faltan datos necesarios para procesar el acta.",
        duration: 5000,
      });
      cerrarModalRelanzamiento();
      return;
    }

    const codigoFinal = codigoAtencionUsado || codigoValidado?.codigo || null;
    const duracionSegundos = duracionASegundos(actaParaRelanzar.duracion);

    if (codigoFinal && codigoValidado) {
      try {
        const resultadoValidacion = await validarCodigo(
          codigoFinal,
          duracionSegundos,
        );
        if (!resultadoValidacion.valido) {
          toast.error("Error", {
            description:
              resultadoValidacion.mensaje ||
              "Código inválido o saldo insuficiente",
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
          description:
            "Error al validar el código. Por favor, intenta nuevamente.",
          duration: 5000,
        });
        return;
      }
    }

    setProcesandoRelanzamiento(true);

    try {
      const carpeta = actaParaRelanzar.nombre.replace(/\.[^/.]+$/, "");

      if (codigoFinal && codigoValidado) {
        try {
          const reservaResult = await reservarMinutos(
            codigoValidado.id,
            duracionSegundos,
          );
          if (!reservaResult.success) {
            setProcesandoRelanzamiento(false);
            toast.error("Error", {
              description:
                "Error al reservar minutos: " +
                (reservaResult.message || "Error desconocido"),
              duration: 5000,
            });
            return;
          }
        } catch (error) {
          console.error("Error al reservar minutos:", error);
          setProcesandoRelanzamiento(false);
          toast.error("Error", {
            description:
              "Error al reservar minutos. Por favor, intenta nuevamente.",
            duration: 5000,
          });
          return;
        }
      }

      await ActualizarProceso(
        actaParaRelanzar.nombre,
        5,
        undefined,
        undefined,
        codigoFinal ? "pago con codigo" : undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        false,
        codigoFinal || undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      cerrarModalRelanzamiento();

      toast.success("Acta relanzada", {
        description:
          "El acta se está procesando. Se actualizará automáticamente cuando esté lista.",
        duration: 5000,
      });

      await cargarActas(true);

      processAction(
        carpeta,
        actaParaRelanzar.nombre,
        actaParaRelanzar.urlAssembly,
        session?.user?.email || "",
        session?.user?.name || "",
        false,
        codigoFinal || undefined,
        actaParaRelanzar.idUsuario || undefined,
      )
        .then((result) => {
          if (result.status === "success") {
            cargarActas(true);
          } else {
            toast.error("Error al procesar el acta", {
              description: result.message || "Ocurrió un error inesperado",
              duration: 5000,
            });
          }
        })
        .catch((error) => {
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
    const nombreUsuario = session?.user?.name || "Usuario";
    const emailUsuario = session?.user?.email || "Sin email";

    const mensaje = `Hola, soy ${nombreUsuario}. Necesito ayuda con mi cuenta.

Información del usuario:
• Nombre: ${nombreUsuario}
• Email: ${emailUsuario}

Por favor, ¿pueden ayudarme?`;

    const numeroWhatsApp = "573122995191";
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    window.open(urlWhatsApp, "_blank");
  };

  const getEstadoTexto = (acta: Acta): string => {
    if (acta.nombreEstado) {
      return acta.nombreEstado;
    }
    if (acta.idEstadoProceso === null) return "Sin estado";
    return "Sin estado";
  };

  const getEstadoColor = (idEstadoProceso: number | null): string => {
    if (idEstadoProceso === null) return "bg-gray-100 text-gray-700";
    if (idEstadoProceso <= 4) return "bg-yellow-100 text-yellow-700";
    if (idEstadoProceso === 5) return "bg-blue-100 text-blue-700";
    if (idEstadoProceso === 6) return "bg-green-100 text-green-700";
    if (idEstadoProceso === 7) return "bg-purple-100 text-purple-700";
    return "bg-gray-100 text-gray-700";
  };

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
      {}
      <div className="mb-3 sm:mb-6">
        <div className={`grid grid-cols-1 ${isSupportUser ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3 sm:gap-4`}>
          {}
          <div>
            <label
              htmlFor="busqueda"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
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

          {}
          {isSupportUser && (
            <div>
              <label
                htmlFor="busquedaCorreo"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Buscar por correo de usuario
              </label>
              <input
                id="busquedaCorreo"
                type="text"
                value={busquedaCorreo}
                onChange={(e) => setBusquedaCorreo(e.target.value)}
                placeholder="Escribe el correo del usuario..."
                className="w-full px-2 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm sm:text-base"
              />
            </div>
          )}

          {}
          <div>
            <label
              htmlFor="filtroEstado"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Filtrar por estado
            </label>
            <select
              id="filtroEstado"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-2 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm sm:text-base bg-white"
            >
              <option value="todos">Todos los estados</option>
              {estadosUnicos.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {}
      {(busqueda || (isSupportUser && busquedaCorreo)) && (
        <div className="mb-4 text-sm text-gray-600">
          {actasFiltradas.length === 0 ? (
            <p>
              No se encontraron actas
              {busqueda && " con ese nombre"}
              {busqueda && isSupportUser && busquedaCorreo && " o"}
              {isSupportUser && busquedaCorreo && " con ese correo"}
              .
            </p>
          ) : (
            <p>
              {actasFiltradas.length}{" "}
              {actasFiltradas.length === 1
                ? "acta encontrada"
                : "actas encontradas"}
            </p>
          )}
        </div>
      )}

      {}
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

      {}
      {actasPagina.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No hay actas para mostrar.</p>
        </div>
      ) : (
        <>
          <ul role="list" className="divide-y divide-gray-100">
            {actasPagina.map((acta) => {
              const mostrarDetalles = actasExpandidas[acta.id] || false;
              
              // Lógica para mostrar en verde: tiene tx (pagada), ha pasado más de 1 hora y no está completada
              const mostrarEnVerde = isSupportUser && 
                acta.tx && 
                acta.idEstadoProceso !== null && 
                acta.idEstadoProceso < 6 &&
                (() => {
                  const fechaProcesamiento = new Date(acta.fechaProcesamiento);
                  const ahora = new Date();
                  const diferenciaHoras = (ahora.getTime() - fechaProcesamiento.getTime()) / (1000 * 60 * 60);
                  return diferenciaHoras > 1;
                })();

              return (
                <li
                  key={acta.id}
                  className={`relative sm:py-2 mb-2 sm:mb-0 sm:border-0 sm:rounded-none ${mostrarEnVerde ? 'bg-green-50 border-l-4 border-green-500 pl-2' : ''}`}
                >
                  <div className="flex flex-row items-start gap-2 sm:gap-4">
                    <div className="flex min-w-0 flex-1 pr-2">
                      <div className="min-w-0 flex-auto">
                        <p className={`text-sm sm:text-base font-semibold break-words line-clamp-2 ${mostrarEnVerde ? 'text-green-700' : 'text-gray-900'}`}>
                          {acta.nombre || "Sin nombre"}
                        </p>
                        <div className="mt-1 space-y-1">
                          <p className="text-xs sm:text-sm text-gray-500">
                            TX: {acta.tx || "Sin transacción"}
                            {isSupportUser && acta.emailUsuario && (
                              <span className="ml-2 text-purple-600 font-medium">
                                • {acta.emailUsuario}
                              </span>
                            )}
                          </p>
                          {isSupportUser && (
                            <>
                              <div className="flex items-center gap-2 flex-wrap">
                                {acta.telefonoUsuario ? (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    (acta.idEstadoProceso !== null && acta.idEstadoProceso >= 4 && acta.idEstadoProceso <= 9)
                                      ? 'bg-green-200 text-green-700'
                                      : 'bg-gray-200 text-gray-700'
                                  }`}>
                                    📞 {acta.telefonoUsuario}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-500">
                                    📞 Sin teléfono
                                  </span>
                                )}
                                <p className="text-xs text-gray-400">
                                  Creado: {new Date(acta.fechaProcesamiento).toLocaleString('es-CO', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </>
                          )}
                        </div>

                        {}
                        {mostrarDetalles && (
                          <div className="mt-3 sm:hidden space-y-1 pt-3 border-t border-gray-200">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-gray-700">
                                Estado:
                              </span>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-normal ${getEstadoColor(acta.idEstadoProceso)}`}
                              >
                                {getEstadoTexto(acta)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-700">
                              <span className="font-semibold">Duración:</span>{" "}
                              {acta.duracion || "N/A"}
                            </p>
                          </div>
                        )}

                        {}
                        <button
                          onClick={() =>
                            setActasExpandidas((prev) => ({
                              ...prev,
                              [acta.id]: !prev[acta.id],
                            }))
                          }
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
                      {}
                      <div className="hidden sm:flex sm:flex-col sm:items-end gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-normal ${getEstadoColor(acta.idEstadoProceso)}`}
                        >
                          {getEstadoTexto(acta)}
                        </span>
                        <p className="text-xs text-gray-500">
                          Duración: {acta.duracion || "N/A"}
                        </p>
                      </div>

                      {}
                      <div className="flex justify-end">
                        {acta.idEstadoProceso === 5 ? (
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
                        ) : (acta.idEstadoProceso !== null &&
                            acta.idEstadoProceso < 5 &&
                            acta.urlAssembly) ||
                          (acta.idEstadoProceso === 9 &&
                            acta.urlAssembly &&
                            puedeRelanzar(acta.fechaProcesamiento)) ? (
                          <button
                            onClick={() => handleRelanzarActa(acta)}
                            disabled={
                              procesandoRelanzamiento ||
                              !puedeRelanzar(acta.fechaProcesamiento)
                            }
                            className={`group relative flex items-center justify-center w-10 h-10 min-w-[40px] rounded-lg transition-colors flex-shrink-0 shadow-sm ${
                              puedeRelanzar(acta.fechaProcesamiento) &&
                              !procesandoRelanzamiento
                                ? "text-purple-600 bg-white border border-gray-200 hover:bg-gray-50"
                                : "text-gray-400 bg-gray-100 cursor-not-allowed border border-gray-200"
                            }`}
                            aria-label="Relanzar acta"
                            title={
                              puedeRelanzar(acta.fechaProcesamiento)
                                ? "Relanzar acta y continuar con el pago"
                                : "El relanzamiento solo está disponible para actas creadas hace menos de 20 horas"
                            }
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
                        {}
                        {isSupportUser &&
                          acta.idEstadoProceso !== null &&
                          acta.idEstadoProceso > 4 && (
                            <button
                              onClick={() =>
                                handleRelanzarDesdeTranscripcion(acta)
                              }
                              className="group relative flex items-center justify-center w-10 h-10 min-w-[40px] text-blue-600 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors flex-shrink-0 shadow-sm"
                              aria-label="Relanzar desde transcripción"
                              title="Relanzar desde transcripción"
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
                                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                                <path d="M21 3v5h-5" />
                                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                                <path d="M3 21v-5h5" />
                              </svg>
                              <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                Relanzar desde transcripción
                                <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 -mb-1 w-2 h-2 bg-gray-900 rotate-45"></span>
                              </span>
                            </button>
                          )}
                        {isSupportUser &&
                          acta.idEstadoProceso !== null &&
                          acta.idEstadoProceso > 4 && (
                            <button
                              onClick={() =>
                                handleRelanzarDesdeContenido(acta)
                              }
                              className="group relative flex items-center justify-center w-10 h-10 min-w-[40px] text-cyan-600 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors flex-shrink-0 shadow-sm"
                              aria-label="Relanzar desde contenido"
                              title="Relanzar desde contenido"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="size-5" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <path d="m12 12-4-4 4-4" />
                                <path d="M8 12h12" />
                              </svg>
                              <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                Relanzar desde contenido
                                <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 -mb-1 w-2 h-2 bg-gray-900 rotate-45"></span>
                              </span>
                            </button>
                          )}
                        {}
                        {isSupportUser && acta.idEstadoProceso === 6 && (
                          <button
                            onClick={() => handleReenviarCorreo(acta)}
                            className="group relative flex items-center justify-center w-10 h-10 min-w-[40px] text-green-600 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors flex-shrink-0 shadow-sm"
                            aria-label="Reenviar correo"
                            title="Reenviar correo"
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
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                              <polyline points="22,6 12,13 2,6" />
                            </svg>
                            <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                              Reenviar correo
                              <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 -mb-1 w-2 h-2 bg-gray-900 rotate-45"></span>
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {}
          {totalPaginas > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs sm:text-sm text-gray-600">
                {indiceInicio + 1} -{" "}
                {Math.min(indiceFin, actasFiltradas.length)} de{" "}
                {actasFiltradas.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setPaginaActual((prev) => Math.max(1, prev - 1))
                  }
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
                  onClick={() =>
                    setPaginaActual((prev) => Math.min(totalPaginas, prev + 1))
                  }
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

      {}
      {actaParaRelanzar &&
        actaParaRelanzar.urlAssembly &&
        actaParaRelanzar.nombre &&
        actaParaRelanzar.duracion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">
                Relanzar acta: {actaParaRelanzar.nombre}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Duración: {actaParaRelanzar.duracion} | Costo: $
                {calculatePrice(
                  duracionASegundos(actaParaRelanzar.duracion),
                ).toLocaleString("es-CO")}{" "}
                COP
              </p>

              {}
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tieneCodigoAtencion}
                    onChange={(e) => {
                      setTieneCodigoAtencion(e.target.checked);
                      if (!e.target.checked) {
                        setCodigoAtencion("");
                        setCodigoValido(false);
                        setCodigoValidado(null);
                        setMensajeCodigo("");
                      }
                    }}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">
                    ¿Tienes código de atención?
                  </span>
                </label>
              </div>

              {}
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
                    <p
                      className={`text-sm ${codigoValido ? "text-green-600" : "text-red-600"}`}
                    >
                      {mensajeCodigo}
                    </p>
                  )}
                </div>
              )}

              {}
              {!tieneCodigoAtencion || !codigoValido ? (
                <EPaycoOnPageComponent
                  costo={calculatePrice(
                    duracionASegundos(actaParaRelanzar.duracion),
                  )}
                  file={actaParaRelanzar.nombre}
                  folder={actaParaRelanzar.nombre.replace(/\.[^/.]+$/, "")}
                  fileid={actaParaRelanzar.urlAssembly}
                  duration={duracionASegundos(
                    actaParaRelanzar.duracion,
                  ).toString()}
                  handlePayment={() => handlePaymentRelanzamiento()}
                  nombreUsuario={session?.user?.name || undefined}
                  emailUsuario={session?.user?.email || undefined}
                  tipoDocumento={tipoDocumento}
                  numeroDocumento={numeroDocumento}
                />
              ) : (
                <Button
                  className="w-full rounded-sm bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() =>
                    handlePaymentRelanzamiento(codigoValidado?.codigo || null)
                  }
                  disabled={procesandoRelanzamiento}
                >
                  {procesandoRelanzamiento
                    ? "Generando acta..."
                    : "Generar con código"}
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

      {}
      <ConfirmRelanzarModalComponent
        open={actaParaRelanzarDesdeTranscripcion !== null}
        onClose={cerrarModalRelanzamientoDesdeTranscripcion}
        onConfirm={handleConfirmarRelanzamientoDesdeTranscripcion}
        loading={procesandoRelanzamientoDesdeTranscripcion}
        message="Esto borrará la transcripción y el borrador actuales para generar unos nuevos. ¿Deseas continuar?"
      />

      {}
      <ConfirmRelanzarModalComponent
        open={actaParaRelanzarDesdeContenido !== null}
        onClose={cerrarModalRelanzamientoDesdeContenido}
        onConfirm={handleConfirmarRelanzamientoDesdeContenido}
        loading={procesandoRelanzamientoDesdeContenido}
        message="Esto borrará el borrador actual para generar uno nuevo desde el contenido. ¿Deseas continuar?"
      />

      {}
      <ConfirmReenviarCorreoModalComponent
        open={actaParaReenviarCorreo !== null}
        onClose={cerrarModalReenvioCorreo}
        onConfirm={handleConfirmarReenvioCorreo}
        loading={procesandoReenvioCorreo}
        nombreUsuario={usuarioActaReenvio?.nombreUsuario || null}
        emailUsuario={usuarioActaReenvio?.emailUsuario || null}
      />
    </div>
  );
}
