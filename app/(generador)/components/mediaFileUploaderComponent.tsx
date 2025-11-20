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
import { ActualizarProcesoPorId } from "../services/actas_querys_services/actualizarProcesoPorId";
import { BuscarAbiertoProceso } from "../services/actas_querys_services/buscarAbiertoProceso";
import { GuardarNuevoProceso } from "../services/actas_querys_services/guardarNuevoProceso";
import { buscarActaPorNombreYUsuario } from "../services/actas_querys_services/buscarActaPorNombreYUsuario";
import { regenerarActaTotal } from "../services/actas_querys_services/regenerarActaTotal";
import { validarCodigo } from "../services/codigos_atencion/validarCodigo";
import { reservarMinutos } from "../services/codigos_atencion/reservarMinutos";
import { normalizarNombreArchivo } from "../services/generacion_contenido_services/utilsActions";
import { verificarPrimeraActa } from "../services/referidos/verificarPrimeraActa";
import { validarCodigoReferido } from "../services/referidos/validarCodigoReferido";
import { processAction } from "../services/generacion_contenido_services/processAction";
import { uploadFileToAssemblyAI } from "../services/generacion_contenido_services/assemblyActions";
import { allowedExtensions } from "../utils/allowedExtensions";
import { formatCurrency, ensureDurationFormat } from "../utils/format";
import { calculatePrice } from "../utils/price";
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
  disabled?: boolean;
  disabledMessage?: string;
  isSupportUser?: boolean;
  usuarioSoporteSeleccionado?: {
    id: string;
    nombre: string | null;
    email: string | null;
  } | null;
  tipoAtencionSoporte?: "acta_nueva" | "regeneracion_total" | null;
  idTransaccionSoporte?: string;
  idUsuarioSoporte?: string | null;
  onPrecioCalculado?: (precio: number | null) => void;
}

export default function MediaFileUploaderComponent({
  onFileSelect,
  accept = "audio/*,video/*",
  onCheckActa = () => {},
  disabled = false,
  disabledMessage = "Por favor, completa la información requerida antes de subir archivos.",
  isSupportUser = false,
  usuarioSoporteSeleccionado = null,
  tipoAtencionSoporte = null,
  idTransaccionSoporte = "",
  idUsuarioSoporte = null,
  onPrecioCalculado,
}: MediaSelectorProps) {
  const router = useRouter();
  const { data: session } = useSession();
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
  const [checkingBillingData, setCheckingBillingData] =
    React.useState<boolean>(false);
  const [showBillingForm, setShowBillingForm] = React.useState<boolean>(false);
  const [transcripcion, setTranscripcion] = React.useState<string | null>(null);
  const [start, setStar] = React.useState<boolean>(true);
  const [showModal, setShowModal] = React.useState(false);
  const [modalMessage, setModalMessage] = React.useState("");
  const [isDuplicateModal, setIsDuplicateModal] = React.useState(false);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [pendingOriginalName, setPendingOriginalName] =
    React.useState<string>("");
  const [originalFileName, setOriginalFileName] = React.useState<string | null>(
    null,
  );
  const [industriaId, setIndustriaId] = React.useState<number | null>(null);
  const [tipoDocumento, setTipoDocumento] = React.useState<string | null>(null);
  const [numeroDocumento, setNumeroDocumento] = React.useState<string | null>(null);
  const lastAnimRef = React.useRef<SVGAnimateElement | null>(null);
  const [animacionTerminada, setAnimacionTerminada] = React.useState(false);

  const [tieneCodigoAtencion, setTieneCodigoAtencion] =
    React.useState<boolean>(false);
  const [codigoAtencion, setCodigoAtencion] = React.useState<string>("");
  const [validandoCodigo, setValidandoCodigo] = React.useState<boolean>(false);
  const [mensajeCodigo, setMensajeCodigo] = React.useState<string>("");
  const [codigoValido, setCodigoValido] = React.useState<boolean>(false);
  const [codigoValidado, setCodigoValidado] = React.useState<{
    id: string;
    codigo: string;
  } | null>(null);

  const [idActaExistente, setIdActaExistente] = React.useState<string | null>(
    null,
  );

  const [actaParaRelanzar, setActaParaRelanzar] = React.useState<{
    id: string;
    nombre: string | null;
    idEstadoProceso: number | null;
    fechaProcesamiento: Date;
    idUsuario: string;
    urlAssembly: string | null;
    duracion: string | null;
  } | null>(null);
  const [procesandoRelanzamiento, setProcesandoRelanzamiento] =
    React.useState(false);
  const [
    tieneCodigoAtencionRelanzamiento,
    setTieneCodigoAtencionRelanzamiento,
  ] = React.useState<boolean>(false);
  const [codigoAtencionRelanzamiento, setCodigoAtencionRelanzamiento] =
    React.useState<string>("");
  const [validandoCodigoRelanzamiento, setValidandoCodigoRelanzamiento] =
    React.useState<boolean>(false);
  const [mensajeCodigoRelanzamiento, setMensajeCodigoRelanzamiento] =
    React.useState<string>("");
  const [codigoValidoRelanzamiento, setCodigoValidoRelanzamiento] =
    React.useState<boolean>(false);
  const [codigoValidadoRelanzamiento, setCodigoValidadoRelanzamiento] =
    React.useState<{ id: string; codigo: string } | null>(null);

  const [esPrimeraActa, setIsPrimeraActa] = React.useState<boolean>(false);
  const [verificandoPrimeraActa, setVerificandoPrimeraActa] =
    React.useState<boolean>(false);
  const [codigoReferido, setCodigoReferido] = React.useState<string>("");
  const [validandoCodigoReferido, setValidandoCodigoReferido] =
    React.useState<boolean>(false);
  const [codigoReferidoValido, setCodigoReferidoValido] =
    React.useState<boolean>(false);
  const [mensajeCodigoReferido, setMensajeCodigoReferido] =
    React.useState<string>("");

  const handleContinue = () => {
    if (disabled) {
      return;
    }

    if (
      isSupportUser &&
      tipoAtencionSoporte === "acta_nueva" &&
      !idTransaccionSoporte?.trim()
    ) {
      return;
    }

    if (session && !industriaId) {
      setIndustriaId(99);
    }

    track("continue_button_click", {
      event_category: "engagement",
      event_label: "continue_button_clicked",
    });

    handleUploadFile();
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (disabled) {
      return;
    }
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

      if (!file.name || file.name.trim() === "") {
        setError(
          "El archivo seleccionado no tiene un nombre válido. Por favor selecciona otro archivo.",
        );
        clearSelection();
        return;
      }
    } catch (error: unknown) {
      console.error("Error al validar archivo:", error);
    }

    track("inicio_seleccion_archivo", {
      event_category: "proceso_acta",
      event_label: "usuario_selecciona_archivo",
    });

    if (isIOS && !file) {
      setError(
        "Por favor selecciona un archivo válido. En iPhone, asegúrate de seleccionar desde 'Archivos' o usar la opción 'Grabar'.",
      );
      return;
    }

    const nombreNormalizado = await normalizarNombreArchivo(file.name);
    const nombreCarpeta = nombreNormalizado.replace(/\.[^/.]+$/, "");

    if (
      isSupportUser &&
      tipoAtencionSoporte === "regeneracion_total" &&
      usuarioSoporteSeleccionado
    ) {
      try {
        const resultadoBusqueda = await buscarActaPorNombreYUsuario(
          nombreNormalizado,
          usuarioSoporteSeleccionado.id,
        );

        if (resultadoBusqueda.status === "error") {
          setModalMessage(
            resultadoBusqueda.message || "Error al validar el acta",
          );
          setIsDuplicateModal(false);
          setShowModal(true);
          setIdActaExistente(null);
          clearSelection();
          return;
        }

        if (
          resultadoBusqueda.status === "success" &&
          resultadoBusqueda.idActa
        ) {
          setIdActaExistente(resultadoBusqueda.idActa);
          setDuplicado(false);
        } else {
          setModalMessage(
            "Error al validar el acta. Por favor, intenta nuevamente.",
          );
          setIsDuplicateModal(false);
          setShowModal(true);
          setIdActaExistente(null);
          clearSelection();
          return;
        }
      } catch (error) {
        console.error("Error al validar acta para regeneración total:", error);
        setModalMessage(
          "Error al validar el acta. Por favor, intenta nuevamente.",
        );
        setIsDuplicateModal(false);
        setShowModal(true);
        setIdActaExistente(null);
        clearSelection();
        return;
      }
    } else {
      setIdActaExistente(null);

      try {
        const actaExistente = await BuscarAbiertoProceso(nombreNormalizado);

        if (actaExistente) {
          const estado = actaExistente.idEstadoProceso;

          if (estado && estado > 4) {
            setPendingFile(file);
            setPendingOriginalName(nombreNormalizado);
            setModalMessage(
              "Nombre de acta ocupado, Por favor usa otro nombre.",
            );
            setIsDuplicateModal(true);
            setShowModal(true);
            return;
          }

          if (estado === 4) {
            const fechaProcesamiento = new Date(
              actaExistente.fechaProcesamiento,
            );
            const ahora = new Date();
            const diferenciaHoras =
              (ahora.getTime() - fechaProcesamiento.getTime()) /
              (1000 * 60 * 60);

            if (diferenciaHoras < 20) {
              if (actaExistente.urlAssembly && actaExistente.duracion && actaExistente.idUsuario) {
                setActaParaRelanzar({
                  id: actaExistente.id,
                  nombre: actaExistente.nombre,
                  idEstadoProceso: actaExistente.idEstadoProceso,
                  fechaProcesamiento: fechaProcesamiento,
                  idUsuario: actaExistente.idUsuario,
                  urlAssembly: actaExistente.urlAssembly,
                  duracion: actaExistente.duracion,
                });

                return;
              } else {
                setPendingFile(file);
                setPendingOriginalName(nombreNormalizado);
                setModalMessage(
                  "Nombre de acta ocupado, Por favor usa otro nombre.",
                );
                setIsDuplicateModal(true);
                setShowModal(true);
                return;
              }
            } else {
              setPendingFile(file);
              setPendingOriginalName(nombreNormalizado);
              setModalMessage(
                "Nombre de acta ocupado, Por favor usa otro nombre.",
              );
              setIsDuplicateModal(true);
              setShowModal(true);
              return;
            }
          }

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
        setModalMessage(
          "Error al verificar el nombre del acta. Por favor intenta nuevamente.",
        );
        setIsDuplicateModal(false);
        setShowModal(true);
        clearSelection();
        return;
      }
    }

    setOriginalFileName(null);
    setFile(nombreNormalizado);
    setFolder(nombreCarpeta);

    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();

    if (
      !file.type.match(/^(audio|video)/) &&
      !allowedExtensions.includes(fileExtension)
    ) {
      setError(
        "Por favor selecciona un archivo de audio o video válido. Formatos permitidos: " +
          allowedExtensions.join(", "),
      );

      track("error_validacion_archivo", {
        event_category: "proceso_acta",
        event_label: "archivo_invalido",
        tipo_archivo: file.type,
        extension_archivo: fileExtension,
      });
      return;
    }

    track("validacion_archivo_exitosa", {
      event_category: "proceso_acta",
      event_label: "archivo_valido",
      tipo_archivo: file.type,
      tamaño_archivo: file.size,
    });

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
    onFileSelect?.(file);

    const media =
      file.type.startsWith("audio/") ||
      fileExtension.match(/\.(wav|mp3|m4a|aac|ogg|wma|flac)$/i)
        ? new Audio(url)
        : document.createElement("video");
    media.src = url;
    media.onloadedmetadata = () => {
      setDuration(media.duration);
    };

    track("file_selected", {
      event_category: "engagement",
      event_label: file.type || fileExtension,
      value: file.size,
    });
  };

  React.useEffect(() => {
    if (isSupportUser && tipoAtencionSoporte !== "regeneracion_total") {
      setIdActaExistente(null);
    }
    if (isSupportUser && !usuarioSoporteSeleccionado) {
      setIdActaExistente(null);
    }
  }, [isSupportUser, tipoAtencionSoporte, usuarioSoporteSeleccionado]);

  React.useEffect(() => {
    const verificarPrimera = async () => {
      if (uploadProgress === 100 && urlAssembly && session) {
        setVerificandoPrimeraActa(true);
        try {
          const esPrimera = await verificarPrimeraActa();
          setIsPrimeraActa(esPrimera);
        } catch (error) {
          console.error("Error al verificar primera acta:", error);
          setIsPrimeraActa(false);
        } finally {
          setVerificandoPrimeraActa(false);
        }
      } else {
        setIsPrimeraActa(false);
      }
    };
    verificarPrimera();
  }, [uploadProgress, urlAssembly, session]);

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
    setIdActaExistente(null);
    setIndustriaId(null);
    setDuplicado(true);
    setPendingFile(null);
    setPendingOriginalName("");
    setIsDuplicateModal(false);
    setOriginalFileName(null);

    setTieneCodigoAtencion(false);
    setCodigoAtencion("");
    setValidandoCodigo(false);
    setMensajeCodigo("");
    setCodigoValido(false);
    setCodigoValidado(null);

    setCodigoReferido("");
    setCodigoReferidoValido(false);
    setMensajeCodigoReferido("");
    setIsPrimeraActa(false);
    track("clear_selection", { event_category: "engagement" });
  };

  const resetearParaNuevaGeneracion = () => {
    clearSelection();
    setUrlAssembly(null);
    setFolder(null);
    setProcesando(false);
    setAnimacionTerminada(false);
    setShowModal(false);
    setModalMessage("");
    track("resetear_para_nueva_generacion", { event_category: "engagement" });
  };

  const handleRenameFile = async (newFileName: string) => {
    if (!pendingFile) return;

    try {
      const nombreNormalizado = await normalizarNombreArchivo(newFileName);
      const nombreCarpeta = nombreNormalizado.replace(/\.[^/.]+$/, "");

      const actaExistente = await BuscarAbiertoProceso(nombreNormalizado);

      if (actaExistente) {
        const estado = actaExistente.idEstadoProceso;

        if (estado && estado > 4) {
          setModalMessage(
            "Este nombre también está ocupado. Por favor usa otro nombre.",
          );
          setIsDuplicateModal(true);
          setPendingOriginalName(nombreNormalizado);
          return;
        }

        if (estado === 4) {
          const fechaProcesamiento = new Date(actaExistente.fechaProcesamiento);
          const ahora = new Date();
          const diferenciaHoras =
            (ahora.getTime() - fechaProcesamiento.getTime()) / (1000 * 60 * 60);

          if (diferenciaHoras < 20) {
            if (actaExistente.urlAssembly && actaExistente.duracion && actaExistente.idUsuario) {
              setActaParaRelanzar({
                id: actaExistente.id,
                nombre: actaExistente.nombre,
                idEstadoProceso: actaExistente.idEstadoProceso,
                fechaProcesamiento: fechaProcesamiento,
                idUsuario: actaExistente.idUsuario,
                urlAssembly: actaExistente.urlAssembly,
                duracion: actaExistente.duracion,
              });

              setIsDuplicateModal(false);
              setShowModal(false);
              return;
            }
          }
        }

        setModalMessage(
          "Este nombre también está ocupado. Por favor usa otro nombre.",
        );
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

      const fileExtension =
        "." + pendingFile.name.split(".").pop()?.toLowerCase();
      const media =
        pendingFile.type.startsWith("audio/") ||
        fileExtension.match(/\.(wav|mp3|m4a|aac|ogg|wma|flac)$/i)
          ? new Audio(url)
          : document.createElement("video");
      media.src = url;
      media.onloadedmetadata = () => {
        setDuration(media.duration);
      };

      track("file_renamed", {
        event_category: "engagement",
        event_label: "usuario_renombro_archivo",
        nombre_original: pendingOriginalName,
        nombre_nuevo: nombreNormalizado,
      });
    } catch (error: unknown) {
      console.error("Error al renombrar archivo:", error);
      setModalMessage(
        "Error al procesar el nuevo nombre. Por favor intenta nuevamente.",
      );
      setIsDuplicateModal(false);
    }
  };

  const handleGenerateSoporte = async () => {
    if (
      !isSupportUser ||
      !usuarioSoporteSeleccionado ||
      !tipoAtencionSoporte ||
      !idUsuarioSoporte
    ) {
      alert("Error: Faltan datos necesarios para generar el acta.");
      return;
    }

    if (!file) {
      alert("Error: No se ha establecido el nombre del archivo.");
      return;
    }

    if (tipoAtencionSoporte === "acta_nueva" && !idTransaccionSoporte?.trim()) {
      alert("Error: El ID de transacción es obligatorio para actas nuevas.");
      return;
    }

    if (tipoAtencionSoporte === "regeneracion_total" && !idActaExistente) {
      alert(
        "Error: No se encontró un acta válido para regenerar. Por favor, verifica que el archivo seleccionado corresponde a un acta pagado del usuario.",
      );
      return;
    }

    setProcesando(true);
    setUploadStatus("Iniciando generación del acta");

    const nombreParaProcesar = file || "";
    const carpetaParaProcesar =
      folder || nombreParaProcesar.replace(/\.[^/.]+$/, "");

    try {
      if (tipoAtencionSoporte === "regeneracion_total" && idActaExistente) {
        setUploadStatus("Regenerando acta existente...");

        try {
          const updateResult = await ActualizarProcesoPorId(
            idActaExistente,
            5,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            false,
            idUsuarioSoporte,
            undefined,
            undefined,
            "regeneracion total",
          );

          if (updateResult.status === "success") {
            onCheckActa?.();
          } else {
            console.warn(
              "Advertencia: No se pudo actualizar el estado a 5, continuando con la regeneración...",
            );
          }
        } catch (error) {
          console.error("Error al actualizar estado a 5:", error);
        }

        let urlAssemblyFinal = urlAssembly;
        if (!urlAssemblyFinal && selectedFile) {
          setUploadStatus("Subiendo archivo a AssemblyAI...");
          // Crear FormData con el archivo
          const formData = new FormData();
          formData.append("audioFile", selectedFile);
          const uploadResult = await uploadFileToAssemblyAI(formData);
          if (uploadResult.success && uploadResult.uploadUrl) {
            urlAssemblyFinal = uploadResult.uploadUrl;
            setUrlAssembly(urlAssemblyFinal);
          } else {
            throw new Error(
              uploadResult.message || "Error al subir archivo a AssemblyAI",
            );
          }
        }

        if (!urlAssemblyFinal) {
          throw new Error("No se pudo obtener la URL de AssemblyAI");
        }

        const result = await regenerarActaTotal(
          idActaExistente,
          urlAssemblyFinal,
          nombreParaProcesar,
          carpetaParaProcesar,
          usuarioSoporteSeleccionado.email || "",
          usuarioSoporteSeleccionado.nombre || "Usuario",
          idUsuarioSoporte,
        );

        if (result.status === "success") {
          setActa(result.acta ?? null);
          setTranscripcion(result.transcripcion ?? null);
          setUploadStatus("Acta regenerada exitosamente");
          onCheckActa?.();
        } else {
          setUploadStatus(`Error: ${result.message || "Error al regenerar el acta"}`);
          alert(`Error al regenerar el acta: ${result.message || "Error desconocido"}`);
        }
      } else {
        const soporteValue = "acta nueva";
        const txValue = idTransaccionSoporte || "";

        await ActualizarProceso(
          nombreParaProcesar,
          5,
          undefined,
          undefined,
          txValue,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          false,
          idUsuarioSoporte,
          undefined,
          undefined,
          soporteValue,
          usuarioSoporteSeleccionado.id,
        );

        onCheckActa?.();

        const result = await processAction(
          carpetaParaProcesar,
          nombreParaProcesar,
          urlAssembly || "",
          usuarioSoporteSeleccionado.email || "",
          usuarioSoporteSeleccionado.nombre || "Usuario",
          false,
          idUsuarioSoporte,
          usuarioSoporteSeleccionado.id,
        );

        if (result.status === "success") {
          setActa(result.acta ?? null);
          setTranscripcion(result.transcripcion ?? null);
          setUploadStatus("Acta generada exitosamente");
          onCheckActa?.();
        } else {
          setUploadStatus(`Error: ${result.message || "Error al generar el acta"}`);
          alert(`Error al generar el acta: ${result.message || "Error desconocido"}`);
        }
      }
    } catch (error) {
      console.error("Error al generar acta:", error);
      setUploadStatus(`Error: ${error instanceof Error ? error.message : "Error desconocido"}`);
      alert(`Error al generar el acta: ${error instanceof Error ? error.message : "Error desconocido"}`);
    } finally {
      setProcesando(false);
    }
  };

  const handlePayment = async (codigoAtencionUsado?: string | null) => {
    if (!file) {
      alert("Error: No se ha establecido el nombre del archivo.");
      return;
    }

    const codigoFinal = codigoAtencionUsado || codigoValidado?.codigo || null;

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

    setProcesando(true);

    if (codigoFinal && codigoValidado) {
      try {
        const reservaResult = await reservarMinutos(
          codigoValidado.id,
          duration,
        );
        if (!reservaResult.success) {
          setProcesando(false);
          alert(
            "Error al reservar minutos: " +
              (reservaResult.message || "Error desconocido"),
          );
          return;
        }
      } catch (error) {
        console.error("Error al reservar minutos:", error);
        setProcesando(false);
        alert("Error al reservar minutos. Por favor, intenta nuevamente.");
        return;
      }
    }

    track("inicio_procesamiento_acta", {
      event_category: "proceso_acta",
      event_label: "inicio_generacion_acta",
      nombre_archivo: file,
      duracion_estimada: duration,
      tipo_procesamiento: codigoFinal ? "acta_con_codigo" : "acta_completa",
    });

    if (!codigoFinal) {
      track("payment_initiated", {
        event_category: "engagement",
        event_label: "payment_start",
        value: calculatePrice(duration),
      });
    }

    const nombreParaProcesar = file || "";
    const carpetaParaProcesar =
      folder || nombreParaProcesar.replace(/\.[^/.]+$/, "");

    if (!nombreParaProcesar) {
      setProcesando(false);
      alert("Error: No se ha establecido el nombre del archivo.");
      return;
    }

    setUploadStatus("Iniciando generacion del acta");

    const codigoReferidoFinal =
      esPrimeraActa && codigoReferidoValido ? codigoReferido : null;
    try {
      await ActualizarProceso(
        nombreParaProcesar,
        5, // idEstadoProceso
        undefined, // duracion
        undefined, // costo
        codigoFinal ? "pago con codigo" : undefined, // tx
        undefined, // urlAssembly
        undefined, // referencia
        undefined, // urlTranscripcion
        undefined, // urlborrador
        undefined, // urlContenido
        null, // automation
        codigoAtencionUsado || null, // codigoAtencion
        undefined, // automation_mail
        codigoReferidoFinal || null, // codigoReferido
        undefined, // soporte
        undefined, // idUsuarioActa
      );

      onCheckActa?.();
    } catch (updateError) {
      console.error("Error al actualizar acta a estado 5:", updateError);
    }

    const result = await processAction(
      carpetaParaProcesar,
      nombreParaProcesar,
      urlAssembly || "",
      session?.user?.email || "",
      session?.user?.name || "",
      false,
      codigoFinal || undefined,
    );
    if (result.status === "success") {
      setActa(result.acta ?? null);
      setTranscripcion(result.transcripcion ?? null);
      onCheckActa?.();
      setUploadStatus(
        "Todo listo, tu borrador de acta está listo para ser descargado.",
      );
      setProcesando(false);

      track("procesamiento_acta_completado", {
        event_category: "proceso_acta",
        event_label: "acta_generada_exitosamente",
        nombre_archivo: file,
        tiempo_procesamiento: Date.now(),
      });

      if (!codigoFinal) {
        track("payment_success", {
          event_category: "engagement",
          event_label: "payment_completed",
          value: calculatePrice(duration),
        });
      }
    } else {
      setProcesando(false);
      alert("Error al procesar el archivo: " + result.message);

      track("payment_error", {
        event_category: "error",
        event_label: result.message || "Unknown error",
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
      setMensajeCodigo(
        "Error al validar el código. Por favor, intenta nuevamente.",
      );
      setCodigoValidado(null);
    } finally {
      setValidandoCodigo(false);
    }
  };

  const handleCodigoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setCodigoAtencion(valor);

    if (codigoValido) {
      setCodigoValido(false);
      setMensajeCodigo("");
      setCodigoValidado(null);
    }
  };


  React.useEffect(() => {
    if (onPrecioCalculado && isSupportUser) {
      if (duration > 0 && selectedFile) {
        const precio = calculatePrice(duration);
        onPrecioCalculado(precio);
      } else {
        onPrecioCalculado(null);
      }
    }
  }, [duration, selectedFile, isSupportUser, onPrecioCalculado]);

  const tipoAtencionAnteriorRef = React.useRef<
    "acta_nueva" | "regeneracion_total" | null
  >(tipoAtencionSoporte);

  React.useEffect(() => {
    if (isSupportUser && tipoAtencionSoporte !== null) {
      if (
        tipoAtencionAnteriorRef.current !== null &&
        tipoAtencionAnteriorRef.current !== tipoAtencionSoporte &&
        selectedFile
      ) {
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
        setIdActaExistente(null);
        setDuplicado(true);
        setPendingFile(null);
        setPendingOriginalName("");
        setIsDuplicateModal(false);
        setOriginalFileName(null);
        setTieneCodigoAtencion(false);
        setCodigoAtencion("");
        setValidandoCodigo(false);
        setMensajeCodigo("");
        setCodigoValido(false);
        setCodigoValidado(null);
        setCodigoReferido("");
        setCodigoReferidoValido(false);
        setMensajeCodigoReferido("");
        setIsPrimeraActa(false);

        if (onPrecioCalculado) {
          onPrecioCalculado(null);
        }
      }

      tipoAtencionAnteriorRef.current = tipoAtencionSoporte;
    }
  }, [tipoAtencionSoporte, isSupportUser, selectedFile, onPrecioCalculado]);

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

  const handleValidarCodigoRelanzamiento = async () => {
    if (!actaParaRelanzar || !actaParaRelanzar.duracion) {
      return;
    }

    if (!codigoAtencionRelanzamiento.trim()) {
      setMensajeCodigoRelanzamiento("Por favor ingresa un código");
      setCodigoValidoRelanzamiento(false);
      return;
    }

    setValidandoCodigoRelanzamiento(true);
    setMensajeCodigoRelanzamiento("");

    try {
      const duracionSegundos = duracionASegundos(actaParaRelanzar.duracion);
      const resultado = await validarCodigo(
        codigoAtencionRelanzamiento.trim().toLowerCase(),
        duracionSegundos,
      );

      if (resultado.valido && resultado.codigo) {
        setCodigoValidoRelanzamiento(true);
        setMensajeCodigoRelanzamiento("✓ Código válido");
        setCodigoValidadoRelanzamiento({
          id: resultado.codigo.id,
          codigo: resultado.codigo.codigo,
        });
      } else {
        setCodigoValidoRelanzamiento(false);
        setMensajeCodigoRelanzamiento(resultado.mensaje || "Código inválido");
        setCodigoValidadoRelanzamiento(null);
      }
    } catch (error) {
      console.error("Error al validar código:", error);
      setCodigoValidoRelanzamiento(false);
      setMensajeCodigoRelanzamiento(
        "Error al validar el código. Por favor, intenta nuevamente.",
      );
      setCodigoValidadoRelanzamiento(null);
    } finally {
      setValidandoCodigoRelanzamiento(false);
    }
  };

  const handleCodigoChangeRelanzamiento = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const valor = e.target.value;
    setCodigoAtencionRelanzamiento(valor);

    if (codigoValidoRelanzamiento) {
      setCodigoValidoRelanzamiento(false);
      setMensajeCodigoRelanzamiento("");
      setCodigoValidadoRelanzamiento(null);
    }
  };

  const handleValidarCodigoReferido = async () => {
    if (!codigoReferido.trim()) {
      setMensajeCodigoReferido("Por favor ingresa un código");
      setCodigoReferidoValido(false);
      return;
    }

    const codigoNormalizado = codigoReferido.trim().toUpperCase();
    if (
      codigoNormalizado.length !== 7 ||
      !/^[A-Z0-9]{7}$/.test(codigoNormalizado)
    ) {
      setMensajeCodigoReferido(
        "El código debe tener 7 caracteres alfanuméricos",
      );
      setCodigoReferidoValido(false);
      return;
    }

    setValidandoCodigoReferido(true);
    setMensajeCodigoReferido("");

    try {
      const resultado = await validarCodigoReferido(codigoNormalizado);

      if (resultado.valido) {
        setCodigoReferidoValido(true);
        setMensajeCodigoReferido("✓ Código válido");
        setCodigoReferido(codigoNormalizado);
      } else {
        setCodigoReferidoValido(false);
        setMensajeCodigoReferido(
          resultado.mensaje || "Código de referido no válido",
        );
      }
    } catch (error) {
      console.error("Error al validar código de referido:", error);
      setCodigoReferidoValido(false);
      setMensajeCodigoReferido(
        "Error al validar el código. Por favor, intenta nuevamente.",
      );
    } finally {
      setValidandoCodigoReferido(false);
    }
  };

  const handleCodigoReferidoChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const valor = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 7);
    setCodigoReferido(valor);

    if (codigoReferidoValido) {
      setCodigoReferidoValido(false);
      setMensajeCodigoReferido("");
    }
  };

  const cerrarModalRelanzamiento = () => {
    setActaParaRelanzar(null);
    setTieneCodigoAtencionRelanzamiento(false);
    setCodigoAtencionRelanzamiento("");
    setCodigoValidoRelanzamiento(false);
    setCodigoValidadoRelanzamiento(null);
    setMensajeCodigoRelanzamiento("");
    setProcesandoRelanzamiento(false);
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
      alert("Error: Faltan datos necesarios para procesar el acta.");
      cerrarModalRelanzamiento();
      return;
    }

    const codigoFinal =
      codigoAtencionUsado || codigoValidadoRelanzamiento?.codigo || null;
    const duracionSegundos = duracionASegundos(actaParaRelanzar.duracion);

    if (codigoFinal && codigoValidadoRelanzamiento) {
      try {
        const resultadoValidacion = await validarCodigo(
          codigoFinal,
          duracionSegundos,
        );
        if (!resultadoValidacion.valido) {
          alert(
            resultadoValidacion.mensaje ||
              "Código inválido o saldo insuficiente",
          );
          setCodigoValidoRelanzamiento(false);
          setMensajeCodigoRelanzamiento(
            resultadoValidacion.mensaje || "Código inválido",
          );
          setCodigoValidadoRelanzamiento(null);
          return;
        }
      } catch (error) {
        console.error("Error al validar código antes de procesar:", error);
        alert("Error al validar el código. Por favor, intenta nuevamente.");
        return;
      }
    }

    setProcesandoRelanzamiento(true);

    try {
      const carpeta = actaParaRelanzar.nombre.replace(/\.[^/.]+$/, "");

      if (codigoFinal && codigoValidadoRelanzamiento) {
        try {
          const reservaResult = await reservarMinutos(
            codigoValidadoRelanzamiento.id,
            duracionSegundos,
          );
          if (!reservaResult.success) {
            setProcesandoRelanzamiento(false);
            alert(
              "Error al reservar minutos: " +
                (reservaResult.message || "Error desconocido"),
            );
            return;
          }
        } catch (error) {
          console.error("Error al reservar minutos:", error);
          setProcesandoRelanzamiento(false);
          alert("Error al reservar minutos. Por favor, intenta nuevamente.");
          return;
        }
      }

      await ActualizarProceso(
        actaParaRelanzar.nombre,
        5, // idEstadoProceso
        undefined, // duracion
        undefined, // costo
        codigoFinal ? "pago con codigo" : undefined, // tx
        undefined, // urlAssembly
        undefined, // referencia
        undefined, // urlTranscripcion
        undefined, // urlborrador
        undefined, // urlContenido
        false, // automation
        codigoFinal || undefined, // codigoAtencion
        undefined, // automation_mail
        undefined, // codigoReferido
        undefined, // soporte
        undefined, // idUsuarioActa
      );

      cerrarModalRelanzamiento();

      onCheckActa?.();

      processAction(
        carpeta,
        actaParaRelanzar.nombre,
        actaParaRelanzar.urlAssembly,
        session?.user?.email || "",
        session?.user?.name || "",
        false,
        codigoFinal || undefined,
      )
        .then((result) => {
          if (result.status === "success") {
            onCheckActa?.();
          } else {
            console.error("Error al procesar el acta:", result.message);
          }
        })
        .catch((error) => {
          console.error("Error al procesar el acta:", error);
        });
    } catch (error) {
      console.error("Error al relanzar acta:", error);
      alert("Error al relanzar el acta. Por favor, intenta nuevamente.");
      setProcesandoRelanzamiento(false);
    }
  };

  const MONTO_MINIMO_EPAYCO = 5000;

  const handleContactarWhatsAppSoporte = () => {
    const nombreUsuario = session?.user?.name || "Usuario";
    const emailUsuario = session?.user?.email || "Sin email";
    const nombreActa = file || "Sin nombre";
    const montoCalculado = calculatePrice(duration);
    const monto = `$${montoCalculado.toLocaleString("es-CO")} COP`;
    const duracionFormateada = ensureDurationFormat(duration) || "N/A";

    const mensaje = `Hola, soy ${nombreUsuario} (${emailUsuario}). Necesito ayuda para generar el pago de mi acta.

Información del acta:
• Nombre: ${nombreActa}
• Monto: ${monto}
• Duración: ${duracionFormateada}

El monto es menor a $5,000 COP y ePayco solo acepta pagos superiores a $5,000 COP. Por favor, ¿pueden ayudarme con el pago?`;

    const numeroWhatsApp = "56945871929";
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    window.open(urlWhatsApp, "_blank");
  };

  React.useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleUploadFile = async () => {
    track("inicio_subida_archivo", {
      event_category: "proceso_acta",
      event_label: "usuario_inicia_subida",
      nombre_archivo: selectedFile?.name,
      tamaño_archivo: selectedFile?.size,
    });

    setCalculando(true);
    setError(null);
    setUploadStatus(
      "Subiendo archivo, asi lo tendremos listo para ser procesado...",
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

    if (!(isSupportUser && tipoAtencionSoporte === "regeneracion_total")) {
      try {
        const actaExistente = await BuscarAbiertoProceso(nombreNormalizado);

        if (actaExistente) {
          const estado = actaExistente.idEstadoProceso;

          if (estado && estado > 4) {
            setPendingFile(selectedFile);
            setPendingOriginalName(nombreNormalizado);
            setModalMessage(
              "Nombre de acta ocupado, Por favor usa otro nombre.",
            );
            setIsDuplicateModal(true);
            setShowModal(true);
            setCalculando(false);
            return;
          }

          if (estado === 4) {
            const fechaProcesamiento = new Date(
              actaExistente.fechaProcesamiento,
            );
            const ahora = new Date();
            const diferenciaHoras =
              (ahora.getTime() - fechaProcesamiento.getTime()) /
              (1000 * 60 * 60);

            if (diferenciaHoras < 20) {
              if (actaExistente.urlAssembly && actaExistente.duracion && actaExistente.idUsuario) {
                setActaParaRelanzar({
                  id: actaExistente.id,
                  nombre: actaExistente.nombre,
                  idEstadoProceso: actaExistente.idEstadoProceso,
                  fechaProcesamiento: fechaProcesamiento,
                  idUsuario: actaExistente.idUsuario,
                  urlAssembly: actaExistente.urlAssembly,
                  duracion: actaExistente.duracion,
                });
                setCalculando(false);
                return;
              }
            }
          }

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
        setModalMessage(
          "Error al verificar el nombre del acta. Por favor intenta nuevamente.",
        );
        setIsDuplicateModal(false);
        setShowModal(true);
        setCalculando(false);
        return;
      }
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
          track("progreso_subida_archivo", {
            event_category: "proceso_acta",
            event_label: "progreso_subida",
            porcentaje_progreso: progressRounded,
            nombre_archivo: selectedFile?.name,
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

              if (isSupportUser) {
                if (!usuarioSoporteSeleccionado) {
                  setModalMessage(
                    "Error: Debe seleccionar un usuario para crear el acta.",
                  );
                  setShowModal(true);
                  setCalculando(false);
                  return;
                }
                if (!tipoAtencionSoporte) {
                  setModalMessage(
                    "Error: Debe seleccionar un tipo de atención.",
                  );
                  setShowModal(true);
                  setCalculando(false);
                  return;
                }
                if (!idUsuarioSoporte) {
                  setModalMessage(
                    "Error: No se pudo obtener el ID del usuario de soporte.",
                  );
                  setShowModal(true);
                  setCalculando(false);
                  return;
                }
              }

              let codigoAtencionParaGuardar: string | null = null;
              let soporteParaGuardar: string | null = null;
              let txValue: string | undefined =
                process.env.NEXT_PUBLIC_PAGO === "soporte" ? "soporte" : "acta";
              let idUsuarioParaActa: string | undefined = undefined;

              if (isSupportUser) {
                if (!idUsuarioSoporte || typeof idUsuarioSoporte !== "string") {
                  console.error(
                    "❌ [ERROR] idUsuarioSoporte inválido:",
                    idUsuarioSoporte,
                  );
                  setModalMessage(
                    "Error: No se pudo obtener el ID del usuario de soporte.",
                  );
                  setShowModal(true);
                  setCalculando(false);
                  return;
                }
                codigoAtencionParaGuardar = idUsuarioSoporte;

                if (tipoAtencionSoporte === "acta_nueva") {
                  soporteParaGuardar = "acta nueva";
                } else if (tipoAtencionSoporte === "regeneracion_total") {
                  soporteParaGuardar = "regeneracion total";
                } else {
                  console.error(
                    "❌ [ERROR] tipoAtencionSoporte inválido:",
                    tipoAtencionSoporte,
                  );
                  setModalMessage("Error: Tipo de atención inválido.");
                  setShowModal(true);
                  setCalculando(false);
                  return;
                }

                if (
                  soporteParaGuardar &&
                  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                    soporteParaGuardar,
                  )
                ) {
                  console.error(
                    "❌ [ERROR] soporteParaGuardar es un UUID cuando debería ser 'acta nueva' o 'regeneracion total':",
                    soporteParaGuardar,
                  );
                  setModalMessage("Error: Tipo de atención inválido.");
                  setShowModal(true);
                  setCalculando(false);
                  return;
                }

                txValue =
                  tipoAtencionSoporte === "acta_nueva"
                    ? idTransaccionSoporte || ""
                    : undefined;

                if (
                  !usuarioSoporteSeleccionado ||
                  !usuarioSoporteSeleccionado.id ||
                  typeof usuarioSoporteSeleccionado.id !== "string"
                ) {
                  console.error(
                    "❌ [ERROR] usuarioSoporteSeleccionado.id inválido:",
                    usuarioSoporteSeleccionado,
                  );
                  setModalMessage(
                    "Error: No se pudo obtener el ID del usuario seleccionado.",
                  );
                  setShowModal(true);
                  setCalculando(false);
                  return;
                }
                idUsuarioParaActa = usuarioSoporteSeleccionado.id;

                if (
                  !soporteParaGuardar ||
                  (soporteParaGuardar !== "acta nueva" &&
                    soporteParaGuardar !== "regeneracion total")
                ) {
                  console.error(
                    "❌ [ERROR] soporteParaGuardar tiene valor incorrecto:",
                    soporteParaGuardar,
                  );
                  setModalMessage("Error: Tipo de atención inválido.");
                  setShowModal(true);
                  setCalculando(false);
                  return;
                }
                if (
                  !idUsuarioParaActa ||
                  typeof idUsuarioParaActa !== "string"
                ) {
                  console.error(
                    "❌ [ERROR] idUsuarioParaActa inválido:",
                    idUsuarioParaActa,
                  );
                  setModalMessage(
                    "Error: ID del usuario seleccionado inválido.",
                  );
                  setShowModal(true);
                  setCalculando(false);
                  return;
                }
                if (
                  !codigoAtencionParaGuardar ||
                  typeof codigoAtencionParaGuardar !== "string"
                ) {
                  console.error(
                    "❌ [ERROR] codigoAtencionParaGuardar inválido:",
                    codigoAtencionParaGuardar,
                  );
                  setModalMessage("Error: ID del usuario de soporte inválido.");
                  setShowModal(true);
                  setCalculando(false);
                  return;
                }
              }

              if (isSupportUser) {
                if (
                  !soporteParaGuardar ||
                  (soporteParaGuardar !== "acta nueva" &&
                    soporteParaGuardar !== "regeneracion total")
                ) {
                  console.error(
                    "❌ [ERROR FINAL] soporteParaGuardar inválido:",
                    soporteParaGuardar,
                  );
                  setModalMessage("Error: Tipo de atención inválido.");
                  setShowModal(true);
                  setCalculando(false);
                  return;
                }
                if (
                  !idUsuarioParaActa ||
                  typeof idUsuarioParaActa !== "string"
                ) {
                  console.error(
                    "❌ [ERROR FINAL] idUsuarioParaActa inválido:",
                    idUsuarioParaActa,
                  );
                  setModalMessage(
                    "Error: ID del usuario seleccionado inválido.",
                  );
                  setShowModal(true);
                  setCalculando(false);
                  return;
                }
                if (
                  !codigoAtencionParaGuardar ||
                  typeof codigoAtencionParaGuardar !== "string"
                ) {
                  console.error(
                    "❌ [ERROR FINAL] codigoAtencionParaGuardar inválido:",
                    codigoAtencionParaGuardar,
                  );
                  setModalMessage("Error: ID del usuario de soporte inválido.");
                  setShowModal(true);
                  setCalculando(false);
                  return;
                }
              }

              if (
                isSupportUser &&
                tipoAtencionSoporte === "regeneracion_total"
              ) {
              } else {

                await GuardarNuevoProceso(
                  nombreParaGuardar, // 1. nombreActa
                  4, // 2. idEstadoProceso
                  ensureDurationFormat(duration), // 3. duracion
                  calculatePrice(duration), // 4. costo
                  txValue || "", // 5. tx
                  result.uploadUrl || "", // 6. urlAssembly
                  "", // 7. referencia
                  "", // 8. urlTranscripcion
                  "", // 9. urlborrador
                  "", // 10. urlContenido
                  industriaId || 99, // 11. Industria
                  "", // 12. automation_mail
                  codigoAtencionParaGuardar || null, // 13. codigoAtencion
                  null, // 14. codigoReferido
                  soporteParaGuardar, // 15. soporte
                  idUsuarioParaActa, // 16. idUsuarioSoporte
                );

                onCheckActa?.();
              }
            }
          } catch (error: unknown) {
            if (isSupportUser && tipoAtencionSoporte === "regeneracion_total") {
            } else {
              const msg = error instanceof Error ? error.message : "";

              if (
                msg.includes("duplicate key value") ||
                msg.includes("actas_nombre_acta_key") ||
                msg.includes("23505") ||
                msg.includes("DUPLICATE_ACTA")
              ) {
                setModalMessage(
                  "Nombre de acta ocupado, Por favor usa otro nombre.",
                );
                setShowModal(true);
                clearSelection();
              } else {
                setModalMessage(
                  "Ocurrió un error al crear el acta. Intenta nuevamente.",
                );
                setShowModal(true);
              }
            }
          }
        };
        ejecutarCrearActa();

        setCalculando(false);
        setUploadProgress(100);
        setProcesando(false);
        setAnimacionTerminada(true);

        track("file_upload_success", {
          event_category: "engagement",
          event_label: selectedFile.type,
          value: selectedFile.size,
        });
      } else {
        setUploadStatus(result.error || "Error al subir el archivo");
        setCalculando(false);
        setUploadProgress(0);
        setProcesando(false);
        setAnimacionTerminada(true);

        track("file_upload_error", {
          event_category: "error",
          event_label: result.error || "Unknown error",
        });
      }
    } catch (error) {
      setUploadStatus(`Error de red o al procesar la petición: ${error}`);
      console.error("Error al subir:", error);
      setCalculando(false);
      setUploadProgress(0);
      setProcesando(false);
      setAnimacionTerminada(true);

      track("file_upload_error", {
        event_category: "error",
        event_label: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handledirecto = async () => {
    setError(null);
    setUploadStatus("Enviado a soporte directo...");

    track("direct_support_initiated", {
      event_category: "engagement",
      event_label: "direct_support_start",
    });

    setTimeout(async () => {
      try {
        handlePayment();
      } catch (error) {
        setUploadStatus(`Error de red o al procesar la petición: ${error}`);
        console.error("Error al subir:", error);
        setCalculando(false);
        setUploadProgress(0);

        track("direct_support_error", {
          event_category: "error",
          event_label: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }, 0);
  };
  const downloadFile = (url: string, filename?: string) => {
    const proxyUrl = `/api/descarga?url=${encodeURIComponent(url)}`;
    const link = document.createElement("a");
    link.href = proxyUrl;
    link.target = "_blank";
    link.style.display = "none";
    if (filename) {
      link.download = filename;
    }
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);
  };

  const handleDownloadBorrador = () => {
    if (!acta) {
      console.error("No se ha proporcionado el borrador para descargar");
      return;
    }

    track("descarga_borrador", {
      event_category: "descarga",
      event_label: "descarga_borrador",
      nombre_archivo: file,
    });

    downloadFile(acta, "Borrador.docx");
  };

  const handleDownloadTranscripcion = () => {
    if (!transcripcion) {
      console.error("No se ha proporcionado la transcripción para descargar");
      return;
    }

    track("descarga_transcripcion", {
      event_category: "descarga",
      event_label: "descarga_transcripcion",
      nombre_archivo: file,
    });

    downloadFile(transcripcion, "Transcripcion.txt");
  };

  const handleDescargarAmbos = () => {
    try {
      if (acta) {
        track("descarga_borrador", {
          event_category: "descarga",
          event_label: "descarga_borrador",
          nombre_archivo: file,
        });

        downloadFile(acta, "Borrador.docx");
      }

      if (transcripcion) {
        setTimeout(() => {
          track("descarga_transcripcion", {
            event_category: "descarga",
            event_label: "descarga_transcripcion",
            nombre_archivo: file,
          });

          downloadFile(transcripcion, "Transcripcion.txt");
        }, 1500);
      }
    } catch (error) {
      console.error("Error al descargar archivos:", (error as Error).message);
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

  const verifyBillingData = React.useCallback(async () => {
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
  }, []);

  React.useEffect(() => {
    const loadUserIndustria = async () => {
      if (session) {
        try {
          const userData = await getUserData();
          if (userData?.idIndustria) {
            setIndustriaId(userData.idIndustria);
          }
          if (userData?.tipoDocumento) {
            setTipoDocumento(userData.tipoDocumento);
          }
          if (userData?.numeroDocumento) {
            setNumeroDocumento(userData.numeroDocumento);
          }
        } catch (error) {
          console.error("Error al cargar industria del usuario:", error);
        }
      }
    };

    verifyBillingData();
    loadUserIndustria();
  }, [session, verifyBillingData]);

  React.useEffect(() => {
    const handleFocus = () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("openProfile") === "true") {
        window.history.replaceState({}, "", window.location.pathname);

        verifyBillingData();
      }
    };

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("openProfile") === "true") {
      window.history.replaceState({}, "", window.location.pathname);
      verifyBillingData();
    }

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [verifyBillingData]);

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

      <div className="w-full bg-transparent rounded-md">
        {start && (
          <div className="space-y-4">
            {!selectedFile &&
              !file &&
              (disabled ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                  <div className="text-gray-500 text-sm">{disabledMessage}</div>
                </div>
              ) : (
                <UploadDropzoneComponent
                  accept={accept}
                  isIOS={isIOS}
                  onChange={handleFileSelect}
                />
              ))}
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
                          Renombrado a:{" "}
                          <span className="font-semibold">{file}</span>
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

                  {!isSupportUser && (
                    <div className="text-sm font-semibold text-purple-700">
                      Valor estimado: {formatCurrency(calculatePrice(duration))}{" "}
                      COP
                    </div>
                  )}
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
            {}

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
                    {}
                    {!isSupportUser && (
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
                          <span className="text-sm text-gray-700">
                            ¿Tienes código de atención?
                          </span>
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
                                disabled={
                                  validandoCodigo || !codigoAtencion.trim()
                                }
                                className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                              >
                                {validandoCodigo ? "Validando..." : "Validar"}
                              </Button>
                            </div>
                            {mensajeCodigo && (
                              <p
                                className={`text-xs ${
                                  codigoValido
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {mensajeCodigo}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

              {}
              {uploadProgress === 100 &&
                selectedFile !== null &&
                acta === null &&
                transcripcion === null &&
                urlAssembly !== null &&
                !procesando &&
                duplicado === false &&
                hasBillingData &&
                !isSupportUser &&
                esPrimeraActa &&
                !tieneCodigoAtencion &&
                calculatePrice(duration) >= MONTO_MINIMO_EPAYCO && (
                  <div className="w-full mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ¿Te refirió alguien? Ingresa su código de referido:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={codigoReferido}
                        onChange={handleCodigoReferidoChange}
                        placeholder="CÓDIGO (7 caracteres)"
                        maxLength={7}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none uppercase font-mono tracking-wider"
                      />
                      <Button
                        onClick={handleValidarCodigoReferido}
                        disabled={
                          validandoCodigoReferido ||
                          !codigoReferido ||
                          codigoReferido.length !== 7
                        }
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-4"
                      >
                        {validandoCodigoReferido ? "..." : "Validar"}
                      </Button>
                    </div>
                    {mensajeCodigoReferido && (
                      <p
                        className={`mt-2 text-xs ${codigoReferidoValido ? "text-green-600" : "text-red-600"}`}
                      >
                        {mensajeCodigoReferido}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-600 italic">
                      Nota: El código de referido solo es válido para usuarios
                      nuevos y se redime al momento de pagar su primera acta. No
                      aplica para pago con código de atención.
                    </p>
                  </div>
                )}

              <div className="flex gap-4">
                {selectedFile !== null &&
                  acta === null &&
                  transcripcion === null && (
                    <Button
                      className="w-full rounded-sm"
                      variant="outline"
                      onClick={() => {
                        track("cancel_button_click", {
                          event_category: "engagement",
                          event_label: "cancel_button_clicked",
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
                  !procesando &&
                  duplicado === false && (
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
                                  await verifyBillingData();
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
                      ) : isSupportUser ? (
                        <Button
                          className="w-full rounded-sm bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                          onClick={handleGenerateSoporte}
                          disabled={
                            procesando ||
                            !usuarioSoporteSeleccionado ||
                            !tipoAtencionSoporte ||
                            !idUsuarioSoporte ||
                            (tipoAtencionSoporte === "acta_nueva" &&
                              !idTransaccionSoporte?.trim()) ||
                            (tipoAtencionSoporte === "regeneracion_total" &&
                              !idActaExistente) ||
                            !file
                          }
                          title={
                            tipoAtencionSoporte === "acta_nueva" &&
                            !idTransaccionSoporte?.trim()
                              ? "Por favor, ingresa el ID de transacción para generar el acta"
                              : undefined
                          }
                        >
                          {procesando ? "Generando acta..." : "Generar"}
                        </Button>
                      ) : (
                        <>
                          {}
                          {calculatePrice(duration) < MONTO_MINIMO_EPAYCO ? (
                            <div className="w-full space-y-4">
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-sm text-yellow-800 mb-2">
                                  <strong>
                                    Monto menor al mínimo requerido
                                  </strong>
                                </p>
                                <p className="text-sm text-yellow-700 mb-3">
                                  El monto a pagar es{" "}
                                  <strong>
                                    $
                                    {calculatePrice(duration).toLocaleString(
                                      "es-CO",
                                    )}{" "}
                                    COP
                                  </strong>
                                  , pero ePayco solo acepta pagos superiores a{" "}
                                  <strong>$5,000 COP</strong>.
                                </p>
                                <p className="text-sm text-yellow-700">
                                  Te ofrecemos soporte para este tipo de pagos.
                                  Contáctanos por WhatsApp y te ayudaremos a
                                  procesar tu pago.
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
                              {}
                              {!isSupportUser && (
                                <>
                                  {!tieneCodigoAtencion || !codigoValido ? (
                                    <EPaycoOnPageComponent
                                      costo={calculatePrice(duration)}
                                      file={file || ""}
                                      folder={folder || ""}
                                      fileid={urlAssembly || ""}
                                      duration={duration.toString()}
                                      handlePayment={() => handlePayment()}
                                      nombreUsuario={
                                        session?.user?.name || undefined
                                      }
                                      emailUsuario={
                                        session?.user?.email || undefined
                                      }
                                      tipoDocumento={tipoDocumento}
                                      numeroDocumento={numeroDocumento}
                                      onPaymentClick={(
                                        handleOpenWidget:
                                          | (() => void)
                                          | undefined,
                                      ) => {
                                        if (handleOpenWidget) {
                                          handleOpenWidget();
                                        }
                                        window.confirmPayment =
                                          handleOpenWidget;
                                      }}
                                    />
                                  ) : (
                                    <Button
                                      className="w-full rounded-sm bg-purple-600 hover:bg-purple-700 text-white"
                                      onClick={() =>
                                        handlePayment(
                                          codigoValidado?.codigo || null,
                                        )
                                      }
                                      disabled={procesando}
                                    >
                                      {procesando
                                        ? "Generando acta..."
                                        : "Generar con código"}
                                    </Button>
                                  )}
                                </>
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
                !procesando &&
                duplicado === false &&
                !checkingBillingData &&
                !hasBillingData &&
                session && (
                  <div className="w-full p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 mb-2">
                      <strong>Datos de facturación requeridos</strong>
                    </p>
                    <p className="text-sm text-yellow-700">
                      Para procesar el pago, necesitas completar tus datos de
                      facturación en tu perfil.
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
                        className="w-full rounded-sm bg-purple-600 hover:bg-purple-700 flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        onClick={handleContinue}
                        disabled={
                          disabled ||
                          calculando ||
                          (isSupportUser &&
                            tipoAtencionSoporte === "acta_nueva" &&
                            !idTransaccionSoporte?.trim())
                        }
                        title={
                          isSupportUser &&
                          tipoAtencionSoporte === "acta_nueva" &&
                          !idTransaccionSoporte?.trim()
                            ? "Por favor, ingresa el ID de transacción para continuar"
                            : undefined
                        }
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
                      Para procesar el pago, necesitas completar tus datos de
                      facturación en tu perfil.
                    </p>
                  </div>
                )}
              {acta === null &&
              transcripcion === null &&
              animacionTerminada &&
              procesando ? (
                <Button
                  id="procesando"
                  className="w-full rounded-sm bg-purple-600 hover:bg-purple-700"
                  onClick={() => {
                    track("processing_button_click", {
                      event_category: "engagement",
                      event_label: "processing_button_clicked",
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
                <div className="w-full flex gap-2">
                  <Button
                    id="DownloadBtn"
                    className="flex-1 rounded-sm bg-purple-600 hover:bg-purple-700"
                    onClick={() => {
                      handleDescargarAmbos();
                    }}
                    disabled={!acta || !transcripcion}
                  >
                    Descargar
                  </Button>
                  <Button
                    id="GenerarNuevaBtn"
                    className="flex-1 rounded-sm bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
                    onClick={() => {
                      resetearParaNuevaGeneracion();
                    }}
                  >
                    Nueva
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
              track("direct_support_button_click", {
                event_category: "engagement",
                event_label: "direct_support_button_clicked",
              });
              handledirecto();
            }}
          >
            Generar con transcripcion existente
          </Button>
        )}
      </div>

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
                    checked={tieneCodigoAtencionRelanzamiento}
                    onChange={(e) => {
                      setTieneCodigoAtencionRelanzamiento(e.target.checked);
                      if (!e.target.checked) {
                        setCodigoAtencionRelanzamiento("");
                        setCodigoValidoRelanzamiento(false);
                        setCodigoValidadoRelanzamiento(null);
                        setMensajeCodigoRelanzamiento("");
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
              {tieneCodigoAtencionRelanzamiento && (
                <div className="mb-4 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={codigoAtencionRelanzamiento}
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
                      disabled={
                        validandoCodigoRelanzamiento ||
                        !codigoAtencionRelanzamiento.trim()
                      }
                      className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {validandoCodigoRelanzamiento
                        ? "Validando..."
                        : "Validar"}
                    </Button>
                  </div>
                  {mensajeCodigoRelanzamiento && (
                    <p
                      className={`text-sm ${codigoValidoRelanzamiento ? "text-green-600" : "text-red-600"}`}
                    >
                      {mensajeCodigoRelanzamiento}
                    </p>
                  )}
                </div>
              )}

              {}
              {!tieneCodigoAtencionRelanzamiento ||
              !codigoValidoRelanzamiento ? (
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
                  tipoDocumento={tipoDocumento}
                  numeroDocumento={numeroDocumento}
                  nombreUsuario={session?.user?.name || undefined}
                  emailUsuario={session?.user?.email || undefined}
                />
              ) : (
                <Button
                  className="w-full rounded-sm bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() =>
                    handlePaymentRelanzamiento(
                      codigoValidadoRelanzamiento?.codigo || null,
                    )
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
    </>
  );
}
