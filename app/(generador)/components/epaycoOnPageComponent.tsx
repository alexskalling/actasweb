"use client";

import { Button } from "@/components/ui/button";
import React, { useEffect, useState } from "react";
import { ActualizarProceso } from "../services/actas_querys_services/actualizarProceso";
import { guardarFalloPagoService } from "../services/fallos_querys_services/guardarFalloPagoService";
// getBillingData se llama desde el servidor, no directamente aquí

const tipo = process.env.NEXT_PUBLIC_PAGO;

interface ePaycoOnPageComponentProps {
  costo: number;
  file: string;
  folder: string;
  fileid: string;
  duration: string;
  handlePayment: () => void;
  onPaymentClick?: (handleOpenWidget: () => void) => void;
}

// Declarar tipos para ePayco en window
declare global {
  interface Window {
    ePayco?: {
      checkout?: {
        configure: (config: { key: string; test: boolean }) => {
          open: (data: any) => void;
        };
      };
    };
  }
}

const ePaycoOnPageComponent = (props: ePaycoOnPageComponentProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutHandler, setCheckoutHandler] = useState<any>(null);
  const [billingData, setBillingData] = useState<any>(null);

  useEffect(() => {
    // Cargar script de ePayco OnPage Checkout
    const script = document.createElement("script");
    script.src = "https://checkout.epayco.co/checkout.js";
    script.async = true;

    script.onload = () => {
      console.log("Script de ePayco cargado correctamente.");
      
      // Configurar handler de ePayco
      if (typeof window !== "undefined" && window.ePayco?.checkout) {
        const handler = window.ePayco.checkout.configure({
          key: process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY || "",
          test: process.env.NEXT_PUBLIC_EPAYCO_TEST === "true",
        });

        setCheckoutHandler(handler);
      }
    };

    script.onerror = () => {
      console.error("Error al cargar el script de ePayco");
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleOpenCheckout = async () => {
    if (!checkoutHandler) {
      console.error("No se ha cargado el script de ePayco.");
      return;
    }

    // Obtener datos de facturación desde el servidor
    let billingDataToUse = billingData;
    if (!billingDataToUse) {
      try {
        const response = await fetch('/api/user/billing-data');
        if (response.ok) {
          billingDataToUse = await response.json();
          setBillingData(billingDataToUse);
        } else {
          console.error("Error al obtener datos de facturación");
          return;
        }
      } catch (error) {
        console.error("Error al obtener datos de facturación:", error);
        return;
      }
    }

    if (!billingDataToUse) {
      console.error("No se han cargado los datos de facturación.");
      return;
    }

    setIsLoading(true);

    // Generar referencia única
    const referencia = `${tipo}${props.file}-${Math.floor(Math.random() * 90000 + 10000)}`;
    
    // ePayco espera el monto sin decimales para COP
    const monto = Math.round(props.costo).toString();

    // Construir dirección completa
    const direccionCompleta = `${billingDataToUse.direccion || ""}, ${billingDataToUse.municipio || ""}, ${billingDataToUse.departamento || ""}`.trim();

    // Configurar datos del pago para ePayco
    const datosPago = {
      // Información del producto
      name: `Acta ${props.file}`,
      description: `Procesamiento de acta: ${props.file}`,
      invoice: referencia,
      
      // Información de pago
      currency: "COP",
      amount: monto,
      tax_base: monto,
      tax: "0",
      
      // Configuración
      country: "CO",
      lang: "es",
      external: "false", // false = checkout de ePayco, true = formulario propio
      
      // Datos del cliente para facturación
      name_billing: `${billingDataToUse.nombre || ""} ${billingDataToUse.apellido || ""}`.trim(),
      address_billing: direccionCompleta,
      type_doc_billing: "CC", // Por defecto Cédula de Ciudadanía
      mobilephone_billing: billingDataToUse.telefono || "",
      email_billing: billingDataToUse.email || "",
      
      // Callback para manejar la respuesta (OnPage Checkout usa callbacks)
      // Nota: ePayco OnPage Checkout maneja la respuesta a través de eventos
    };

    // Track analytics
    if (process.env.NEXT_PUBLIC_PAGO !== "soporte" && typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag('event', 'epayco_payment_button_click', {
        'event_category': 'engagement',
        'event_label': 'epayco_payment_started',
        'value': props.costo,
        'file_name': props.file,
        'duration': props.duration,
        'folder': props.folder
      });
    }

    // Configurar URLs de respuesta y confirmación
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const urlRespuesta = `${baseUrl}/?folder=${props.folder}&file=${props.file}&fileid=${props.fileid}&duration=${props.duration}&epayco_response=true`;
    const urlConfirmacion = `${baseUrl}/api/epayco/confirmation`;

    // Agregar URLs al objeto de pago
    datosPago.response = urlRespuesta;
    datosPago.confirmation = urlConfirmacion;

    // Abrir checkout de ePayco
    // ePayco OnPage Checkout abre un modal/iframe
    try {
      checkoutHandler.open(datosPago);
      
      // Escuchar mensajes del iframe de ePayco (OnPage Checkout puede usar postMessage)
      const handleMessage = async (event: MessageEvent) => {
        // Verificar origen del mensaje (ePayco)
        if (event.origin !== "https://checkout.epayco.co" && 
            event.origin !== "https://secure.epayco.co" &&
            !event.origin.includes("epayco")) {
          return;
        }

        // ePayco puede enviar la respuesta de diferentes formas
        let response = null;
        
        // Intentar diferentes formatos de respuesta
        if (event.data && typeof event.data === 'object') {
          if (event.data.type === "epayco_response") {
            response = event.data.data;
          } else if (event.data.x_response) {
            response = event.data;
          } else if (event.data.response) {
            response = event.data.response;
          }
        }

        if (response && (response.x_response || response.x_cod_response)) {
          console.log("Respuesta de ePayco recibida:", response);

          // Remover el listener después de procesar
          window.removeEventListener("message", handleMessage);

          if (response.x_response === "Aceptada" || response.x_cod_response === 1) {
            // Pago aprobado
            console.log("Transacción aprobada: " + response.x_transaction_id);
            
            await ActualizarProceso(
              props.file,
              5, // idEstadoProceso aprobado
              undefined,
              parseFloat(response.x_amount),
              response.x_transaction_id,
              undefined,
              response.x_id_invoice || referencia,
              null,
              null,
              null
            );

            props.handlePayment();

            // Track success
            if (process.env.NEXT_PUBLIC_PAGO !== "soporte" && typeof window !== "undefined" && typeof window.gtag === "function") {
              window.gtag('event', 'epayco_payment_success', {
                'event_category': 'engagement',
                'event_label': 'epayco_payment_completed',
                'value': parseFloat(response.x_amount),
                'transaction_id': response.x_transaction_id,
                'file_name': props.file,
                'duration': props.duration
              });
            }
          } else {
            // Pago rechazado
            const detalle_error = {
              'event_category': 'error',
              'event_label': response.x_response || 'Unknown status',
              'transaction_id': response.x_transaction_id || '',
              'file_name': props.file,
              'duration': props.duration,
              'error_message': response.x_response_reason_text || 'No error message'
            };

            await ActualizarProceso(
              props.file,
              9, // pago fallido
              undefined,
              parseFloat(response.x_amount || "0"),
              response.x_transaction_id || "",
              undefined,
              response.x_id_invoice || referencia,
              null,
              null,
              null
            );

            await guardarFalloPagoService({
              nombreActa: props.file,
              detalleFallo: detalle_error
            });

            // Track rejection
            if (process.env.NEXT_PUBLIC_PAGO !== "soporte" && typeof window !== "undefined" && typeof window.gtag === "function") {
              window.gtag('event', 'epayco_payment_rejected', {
                'event_category': 'error',
                'event_label': response.x_response || 'Unknown status',
                'transaction_id': response.x_transaction_id || '',
                'file_name': props.file,
                'duration': props.duration,
                'error_message': response.x_response_reason_text || 'No error message'
              });
            }
          }

          setIsLoading(false);
        }
      };

      // Agregar listener para mensajes de ePayco
      window.addEventListener("message", handleMessage);

      // También verificar parámetros de URL por si ePayco redirige (fallback)
      const checkUrlParams = () => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('epayco_response') === 'true') {
          const refPayco = params.get('x_ref_payco');
          const transactionId = params.get('x_transaction_id');
          const amount = params.get('x_amount');
          const response = params.get('x_response');
          
          if (refPayco && transactionId) {
            window.removeEventListener("message", handleMessage);
            // Procesar respuesta desde URL
            handleEpaycoResponse({
              x_ref_payco: refPayco,
              x_transaction_id: transactionId,
              x_amount: amount || "0",
              x_response: response || "Rechazada",
              x_id_invoice: params.get('x_id_invoice') || referencia
            });
          }
        }
      };

      // Función helper para procesar respuesta
      const handleEpaycoResponse = async (response: any) => {
        if (response.x_response === "Aceptada" || response.x_response === "1") {
          await ActualizarProceso(
            props.file,
            5,
            undefined,
            parseFloat(response.x_amount),
            response.x_transaction_id,
            undefined,
            response.x_id_invoice || referencia,
            null,
            null,
            null
          );
          props.handlePayment();
        } else {
          await ActualizarProceso(
            props.file,
            9,
            undefined,
            parseFloat(response.x_amount || "0"),
            response.x_transaction_id || "",
            undefined,
            response.x_id_invoice || referencia,
            null,
            null,
            null
          );
          await guardarFalloPagoService({
            nombreActa: props.file,
            detalleFallo: {
              'event_category': 'error',
              'event_label': response.x_response || 'Unknown status',
              'transaction_id': response.x_transaction_id || '',
              'file_name': props.file,
              'duration': props.duration,
              'error_message': 'Pago rechazado'
            }
          });
        }
        setIsLoading(false);
      };

      // Verificar URL al cargar (por si ePayco redirige)
      checkUrlParams();

      // Timeout de seguridad (remover listener después de 10 minutos)
      setTimeout(() => {
        window.removeEventListener("message", handleMessage);
        setIsLoading(false);
      }, 600000); // 10 minutos

    } catch (error) {
      console.error("Error al abrir checkout de ePayco:", error);
      setIsLoading(false);
    }
  };

  return (
    <Button
      className="w-full rounded-sm bg-green-700 hover:bg-green-800 disabled:bg-green-500"
      onClick={() => {
        if (props.onPaymentClick) {
          props.onPaymentClick(handleOpenCheckout);
        } else {
          handleOpenCheckout();
        }
      }}
      disabled={isLoading || !checkoutHandler || !billingData}
    >
      {isLoading ? (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-spin"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Procesando...
        </>
      ) : (
        "Pagar"
      )}
    </Button>
  );
};

export default ePaycoOnPageComponent;

