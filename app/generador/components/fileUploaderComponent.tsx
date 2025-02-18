"use client";

import type React from "react";
import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Upload, File } from "lucide-react";
import { CalculateAction } from "../services/calculateAction";
import WompiComponent from "./wompiComponent";
import { processAction } from "../services/processAction";
import { saveTransactionAction } from "../services/saveTransactionAction";

export default function FileUploaderComponent() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState<string>("");
  const [duration, setDuration] = useState<number>(0);
  const [durationFormat, setDurationFormat] = useState<string>("0");
  const [tokens, setTokens] = useState<string>("0");
  const [calcular, setCalcular] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [idtx, setIdtx] = useState(null);
  const [startProcess, setStartProcess] = useState("no iniciado");
  const [acta, setActa] = useState<string>("");
  const [transcripcion, setTranscripcion] = useState<string>("");

  const isAudioOrVideo = (file: File) => {
    return file.type.startsWith("audio/") || file.type.startsWith("video/");
  };

  const handleFile = useCallback((selectedFile: File) => {
    if (isAudioOrVideo(selectedFile)) {
      setFile(selectedFile);
      getMediaDuration(selectedFile);
    } else {
      alert("Por favor, selecciona un archivo de audio o video válido.");
    }
  }, []);

  const getMediaDuration = (file: File) => {
    const url = URL.createObjectURL(file);
    const media = document.createElement(
      file.type.startsWith("audio/") ? "audio" : "video"
    );
    media.src = url;

    media.onloadedmetadata = () => {
      const fileDuration = media.duration;
      setDuration(fileDuration);
      setDurationFormat(formatDuration(fileDuration));
      setTokens(calculateTokens(fileDuration));
      URL.revokeObjectURL(url);
    };
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return [hours, minutes, secs]
      .map((v) => (v < 10 ? "0" + v : v))
      .filter((v, i) => v !== "00" || i > 0)
      .join(":");
  };

  const calculateTokens = (fileDuration: number): string => {
    const tokens = Math.ceil(fileDuration / 900) * 2500;
    return tokens.toString();
  };

  const handleCancel = () => {
    setFile(null);
    setDuration(0);
    setTokens("0");
    setCalcular(false);
    setCalculando(false);
  };

  async function handleCalculate() {
    setCalculando(true);
    if (!file) {
      alert("No se ha seleccionado un archivo");
      setCalculando(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const upload = await CalculateAction(formData);
    if (upload?.status === "success") {
      setCalcular(true);
      setCalculando(false);
      //@ts-expect-error revisar después
      setName(upload.name);
    } else {
      alert("Error al calcular el archivo");
      setCalculando(false);
    }
  }

  const downloadFile = (url: unknown) => {
    const link = document.createElement("a");
    //@ts-expect-error revisar despues
    link.href = url;
    link.style.display = "none"; // Ocultar el enlace
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log("Descarga iniciada para:", url);
  };

  const handleDownload = async () => {
    try {
      // Descargar el acta primero
      if (transcripcion) {
        downloadFile(transcripcion);
        console.log(
          "Esperando 3 segundos antes de descargar la transcripción..."
        );
        setTimeout(() => {
          // Descargar la transcripción después de 3 segundos
          if (acta) {
            downloadFile(acta); // Inicia descarga de la transcripción
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

  useEffect(() => {
    // Asegurarse de que este código solo se ejecute en el cliente
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const id = searchParams.get("id");
      const name = searchParams.get("name");
      const duration = searchParams.get("duration");
      setDuration(Number(duration));
      //@ts-expect-error revisar despues
      setIdtx(id);
      //@ts-expect-error revisar despues
      setName(name);
    }
  }, []);
  useEffect(() => {
    const fetchTransaction = async () => {
      // Check if idtx is not null AND not an empty string
      if (idtx && idtx !== "") {
        try {
          const response = await fetch(
            `https://production.wompi.co/v1/transactions/${idtx}`
          );
          const tx = await response.json();
          const timeDuration = formatDuration(duration);
          if (tx.data.status === "APPROVED") {
            console.log("tx", tx.data);
            const save = await saveTransactionAction({
              transaccion: tx.data.id,
              referencia: tx.data.reference,
              acta: tx.data.reference,
              valor: (tx.data.amount_in_cents / 100).toString(),
              duracion: timeDuration,
            });
            console.log("save: ", JSON.stringify(save));

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

  async function handlePayment() {
    setStartProcess("en proceso");
    const result = await processAction(name); // Primero actualizamos el estado
    if (result.status == "success") {
      setStartProcess("success");
      //@ts-expect-error revisar despues
      setActa(result.acta);
      //@ts-expect-error revisar despues
      setTranscripcion(result.transcripcion);
    } else {
      setStartProcess("error");
    }
  }

  async function handleReset() {
    setStartProcess("no iniciado");
    setFile(null);
    window.location.replace("/");
  }

  return (
    <div className="w-full mx-auto rounded-none">
      {startProcess === "en proceso" && (
        <CardContent className="p-6 text-center">
          <p className="text-lg font-semibold text-gray-700">
            Generación de acta en proceso
          </p>
          <div className="flex mx-auto w-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={80}
              height={80}
              viewBox="0 0 24 24"
              className="mx-auto text-purple-800"
            >
              {[0, 0.4, 0.8].map((delay, index) => (
                <circle key={index} cx={12} cy={12} r={0} fill="currentColor">
                  <animate
                    fill="freeze"
                    attributeName="r"
                    begin={`${delay}s`}
                    calcMode="spline"
                    dur="1.2s"
                    keySplines=".52,.6,.25,.99"
                    values="0;11"
                  />
                  <animate
                    fill="freeze"
                    attributeName="opacity"
                    begin={`${delay}s`}
                    calcMode="spline"
                    dur="1.2s"
                    keySplines=".52,.6,.25,.99"
                    values="1;0"
                  />
                </circle>
              ))}
            </svg>
          </div>
          <p className="text-sm mt-10 text-gray-700">
            Esto podría tardar unos minutos dependiendo de la duración de la
            reunión.
          </p>
        </CardContent>
      )}

      {startProcess === "success" && (
        <CardContent className="p-6 text-center">
          <p className="text-lg font-semibold text-purple-700">
            ¡Acta generada con éxito!
          </p>
          <div className="flex space-x-2 mt-4">
            <Button
              variant="outline"
              className="w-full rounded-lg"
              onClick={handleReset}
            >
              Generar otra
            </Button>
            <Button
              className="w-full rounded-lg bg-purple-950"
              onClick={handleDownload}
            >
              Descargar
            </Button>
          </div>
        </CardContent>
      )}

      {startProcess === "error" && (
        <CardContent className="p-6 text-center">
          <p className="text-lg font-semibold text-red-700">
            Error al generar el acta. Por favor, contacte a soporte.
          </p>
        </CardContent>
      )}

      {!["en proceso", "success", "error"].includes(startProcess) && (
        <CardContent className="p-6">
          {!file ? (
            <div
              ref={dropZoneRef}
              className={`border-2 border-dashed p-6 text-center cursor-pointer transition-colors border-purple-400`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFile(e.target.files[0]);
                  }
                }}
                accept="audio/*,video/*"
                className="hidden"
              />
              <Upload className="mx-auto h-12 w-12 text-purple-800" />
              <p className="mt-2 text-sm text-gray-600">
                Arrastra y suelta un archivo aquí, o haz clic para seleccionar
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-purple-950/70 rounded-sm">
                <div className="flex items-center space-x-2 overflow-hidden">
                  <File className="h-6 w-6 flex-shrink-0 text-white" />
                  <div className="min-w-0 flex-1">
                    {/* Agregamos truncate para cortar el texto largo y mostrar ... */}
                    <p className="text-md text-white font-medium max-w-[250px] truncate">
                      {" "}
                      {/* Adjust 150px as needed */}
                      {file.name}
                    </p>
                    <p className="text-xs text-white truncate">
                      Tipo: {file.type}
                    </p>
                    {calcular && (
                      <div className="mt-2">
                        <p className="text-md text-white">
                          Duración: {formatDuration(duration)}
                        </p>
                        <p className="text-md text-white">
                          Valor:{" "}
                          {Number(tokens).toLocaleString("es-CO", {
                            style: "currency",
                            currency: "COP",
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {!calculando && !calcular && (
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    className="w-full rounded-lg"
                    onClick={handleCancel}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="w-full rounded-lg bg-purple-950"
                    onClick={handleCalculate}
                  >
                    Calcular
                  </Button>
                </div>
              )}

              {calculando && !calcular && (
                <div className="flex space-x-2 mx-auto">
                  Calculando...{" "}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={24}
                    height={24}
                    viewBox="0 0 24 24"
                    className="mx-auto text-purple-800"
                  >
                    {[0, 0.4, 0.8].map((delay, index) => (
                      <circle
                        key={index}
                        cx={12}
                        cy={12}
                        r={0}
                        fill="currentColor"
                      >
                        <animate
                          fill="freeze"
                          attributeName="r"
                          begin={`${delay}s`}
                          calcMode="spline"
                          dur="1.2s"
                          keySplines=".52,.6,.25,.99"
                          values="0;11"
                        />
                        <animate
                          fill="freeze"
                          attributeName="opacity"
                          begin={`${delay}s`}
                          calcMode="spline"
                          dur="1.2s"
                          keySplines=".52,.6,.25,.99"
                          values="1;0"
                        />
                      </circle>
                    ))}
                  </svg>
                </div>
              )}

              {calcular && (
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleCancel}
                  >
                    Cancelar
                  </Button>

                  <WompiComponent
                    costo={tokens}
                    duracion={duration}
                    durationFormat={durationFormat}
                    handlePayment={handlePayment}
                    name={name}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </div>
  );
}
