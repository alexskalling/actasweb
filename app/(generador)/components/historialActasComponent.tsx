"use client";


import { useEffect, useState } from 'react';
import { getActasByUser } from '../services/getActasByUser';

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

export default function HistorialActasComponent({ reloadTrigger }: HistorialActasProps) {
  const [actas, setActas] = useState<Acta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  

  useEffect(() => {
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

    cargarActas();
  }, [reloadTrigger]);

  const downloadFile = (url: string) => {
    const proxyUrl = `/api/descarga?url=${encodeURIComponent(url)}`;
    window.open(proxyUrl, "_blank");
    console.log("Descarga iniciada a través del proxy para:", url);
  };

  const handleDownload = async (acta: Acta) => {
    try {
      if (!acta.urlBorrador || !acta.urlTranscripcion) {
        console.error("No se han proporcionado los datos necesarios para la descarga");
        return;
      }

      // Track inicio descarga desde historial
      if (process.env.NEXT_PUBLIC_PAGO !== "soporte" && typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag('event', 'inicio_descarga_documento', {
          event_category: 'descarga',
          event_label: 'descarga_desde_historial',
          tipo_documento: 'acta_y_transcripcion',
          nombre_archivo: acta.nombre
        });
      }
      

      // Descargar borrador primero
      downloadFile(acta.urlBorrador);

      // Esperar 3 segundos antes de descargar la transcripción
      console.log("Esperando 3 segundos antes de descargar la transcripción...");
      setTimeout(() => {
        if (acta.urlTranscripcion) {
          downloadFile(acta.urlTranscripcion);

          // Track descarga completada desde historial
          if (process.env.NEXT_PUBLIC_PAGO !== "soporte" && typeof window !== "undefined" && typeof window.gtag === "function") {
            window.gtag('event', 'descarga_documento_completada', {
              'event_category': 'descarga',
              'event_label': 'descarga_exitosa_historial',
              'tipo_documento': 'acta_y_transcripcion',
              'nombre_archivo': acta.nombre
            });
          }
        } else {
          console.warn("No se proporcionó una URL para la transcripción.");
        }
      }, 3000);
    } catch (error) {
      console.error("Error general:", (error as Error).message);
    }
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
    <ul role="list" className="divide-y divide-gray-100">
      {actas.map((acta) => (
        <li key={acta.id} className="relative flex justify-between gap-x-6 py-5">
          <div className="flex min-w-0 gap-x-4">
            <div className="min-w-0 flex-auto">
              <p className="text-sm/6 font-semibold text-gray-900">
                {acta.nombre}
              </p>
              <p className="mt-1 flex text-xs/5 text-gray-500">
                TX: {acta.tx || 'Sin transacción'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-x-4">
            <div className="hidden sm:flex sm:flex-col sm:items-end">
              <p className="text-sm/6 text-gray-900">
                ${parseInt(acta.costo || '0').toLocaleString('es-CO')} COP
              </p>
              <p className="mt-1 text-xs/5 text-gray-500">
                Duración: {acta.duracion || 'N/A'}
              </p>
            </div>
            <button
              onClick={() => handleDownload(acta)}
              disabled={!acta.urlBorrador || !acta.urlTranscripcion}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="size-12 flex-none p-2 text-white rounded-lg bg-purple-800 hover:bg-purple-700 cursor-pointer"
                width={24}
                height={24}
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="m17.435 19.723l-2.37-2.37q-.14-.133-.14-.34t.14-.348t.335-.15t.335.131l1.765 1.765v-4.386q0-.213.144-.356t.357-.144t.356.144t.143.356v4.387l1.766-1.766q.133-.14.34-.14t.348.14t.14.348t-.14.34l-2.389 2.389q-.242.243-.565.243t-.565-.243M15 23.5q-.213 0-.356-.144t-.144-.357t.144-.356T15 22.5h6q.213 0 .356.144t.144.357t-.144.356T21 23.5zm-8.884-4q-.652 0-1.134-.482T4.5 17.884V4.116q0-.652.482-1.134T6.116 2.5h6.213q.332 0 .632.13t.518.349L18.02 7.52q.218.217.348.518t.131.632v1.662q0 .343-.232.575t-.576.233H13.73q-.666 0-1.141.474t-.475 1.14v5.937q0 .344-.232.576t-.575.232zm7.596-11H17.5l-5-5l5 5l-5-5v3.789q0 .504.353.858q.354.353.859.353"
                />
              </svg>
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
