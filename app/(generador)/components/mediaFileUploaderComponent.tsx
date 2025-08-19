"use client";

import * as React from "react";

// Declaración global para la función de confirmación de pago
declare global {
  interface Window {
    confirmPayment?: () => void;
  }
}
import { X } from "lucide-react";
//import { exec } from "child_process";
import { Button } from "@/components/ui/button";
import { normalizarNombreArchivo } from "../services/utilsActions";
import WompiComponent from "./wompiComponent";
import { processAction } from "../services/processAction";
import io, { Socket } from "socket.io-client";
import { uploadFileToAssemblyAI } from "../services/assemblyActions";
import { useSession } from "next-auth/react";
import { GuardarNuevoProceso } from "../services/guardarNuevoProceso";
import { ActualizarProceso } from "../services/actualizarProceso";
import DropdownIndustrias from "@/app/(generador)/components/dropdown_industrias";
import { BuscarAbiertoProceso } from "../services/buscarAbiertoProceso";
import AlertModalComponent from "./alertModalComponent";
import SimplePaymentModalComponent from "./simplePaymentModalComponent";
import { track } from "../utils/analytics";
import { formatCurrency, ensureDurationFormat } from "../utils/format";
import { allowedExtensions } from "../utils/allowedExtensions";
import { useIsIOSDevice } from "../hooks/useIOS";
import UploadDropzoneComponent from "./uploadDropzoneComponent";
import ProgressBarComponent from "./progressBarComponent";


interface MediaSelectorProps {
  onFileSelect?: (file: File) => void;
  accept?: string;
  maxSize?: number;
  onCheckActa?: () => void;
}
/*function getRealAudioDuration(filePath: string) {
  return new Promise((resolve, reject) => {
    exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      (error, stdout) => {
        if (error) return reject(error);
        const duration = parseFloat(stdout.trim());
        resolve(duration);
      }
    );
  });
}*/

export default function MediaFileUploaderComponent({
  onFileSelect,
  accept = "audio/*,video/*",
  onCheckActa = () => {}, 
}: MediaSelectorProps,) {
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
  const [folder, setFolder] = React.useState<string>();
  const [file, setFile] = React.useState<string>();
  //const [fileid, setFileid] = React.useState<string>();
  const [acta, setActa] = React.useState<string>();
  const [idtx, setIdtx] = React.useState(null);
  const [transcripcion, setTranscripcion] = React.useState<string>();
  const [socket, setSocket] = React.useState<Socket | null>(null); // Estado para manejar la conexión de Socket.IO
  const [roomName, setRoomName] = React.useState<string | null>(null); // Estado para almacenar el nombre de la sala
  const [start, setStar] = React.useState<boolean>(false);
  const [showModal, setShowModal] = React.useState(false);
  const [modalMessage, setModalMessage] = React.useState("");
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);
  const [industriaId, setIndustriaId] = React.useState<number | null>(null);
  const lastAnimRef = React.useRef<SVGAnimateElement | null>(null);
  const [animacionTerminada, setAnimacionTerminada] = React.useState(false);
  const { data: session } = useSession();

  const handleContinue = () => {
    if (session && !industriaId) {
      setModalMessage("Por favor selecciona una industria afin a los temas de tu acta.");
      setShowModal(true);
      return;
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

    try {
      if (file) {
        const isDuplicated = await BuscarAbiertoProceso(file.name);

        if (isDuplicated) {
          setModalMessage("Nombre de acta ocupado, Por favor usa otro nombre.");
          setShowModal(true);
          clearSelection();
          return;

        } else {
          setDuplicado(false);
        }
      }

    } catch (error: unknown) {
      console.error(" Error al ejecutar BuscarAbiertoProceso:", error);
    }




    // Track inicio selección archivo
    track('inicio_seleccion_archivo', {
      event_category: 'proceso_acta',
      event_label: 'usuario_selecciona_archivo'
    });

    // Manejo específico para dispositivos iOS
    if (isIOS && !file) {
      setError("Por favor selecciona un archivo válido. En iPhone, asegúrate de seleccionar desde 'Archivos' o usar la opción 'Grabar'.");
      return;
    }

    // Validación adicional para iOS
    if (isIOS && file) {
      // Verificar que el archivo tenga un tamaño válido
      if (file.size === 0) {
        setError("El archivo seleccionado está vacío. Por favor selecciona un archivo válido.");
        return;
      }

      // Verificar que el archivo tenga un nombre válido
      if (!file.name || file.name.trim() === '') {
        setError("El archivo seleccionado no tiene un nombre válido. Por favor selecciona otro archivo.");
        return;
      }
    }

    //@ts-expect-error revisar despues

    const nombreNormalizado = await normalizarNombreArchivo(file.name);
    const nombreCarpeta = nombreNormalizado.replace(/\.[^/.]+$/, "");
    setFile(nombreNormalizado);
    setRoomName(nombreCarpeta);
    setFolder(nombreCarpeta);

    if (!file) return;

    // Lista de extensiones de audio y video permitidas (extraído a utils)

    // Obtener la extensión del archivo y convertirla a minúsculas
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    // Verificar si es un archivo de audio/video por tipo MIME o extensión
    if (!file.type.match(/^(audio|video)/) && !allowedExtensions.includes(fileExtension)) {
      setError("Por favor selecciona un archivo de audio o video válido. Formatos permitidos: " + allowedExtensions.join(', '));

      // Track error validación archivo
      track('error_validacion_archivo', {
        event_category: 'proceso_acta',
        event_label: 'archivo_invalido',
        tipo_archivo: file.type,
        extension_archivo: fileExtension
      });
      return;
    }

    // Track validación archivo exitosa
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

    // Track file selection event
    track('file_selected', {
      event_category: 'engagement',
      event_label: file.type || fileExtension,
      value: file.size
    });
  };



  React.useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL);
    setSocket(newSocket);

    return () => {
      newSocket.disconnect(); // Desconecta el socket cuando el componente se desmonte
    };
  }, []);

  React.useEffect(() => {
    if (!socket) return;
    //@ts-expect-error revisar despues
    socket.on("upload-status", (data: Array) => {
      setUploadStatus(data.message);
    });

    return () => {
      socket.off("upload-status");
    };
  }, [socket, roomName]);

  const clearSelection = () => {
    setSelectedFile(null);
    //@ts-expect-error revisar despues

    setFile(null);
    setDuration(0);
    setPreview(null);
    setError(null);
    //@ts-expect-error revisar despues
    setActa(null);
    //@ts-expect-error revisar despues
    setTranscripcion(null);
    //@ts-expect-error revisar despues

    setUploadStatus(false);
    setCalculando(false);

    setUploadProgress(0);
    setIndustriaId(null);
    setDuplicado(true);
    // Track clear selection event
    track('clear_selection', { event_category: 'engagement' });
  };

  const handlePayment = async () => {
    setProcesando(true);

    // Track inicio procesamiento acta
    track('inicio_procesamiento_acta', {
      event_category: 'proceso_acta',
      event_label: 'inicio_generacion_acta',
      nombre_archivo: file,
      duracion_estimada: duration,
      tipo_procesamiento: 'acta_completa'
    });

    // Track payment initiation event
    track('payment_initiated', {
      event_category: 'engagement',
      event_label: 'payment_start',
      value: calculatePrice(duration)
    });

    setUploadStatus("Iniciando generacion del acta");
    //@ts-expect-error revisar despues
    const result = await processAction(folder, file, urlAssembly, session?.user?.email, session?.user?.name);
    if (result.status == "success") {
      setActa(result.acta);
      setTranscripcion(result.transcripcion);
      onCheckActa?.();
      setUploadStatus(
        "Todo listo, tu borrador de acta está listo para ser descargado."
      );
      setProcesando(false);

      // Track procesamiento acta completado
      track('procesamiento_acta_completado', {
        event_category: 'proceso_acta',
        event_label: 'acta_generada_exitosamente',
        nombre_archivo: file,
        tiempo_procesamiento: Date.now()
      });

      // Track successful payment event
      track('payment_success', {
        event_category: 'engagement',
        event_label: 'payment_completed',
        value: calculatePrice(duration)
      });
    } else {
      setProcesando(false);
      alert("Error al procesar el archivo: " + result.message);

      // Track payment error event
      track('payment_error', {
        event_category: 'error',
        event_label: result.message || 'Unknown error'
      });
    }
  };

  const calculatePrice = (durationInSeconds: number): number => {
    const segments = Math.ceil(durationInSeconds / 60 / 15);
    return segments * 2500;
  };

  React.useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleUploadFile = async () => {
    // Track inicio subida archivo
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

    const formData = new FormData();

    const nombreNormalizado = await normalizarNombreArchivo(selectedFile.name);
    const nombreCarpeta = nombreNormalizado.replace(/\.[^/.]+$/, "");
    setFile(nombreNormalizado);
    setRoomName(nombreCarpeta);

    setFolder(nombreCarpeta);
    if (socket) {
      socket.emit("set-filename", nombreNormalizado);
      socket.emit("join-room", nombreCarpeta);
    }

    formData.append("audioFile", selectedFile);
    formData.append("nombreCarpeta", nombreCarpeta);
    formData.append("nombreNormalizado", nombreNormalizado);

    try {
      const result = await uploadFileToAssemblyAI(formData, (progress) => {
        const progressRounded = Math.round(progress);
        setUploadProgress(progressRounded);

        // Track progreso subida cada 25%
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

        //@ts-expect-error revisar despues
        setUrlAssembly(result.uploadUrl);


        const ejecutarCrearActa = async () => {
          try {
            if (result.uploadUrl) {
              if (industriaId == null || industriaId == undefined) {
                setIndustriaId(99);
              }
              const tipo = process.env.NEXT_PUBLIC_PAGO == "soporte" ? "soporte" : "acta";
              await GuardarNuevoProceso(nombreNormalizado, 4, ensureDurationFormat(duration), calculatePrice(duration), tipo, result.uploadUrl, '', '', '', industriaId, '');

            }
          } catch (error: unknown) {
            console.error("❌ Error al ejecutar crearActaDesdeCliente:", error);

            const msg = error instanceof Error ? error.message : "";

            if (
              msg.includes("duplicate key value") ||
              msg.includes("actas_nombre_acta_key") ||
              msg.includes("23505") ||
              msg.includes("DUPLICATE_ACTA")
            ) {
              console.warn("⚠️ Duplicado detectado");
              setModalMessage("Nombre de acta ocupado, Por favor usa otro nombre.");
              setShowModal(true);
              clearSelection();

            } else {
              // otro error
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

        // Track successful upload event
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

        // Track upload error event
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

      // Track upload error event
      track('file_upload_error', {
        event_category: 'error',
        event_label: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handledirecto = async () => {
    setError(null);
    setUploadStatus("Enviado a soporte directo...");

    // Track direct support event
    track('direct_support_initiated', {
      event_category: 'engagement',
      event_label: 'direct_support_start'
    });

    // Introduce a very short delay to allow state updates to potentially process
    setTimeout(async () => {
      try {
        handlePayment();
      } catch (error) {
        setUploadStatus(`Error de red o al procesar la petición: ${error}`);
        console.error("Error al subir:", error);
        setCalculando(false);
        setUploadProgress(0);

        // Track direct support error event
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

      // Track inicio descarga documento
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

            // Track descarga documento completada y conversión
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
          } else {
            console.warn("No se proporcionó una URL para la transcripción.");
          }
        }, 4000);
      } else {
        console.warn("No se proporcionó una URL para el acta.");
      }
    } catch (error) {
      console.error("Error general:", (error as Error).message);

      // Track download error event
      track('document_download_error', {
        event_category: 'error',
        event_label: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };


  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const id = searchParams.get("id");
      const file = searchParams.get("file");
      const folder = searchParams.get("folder");
      const fileid = searchParams.get("fileid");
      const duration = searchParams.get("duration");
      setDuration(Number(duration));
      //@ts-expect-error revisar despues
      setIdtx(id);
      //@ts-expect-error revisar despues
      setFile(file);
      ////@ts-expect-error revisar despues
      //setFileid(fileid);
      setUrlAssembly(fileid);
      //@ts-expect-error revisar despues
      setFolder(folder);
      setRoomName(folder);
    }
  }, []);

  React.useEffect(() => {
    const animEl = lastAnimRef.current;
    if (animEl) {
      const onAnimEnd = () => {
        console.log("Animación del botón procesando terminada");
        setAnimacionTerminada(true);
        setProcesando(false);
      };
      animEl.addEventListener("endEvent", onAnimEnd);
      return () => {
        animEl.removeEventListener("endEvent", onAnimEnd);
      };
    }
  }, []);

  React.useEffect(() => {
    const fetchTransaction = async () => {
      if (idtx && idtx !== "") {
        setUploadStatus("Revisando tu pago, espera un momento por favor");

        setProcesando(true);
        try {
          const response = await fetch(
            process.env.NEXT_PUBLIC_WOMPI_TX + "/v1/transactions/" + idtx
          );

          const tx = await response.json();


          if (tx.data.status === "APPROVED") {
            await ActualizarProceso(
              file || '', // nombre
              5, // idEstadoProceso (ejemplo: 4 = aprobado)
              undefined,
              undefined,
              tx.data.id,
              undefined,
              undefined,
              null, // urlTranscripcion (ajusta según tu flujo)
              null,  // urlborrador (ajusta según tu flujo)
              null
            );

            handlePayment();
          }
        } catch (error) {
          console.error("Error al buscar la transacción:", error);
        }
      }
      setStar(true);
    };

    fetchTransaction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idtx]);


  return (
    <>
      <AlertModalComponent open={showModal} message={modalMessage} onClose={() => setShowModal(false)} />

      <SimplePaymentModalComponent
        open={showPaymentModal}
        onConfirm={() => {
          if (window.confirmPayment) {
            window.confirmPayment();
            window.confirmPayment = undefined;
          }
          track('payment_confirmed', { event_category: 'engagement', event_label: 'payment_confirmed' });
          setShowPaymentModal(false);
        }}
      />
      <div className="p-6 w-full max-w-md mx-auto bg-transparent rounded-md">
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
                    <div className="text-md font-medium text-purple-700 truncate">
                      {selectedFile.name}
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
            <div className="flex gap-4">
              {session != null && (
                <DropdownIndustrias value={industriaId} onSelect={setIndustriaId} />
              )}

            </div>

            <div className="flex gap-4" id="DivBotonesUpload">

              {acta == null && transcripcion == null && (
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

              {uploadProgress == 100 &&
                selectedFile != null &&
                acta == null &&
                transcripcion == null &&
                urlAssembly != null &&
                !procesando && duplicado == false && (
                  <WompiComponent
                    costo={calculatePrice(duration)}
                    file={file}
                    folder={folder}
                    fileid={urlAssembly}
                    duration={duration}
                    handlePayment={handlePayment}
                    showModalFirst={true}
                    onPaymentClick={(handleOpenWidget: (() => void) | undefined) => {
                      setShowPaymentModal(true);
                      // Guardar la función para ejecutarla cuando el usuario confirme
                      window.confirmPayment = handleOpenWidget;
                    }}
                  />
                )}
              {uploadProgress != 100 &&
                acta == null &&
                transcripcion == null &&
                !procesando && (
                  <Button
                    className="w-full rounded-sm bg-purple-600 hover:bg-purple-700"
                    onClick={handleContinue}
                    disabled={calculando}
                  >
                    {calculando ? (
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
              {acta == null && transcripcion == null && animacionTerminada && procesando  ? (
                <Button
                  id="procesando" className="w-full rounded-sm bg-purple-600 hover:bg-purple-700"
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
              ):acta != null && transcripcion != null &&  animacionTerminada && (
                <div className="flex gap-2 w-full">
                  <Button
                    className="w-full rounded-sm"
                    variant="outline"
                    onClick={() => {
                      track('new_generation_button_click', {
                        event_category: 'engagement',
                        event_label: 'new_generation_button_clicked'
                      });
                      window.location.href = "/";
                    }}
                  >
                    Generar nueva
                  </Button>
                  <Button
                    id="DownloadBtn" className="w-full rounded-sm bg-purple-600 hover:bg-purple-700"
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
              )}
            </div>
            {/* Barra de Progreso - Colocada aquí, antes de los botones */}
            {calculando && selectedFile != null && (
              <ProgressBarComponent progress={uploadProgress} />
            )}

            {uploadStatus &&
              uploadProgress != 100 &&
              !procesando &&
              !calculando &&
              selectedFile != null && (
                <div className="text-sm text-purple-700 text-center">
                  {uploadStatus}
                </div>
              )}
          </div>
        )}
        <div>
          {uploadStatus && (
            <div className="mt-2 text-sm  break-words text-center text-purple-700 ">
              {uploadStatus}
            </div>
          )}
        </div>
        {process.env.NEXT_PUBLIC_PAGO == "soporte" && selectedFile && (
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