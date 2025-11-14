"use client";

import * as React from "react";
import { X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import AlertModalComponent from "./alertModalComponent";
import DropdownIndustrias from "@/app/(generador)/components/dropdown_industrias";
import ProgressBarComponent from "./progressBarComponent";
import UploadDropzoneComponent from "./uploadDropzoneComponent";
import EPaycoOnPageComponent from "./epaycoOnPageComponent";
import BillingDataForm from "./billingDataForm";
import { getUserData } from "../plataforma/perfil/actions/getUserData";
import { checkBillingData } from "../services/billing/checkBillingData";
import { ActualizarProceso } from "../services/actas_querys_services/actualizarProceso";
import { BuscarAbiertoProceso } from "../services/actas_querys_services/buscarAbiertoProceso";
import { GuardarNuevoProceso } from "../services/actas_querys_services/guardarNuevoProceso";
import { validarCodigo } from "../services/codigos_atencion/validarCodigo";
import { reservarMinutos } from "../services/codigos_atencion/reservarMinutos";
import { normalizarNombreArchivo } from "../services/generacion_contenido_services/utilsActions";
import { processAction } from "../services/generacion_contenido_services/processAction";
import { uploadFileToAssemblyAI } from "../services/generacion_contenido_services/assemblyActions";
import { allowedExtensions } from "../utils/allowedExtensions";
import { formatCurrency, ensureDurationFormat } from "../utils/format";
import { track } from "../utils/analytics";
import { useIsIOSDevice } from "../hooks/useIOS";

declare global {
  interface Window {
    confirmPayment?: () => void;
  }
}


interface MediaSelectorProps {
  onFileSelect?: (file: File) => void;
  accept?: string;
  maxSize?: number;
  onCheckActa?: () => void;
}

export default function MediaFileUploaderComponent({
  onFileSelect,
  accept = "audio/*,video/*",
  onCheckActa = () => {}, 
}: MediaSelectorProps,) {
  const router = useRouter();
  const isIOS = useIsIOSDevice();
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [duration, setDuration] = React.useState<number>(0);
  const [uploadStatus, setUploadStatus] = React.useState<string | null>(null);
  const [calculando, setCalculando] = React.useState<boolean>(false);
  const [procesando, setProcesando] = React.useState<boolean>(false);
  const [duplicado, setDuplicado] = React.useState<boolean>(true);
  const [uploadProgress, setUploadProgress] = React.useState<number>(0);
  const [urlAssembly, setUrlAssembly] = React.useState<string | null>(null);
  const [folder, setFolder] = React.useState<string | null>(null);
  const [file, setFile] = React.useState<string | null>(null);
  const [acta, setActa] = React.useState<string | null>(null);
  const [hasBillingData, setHasBillingData] = React.useState<boolean>(false);
  const [checkingBillingData, setCheckingBillingData] = React.useState<boolean>(false);
  const [showBillingForm, setShowBillingForm] = React.useState<boolean>(false);
  const [transcripcion, setTranscripcion] = React.useState<string | null>(null);
  const [start, setStar] = React.useState<boolean>(true);
  const [showModal, setShowModal] = React.useState(false);
  const [modalMessage, setModalMessage] = React.useState("");
  const [isDuplicateModal, setIsDuplicateModal] = React.useState(false);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [pendingOriginalName, setPendingOriginalName] = React.useState<string>("");
  const [originalFileName, setOriginalFileName] = React.useState<string | null>(null);
  const [industriaId, setIndustriaId] = React.useState<number | null>(null);
  const lastAnimRef = React.useRef<SVGAnimateElement | null>(null);
  const [animacionTerminada, setAnimacionTerminada] = React.useState(false);
  const { data: session } = useSession();
  // Estados para código de atención
  const [tieneCodigoAtencion, setTieneCodigoAtencion] = React.useState<boolean>(false);
  const [codigoAtencion, setCodigoAtencion] = React.useState<string>("");
  const [validandoCodigo, setValidandoCodigo] = React.useState<boolean>(false);
  const [mensajeCodigo, setMensajeCodigo] = React.useState<string>("");
  const [codigoValido, setCodigoValido] = React.useState<boolean>(false);
  const [codigoValidado, setCodigoValidado] = React.useState<{ id: string; codigo: string } | null>(null);

  const handleContinue = () => {
    // No pedir industria si ya está guardada en el perfil
    // La industria se carga automáticamente desde el perfil del usuario
    if (session && !industriaId) {
      // Si no hay industria, usar la por defecto (99)
      setIndustriaId(99);
    }

    track('continue_button_click', {
      event_category: 'engagement',
      event_label: 'continue_button_clicked'
    });

    handleUploadFile();
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    setError(null);
    setUploadStatus(null);
    setUploadProgress(0);

    if (!file) return;

    try {
      const MAX_FILE_SIZE = 1.1 * 1024 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
        const maxSizeMB = (MAX_FILE_SIZE / 1024 / 1024).toFixed(0);
        setError(`El archivo es demasiado grande (${fileSizeMB} MB). Tamaño máximo permitido: ${maxSizeMB} MB`);
        clearSelection();
        return;
      }

      if (file.size === 0) {
        setError("El archivo seleccionado está vacío. Por favor selecciona un archivo válido.");
        clearSelection();
        return;
      }

      if (!file.name || file.name.trim() === '') {
        setError("El archivo seleccionado no tiene un nombre válido. Por favor selecciona otro archivo.");
        clearSelection();
        return;
      }
    } catch (error: unknown) {
      console.error("Error al validar archivo:", error);
    }

    track('inicio_seleccion_archivo', {
      event_category: 'proceso_acta',
      event_label: 'usuario_selecciona_archivo'
    });

    if (isIOS && !file) {
      setError("Por favor selecciona un archivo válido. En iPhone, asegúrate de seleccionar desde 'Archivos' o usar la opción 'Grabar'.");
      return;
    }

    const nombreNormalizado = await normalizarNombreArchivo(file.name);
    const nombreCarpeta = nombreNormalizado.replace(/\.[^/.]+$/, "");

    try {
      const isDuplicated = await BuscarAbiertoProceso(nombreNormalizado);

      if (isDuplicated) {
        setPendingFile(file);
        setPendingOriginalName(nombreNormalizado);
        setModalMessage("Nombre de acta ocupado, Por favor usa otro nombre.");
        setIsDuplicateModal(true);
        setShowModal(true);
        return;
      } else {
        setDuplicado(false);
      }
    } catch (error: unknown) {
      console.error("Error al ejecutar BuscarAbiertoProceso:", error);
      setModalMessage("Error al verificar el nombre del acta. Por favor intenta nuevamente.");
      setIsDuplicateModal(false);
      setShowModal(true);
      clearSelection();
      return;
    }

    setOriginalFileName(null);
    setFile(nombreNormalizado);
    setFolder(nombreCarpeta);

    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!file.type.match(/^(audio|video)/) && !allowedExtensions.includes(fileExtension)) {
      setError("Por favor selecciona un archivo de audio o video válido. Formatos permitidos: " + allowedExtensions.join(', '));

      track('error_validacion_archivo', {
        event_category: 'proceso_acta',
        event_label: 'archivo_invalido',
        tipo_archivo: file.type,
        extension_archivo: fileExtension
      });
      return;
    }

    track('validacion_archivo_exitosa', {
      event_category: 'proceso_acta',
      event_label: 'archivo_valido',
      tipo_archivo: file.type,
      tamaño_archivo: file.size
    });

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
    onFileSelect?.(file);

    const media = file.type.startsWith("audio/") || fileExtension.match(/\.(wav|mp3|m4a|aac|ogg|wma|flac)$/i)
      ? new Audio(url)
      : document.createElement("video");
    media.src = url;
    media.onloadedmetadata = () => {
      setDuration(media.duration);
    };

    track('file_selected', {
      event_category: 'engagement',
      event_label: file.type || fileExtension,
      value: file.size
    });
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setFile(null);
    setDuration(0);
    setPreview(null);
    setError(null);
    setActa(null);
    setTranscripcion(null);
    setUploadStatus(null);
    setCalculando(false);
    setUploadProgress(0);
    setIndustriaId(null);
    setDuplicado(true);
    setPendingFile(null);
    setPendingOriginalName("");
    setIsDuplicateModal(false);
    setOriginalFileName(null);
    // Limpiar estados de código de atención
    setTieneCodigoAtencion(false);
    setCodigoAtencion("");
    setValidandoCodigo(false);
    setMensajeCodigo("");
    setCodigoValido(false);
    setCodigoValidado(null);
    track('clear_selection', { event_category: 'engagement' });
  };

  const resetearParaNuevaGeneracion = () => {
    clearSelection();
    setUrlAssembly(null);
    setFolder(null);
    setProcesando(false);
    setAnimacionTerminada(false);
    setShowModal(false);
    setModalMessage("");
    track('resetear_para_nueva_generacion', { event_category: 'engagement' });
  };

  const handleRenameFile = async (newFileName: string) => {
    if (!pendingFile) return;

    try {
      const nombreNormalizado = await normalizarNombreArchivo(newFileName);
      const nombreCarpeta = nombreNormalizado.replace(/\.[^/.]+$/, "");

      const isDuplicated = await BuscarAbiertoProceso(nombreNormalizado);

      if (isDuplicated) {
        setModalMessage("Este nombre también está ocupado. Por favor usa otro nombre.");
        setIsDuplicateModal(true);
        setPendingOriginalName(nombreNormalizado);
        return;
      }

      setOriginalFileName(pendingOriginalName);
      setFile(nombreNormalizado);
      setFolder(nombreCarpeta);
      setSelectedFile(pendingFile);
      setDuplicado(false);
      setIsDuplicateModal(false);
      setShowModal(false);
      setPendingFile(null);
      setPendingOriginalName("");

      const url = URL.createObjectURL(pendingFile);
      setPreview(url);

      const fileExtension = '.' + pendingFile.name.split('.').pop()?.toLowerCase();
      const media = pendingFile.type.startsWith("audio/") || fileExtension.match(/\.(wav|mp3|m4a|aac|ogg|wma|flac)$/i)
        ? new Audio(url)
        : document.createElement("video");
      media.src = url;
      media.onloadedmetadata = () => {
        setDuration(media.duration);
      };

      track('file_renamed', {
        event_category: 'engagement',
        event_label: 'usuario_renombro_archivo',
        nombre_original: pendingOriginalName,
        nombre_nuevo: nombreNormalizado
      });
    } catch (error: unknown) {
      console.error("Error al renombrar archivo:", error);
      setModalMessage("Error al procesar el nuevo nombre. Por favor intenta nuevamente.");
      setIsDuplicateModal(false);
    }
  };

  const handlePayment = async (codigoAtencionUsado?: string | null) => {
    // Validar que no exista un acta con el mismo nombre ANTES de procesar
    // Usar el nombre renombrado (file) que el usuario ingresó
    if (!file) {
      alert("Error: No se ha establecido el nombre del archivo.");
      return;
    }

    const codigoFinal = codigoAtencionUsado || codigoValidado?.codigo || null;

    // Si hay código de atención, VALIDAR NUEVAMENTE antes de procesar
    // para asegurar que el saldo sigue siendo suficiente
    if (codigoFinal && codigoValidado) {
      try {
        const resultadoValidacion = await validarCodigo(codigoFinal, duration);
        if (!resultadoValidacion.valido) {
          setProcesando(false);
          alert(`Error: ${resultadoValidacion.mensaje || "Código inválido o saldo insuficiente"}`);
          setCodigoValido(false);
          setMensajeCodigo(resultadoValidacion.mensaje || "Código inválido");
          setCodigoValidado(null);
          return;
        }
        // Actualizar el código validado con la información más reciente
        if (resultadoValidacion.codigo) {
          setCodigoValidado({
            id: resultadoValidacion.codigo.id,
            codigo: resultadoValidacion.codigo.codigo,
          });
        }
      } catch (error) {
        console.error("Error al validar código antes de procesar:", error);
        setProcesando(false);
        alert("Error al validar el código. Por favor, intenta nuevamente.");
        return;
      }
    }

    // NO validar duplicados aquí porque:
    // 1. Ya se validó al subir el archivo
    // 2. Si el usuario renombró, ese es el nombre que debe usar
    // 3. La validación en handleUploadFile ya previno duplicados
    // Si llegamos aquí, el nombre ya fue validado y aprobado

    setProcesando(true);

    // Si hay código de atención válido, reservar minutos antes de iniciar
    if (codigoFinal && codigoValidado) {
      try {
        const reservaResult = await reservarMinutos(codigoValidado.id, duration);
        if (!reservaResult.success) {
          setProcesando(false);
          alert("Error al reservar minutos: " + (reservaResult.message || "Error desconocido"));
          return;
        }
      } catch (error) {
        console.error("Error al reservar minutos:", error);
        setProcesando(false);
        alert("Error al reservar minutos. Por favor, intenta nuevamente.");
        return;
      }
    }

    track('inicio_procesamiento_acta', {
      event_category: 'proceso_acta',
      event_label: 'inicio_generacion_acta',
      nombre_archivo: file,
      duracion_estimada: duration,
      tipo_procesamiento: codigoFinal ? 'acta_con_codigo' : 'acta_completa'
    });

    if (!codigoFinal) {
      track('payment_initiated', {
        event_category: 'engagement',
        event_label: 'payment_start',
        value: calculatePrice(duration)
      });
    }

    const nombreParaProcesar = file || '';
    const carpetaParaProcesar = folder || nombreParaProcesar.replace(/\.[^/.]+$/, "");
    
    if (!nombreParaProcesar) {
      setProcesando(false);
      alert("Error: No se ha establecido el nombre del archivo.");
      return;
    }

    setUploadStatus("Iniciando generacion del acta");
    
    // Actualizar estado a 5 (en generación) antes de iniciar el proceso
    // IMPORTANTE: Usar el nombre renombrado
    try {
      await ActualizarProceso(
        nombreParaProcesar,
        5, // Estado: En generación
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        false,
        codigoAtencionUsado || undefined
      );
      // Actualizar la tabla después de cambiar a estado 5
      onCheckActa?.();
    } catch (updateError) {
      console.error("Error al actualizar acta a estado 5:", updateError);
      // Continuar con el proceso aunque falle la actualización
    }
    
    const result = await processAction(
      carpetaParaProcesar, 
      nombreParaProcesar, 
      urlAssembly || '', 
      session?.user?.email || '', 
      session?.user?.name || '',
      false, // automation
      codigoFinal || undefined
    );
    if (result.status === "success") {
      setActa(result.acta ?? null);
      setTranscripcion(result.transcripcion ?? null);
      onCheckActa?.();
      setUploadStatus(
        "Todo listo, tu borrador de acta está listo para ser descargado."
      );
      setProcesando(false);

      track('procesamiento_acta_completado', {
        event_category: 'proceso_acta',
        event_label: 'acta_generada_exitosamente',
        nombre_archivo: file,
        tiempo_procesamiento: Date.now()
      });

      if (!codigoFinal) {
        track('payment_success', {
          event_category: 'engagement',
          event_label: 'payment_completed',
          value: calculatePrice(duration)
        });
      }
    } else {
      setProcesando(false);
      alert("Error al procesar el archivo: " + result.message);

      track('payment_error', {
        event_category: 'error',
        event_label: result.message || 'Unknown error'
      });
    }
  };

  const handleValidarCodigo = async () => {
    if (!codigoAtencion.trim()) {
      setMensajeCodigo("Por favor ingresa un código");
      setCodigoValido(false);
      return;
    }

    setValidandoCodigo(true);
    setMensajeCodigo("");

    try {
      const resultado = await validarCodigo(codigoAtencion, duration);
      
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

  const handleCodigoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setCodigoAtencion(valor);
    // Resetear validación cuando el usuario cambia el código
    if (codigoValido) {
      setCodigoValido(false);
      setMensajeCodigo("");
      setCodigoValidado(null);
    }
  };

  const calculatePrice = (durationInSeconds: number): number => {
    const segments = Math.ceil(durationInSeconds / 60 / 15);
    return segments * 2500;
  };

  // Monto mínimo para ePayco: 5000 COP
  const MONTO_MINIMO_EPAYCO = 5000;
  
  // Función para abrir WhatsApp con mensaje de soporte
  const handleContactarWhatsAppSoporte = () => {
    const nombreUsuario = session?.user?.name || 'Usuario';
    const emailUsuario = session?.user?.email || 'Sin email';
    const nombreActa = file || 'Sin nombre';
    const montoCalculado = calculatePrice(duration);
    const monto = `$${montoCalculado.toLocaleString('es-CO')} COP`;
    const duracionFormateada = ensureDurationFormat(duration) || 'N/A';

    const mensaje = `Hola, soy ${nombreUsuario} (${emailUsuario}). Necesito ayuda para generar el pago de mi acta.

Información del acta:
• Nombre: ${nombreActa}
• Monto: ${monto}
• Duración: ${duracionFormateada}

El monto es menor a $5,000 COP y ePayco solo acepta pagos superiores a $5,000 COP. Por favor, ¿pueden ayudarme con el pago?`;

    const numeroWhatsApp = '56945871929'; // +56 9 45871929 sin espacios ni signos
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    window.open(urlWhatsApp, '_blank');
  };


  React.useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleUploadFile = async () => {
    track('inicio_subida_archivo', {
      event_category: 'proceso_acta',
      event_label: 'usuario_inicia_subida',
      nombre_archivo: selectedFile?.name,
      tamaño_archivo: selectedFile?.size
    });

    setCalculando(true);
    setError(null);
    setUploadStatus(
      "Subiendo archivo, asi lo tendremos listo para ser procesado..."
    );
    setUploadProgress(0);

    if (!selectedFile) {
      setError("Por favor selecciona un archivo de audio o video.");
      setCalculando(false);
      return;
    }

    if (!file) {
      setError("Error: No se ha establecido el nombre del archivo.");
      setCalculando(false);
      return;
    }

    const nombreNormalizado = file;
    const nombreCarpeta = folder || nombreNormalizado.replace(/\.[^/.]+$/, "");

    try {
      const isDuplicated = await BuscarAbiertoProceso(nombreNormalizado);

      if (isDuplicated) {
        setPendingFile(selectedFile);
        setPendingOriginalName(nombreNormalizado);
        setModalMessage("Nombre de acta ocupado, Por favor usa otro nombre.");
        setIsDuplicateModal(true);
        setShowModal(true);
        setCalculando(false);
        return;
      }
    } catch (error: unknown) {
      console.error("Error al verificar duplicado antes de subir:", error);
      setModalMessage("Error al verificar el nombre del acta. Por favor intenta nuevamente.");
      setIsDuplicateModal(false);
      setShowModal(true);
      setCalculando(false);
      return;
    }

    setFolder(nombreCarpeta);

    const formData = new FormData();
    formData.append("audioFile", selectedFile);
    formData.append("nombreCarpeta", nombreCarpeta);
    formData.append("nombreNormalizado", nombreNormalizado);

    try {
      const result = await uploadFileToAssemblyAI(formData, (progress) => {
        const progressRounded = Math.round(progress);
        setUploadProgress(progressRounded);

        if (progressRounded % 25 === 0 && progressRounded > 0) {
          track('progreso_subida_archivo', {
            event_category: 'proceso_acta',
            event_label: 'progreso_subida',
            porcentaje_progreso: progressRounded,
            nombre_archivo: selectedFile?.name
          });
        }
      });

      if (result.success) {
        setUploadStatus("Archivo listo para ser procesado");
        setUrlAssembly(result.uploadUrl || null);

        const ejecutarCrearActa = async () => {
          try {
            if (result.uploadUrl) {
              if (industriaId === null || industriaId === undefined) {
                setIndustriaId(99);
              }
              const nombreParaGuardar = file || nombreNormalizado;
              const tipo = process.env.NEXT_PUBLIC_PAGO === "soporte" ? "soporte" : "acta";
              
              await GuardarNuevoProceso(nombreParaGuardar, 4, ensureDurationFormat(duration), calculatePrice(duration), tipo, result.uploadUrl, '', '', '', industriaId, '');
              
              // Actualizar la tabla después de guardar el nuevo proceso
              onCheckActa?.();
            }
          } catch (error: unknown) {
            console.error("Error al ejecutar crearActaDesdeCliente:", error);

            const msg = error instanceof Error ? error.message : "";

            if (
              msg.includes("duplicate key value") ||
              msg.includes("actas_nombre_acta_key") ||
              msg.includes("23505") ||
              msg.includes("DUPLICATE_ACTA")
            ) {
              setModalMessage("Nombre de acta ocupado, Por favor usa otro nombre.");
              setShowModal(true);
              clearSelection();
            } else {
              setModalMessage("Ocurrió un error al crear el acta. Intenta nuevamente.");
              setShowModal(true);
            }
          }
        };
        ejecutarCrearActa();

        setCalculando(false);
        setUploadProgress(100);
        setProcesando(false);
        setAnimacionTerminada(true);

        track('file_upload_success', {
          event_category: 'engagement',
          event_label: selectedFile.type,
          value: selectedFile.size
        });
      } else {
        setUploadStatus(result.error || "Error al subir el archivo");
        setCalculando(false);
        setUploadProgress(0);
        setProcesando(false);
        setAnimacionTerminada(true);

        track('file_upload_error', {
          event_category: 'error',
          event_label: result.error || 'Unknown error'
        });
      }
    } catch (error) {
      setUploadStatus(`Error de red o al procesar la petición: ${error}`);
      console.error("Error al subir:", error);
      setCalculando(false);
      setUploadProgress(0);
      setProcesando(false);
      setAnimacionTerminada(true);

      track('file_upload_error', {
        event_category: 'error',
        event_label: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handledirecto = async () => {
    setError(null);
    setUploadStatus("Enviado a soporte directo...");

    track('direct_support_initiated', {
      event_category: 'engagement',
      event_label: 'direct_support_start'
    });

    setTimeout(async () => {
      try {
        handlePayment();
      } catch (error) {
        setUploadStatus(`Error de red o al procesar la petición: ${error}`);
        console.error("Error al subir:", error);
        setCalculando(false);
        setUploadProgress(0);

        track('direct_support_error', {
          event_category: 'error',
          event_label: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, 0);
  };
  const downloadFile = (url: string) => {
    const proxyUrl = `/api/descarga?url=${encodeURIComponent(url)}`;
    window.open(proxyUrl, "_blank");
  };

  const handleDownload = async () => {
    try {
      if (!acta || !transcripcion) {
        console.error(
          "No se han proporcionado los datos necesarios para la descarga"
        );
        return;
      }

      track('inicio_descarga_documento', {
        event_category: 'descarga',
        event_label: 'inicio_descarga_acta_transcripcion',
        tipo_documento: 'acta_y_transcripcion',
        nombre_archivo: file
      });

      if (transcripcion) {
        downloadFile(acta);

        setTimeout(() => {
          if (acta) {
            downloadFile(transcripcion);

            track('descarga_documento_completada', {
              event_category: 'descarga',
              event_label: 'descarga_exitosa_completa',
              tipo_documento: 'acta_y_transcripcion',
              nombre_archivo: file
            });
            track('conversion_completada', {
              event_category: 'conversion',
              event_label: 'usuario_completa_proceso',
              valor_conversion: calculatePrice(duration),
              tipo_conversion: 'acta_completa',
              posicion_embudo: 'final'
            });
          }
        }, 4000);
      }
    } catch (error) {
      console.error("Error general:", (error as Error).message);

      track('document_download_error', {
        event_category: 'error',
        event_label: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };


  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const file = searchParams.get("file");
      const folder = searchParams.get("folder");
      const fileid = searchParams.get("fileid");
      const duration = searchParams.get("duration");
      if (duration) setDuration(Number(duration));
      setFile(file ?? null);
      setUrlAssembly(fileid ?? null);
      setFolder(folder ?? null);
    }
  }, []);

  // Verificar datos de facturación y cargar industria cuando el componente se monta o cuando hay sesión
  React.useEffect(() => {
    const verifyBillingData = async () => {
      setCheckingBillingData(true);
      try {
        const check = await checkBillingData();
        setHasBillingData(check.hasCompleteData);
      } catch (error) {
        console.error("Error al verificar datos de facturación:", error);
        setHasBillingData(false);
      } finally {
        setCheckingBillingData(false);
      }
    };

    const loadUserIndustria = async () => {
      if (session) {
        try {
          const userData = await getUserData();
          if (userData?.idIndustria) {
            setIndustriaId(userData.idIndustria);
          }
        } catch (error) {
          console.error("Error al cargar industria del usuario:", error);
        }
      }
    };

    verifyBillingData();
    loadUserIndustria();
  }, [session]);

  React.useEffect(() => {
    const animEl = lastAnimRef.current;
    if (animEl) {
      const onAnimEnd = () => {
        setAnimacionTerminada(true);
        setProcesando(false);
      };
      animEl.addEventListener("endEvent", onAnimEnd);
      return () => {
        animEl.removeEventListener("endEvent", onAnimEnd);
      };
    }
  }, []);

  // Eliminado: lógica de fetchTransaction de Wompi ya no es necesaria con OnPage Checkout


  return (
    <>
      <AlertModalComponent 
        open={showModal} 
        message={modalMessage} 
        onClose={() => {
          if (isDuplicateModal) {
            setPendingFile(null);
            setPendingOriginalName("");
            setIsDuplicateModal(false);
            clearSelection();
          } else {
            clearSelection();
          }
          setShowModal(false);
        }}
        allowRename={isDuplicateModal}
        onRename={handleRenameFile}
        currentFileName={pendingOriginalName}
      />

      <div className="p-4 sm:p-6 w-full max-w-lg mx-auto bg-transparent rounded-md">
        {start && (
          <div className="space-y-4">
            {!selectedFile && !file && (
              <UploadDropzoneComponent accept={accept} isIOS={isIOS} onChange={handleFileSelect} />
            )}
            {error && (
              <div className="text-sm text-red-500 text-center">{error}</div>
            )}
            {selectedFile && preview && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-md font-medium text-purple-700 truncate">
                        {originalFileName || selectedFile.name}
                      </div>
                      {originalFileName && file && (
                        <div className="text-sm text-purple-500 mt-1">
                          Renombrado a: <span className="font-semibold">{file}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSelection}
                      className="text-pu text-purple-700"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Eliminar archivo</span>
                    </Button>
                  </div>

                  <div className="text-sm font-semibold text-purple-700">
                    Valor estimado: {formatCurrency(calculatePrice(duration))} COP
                  </div>
                </div>

                <div className="rounded-lg overflow-hidden bg-black">
                  {selectedFile.type.startsWith("audio/") ? (
                    <audio src={preview} controls className="w-full">
                      Tu navegador no soporta el elemento de audio.
                    </audio>
                  ) : (
                    <video src={preview} controls className="w-full">
                      Tu navegador no soporta el elemento de video.
                    </video>
                  )}
                </div>
              </div>
            )}
            {/* No mostrar dropdown de industria - se usa la del perfil o la por defecto */}

            <div className="space-y-4" id="DivBotonesUpload">
              {uploadProgress === 100 &&
                selectedFile !== null &&
                acta === null &&
                transcripcion === null &&
                urlAssembly !== null &&
                !procesando && 
                duplicado === false &&
                hasBillingData && (
                  <>
                    {/* Checkbox para código de atención - Nueva fila arriba de los botones */}
                    <div className="space-y-3">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tieneCodigoAtencion}
                          onChange={(e) => {
                            setTieneCodigoAtencion(e.target.checked);
                            if (!e.target.checked) {
                              setCodigoAtencion("");
                              setCodigoValido(false);
                              setMensajeCodigo("");
                              setCodigoValidado(null);
                            }
                          }}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700">¿Tienes código de atención?</span>
                      </label>

                      {tieneCodigoAtencion && (
                        <div className="space-y-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={codigoAtencion}
                              onChange={handleCodigoChange}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleValidarCodigo();
                                }
                              }}
                              placeholder="Ingresa tu código (ej: skln12)"
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                            <Button
                              onClick={handleValidarCodigo}
                              disabled={validandoCodigo || !codigoAtencion.trim()}
                              className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                              {validandoCodigo ? "Validando..." : "Validar"}
                            </Button>
                          </div>
                          {mensajeCodigo && (
                            <p className={`text-xs ${
                              codigoValido ? "text-green-600" : "text-red-600"
                            }`}>
                              {mensajeCodigo}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

              <div className="flex gap-4">
                {selectedFile !== null && acta === null && transcripcion === null && (
                <Button
                  className="w-full rounded-sm"
                  variant="outline"
                  onClick={() => {
                    track('cancel_button_click', {
                      event_category: 'engagement',
                      event_label: 'cancel_button_clicked'
                    });
                    clearSelection();
                  }}
                >
                  Cancelar
                </Button>
              )}

              {uploadProgress === 100 &&
                selectedFile !== null &&
                acta === null &&
                transcripcion === null &&
                urlAssembly !== null &&
                !procesando && duplicado === false && (
                    <>
                      {checkingBillingData ? (
                        <Button
                          className="w-full rounded-sm bg-gray-400 cursor-not-allowed"
                          disabled
                        >
                          Verificando datos...
                        </Button>
                      ) : !hasBillingData ? (
                        <>
                          {session ? (
                            <>
                              <Button
                                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                                onClick={() => {
                                  router.push("/plataforma?openProfile=true");
                                }}
                              >
                                Ir a mi perfil
                              </Button>
                            </>
                          ) : (
                          <>
                            <BillingDataForm
                              isOpen={showBillingForm}
                              onClose={() => setShowBillingForm(false)}
                              onSuccess={async () => {
                                try {
                                  const check = await checkBillingData();
                                  setHasBillingData(check.hasCompleteData);
                                } catch (error) {
                                  console.error("Error al verificar datos:", error);
                                }
                                setShowBillingForm(false);
                              }}
                            />
                            <Button
                              className="w-full rounded-sm bg-green-700 hover:bg-green-800"
                              onClick={() => setShowBillingForm(true)}
                            >
                              Completar datos de facturación
                            </Button>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Verificar si el monto es menor al mínimo antes de mostrar opciones de pago */}
                        {calculatePrice(duration) < MONTO_MINIMO_EPAYCO ? (
                          <div className="w-full space-y-4">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                              <p className="text-sm text-yellow-800 mb-2">
                                <strong>Monto menor al mínimo requerido</strong>
                              </p>
                              <p className="text-sm text-yellow-700 mb-3">
                                El monto a pagar es <strong>${calculatePrice(duration).toLocaleString('es-CO')} COP</strong>, pero ePayco solo acepta pagos superiores a <strong>$5,000 COP</strong>.
                              </p>
                              <p className="text-sm text-yellow-700">
                                Te ofrecemos soporte para este tipo de pagos. Contáctanos por WhatsApp y te ayudaremos a procesar tu pago.
                              </p>
                            </div>
                            <Button
                              className="w-full rounded-sm bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
                              onClick={handleContactarWhatsAppSoporte}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width={20}
                                height={20}
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214l-3.741.982l.998-3.648l-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884c2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                              </svg>
                              Contactar soporte por WhatsApp
                            </Button>
                 
                          </div>
                        ) : (
                          <>
                            {/* Mostrar ePayco solo si no hay código válido */}
                            {!tieneCodigoAtencion || !codigoValido ? (
                              <EPaycoOnPageComponent
                                costo={calculatePrice(duration)}
                                file={file || ''}
                                folder={folder || ''}
                                fileid={urlAssembly || ''}
                                duration={duration.toString()}
                                handlePayment={() => handlePayment()}
                                nombreUsuario={session?.user?.name || undefined}
                                emailUsuario={session?.user?.email || undefined}
                                onPaymentClick={(handleOpenWidget: (() => void) | undefined) => {
                                  // Abrir ePayco directamente sin modal intermedio
                                  if (handleOpenWidget) {
                                    handleOpenWidget();
                                  }
                                  window.confirmPayment = handleOpenWidget;
                                }}
                              />
                            ) : (
                              // Botón para generar con código
                              <Button
                                className="w-full rounded-sm bg-purple-600 hover:bg-purple-700 text-white"
                                onClick={() => handlePayment(codigoValidado?.codigo || null)}
                                disabled={procesando}
                              >
                                {procesando ? "Generando acta..." : "Generar con código"}
                              </Button>
                            )}
                          </>
                        )}
                      </>
                    )}
                    </>
                  )}
              </div>
              {uploadProgress === 100 &&
                selectedFile !== null &&
                acta === null &&
                transcripcion === null &&
                urlAssembly !== null &&
                !procesando && duplicado === false && 
                !checkingBillingData &&
                !hasBillingData &&
                session && (
                  <div className="w-full p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 mb-2">
                      <strong>Datos de facturación requeridos</strong>
                    </p>
                    <p className="text-sm text-yellow-700">
                      Para procesar el pago, necesitas completar tus datos de facturación en tu perfil.
                    </p>
                  </div>
                )}
              {selectedFile !== null &&
                uploadProgress !== 100 &&
                acta === null &&
                transcripcion === null &&
                !procesando && 
                !checkingBillingData && (
                  <div className="flex gap-4">
                    {!hasBillingData && session ? (
                  <Button
                        className="w-full rounded-sm bg-yellow-600 hover:bg-yellow-700 text-white"
                        onClick={() => {
                          router.push("/plataforma?openProfile=true");
                        }}
                      >
                        Ir a mi perfil
                      </Button>
                    ) : (
                      <Button
                        className="w-full rounded-sm bg-purple-600 hover:bg-purple-700 flex items-center justify-center gap-2"
                    onClick={handleContinue}
                    disabled={calculando}
                  >
                    {calculando ? (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width={50}
                          height={50}
                          viewBox="0 0 24 24"
                        >
                          <rect
                            width={7.33}
                            height={7.33}
                            x={1}
                            y={1}
                            fill="currentColor"
                          >
                            <animate
                              id="svgSpinnersBlocksWave0"
                              attributeName="x"
                              begin="0;svgSpinnersBlocksWave1.end+0.2s"
                              dur="0.6s"
                              values="1;4;1"
                            ></animate>
                            <animate
                              attributeName="y"
                              begin="0;svgSpinnersBlocksWave1.end+0.2s"
                              dur="0.6s"
                              values="1;4;1"
                            ></animate>
                            <animate
                              attributeName="width"
                              begin="0;svgSpinnersBlocksWave1.end+0.2s"
                              dur="0.6s"
                              values="7.33;1.33;7.33"
                            ></animate>
                            <animate
                              attributeName="height"
                              begin="0;svgSpinnersBlocksWave1.end+0.2s"
                              dur="0.6s"
                              values="7.33;1.33;7.33"
                            ></animate>
                          </rect>
                          <rect
                            width={7.33}
                            height={7.33}
                            x={8.33}
                            y={1}
                            fill="currentColor"
                          >
                            <animate
                              attributeName="x"
                              begin="svgSpinnersBlocksWave0.begin+0.1s"
                              dur="0.6s"
                              values="8.33;11.33;8.33"
                            ></animate>
                            <animate
                              attributeName="y"
                              begin="svgSpinnersBlocksWave0.begin+0.1s"
                              dur="0.6s"
                              values="1;4;1"
                            ></animate>
                            <animate
                              attributeName="width"
                              begin="svgSpinnersBlocksWave0.begin+0.1s"
                              dur="0.6s"
                              values="7.33;1.33;7.33"
                            ></animate>
                            <animate
                              attributeName="height"
                              begin="svgSpinnersBlocksWave0.begin+0.1s"
                              dur="0.6s"
                              values="7.33;1.33;7.33"
                            ></animate>
                          </rect>
                          <rect
                            width={7.33}
                            height={7.33}
                            x={1}
                            y={8.33}
                            fill="currentColor"
                          >
                            <animate
                              attributeName="x"
                              begin="svgSpinnersBlocksWave0.begin+0.1s"
                              dur="0.6s"
                              values="1;4;1"
                            ></animate>
                            <animate
                              attributeName="y"
                              begin="svgSpinnersBlocksWave0.begin+0.1s"
                              dur="0.6s"
                              values="8.33;11.33;8.33"
                            ></animate>
                            <animate
                              attributeName="width"
                              begin="svgSpinnersBlocksWave0.begin+0.1s"
                              dur="0.6s"
                              values="7.33;1.33;7.33"
                            ></animate>
                            <animate
                              attributeName="height"
                              begin="svgSpinnersBlocksWave0.begin+0.1s"
                              dur="0.6s"
                              values="7.33;1.33;7.33"
                            ></animate>
                          </rect>
                          <rect
                            width={7.33}
                            height={7.33}
                            x={15.66}
                            y={1}
                            fill="currentColor"
                          >
                            <animate
                              attributeName="x"
                              begin="svgSpinnersBlocksWave0.begin+0.2s"
                              dur="0.6s"
                              values="15.66;18.66;15.66"
                            ></animate>
                            <animate
                              attributeName="y"
                              begin="svgSpinnersBlocksWave0.begin+0.2s"
                              dur="0.6s"
                              values="1;4;1"
                            ></animate>
                            <animate
                              attributeName="width"
                              begin="svgSpinnersBlocksWave0.begin+0.2s"
                              dur="0.6s"
                              values="7.33;1.33;7.33"
                            ></animate>
                            <animate
                              attributeName="height"
                              begin="svgSpinnersBlocksWave0.begin+0.2s"
                              dur="0.6s"
                              values="7.33;1.33;7.33"
                            ></animate>
                          </rect>
                          <rect
                            width={7.33}
                            height={7.33}
                            x={8.33}
                            y={8.33}
                            fill="currentColor"
                          >
                            <animate
                              attributeName="x"
                              begin="svgSpinnersBlocksWave0.begin+0.2s"
                              dur="0.6s"
                              values="8.33;11.33;8.33"
                            ></animate>
                            <animate
                              attributeName="y"
                              begin="svgSpinnersBlocksWave0.begin+0.2s"
                              dur="0.6s"
                              values="8.33;11.33;8.33"
                            ></animate>
                            <animate
                              attributeName="width"
                              begin="svgSpinnersBlocksWave0.begin+0.2s"
                              dur="0.6s"
                              values="7.33;1.33;7.33"
                            ></animate>
                            <animate
                              attributeName="height"
                              begin="svgSpinnersBlocksWave0.begin+0.2s"
                              dur="0.6s"
                              values="7.33;1.33;7.33"
                            ></animate>
                          </rect>
                          <rect
                            width={7.33}
                            height={7.33}
                            x={1}
                            y={15.66}
                            fill="currentColor"
                          >
                            <animate
                              attributeName="x"
                              begin="svgSpinnersBlocksWave0.begin+0.2s"
                              dur="0.6s"
                              values="1;4;1"
                            ></animate>
                            <animate
                              attributeName="y"
                              begin="svgSpinnersBlocksWave0.begin+0.2s"
                              dur="0.6s"
                              values="15.66;18.66;15.66"
                            ></animate>
                            <animate
                              attributeName="width"
                              begin="svgSpinnersBlocksWave0.begin+0.2s"
                              dur="0.6s"
                              values="7.33;1.33;7.33"
                            ></animate>
                            <animate
                              attributeName="height"
                              begin="svgSpinnersBlocksWave0.begin+0.2s"
                              dur="0.6s"
                              values="7.33;1.33;7.33"
                            ></animate>
                          </rect>
                          <rect
                            width={7.33}
                            height={7.33}
                            x={15.66}
                            y={8.33}
                            fill="currentColor"
                          >
                            <animate
                              attributeName="x"
                              begin="svgSpinnersBlocksWave0.begin+0.3s"
                              dur="0.6s"
                              values="15.66;18.66;15.66"
                            ></animate>
                            <animate
                              attributeName="y"
                              begin="svgSpinnersBlocksWave0.begin+0.3s"
                              dur="0.6s"
                              values="8.33;11.33;8.33"
                            ></animate>
                            <animate
                              attributeName="width"
                              begin="svgSpinnersBlocksWave0.begin+0.3s"
                              dur="0.6s"
                              values="7.33;1.33;7.33"
                            ></animate>
                            <animate
                              attributeName="height"
                              begin="svgSpinnersBlocksWave0.begin+0.3s"
                              dur="0.6s"
                              values="7.33;1.33;7.33"
                            ></animate>
                          </rect>
                          <rect
                            width={7.33}
                            height={7.33}
                            x={8.33}
                            y={15.66}
                            fill="currentColor"
                          >
                            <animate
                              attributeName="x"
                              begin="svgSpinnersBlocksWave0.begin+0.3s"
                              dur="0.6s"
                              values="8.33;11.33;8.33"
                            ></animate>
                            <animate
                              attributeName="y"
                              begin="svgSpinnersBlocksWave0.begin+0.3s"
                              dur="0.6s"
                              values="15.66;18.66;15.66"
                            ></animate>
                            <animate
                              attributeName="width"
                              begin="svgSpinnersBlocksWave0.begin+0.3s"
                              dur="0.6s"
                              values="7.33;1.33;7.33"
                            ></animate>
                            <animate
                              attributeName="height"
                              begin="svgSpinnersBlocksWave0.begin+0.3s"
                              dur="0.6s"
                              values="7.33;1.33;7.33"
                            ></animate>
                          </rect>
                          <rect
                            width={7.33}
                            height={7.33}
                            x={15.66}
                            y={15.66}
                            fill="currentColor"
                          >
                            <animate
                              id="svgSpinnersBlocksWave1"
                              attributeName="x"
                              begin="svgSpinnersBlocksWave0.begin+0.4s"
                              dur="0.6s"
                              values="15.66;18.66;15.66"
                            ></animate>
                            <animate
                              attributeName="y"
                              begin="svgSpinnersBlocksWave0.begin+0.4s"
                              dur="0.6s"
                              values="15.66;18.66;15.66"
                            ></animate>
                            <animate
                              attributeName="width"
                              begin="svgSpinnersBlocksWave0.begin+0.4s"
                              dur="0.6s"
                              values="7.33;1.33;7.33"
                            ></animate>
                            <animate
                              attributeName="height"
                              begin="svgSpinnersBlocksWave0.begin+0.4s"
                              dur="0.6s"
                              values="7.33;1.33;7.33"
                            ></animate>
                          </rect>
                        </svg>
                        Subiendo...
                      </>
                    ) : (
                      "Continuar"
                    )}
                  </Button>
                    )}
                  </div>
                )}
              {uploadProgress !== 100 &&
                acta === null &&
                transcripcion === null &&
                !procesando && 
                !checkingBillingData &&
                !hasBillingData &&
                session && (
                  <div className="w-full p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 mb-2">
                      <strong>Datos de facturación requeridos</strong>
                    </p>
                    <p className="text-sm text-yellow-700">
                      Para procesar el pago, necesitas completar tus datos de facturación en tu perfil.
                    </p>
                  </div>
                )}
              {acta === null && transcripcion === null && animacionTerminada && procesando ? (
                <Button
                  id="procesando"
                  className="w-full rounded-sm bg-purple-600 hover:bg-purple-700"
                  onClick={() => {
                    track('processing_button_click', {
                      event_category: 'engagement',
                      event_label: 'processing_button_clicked'
                    });
                    handleUploadFile();
                  }}
                  disabled={procesando}
                >
                  <>
                    {" "}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width={50}
                      height={50}
                      viewBox="0 0 24 24"
                    >
                      <rect
                        width={7.33}
                        height={7.33}
                        x={1}
                        y={1}
                        fill="currentColor"
                      >
                        <animate
                          id="svgSpinnersBlocksWave0"
                          attributeName="x"
                          begin="0;svgSpinnersBlocksWave1.end+0.2s"
                          dur="0.6s"
                          values="1;4;1"
                        ></animate>
                        <animate
                          attributeName="y"
                          begin="0;svgSpinnersBlocksWave1.end+0.2s"
                          dur="0.6s"
                          values="1;4;1"
                        ></animate>
                        <animate
                          attributeName="width"
                          begin="0;svgSpinnersBlocksWave1.end+0.2s"
                          dur="0.6s"
                          values="7.33;1.33;7.33"
                        ></animate>
                        <animate
                          attributeName="height"
                          begin="0;svgSpinnersBlocksWave1.end+0.2s"
                          dur="0.6s"
                          values="7.33;1.33;7.33"
                        ></animate>
                      </rect>
                      <rect
                        width={7.33}
                        height={7.33}
                        x={8.33}
                        y={1}
                        fill="currentColor"
                      >
                        <animate
                          attributeName="x"
                          begin="svgSpinnersBlocksWave0.begin+0.1s"
                          dur="0.6s"
                          values="8.33;11.33;8.33"
                        ></animate>
                        <animate
                          attributeName="y"
                          begin="svgSpinnersBlocksWave0.begin+0.1s"
                          dur="0.6s"
                          values="1;4;1"
                        ></animate>
                        <animate
                          attributeName="width"
                          begin="svgSpinnersBlocksWave0.begin+0.1s"
                          dur="0.6s"
                          values="7.33;1.33;7.33"
                        ></animate>
                        <animate
                          attributeName="height"
                          begin="svgSpinnersBlocksWave0.begin+0.1s"
                          dur="0.6s"
                          values="7.33;1.33;7.33"
                        ></animate>
                      </rect>
                      <rect
                        width={7.33}
                        height={7.33}
                        x={1}
                        y={8.33}
                        fill="currentColor"
                      >
                        <animate
                          attributeName="x"
                          begin="svgSpinnersBlocksWave0.begin+0.1s"
                          dur="0.6s"
                          values="1;4;1"
                        ></animate>
                        <animate
                          attributeName="y"
                          begin="svgSpinnersBlocksWave0.begin+0.1s"
                          dur="0.6s"
                          values="8.33;11.33;8.33"
                        ></animate>
                        <animate
                          attributeName="width"
                          begin="svgSpinnersBlocksWave0.begin+0.1s"
                          dur="0.6s"
                          values="7.33;1.33;7.33"
                        ></animate>
                        <animate
                          attributeName="height"
                          begin="svgSpinnersBlocksWave0.begin+0.1s"
                          dur="0.6s"
                          values="7.33;1.33;7.33"
                        ></animate>
                      </rect>
                      <rect
                        width={7.33}
                        height={7.33}
                        x={15.66}
                        y={1}
                        fill="currentColor"
                      >
                        <animate
                          attributeName="x"
                          begin="svgSpinnersBlocksWave0.begin+0.2s"
                          dur="0.6s"
                          values="15.66;18.66;15.66"
                        ></animate>
                        <animate
                          attributeName="y"
                          begin="svgSpinnersBlocksWave0.begin+0.2s"
                          dur="0.6s"
                          values="1;4;1"
                        ></animate>
                        <animate
                          attributeName="width"
                          begin="svgSpinnersBlocksWave0.begin+0.2s"
                          dur="0.6s"
                          values="7.33;1.33;7.33"
                        ></animate>
                        <animate
                          attributeName="height"
                          begin="svgSpinnersBlocksWave0.begin+0.2s"
                          dur="0.6s"
                          values="7.33;1.33;7.33"
                        ></animate>
                      </rect>
                      <rect
                        width={7.33}
                        height={7.33}
                        x={8.33}
                        y={8.33}
                        fill="currentColor"
                      >
                        <animate
                          attributeName="x"
                          begin="svgSpinnersBlocksWave0.begin+0.2s"
                          dur="0.6s"
                          values="8.33;11.33;8.33"
                        ></animate>
                        <animate
                          attributeName="y"
                          begin="svgSpinnersBlocksWave0.begin+0.2s"
                          dur="0.6s"
                          values="8.33;11.33;8.33"
                        ></animate>
                        <animate
                          attributeName="width"
                          begin="svgSpinnersBlocksWave0.begin+0.2s"
                          dur="0.6s"
                          values="7.33;1.33;7.33"
                        ></animate>
                        <animate
                          attributeName="height"
                          begin="svgSpinnersBlocksWave0.begin+0.2s"
                          dur="0.6s"
                          values="7.33;1.33;7.33"
                        ></animate>
                      </rect>
                      <rect
                        width={7.33}
                        height={7.33}
                        x={1}
                        y={15.66}
                        fill="currentColor"
                      >
                        <animate
                          attributeName="x"
                          begin="svgSpinnersBlocksWave0.begin+0.2s"
                          dur="0.6s"
                          values="1;4;1"
                        ></animate>
                        <animate
                          attributeName="y"
                          begin="svgSpinnersBlocksWave0.begin+0.2s"
                          dur="0.6s"
                          values="15.66;18.66;15.66"
                        ></animate>
                        <animate
                          attributeName="width"
                          begin="svgSpinnersBlocksWave0.begin+0.2s"
                          dur="0.6s"
                          values="7.33;1.33;7.33"
                        ></animate>
                        <animate
                          attributeName="height"
                          begin="svgSpinnersBlocksWave0.begin+0.2s"
                          dur="0.6s"
                          values="7.33;1.33;7.33"
                        ></animate>
                      </rect>
                      <rect
                        width={7.33}
                        height={7.33}
                        x={15.66}
                        y={8.33}
                        fill="currentColor"
                      >
                        <animate
                          attributeName="x"
                          begin="svgSpinnersBlocksWave0.begin+0.3s"
                          dur="0.6s"
                          values="15.66;18.66;15.66"
                        ></animate>
                        <animate
                          attributeName="y"
                          begin="svgSpinnersBlocksWave0.begin+0.3s"
                          dur="0.6s"
                          values="8.33;11.33;8.33"
                        ></animate>
                        <animate
                          attributeName="width"
                          begin="svgSpinnersBlocksWave0.begin+0.3s"
                          dur="0.6s"
                          values="7.33;1.33;7.33"
                        ></animate>
                        <animate
                          attributeName="height"
                          begin="svgSpinnersBlocksWave0.begin+0.3s"
                          dur="0.6s"
                          values="7.33;1.33;7.33"
                        ></animate>
                      </rect>
                      <rect
                        width={7.33}
                        height={7.33}
                        x={8.33}
                        y={15.66}
                        fill="currentColor"
                      >
                        <animate
                          attributeName="x"
                          begin="svgSpinnersBlocksWave0.begin+0.3s"
                          dur="0.6s"
                          values="8.33;11.33;8.33"
                        ></animate>
                        <animate
                          attributeName="y"
                          begin="svgSpinnersBlocksWave0.begin+0.3s"
                          dur="0.6s"
                          values="15.66;18.66;15.66"
                        ></animate>
                        <animate
                          attributeName="width"
                          begin="svgSpinnersBlocksWave0.begin+0.3s"
                          dur="0.6s"
                          values="7.33;1.33;7.33"
                        ></animate>
                        <animate
                          attributeName="height"
                          begin="svgSpinnersBlocksWave0.begin+0.3s"
                          dur="0.6s"
                          values="7.33;1.33;7.33"
                        ></animate>
                      </rect>
                      <rect
                        width={7.33}
                        height={7.33}
                        x={15.66}
                        y={15.66}
                        fill="currentColor"
                      >
                        <animate
                          id="svgSpinnersBlocksWave1"
                          attributeName="x"
                          begin="svgSpinnersBlocksWave0.begin+0.4s"
                          dur="0.6s"
                          values="15.66;18.66;15.66"
                        ></animate>
                        <animate
                          attributeName="y"
                          begin="svgSpinnersBlocksWave0.begin+0.4s"
                          dur="0.6s"
                          values="15.66;18.66;15.66"
                        ></animate>
                        <animate
                          attributeName="width"
                          begin="svgSpinnersBlocksWave0.begin+0.4s"
                          dur="0.6s"
                          values="7.33;1.33;7.33"
                        ></animate>
                        <animate
                          ref={lastAnimRef}
                          id="svgSpinnersBlocksWave1"
                          attributeName="x"
                          begin="svgSpinnersBlocksWave0.begin+0.4s"
                          dur="0.6s"
                          values="15.66;18.66;15.66"
                        />
                      </rect>
                    </svg>
                    Procesando acta...
                  </>
                </Button>
              ) : acta && transcripcion ? (
                <div className="flex gap-2 w-full">
                  <Button
                    className="w-full rounded-sm"
                    variant="outline"
                    onClick={() => {
                      track('new_generation_button_click', {
                        event_category: 'engagement',
                        event_label: 'new_generation_button_clicked'
                      });
                      resetearParaNuevaGeneracion();
                    }}
                  >
                    Generar nueva
                  </Button>
                  <Button
                    id="DownloadBtn"
                    className="w-full rounded-sm bg-purple-600 hover:bg-purple-700"
                    onClick={() => {
                      track('download_button_click', {
                        event_category: 'engagement',
                        event_label: 'download_button_clicked'
                      });
                      handleDownload();
                    }}
                  >
                    Descargar
                  </Button>
                </div>
              ) : transcripcion && !acta ? (
                <div className="text-sm text-purple-700 text-center">
                  Transcripción lista, esperando acta...
                </div>
              ) : acta && !transcripcion ? (
                <div className="text-sm text-purple-700 text-center">
                  Acta lista, esperando transcripción...
                </div>
              ) : null}
            </div>
            {calculando && selectedFile !== null && (
              <ProgressBarComponent progress={uploadProgress} />
            )}

            {uploadStatus &&
              uploadProgress !== 100 &&
              !procesando &&
              !calculando &&
              selectedFile !== null && (
                <div className="text-sm text-purple-700 text-center">
                  {uploadStatus}
                </div>
              )}
          </div>
        )}
        <div>
          {uploadStatus && (
            <div className="mt-2 text-sm break-words text-center text-purple-700">
              {uploadStatus}
            </div>
          )}
        </div>
        {process.env.NEXT_PUBLIC_PAGO === "soporte" && selectedFile && (
          <Button
            className="w-full mt-3 rounded-sm bg-purple-600 hover:bg-purple-700"
            onClick={() => {
              track('direct_support_button_click', {
                event_category: 'engagement',
                event_label: 'direct_support_button_clicked'
              });
              handledirecto();
            }}
          >
            Generar con transcripcion existente
          </Button>
        )}
        
      </div>
    </>
  );
}