"use client";

import { Button } from "@/components/ui/button";
import React, { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { ActualizarProceso } from "../services/actas_querys_services/actualizarProceso";
import { getUserId } from "../services/user/getUserId";
import { guardarFalloPagoService } from "../services/fallos_querys_services/guardarFalloPagoService";
import { toast } from "sonner";

const tipo = process.env.NEXT_PUBLIC_PAGO;

interface ePaycoOnPageComponentProps {
  costo: number;
  file: string;
  folder: string;
  fileid: string;
  duration: string;
  handlePayment: () => void;
  onPaymentClick?: (handleOpenWidget: () => void) => void;
  nombreUsuario?: string;
  emailUsuario?: string;
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
}

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

const EPaycoOnPageComponent = (props: ePaycoOnPageComponentProps) => {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutHandler, setCheckoutHandler] = useState<any>(null);
  const [billingData, setBillingData] = useState<any>(null);
  const processingTransactions = useRef(new Set<string>()).current;

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  const hasToastBeenShown = (transactionId: string): boolean => {
    if (typeof window === "undefined") return false;
    const shown = localStorage.getItem(`toast_shown_${transactionId}`);
    return shown === "true";
  };

  const markToastAsShown = (transactionId: string): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(`toast_shown_${transactionId}`, "true");
    setTimeout(() => {
      localStorage.removeItem(`toast_shown_${transactionId}`);
    }, 3600000);
  };

  const MONTO_MINIMO_EPAYCO = 5000;
  const montoRedondeado = Math.round(props.costo);
  const montoMenorAlMinimo = montoRedondeado < MONTO_MINIMO_EPAYCO;

  const handleContactarWhatsApp = () => {
    const nombreUsuario = props.nombreUsuario || session?.user?.name || 'Usuario';
    const emailUsuario = props.emailUsuario || session?.user?.email || 'Sin email';
    const nombreActa = props.file || 'Sin nombre';
    const monto = `$${montoRedondeado.toLocaleString('es-CO')} COP`;
    const duracion = props.duration || 'N/A';

    const mensaje = `Hola, soy ${nombreUsuario} (${emailUsuario}). Necesito ayuda para generar el pago de mi acta.

Información del acta:
• Nombre: ${nombreActa}
• Monto: ${monto}
• Duración: ${duracion}

El monto es menor a $5,000 COP y ePayco solo acepta pagos superiores a $5,000 COP. Por favor, ¿pueden ayudarme con el pago?`;

    const numeroWhatsApp = '56945871929';
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    window.open(urlWhatsApp, '_blank');
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    const epaycoResponse = urlParams.get('epayco_response');
    const refPayco = urlParams.get('ref_payco') || urlParams.get('x_ref_payco');

    const file = urlParams.get('file');
    const folder = urlParams.get('folder');
    const fileid = urlParams.get('fileid');
    const duration = urlParams.get('duration');

    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.replace('#', ''));
    const refPaycoHash = hashParams.get('ref_payco') || hashParams.get('x_ref_payco');

    const refPaycoToProcess = refPayco || refPaycoHash;

    if (epaycoResponse || refPaycoToProcess) {
      const savedData = { file, folder, fileid, duration, refPayco: refPaycoToProcess };
      window.history.replaceState({}, '', window.location.pathname);

      const verifyPayment = async () => {
        try {
          if (!refPaycoToProcess) {
            return;
          }

          if (!file) {
            console.error("No se encontró el nombre del archivo en la URL");
            return;
          }

          const verifyUrl = `https://api.secure.epayco.co/v1/transaction/response.json?ref_payco=${refPaycoToProcess}&public_key=${process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY}`;

          const response = await fetch(verifyUrl);
          const data = await response.json();

          if (data.success && data.data) {
            const transaction = data.data;

            if (transaction.x_response === "Aceptada" || transaction.x_cod_response === 1) {
              await handleEpaycoResponseFromRedirect(transaction, savedData);
            }
          }
        } catch (error) {
          console.error("Error al verificar pago:", error);
        }
      };

      verifyPayment();
    }
  }, []);

  const handleEpaycoResponseFromRedirect = async (transaction: any, savedData?: { file: string | null; folder: string | null; fileid: string | null; duration: string | null; refPayco: string | null }) => {
    const file = savedData?.file || props.file;
    const folder = savedData?.folder || props.folder || '';
    const fileid = savedData?.fileid || props.fileid || '';
    const duration = savedData?.duration || props.duration || '';

    if (!file) {
      console.error("No se pudo obtener el nombre del archivo");
      return;
    }

    const referencia = `${process.env.NEXT_PUBLIC_PAGO || "acta"}${file}-${Math.floor(Math.random() * 90000 + 10000)}`;

    try {
      const epaycoIframes = document.querySelectorAll('iframe[src*="epayco"], iframe[src*="checkout"], iframe[src*="secure.epayco"], iframe[src*="new-checkout.epayco"]');
      epaycoIframes.forEach((iframe: any) => {
        if (iframe && iframe.parentElement) {
          const container = iframe.closest('[class*="epayco"], [id*="epayco"], [class*="modal"], [class*="overlay"], [id="epayco-onepage-v2-container"], dialog[aria-label*="checkout"]') || iframe.parentElement;
          if (container && container.style) {
            container.style.display = 'none';
            container.style.visibility = 'hidden';
              container.style.opacity = '0';
            }
            if (container && container.tagName === 'DIALOG') {
            (container as HTMLDialogElement).close();
          }
          iframe.style.display = 'none';
        }
      });

      const epaycoV2Container = document.getElementById('epayco-onepage-v2-container');
      if (epaycoV2Container) {
        const dialog = epaycoV2Container.querySelector('dialog');
        if (dialog) {
          dialog.close();
        }
        epaycoV2Container.style.display = 'none';
      }

      const overlays = document.querySelectorAll('[class*="epayco"], [id*="epayco"], [class*="epayco-modal"], [class*="epayco-overlay"], [id="epayco-onepage-v2-container"]');
      overlays.forEach((overlay: any) => {
        if (overlay && overlay.style) {
          overlay.style.display = 'none';
          overlay.style.visibility = 'hidden';
          overlay.style.opacity = '0';
        }
        if (overlay && overlay.tagName === 'DIALOG') {
          (overlay as HTMLDialogElement).close();
        }
      });

      document.body.classList.remove('epayco-modal-open', 'modal-open');
      document.body.style.overflow = '';
    } catch (e) {
    }

    try {
      await ActualizarProceso(
        file,
        5, // idEstadoProceso aprobado
        undefined,
        parseFloat(transaction.x_amount || transaction.amount),
        transaction.x_transaction_id || transaction.transaction_id,
        undefined,
        transaction.x_id_invoice || transaction.invoice || referencia,
        undefined,
        undefined,
        null,
        false,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    } catch (updateError) {
      console.error("Error al actualizar acta:", updateError);
    }

    if (props.handlePayment) {
      props.handlePayment();
    } else {
      window.location.href = '/plataforma';
    }

    setIsLoading(false);
  };

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.epayco.co/checkout.js";
    script.async = true;

    script.onload = () => {
      if (typeof window !== "undefined" && window.ePayco?.checkout) {
        const isTestMode = process.env.NEXT_PUBLIC_EPAYCO_TEST === "true";
        const publicKey = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY || "";

        const handler = window.ePayco.checkout.configure({
          key: publicKey,
          test: isTestMode,
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
      console.error("❌ No se ha cargado el script de ePayco. checkoutHandler es null/undefined");
      alert("Error: El sistema de pago no está listo. Por favor recarga la página.");
      return;
    }

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

    const userId = await getUserId();

    if (!userId) {
      console.error("❌ No se pudo obtener el ID del usuario para el pago.");
      toast.error("Error de autenticación", {
        description: "No se pudo verificar tu sesión. Por favor, recarga la página e inicia sesión de nuevo.",
        duration: 5000,
      });
      setIsLoading(false);
      return;
    }
    const referencia = `${props.file}`;

    if (!props.costo || props.costo <= 0) {
      console.error("❌ Costo inválido:", props.costo);
      toast.error("Error", {
        description: "El costo del acta no es válido. Por favor, intenta nuevamente.",
        duration: 5000,
      });
      setIsLoading(false);
      return;
    }

    const montoRedondeado = Math.round(props.costo);

    if (montoRedondeado < MONTO_MINIMO_EPAYCO) {
      console.error("❌ Monto muy bajo:", montoRedondeado);
      toast.error("Error", {
        description: `El monto mínimo permitido es $5,000 COP. El costo calculado es ${montoRedondeado.toLocaleString('es-CO')} COP. Por favor, contacta a soporte por WhatsApp.`,
        duration: 5000,
      });
      setIsLoading(false);
      return;
    }

    const monto = montoRedondeado;

    const direccionCompleta = `${billingDataToUse.direccion || ""}, ${billingDataToUse.municipio || ""}, ${billingDataToUse.departamento || ""}`.trim();

    const isTestMode = process.env.NEXT_PUBLIC_EPAYCO_TEST === "true";

    const datosPago: any = {
      name: `Acta ${props.file}`,
      description: `Procesamiento de acta: ${props.file}`,
      invoice: referencia,

      currency: "COP",
      amount: monto.toString(),
      tax_base: monto.toString(),
      tax: "0",

      country: "CO",
      lang: "es",
      external: false,

      name_billing: `${billingDataToUse.nombre || ""} ${billingDataToUse.apellido || ""}`.trim(),
      address_billing: direccionCompleta,
      type_doc_billing: props.tipoDocumento || "CC",
      doc_billing: props.numeroDocumento || "",
      mobilephone_billing: billingDataToUse.telefono || "",
      email_billing: billingDataToUse.email || "",
      extra1: userId,
    };

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

    const baseUrl = typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_NGROK_URL || window.location.origin)
      : "";
    const urlConfirmacion = `${baseUrl}/api/epayco/confirmation`;

    datosPago.confirmation = urlConfirmacion;
    if (typeof window !== "undefined") {
      datosPago.response = window.location.href;
    }

    const cerrarModalEpayco = () => {
      try {
        const epaycoIframes = document.querySelectorAll('iframe[src*="epayco"], iframe[src*="checkout"], iframe[src*="secure.epayco"], iframe[src*="new-checkout.epayco"]');
        epaycoIframes.forEach((iframe: any) => {
          try {
            if (iframe && iframe.parentElement) {
              const container = iframe.closest('[class*="epayco"], [id*="epayco"], [class*="modal"], [class*="overlay"], [class*="checkout"], [id="epayco-onepage-v2-container"], dialog[aria-label*="checkout"]') || iframe.parentElement;
              if (container && container.style) {
                container.style.display = 'none';
                container.style.visibility = 'hidden';
                container.style.opacity = '0';
                container.style.pointerEvents = 'none';
                container.style.zIndex = '-1';
              }
              if (container && container.tagName === 'DIALOG') {
                (container as HTMLDialogElement).close();
              }
              iframe.style.display = 'none';
              iframe.style.visibility = 'hidden';
              if (iframe.parentNode) {
                iframe.remove();
              }
            }
          } catch (e) {
          }
        });

        const epaycoV2Container = document.getElementById('epayco-onepage-v2-container');
        if (epaycoV2Container) {
          try {
            const dialog = epaycoV2Container.querySelector('dialog');
            if (dialog) {
              dialog.close();
              dialog.style.display = 'none';
            }
            epaycoV2Container.style.display = 'none';
            epaycoV2Container.remove();
          } catch (e) {
          }
        }

        const epaycoDialogs = document.querySelectorAll('dialog[aria-label*="checkout"], dialog[aria-label*="Ventana de checkout"]');
        epaycoDialogs.forEach((dialog: any) => {
          try {
            if (dialog && typeof dialog.close === 'function') {
              dialog.close();
            }
            if (dialog && dialog.style) {
              dialog.style.display = 'none';
              dialog.style.visibility = 'hidden';
              dialog.style.opacity = '0';
            }
          } catch (e) {
          }
        });

        const epaycoOverlays = document.querySelectorAll('[class*="epayco"], [id*="epayco"], [class*="epayco-modal"], [class*="epayco-overlay"], [class*="epayco-backdrop"], [class*="epayco-checkout"], [class*="OnePageV2"], [id="epayco-onepage-v2-container"]');
        epaycoOverlays.forEach((overlay: any) => {
          try {
            if (overlay && overlay.style) {
              overlay.style.display = 'none';
              overlay.style.visibility = 'hidden';
              overlay.style.opacity = '0';
              overlay.style.pointerEvents = 'none';
              overlay.style.zIndex = '-1';
            }
            if (overlay.parentNode) {
              overlay.remove();
            }
          } catch (e) {
          }
        });

        const blurDivs = document.querySelectorAll('div[style*="background-color: rgba(0, 0, 0"], div[style*="background-color:rgba(0,0,0"], div[id^="oK"], div[style*="position: fixed"][style*="z-index: 99999"]');
        blurDivs.forEach((div: any) => {
          try {
            const style = div.getAttribute('style') || '';
            if (style.includes('rgba(0, 0, 0') || style.includes('rgba(0,0,0') || style.includes('position: fixed')) {
              const computedStyle = window.getComputedStyle(div);
              if (computedStyle.backgroundColor.includes('rgba(0, 0, 0') || computedStyle.backgroundColor.includes('rgba(0,0,0')) {
                div.style.display = 'none';
                div.style.visibility = 'hidden';
                div.style.opacity = '0';
                div.style.pointerEvents = 'none';
                if (div.parentNode) {
                  div.remove();
                }
              }
            }
          } catch (e) {
          }
        });

        const highZIndexElements = document.querySelectorAll('div[style*="z-index: 99999"], div[style*="z-index:99999"]');
        highZIndexElements.forEach((el: any) => {
          try {
            const computedStyle = window.getComputedStyle(el);
            if (computedStyle.position === 'fixed' && (computedStyle.backgroundColor.includes('rgba(0, 0, 0') || computedStyle.backgroundColor.includes('rgba(0,0,0'))) {
              el.style.display = 'none';
              el.style.visibility = 'hidden';
              el.style.opacity = '0';
              el.style.pointerEvents = 'none';
              if (el.parentNode) {
                el.remove();
              }
            }
          } catch (e) {
          }
        });

        if (document.body) {
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
        }

        document.body.classList.remove('epayco-modal-open', 'epayco-checkout-open');

        const allModals = document.querySelectorAll('[class*="modal"], [class*="overlay"]');
        allModals.forEach((modal: any) => {
          try {
            const text = modal.textContent || '';
            if (text.includes('ePayco') || text.includes('Transacción') || text.includes('epayco')) {
              if (modal.style) {
                modal.style.display = 'none';
                modal.style.visibility = 'hidden';
                modal.style.opacity = '0';
                modal.style.pointerEvents = 'none';
                modal.style.zIndex = '-1';
              }
              if (modal.parentNode) {
                modal.remove();
              }
            }
          } catch (e) {
          }
        });
      } catch (e) {
      }
    };

    let pagoProcesado = false;
    let modalCerrado = false;

    datosPago.onResponse = async (response: any) => {
      let normalizedResponse = response;
      
      if (response && response.data && (response.data.x_response || response.data.x_cod_response)) {
        normalizedResponse = response.data;
      } else if (response && response.transaction) {
        normalizedResponse = response.transaction;
      }
      
      const transactionId = normalizedResponse.x_transaction_id || normalizedResponse.transaction_id || response.x_transaction_id || "";
      if (!transactionId) {
        console.warn("⚠️ No se encontró transaction_id en la respuesta de ePayco:", response);
        return;
      }

      if (processingTransactions.has(transactionId)) {
        await sleep(2000);
        if (hasToastBeenShown(transactionId)) {
          return;
        }
      }
      processingTransactions.add(transactionId);

      pagoProcesado = true;
      modalCerrado = true;

      try {
        cerrarModalEpayco();
      
      if (typeof window !== "undefined") {
        const currentUrl = window.location.href;

        const preventNavigation = (e: BeforeUnloadEvent) => {
          if (pagoProcesado) {
            e.preventDefault();
            e.returnValue = '';
            return '';
          }
        };

        window.addEventListener('beforeunload', preventNavigation);

        let checkInterval = setInterval(() => {
          if (window.location.href !== currentUrl) {
            const newUrl = window.location.href;
            if (newUrl.includes('epayco.co') || newUrl.includes('ref_payco') || newUrl.includes('secure.epayco') || newUrl.includes('landingresume') || newUrl.includes('?ref_payco=')) {
              window.stop();
              window.history.replaceState({}, '', currentUrl);
            }
          }
        }, 5);

        setTimeout(() => {
          clearInterval(checkInterval);
          window.removeEventListener('beforeunload', preventNavigation);
        }, 15000);
      }

      if (normalizedResponse.x_response === "Aceptada" || normalizedResponse.x_cod_response === 1) {
        setIsLoading(false);

        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.frequency.value = 600;
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);

          setTimeout(() => {
            try {
              const oscillator2 = audioContext.createOscillator();
              const gainNode2 = audioContext.createGain();
              oscillator2.connect(gainNode2);
              gainNode2.connect(audioContext.destination);
              oscillator2.frequency.value = 800;
              oscillator2.type = "sine";
              gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
              gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
              oscillator2.start(audioContext.currentTime);
              oscillator2.stop(audioContext.currentTime + 0.3);
            } catch (e) {
            }
          }, 150);
        } catch (error) {
        }

        if (props.handlePayment) {
          props.handlePayment();
        }

        await ActualizarProceso(
          props.file,
          5,
          undefined,
          parseFloat(normalizedResponse.x_amount || normalizedResponse.amount || "0"),
          transactionId,
          undefined,
          normalizedResponse.x_id_invoice || normalizedResponse.invoice || props.file,
          undefined,
          undefined,
          null,
          false,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
        );
        if (transactionId && !hasToastBeenShown(transactionId)) {
          markToastAsShown(transactionId);
        setTimeout(() => {
          const amount = parseFloat(normalizedResponse.x_amount || normalizedResponse.amount || "0");

          toast.success("¡Pago Aprobado!", {
            description: (
              <div className="space-y-3 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Monto:</span>
                  <span className="text-sm font-bold text-gray-900">${amount.toLocaleString('es-CO')} COP</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Tx:</span>
                  <span className="text-xs font-mono text-gray-600">{transactionId}</span>
                </div>
              </div>
            ),
            duration: Infinity, // No se cierra automáticamente
            action: {
              label: "Entendido",
              onClick: () => { },
            },
          });
        }, 600);
        }

        if (process.env.NEXT_PUBLIC_PAGO !== "soporte" && typeof window !== "undefined" && typeof window.gtag === "function") {
          window.gtag('event', 'epayco_payment_success', {
            'event_category': 'engagement',
            'event_label': 'epayco_payment_completed',
            'value': parseFloat(normalizedResponse.x_amount || normalizedResponse.amount || "0"),
            'transaction_id': transactionId,
            'file_name': props.file,
            'duration': props.duration
          });
        }
      } else {
        pagoProcesado = true;
        modalCerrado = true;
        setTimeout(() => {
          cerrarModalEpayco();
        }, 500);

        setIsLoading(false);

        try {
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
            null,
            false,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          );

          await guardarFalloPagoService({
            nombreActa: props.file,
            detalleFallo: {
              'event_category': 'error',
              'event_label': response.x_response || 'Unknown status',
              'transaction_id': response.x_transaction_id || '',
              'file_name': props.file,
              'duration': props.duration,
              'error_message': response.x_response_reason_text || 'Pago rechazado'
            }
          });

          setTimeout(() => {
            const motivo = response.x_response_reason_text || response.x_response_reason || 'Razón desconocida';
            toast.error("Pago Rechazado", {
              description: (
                <div className="space-y-2 mt-2">
                  <p className="text-sm text-gray-700">
                    Tu transacción fue rechazada. No se generará ningún acta.
                  </p>
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-600">Motivo:</p>
                    <p className="text-xs text-gray-800 mt-1">{motivo}</p>
                  </div>
                </div>
              ),
              duration: Infinity,
              action: {
                label: "Entendido",
                onClick: () => { },
              },
            });
          }, 600);
        } catch (error) {
          console.error("❌ Error al guardar fallo:", error);
          setTimeout(() => {
            toast.error("Pago Rechazado", {
              description: "Tu transacción fue rechazada. Por favor, intenta nuevamente.",
              duration: Infinity,
              action: {
                label: "Entendido",
                onClick: () => { },
              },
            });
          }, 600);
        }
      }

      setIsLoading(false);

      if (response.x_response === "Aceptada" || response.x_cod_response === 1) {
        ActualizarProceso(
          props.file,
          5,
          undefined,
          parseFloat(response.x_amount || "0"),
          response.x_transaction_id || "",
          undefined,
          response.x_id_invoice || referencia,
          undefined,
          undefined,
          null,
          false,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
        ).catch(err => console.error("Error al actualizar (ignorado):", err));
      }
      } finally {
        processingTransactions.delete(transactionId);
      }
    };

    const currentUrl = typeof window !== "undefined" ? window.location.href : '';
    const originalPushState = typeof window !== "undefined" ? window.history.pushState.bind(window.history) : null;
    const originalReplaceState = typeof window !== "undefined" ? window.history.replaceState.bind(window.history) : null;

    if (typeof window !== "undefined") {
      if (originalPushState) {
        window.history.pushState = function (...args: any[]) {
          const url = args[2]?.toString() || '';
          if (url.includes('epayco.co') || url.includes('ref_payco') || url.includes('secure.epayco')) {
            return;
          }
          return originalPushState.apply(window.history, args as any);
        };
      }

      if (originalReplaceState) {
        window.history.replaceState = function (...args: any[]) {
          const url = args[2]?.toString() || '';
          if (url.includes('epayco.co') || url.includes('ref_payco') || url.includes('secure.epayco')) {
            return;
          }
          return originalReplaceState.apply(window.history, args as any);
        };
      }

      let checkLocationInterval = setInterval(() => {
        if (window.location.href !== currentUrl) {
          const newUrl = window.location.href;
          if (newUrl.includes('epayco.co') || newUrl.includes('ref_payco') || newUrl.includes('secure.epayco') || newUrl.includes('landingresume') || newUrl.includes('?ref_payco=')) {
            window.stop();
            window.history.replaceState({}, '', currentUrl);
          }
        }
      }, 10);

      setTimeout(() => {
        if (originalPushState) {
          window.history.pushState = originalPushState;
        }
        if (originalReplaceState) {
          window.history.replaceState = originalReplaceState;
        }
        clearInterval(checkLocationInterval);
      }, 30000);
    }

    if (isTestMode) {
    }

    try {
      checkoutHandler.open(datosPago);

      let modalDetected = false;
      let checkModalInterval: NodeJS.Timeout;

      const isModalOpen = () => {
        const iframes = document.querySelectorAll('iframe[src*="epayco"], iframe[src*="checkout"], iframe[src*="secure.epayco"], iframe[src*="new-checkout.epayco"]');
        const modals = document.querySelectorAll('[class*="epayco-modal"], [class*="epayco-checkout"], [id="epayco-onepage-v2-container"]');
        const dialogs = document.querySelectorAll('dialog[aria-label*="checkout"], dialog[aria-label*="Ventana de checkout"]');
        const bodyHasClass = document.body.classList.contains('epayco-modal-open');
        const v2Dialog = document.querySelector('dialog[aria-label*="checkout"]');
        const isV2Open = v2Dialog && (v2Dialog as HTMLDialogElement).open;
        return iframes.length > 0 || modals.length > 0 || dialogs.length > 0 || bodyHasClass || isV2Open;
      };

      checkModalInterval = setInterval(() => {
        const open = isModalOpen();

        if (open) {
          modalDetected = true;
        }

        if (modalDetected && !open && !pagoProcesado) {
          setIsLoading(false);
          clearInterval(checkModalInterval);
        }

        if (pagoProcesado) {
          clearInterval(checkModalInterval);
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(checkModalInterval);
      }, 600000);

      const handleMessage = async (event: MessageEvent) => {
        const epaycoOrigins = [
          'epayco',
          'checkout',
          'secure.epayco',
          'new-checkout.epayco'
        ];
        
        if (event.origin &&
          !epaycoOrigins.some(origin => event.origin.includes(origin)) &&
          event.origin !== window.location.origin) {
          return;
        }

        let response = null;

        if (event.data && typeof event.data === 'object') {
          if (event.data.event === 'onResponse' && event.data.response) {
            response = event.data.response;
          } else if (event.data.type === "epayco_response") {
            response = event.data.data;
          } else if (event.data.x_response) {
            response = event.data;
          } else if (event.data.response) {
            response = event.data.response;
          } else if (event.data.x_cod_response) {
            response = event.data;
          } else if (event.data.transaction) {
            response = event.data.transaction;
          } else if (event.data.data && (event.data.data.x_response || event.data.data.x_cod_response)) {
            response = event.data.data;
          }
        } else if (typeof event.data === 'string') {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.event === 'onResponse' && parsed.response) {
              response = parsed.response;
            } else if (parsed.x_response || parsed.x_cod_response) {
              response = parsed;
            } else if (parsed.transaction) {
              response = parsed.transaction;
            } else if (parsed.data && (parsed.data.x_response || parsed.data.x_cod_response)) {
              response = parsed.data;
            }
          } catch (e) {
          }
        }

        if (response && (response.x_response || response.x_cod_response || response.respuesta || response.estado)) {
          const transactionId = response.x_transaction_id || response.transactionId || response.ref_payco || "";
          if (!transactionId) return;

          if (processingTransactions.has(transactionId)) {
            await sleep(2000);
            if (hasToastBeenShown(transactionId)) {
              return;
            }
          }
          processingTransactions.add(transactionId);

          const isSuccess = response.x_response === "Aceptada" ||
            response.x_cod_response === 1 ||
            response.respuesta === "Aceptada" ||
            response.estado === "Aceptada";
          if (isSuccess) {
            pagoProcesado = true;
            modalCerrado = true;

            try {
              setTimeout(() => {
                cerrarModalEpayco();
              }, 500);

              if (typeof window !== "undefined") {
                const currentUrl = window.location.href;

                const preventNavigation = (e: BeforeUnloadEvent) => {
                  e.preventDefault();
                  e.returnValue = '';
                  return '';
                };

                window.addEventListener('beforeunload', preventNavigation);

                let checkInterval = setInterval(() => {
                  if (window.location.href !== currentUrl) {
                    const newUrl = window.location.href;
                    if (newUrl.includes('epayco.co') || newUrl.includes('ref_payco') || newUrl.includes('secure.epayco') || newUrl.includes('landingresume') || newUrl.includes('?ref_payco=')) {
                      window.stop();
                      window.history.replaceState({}, '', currentUrl);
                    }
                  }
                }, 5);

                setTimeout(() => {
                  clearInterval(checkInterval);
                  window.removeEventListener('beforeunload', preventNavigation);
                }, 15000);
              }

              const amount = response.x_amount || response.amount || response.valor || "0";

              window.removeEventListener("message", handleMessage);

              setIsLoading(false);

              try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.frequency.value = 600;
                oscillator.type = "sine";
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);

                setTimeout(() => {
                  try {
                    const oscillator2 = audioContext.createOscillator();
                    const gainNode2 = audioContext.createGain();
                    oscillator2.connect(gainNode2);
                    gainNode2.connect(audioContext.destination);
                    oscillator2.frequency.value = 800;
                    oscillator2.type = "sine";
                    gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                    oscillator2.start(audioContext.currentTime);
                  oscillator2.stop(audioContext.currentTime + 0.3);
                } catch (e) {
                }
              }, 150);
            } catch (error) {
            }

            if (props.handlePayment) {
              props.handlePayment();
            }

            if (transactionId && !hasToastBeenShown(transactionId)) {
                markToastAsShown(transactionId);
              setTimeout(() => {
                const amountNum = parseFloat(amount || "0");

                toast.success("¡Pago Aprobado!", {
                  description: (
                    <div className="space-y-3 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Monto:</span>
                        <span className="text-sm font-bold text-gray-900">${amountNum.toLocaleString('es-CO')} COP</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Tx:</span>
                        <span className="text-xs font-mono text-gray-600">{transactionId}</span>
                      </div>
                    </div>
                  ),
                  duration: Infinity, // No se cierra automáticamente
                  action: {
                    label: "Entendido",
                    onClick: () => { },
                  },
                });
              }, 600);
              }
            } finally {
              processingTransactions.delete(transactionId);
            }
          } else {
            const amountRejected = response.x_amount || response.amount || response.valor || "0";
            const invoiceRejected = response.x_id_invoice || response.factura || referencia;

            pagoProcesado = true;
            modalCerrado = true;
            setTimeout(() => {
              cerrarModalEpayco();
            }, 500);

            try {
              setIsLoading(false);

              window.removeEventListener("message", handleMessage);

              try {
                await ActualizarProceso(
                  props.file,
                  9,
                  undefined,
                  parseFloat(amountRejected || "0"),
                  transactionId || "",
                  undefined,
                  invoiceRejected || "",
                  null,
                  null,
                  null,
                  false,
                  undefined,
                  undefined,
                  undefined,
                  undefined,
                  undefined,
                ).catch(err => console.error("Error al actualizar (ignorado):", err));

                await guardarFalloPagoService({
                  nombreActa: props.file,
                  detalleFallo: {
                    'event_category': 'error',
                    'event_label': response.x_response || 'Unknown status',
                    'transaction_id': transactionId || '',
                    'file_name': props.file,
                    'duration': props.duration,
                    'error_message': response.x_response_reason_text || response.x_response_reason || 'Pago rechazado'
                  }
                }).catch(err => console.error("Error al guardar fallo (ignorado):", err));

                setTimeout(() => {
                  const motivo = response.x_response_reason_text || response.x_response_reason || 'Razón desconocida';
                  toast.error("Pago Rechazado", {
                    description: (
                      <div className="space-y-2 mt-2">
                        <p className="text-sm text-gray-700">
                          Tu transacción fue rechazada. No se generará ningún acta.
                        </p>
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-600">Motivo:</p>
                          <p className="text-xs text-gray-800 mt-1">{motivo}</p>
                        </div>
                      </div>
                    ),
                    duration: Infinity,
                    action: {
                      label: "Entendido",
                      onClick: () => { },
                    },
                  });
                }, 600);
              } catch (error) {
                console.error("❌ Error al procesar rechazo:", error);
                setTimeout(() => {
                  toast.error("Pago Rechazado", {
                    description: "Tu transacción fue rechazada. Por favor, intenta nuevamente.",
                    duration: Infinity,
                    action: {
                      label: "Entendido",
                      onClick: () => { },
                    },
                  });
                }, 600);
              }
            } finally {
              processingTransactions.delete(transactionId);
            }
          }
        }
      };

      window.addEventListener("message", handleMessage);

      const observeV2Modal = () => {
        const v2Container = document.getElementById('epayco-onepage-v2-container');
        if (v2Container) {
          const dialog = v2Container.querySelector('dialog');
          if (dialog) {
            dialog.addEventListener('close', async () => {
              if (!pagoProcesado) {
                await sleep(1000);
                
                const urlParams = new URLSearchParams(window.location.search);
                const refPayco = urlParams.get('ref_payco') || urlParams.get('x_ref_payco');
                
                if (refPayco) {
                  try {
                    const verifyUrl = `https://api.secure.epayco.co/v1/transaction/response.json?ref_payco=${refPayco}&public_key=${process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY}`;
                    const response = await fetch(verifyUrl);
                    const data = await response.json();
                    
                    if (data.success && data.data) {
                      const transaction = data.data;
                      if (transaction.x_response === "Aceptada" || transaction.x_cod_response === 1) {
                        await handleEpaycoResponseFromRedirect(transaction, {
                          file: props.file,
                          folder: props.folder || null,
                          fileid: props.fileid || null,
                          duration: props.duration || null,
                          refPayco: refPayco
                        });
                      }
                    }
                  } catch (error) {
                    console.error("Error al verificar pago desde V2:", error);
                  }
                }
              }
            });

            const observer = new MutationObserver((mutations) => {
              mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'open') {
                  const isOpen = (dialog as HTMLDialogElement).open;
                  if (!isOpen && !pagoProcesado) {
                    setTimeout(async () => {
                      const urlParams = new URLSearchParams(window.location.search);
                      const refPayco = urlParams.get('ref_payco') || urlParams.get('x_ref_payco');
                      if (refPayco) {
                        try {
                          const verifyUrl = `https://api.secure.epayco.co/v1/transaction/response.json?ref_payco=${refPayco}&public_key=${process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY}`;
                          const response = await fetch(verifyUrl);
                          const data = await response.json();
                          
                          if (data.success && data.data) {
                            const transaction = data.data;
                            if (transaction.x_response === "Aceptada" || transaction.x_cod_response === 1) {
                              await handleEpaycoResponseFromRedirect(transaction, {
                                file: props.file,
                                folder: props.folder || null,
                                fileid: props.fileid || null,
                                duration: props.duration || null,
                                refPayco: refPayco
                              });
                            }
                          }
                        } catch (error) {
                          console.error("Error al verificar pago desde V2 observer:", error);
                        }
                      }
                    }, 1000);
                  }
                }
              });
            });

            observer.observe(dialog, {
              attributes: true,
              attributeFilter: ['open']
            });

            setTimeout(() => {
              observer.disconnect();
            }, 600000);
          }
        }
      };

      setTimeout(() => {
        observeV2Modal();
      }, 500);

      const v2Observer = new MutationObserver(() => {
        observeV2Modal();
      });

      v2Observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        window.removeEventListener("message", handleMessage);
        v2Observer.disconnect();
        setIsLoading(false);
      }, 600000);

    } catch (error) {
      console.error("Error al abrir checkout de ePayco:", error);
      setIsLoading(false);
    }
  };

  if (montoMenorAlMinimo) {
    return (
      <div className="w-full space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800 mb-2">
            <strong>Monto menor al mínimo requerido</strong>
          </p>
          <p className="text-sm text-yellow-700 mb-3">
            El monto a pagar es <strong>${montoRedondeado.toLocaleString('es-CO')} COP</strong>, pero ePayco solo acepta pagos superiores a <strong>$5,000 COP</strong>.
          </p>
          <p className="text-sm text-yellow-700">
            Te ofrecemos soporte para este tipo de pagos. Contáctanos por WhatsApp y te ayudaremos a procesar tu pago.
          </p>
        </div>
        <Button
          className="w-full rounded-sm bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
          onClick={handleContactarWhatsApp}
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
    );
  }

  return (
    <>
      <Button
        className="w-full rounded-sm bg-green-700 hover:bg-green-800 disabled:bg-green-500"
        onClick={() => {
          if (props.onPaymentClick) {
            props.onPaymentClick(handleOpenCheckout);
          } else {
            handleOpenCheckout();
          }
        }}
        disabled={isLoading || !checkoutHandler}
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
    </>
  );
};

export default EPaycoOnPageComponent;
