"use client";

import * as React from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizarNombreArchivo } from "../services/utilsActions";
import WompiComponent from "./wompiComponent";
import { processAction } from "../services/processAction";
import io, { Socket } from "socket.io-client";
import { saveTransactionAction } from "../services/saveTransactionAction";
import { uploadFileToAssemblyAI } from "../services/assemblyActions";

interface MediaSelectorProps {
  onFileSelect?: (file: File) => void;
  accept?: string;
  maxSize?: number;
}

export default function MediaFileUploaderComponent({
  onFileSelect,
  accept = "audio/*,video/*",
}: MediaSelectorProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [duration, setDuration] = React.useState<number>(0);
  const [uploadStatus, setUploadStatus] = React.useState<string | null>(null);
  const [calculando, setCalculando] = React.useState<boolean>(false);
  const [procesando, setProcesando] = React.useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = React.useState<number>(0);
  const [publicUrl, setPublicUrl] = React.useState<string | null>(null);
  const [urlAssembly, setUrlAssembly] = React.useState<string | null>(null);
  const [folder, setFolder] = React.useState<string>();
  const [file, setFile] = React.useState<string>();
  const [fileid, setFileid] = React.useState<string>();
  const [acta, setActa] = React.useState<string>();
  const [idtx, setIdtx] = React.useState(null);
  const [transcripcion, setTranscripcion] = React.useState<string>();
  const [socket, setSocket] = React.useState<Socket | null>(null); // Estado para manejar la conexión de Socket.IO
  const [roomName, setRoomName] = React.useState<string | null>(null); // Estado para almacenar el nombre de la sala

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError(null);
    setUploadStatus(null);
    setUploadProgress(0);
    setPublicUrl(null);

    if (!file) return;

    if (!file.type.match(/^(audio|video)/)) {
      setError("Por favor selecciona un archivo de audio o video válido.");
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
    onFileSelect?.(file);

    const media = file.type.startsWith("audio/")
      ? new Audio(url)
      : document.createElement("video");
    media.src = url;
    media.onloadedmetadata = () => {
      setDuration(media.duration);
    };
  };

  React.useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL); // Conéctate al servidor de Socket.IO
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
    setPublicUrl(null);
  };

  async function handlePayment() {
    setProcesando(true);

    setUploadStatus("Iniciando generacion del acta");
    //@ts-expect-error revisar despues
    const result = await processAction(folder, file, urlAssembly);
    if (result.status == "success") {
      setActa(result.acta);
      setTranscripcion(result.transcripcion);
      setUploadStatus(
        "Todo listo, tu borrador de acta está listo para ser descargado."
      );
      setProcesando(false);
    } else {
      setProcesando(false);
      alert("Error al procesar el archivo: " + result.message);
    }
  }

  const calculatePrice = (durationInSeconds: number): number => {
    const segments = Math.ceil(durationInSeconds / 60 / 15);
    return segments * 2500;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  React.useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleUploadFile = async () => {
    setCalculando(true);
    setError(null);
    setUploadStatus(
      "Subiendo archivo, asi lo tendremos listo para ser procesado..."
    );
    setUploadProgress(0);
    setPublicUrl(null);

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
        // ✅ Pasa el callback onUploadProgress
        setUploadProgress(Math.round(progress)); // ✅ Actualiza el estado uploadProgress
      });

      if (result.success) {
        setUploadStatus("Archivo listo para ser procesado");

        console.log(result.uploadUrl);
        //@ts-expect-error revisar despues

        setUrlAssembly(result.uploadUrl);

        setCalculando(false);
        setUploadProgress(100);
        //@ts-expect-error revisar despues

        setPublicUrl(result.publicUrl);
      } else {
        setUploadStatus(result.error || "Error al subir el archivo");
        setCalculando(false);
        setUploadProgress(0);
      }
    } catch (error) {
      setUploadStatus(`Error de red o al procesar la petición: ${error}`);
      console.error("Error al subir:", error);
      setCalculando(false);
      setUploadProgress(0);
    }
  };

  const downloadFile = (url: string) => {
    const proxyUrl = `/api/descarga?url=${encodeURIComponent(url)}`;
    window.open(proxyUrl, "_blank");
    console.log("Descarga iniciada a través del proxy para:", url);
  };

  const handleDownload = async () => {
    try {
      if (!acta || !transcripcion) {
        console.error(
          "No se han proporcionado los datos necesarios para la descarga"
        );
        return;
      }
      if (transcripcion) {
        downloadFile(acta);
        console.log(
          "Esperando 3 segundos antes de descargar la transcripción..."
        );
        setTimeout(() => {
          // Descargar la transcripción después de 3 segundos
          if (acta) {
            downloadFile(transcripcion);
          } else {
            console.warn("No se proporcionó una URL para la transcripción.");
          }
        }, 4000);
      } else {
        console.warn("No se proporcionó una URL para el acta.");
      }
    } catch (error) {
      console.error("Error general:", (error as Error).message);
    }
  };

  React.useEffect(() => {
    setUploadStatus("Revisando tu pago, espera un momento por favor");
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
      //@ts-expect-error revisar despues
      setFileid(fileid);
      //@ts-expect-error revisar despues
      setFolder(folder);
      setRoomName(folder);
    }
  }, []);

  React.useEffect(() => {
    const fetchTransaction = async () => {
      if (idtx && idtx !== "") {
        setProcesando(true);
        try {
          const response = await fetch(
            process.env.NEXT_PUBLIC_WOMPI_TX + "/v1/transactions/" + idtx
          );

          const tx = await response.json();
          const timeDuration = duration;

          if (tx.data.status === "APPROVED") {
            console.log("tx", tx.data);
            await saveTransactionAction({
              transaccion: tx.data.id,
              referencia: tx.data.reference,
              //@ts-expect-error revisar despues
              acta: file,
              valor: (tx.data.amount_in_cents / 100).toString(),
              //@ts-expect-error revisar despues
              duracion: timeDuration,
            });

            handlePayment();
          } else {
            console.log("pago aprobado");
          }
        } catch (error) {
          console.error("Error al buscar la transacción:", error);
        }
      }
    };

    fetchTransaction();
  }, [idtx]);

  return (
    <div className="p-6 w-full max-w-md mx-auto bg-transparent rounded-md">
      <div className="space-y-4">
        {!selectedFile && !file && (
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="media-upload"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-md cursor-pointer transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-12 h-12 mb-4 text-white" />
                <p className="mb-2 text-sm text-white">
                  <span className="font-semibold">
                    Haz click para seleccionar un archivo
                  </span>{" "}
                </p>
              </div>
              <input
                id="media-upload"
                type="file"
                className="hidden"
                accept={accept}
                onChange={handleFileSelect}
                aria-label="Seleccionar archivo de audio o video"
              />
            </label>
          </div>
        )}
        {error && (
          <div className="text-sm text-red-500 text-center">{error}</div>
        )}
        {selectedFile && preview && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-md font-medium text-white truncate">
                  {selectedFile.name}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="text-white"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Eliminar archivo</span>
                </Button>
              </div>

              <div className="text-sm font-semibold text-white">
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
          {acta == null && transcripcion == null && (
            <Button
              className="w-full rounded-sm"
              variant="outline"
              onClick={clearSelection}
            >
              Cancelar
            </Button>
          )}

          {uploadProgress == 100 &&
            selectedFile != null &&
            acta == null &&
            transcripcion == null &&
            !procesando && (
              <WompiComponent
                costo={calculatePrice(duration)}
                file={file}
                folder={folder}
                fileid={fileid}
                duration={duration}
                handlePayment={handlePayment}
              />
            )}
          {uploadProgress != 100 &&
            acta == null &&
            transcripcion == null &&
            !procesando && (
              <Button
                className="w-full rounded-sm bg-purple-600 hover:bg-purple-700"
                onClick={handleUploadFile} //  Ahora llama a handleUploadFile corregida
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
          {procesando && (
            <Button
              className="w-full rounded-sm bg-purple-600 hover:bg-purple-700"
              onClick={handleUploadFile} //  Ahora llama a handleUploadFile corregida
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
                      attributeName="height"
                      begin="svgSpinnersBlocksWave0.begin+0.4s"
                      dur="0.6s"
                      values="7.33;1.33;7.33"
                    ></animate>
                  </rect>
                </svg>
                Procesando acta...
              </>
            </Button>
          )}

          {acta != null && transcripcion != null && file && (
            <div className="flex gap-2 w-full">
              <Button
                className="w-full rounded-sm"
                variant="outline"
                onClick={() => {
                  window.location.href = "/";
                  // window.location.reload(); // Opcional: Si quieres forzar la recarga
                }}
              >
                Generar nueva
              </Button>
              <Button
                className="w-full rounded-sm bg-purple-600 hover:bg-purple-700"
                onClick={handleDownload}
              >
                Descargar
              </Button>
            </div>
          )}
        </div>
        {/* Barra de Progreso - Colocada aquí, antes de los botones */}
        {calculando &&
          selectedFile != null && ( // Condición para mostrar la barra:  calculando Y selectedFile no es nulo
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div
                className="bg-purple-600 h-2.5 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}

        {uploadStatus &&
          uploadProgress != 100 &&
          !procesando &&
          !calculando &&
          selectedFile != null && (
            <div className="text-sm text-white text-center">{uploadStatus}</div>
          )}
        <div>
          {uploadStatus && (
            <div className="mt-2 text-sm  break-words text-center text-white ">
              {uploadStatus}
              {publicUrl && (
                <>
                  <br />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
