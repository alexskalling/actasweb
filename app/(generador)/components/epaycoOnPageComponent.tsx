"use client";

import { Button } from "@/components/ui/button";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ActualizarProceso } from "../services/actas_querys_services/actualizarProceso";
import { guardarFalloPagoService } from "../services/fallos_querys_services/guardarFalloPagoService";
import { toast } from "sonner";
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
  nombreUsuario?: string;
  emailUsuario?: string;
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

const EPaycoOnPageComponent = (props: ePaycoOnPageComponentProps) => {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutHandler, setCheckoutHandler] = useState<any>(null);
  const [billingData, setBillingData] = useState<any>(null);
  
  // Monto mínimo para ePayco: 5000 COP
  const MONTO_MINIMO_EPAYCO = 5000;
  const montoRedondeado = Math.round(props.costo);
  const montoMenorAlMinimo = montoRedondeado < MONTO_MINIMO_EPAYCO;
  
  // Función para abrir WhatsApp con mensaje
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

    const numeroWhatsApp = '56945871929'; // +56 9 45871929 sin espacios ni signos
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    window.open(urlWhatsApp, '_blank');
  };

  // Interceptar redirecciones de ePayco cuando la página carga
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Verificar si hay parámetros de ePayco en la URL (después de redirección)
    const urlParams = new URLSearchParams(window.location.search);
    const epaycoResponse = urlParams.get('epayco_response');
    const refPayco = urlParams.get('ref_payco') || urlParams.get('x_ref_payco');
    
    // Extraer parámetros del archivo de la URL
    const file = urlParams.get('file');
    const folder = urlParams.get('folder');
    const fileid = urlParams.get('fileid');
    const duration = urlParams.get('duration');
    
    // También verificar en el hash
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.replace('#', ''));
    const refPaycoHash = hashParams.get('ref_payco') || hashParams.get('x_ref_payco');

    const refPaycoToProcess = refPayco || refPaycoHash;

    if (epaycoResponse || refPaycoToProcess) {
      console.log("Redirección de ePayco detectada, ref_payco:", refPaycoToProcess);
      console.log("Datos del archivo desde URL:", { file, folder, fileid, duration });
      
      // Limpiar la URL inmediatamente (pero guardar los datos primero)
      const savedData = { file, folder, fileid, duration, refPayco: refPaycoToProcess };
      window.history.replaceState({}, '', window.location.pathname);
      
      // Verificar el estado del pago con ePayco
      const verifyPayment = async () => {
        try {
          if (!refPaycoToProcess) {
            console.log("No hay ref_payco en la URL, esperando confirmación del servidor...");
            return;
          }

          if (!file) {
            console.error("No se encontró el nombre del archivo en la URL");
            return;
          }

          // Verificar el pago usando la API de ePayco
          const verifyUrl = `https://api.secure.epayco.co/v1/transaction/response.json?ref_payco=${refPaycoToProcess}&public_key=${process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY}`;
          
          const response = await fetch(verifyUrl);
          const data = await response.json();
          
          if (data.success && data.data) {
            const transaction = data.data;
            console.log("Estado de transacción:", transaction);
            
            if (transaction.x_response === "Aceptada" || transaction.x_cod_response === 1) {
              // Pago aprobado - procesar con los datos de la URL
              await handleEpaycoResponseFromRedirect(transaction, savedData);
            } else {
              console.log("Pago rechazado:", transaction.x_response_reason_text);
            }
          }
        } catch (error) {
          console.error("Error al verificar pago:", error);
        }
      };

      verifyPayment();
    }
  }, []);

  // Función para procesar respuesta cuando ePayco redirige
  const handleEpaycoResponseFromRedirect = async (transaction: any, savedData?: { file: string | null; folder: string | null; fileid: string | null; duration: string | null; refPayco: string | null }) => {
    console.log("Procesando respuesta de ePayco desde redirección:", transaction);
    
    // Usar datos de la URL si están disponibles, sino usar props
    const file = savedData?.file || props.file;
    const folder = savedData?.folder || props.folder || '';
    const fileid = savedData?.fileid || props.fileid || '';
    const duration = savedData?.duration || props.duration || '';
    
    if (!file) {
      console.error("No se pudo obtener el nombre del archivo");
      return;
    }
    
    const referencia = `${process.env.NEXT_PUBLIC_PAGO || "acta"}${file}-${Math.floor(Math.random() * 90000 + 10000)}`;
    
    // Cerrar cualquier modal que pueda estar abierto
    try {
      const epaycoIframes = document.querySelectorAll('iframe[src*="epayco"], iframe[src*="checkout"], iframe[src*="secure.epayco"]');
      epaycoIframes.forEach((iframe: any) => {
        if (iframe && iframe.parentElement) {
          const container = iframe.closest('[class*="epayco"], [id*="epayco"], [class*="modal"], [class*="overlay"]') || iframe.parentElement;
          if (container && container.style) {
            container.style.display = 'none';
            container.style.visibility = 'hidden';
            container.style.opacity = '0';
          }
          iframe.style.display = 'none';
        }
      });
      
      const overlays = document.querySelectorAll('[class*="epayco"], [id*="epayco"], [class*="epayco-modal"], [class*="epayco-overlay"]');
      overlays.forEach((overlay: any) => {
        if (overlay && overlay.style) {
          overlay.style.display = 'none';
          overlay.style.visibility = 'hidden';
          overlay.style.opacity = '0';
        }
      });
      
      document.body.classList.remove('epayco-modal-open', 'modal-open');
      document.body.style.overflow = '';
    } catch (e) {
      console.log("Error al cerrar modal:", e);
    }
    
    // Actualizar estado del acta
    try {
      await ActualizarProceso(
        file,
        5, // idEstadoProceso aprobado
        undefined,
        parseFloat(transaction.x_amount || transaction.amount),
        transaction.x_transaction_id || transaction.transaction_id,
        undefined,
        transaction.x_id_invoice || transaction.invoice || referencia,
        undefined, // NO actualizar urlTranscripcion - puede que ya esté guardada
        undefined, // NO actualizar urlborrador - puede que ya esté guardada
        null
      );
      console.log("Acta actualizada correctamente desde redirección:", file);
    } catch (updateError) {
      console.error("Error al actualizar acta:", updateError);
    }

    // Iniciar procesamiento del acta automáticamente
    // Si tenemos props.handlePayment disponible, usarlo, sino redirigir a la página de procesamiento
    if (props.handlePayment) {
      console.log("Iniciando procesamiento del acta desde redirección...");
      props.handlePayment();
    } else {
      // Si no tenemos handlePayment (página recargada), redirigir a la plataforma
      console.log("Redirigiendo a plataforma para continuar procesamiento...");
      window.location.href = '/plataforma';
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    // Cargar script de ePayco OnPage Checkout
    const script = document.createElement("script");
    script.src = "https://checkout.epayco.co/checkout.js";
    script.async = true;

    script.onload = () => {
      console.log("Script de ePayco cargado correctamente.");
      
      // Configurar handler de ePayco
      if (typeof window !== "undefined" && window.ePayco?.checkout) {
        const isTestMode = process.env.NEXT_PUBLIC_EPAYCO_TEST === "true";
        const publicKey = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY || "";
        
        console.log("Configurando ePayco:", {
          isTestMode,
          publicKey: publicKey.substring(0, 10) + "...", // Solo mostrar primeros caracteres
          testEnv: process.env.NEXT_PUBLIC_EPAYCO_TEST
        });
        
        const handler = window.ePayco.checkout.configure({
          key: publicKey,
          test: isTestMode,
        });

        setCheckoutHandler(handler);
        console.log("ePayco configurado en modo:", isTestMode ? "TEST" : "PRODUCCIÓN");
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
    console.log("🚀 handleOpenCheckout llamado", { checkoutHandler: !!checkoutHandler });
    if (!checkoutHandler) {
      console.error("❌ No se ha cargado el script de ePayco. checkoutHandler es null/undefined");
      alert("Error: El sistema de pago no está listo. Por favor recarga la página.");
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
    
    // Guardar referencia para polling
    const refPaycoParaPolling = referencia;
    
    // ePayco espera el monto sin decimales para COP
    // Validar que el costo sea válido
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
    
    // Validar monto mínimo (ePayco requiere mínimo 5000 COP)
    if (montoRedondeado < MONTO_MINIMO_EPAYCO) {
      console.error("❌ Monto muy bajo:", montoRedondeado);
      toast.error("Error", {
        description: `El monto mínimo permitido es $5,000 COP. El costo calculado es ${montoRedondeado.toLocaleString('es-CO')} COP. Por favor, contacta a soporte por WhatsApp.`,
        duration: 5000,
      });
      setIsLoading(false);
      return;
    }
    
    // ePayco OnPage Checkout acepta el monto como número o string
    // Usar número para evitar problemas de formato
    const monto = montoRedondeado;

    // Construir dirección completa
    const direccionCompleta = `${billingDataToUse.direccion || ""}, ${billingDataToUse.municipio || ""}, ${billingDataToUse.departamento || ""}`.trim();

    // Verificar modo test
    const isTestMode = process.env.NEXT_PUBLIC_EPAYCO_TEST === "true";
    console.log("Iniciando pago en modo:", isTestMode ? "TEST" : "PRODUCCIÓN");
    
    // Configurar datos del pago para ePayco OnPage Checkout
    const datosPago: any = {
      // Información del producto
      name: `Acta ${props.file}`,
      description: `Procesamiento de acta: ${props.file}`,
      invoice: referencia,
      
      // Información de pago
      currency: "COP",
      amount: monto.toString(), // ePayco puede requerir string
      tax_base: monto.toString(),
      tax: "0",
      
      // Configuración OnPage Checkout
      country: "CO",
      lang: "es",
      external: false, // false = checkout de ePayco (modal), true = formulario propio
      
      // Datos del cliente para facturación
      name_billing: `${billingDataToUse.nombre || ""} ${billingDataToUse.apellido || ""}`.trim(),
      address_billing: direccionCompleta,
      type_doc_billing: "CC", // Por defecto Cédula de Ciudadanía
      doc_billing: "1213123123", // Número de documento para pruebas
      mobilephone_billing: billingDataToUse.telefono || "",
      email_billing: billingDataToUse.email || "",
    };
    
    console.log("Datos de pago configurados:", {
      invoice: referencia,
      amount: monto,
      isTestMode,
      external: false
    });

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

    // Configurar URLs
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const urlConfirmacion = `${baseUrl}/api/epayco/confirmation`;

    // Configurar URLs - NO usar response para evitar redirección
    datosPago.confirmation = urlConfirmacion;
    // NO configurar response - queremos que todo se maneje en el callback sin redirección
    // Si ePayco requiere response, usar la misma URL actual para evitar redirección
    if (typeof window !== "undefined") {
      datosPago.response = window.location.href; // Misma página, sin redirección
    }
    
    console.log("🔍 Configuración de ePayco - Sin redirección, usando solo callback");
    
    // Función para cerrar el modal de ePayco completamente
    const cerrarModalEpayco = () => {
      try {
        console.log("🔒 Cerrando modal de ePayco...");
        
        // Cerrar todos los iframes de ePayco PRIMERO
        const epaycoIframes = document.querySelectorAll('iframe[src*="epayco"], iframe[src*="checkout"], iframe[src*="secure.epayco"]');
        epaycoIframes.forEach((iframe: any) => {
          try {
            if (iframe && iframe.parentElement) {
              const container = iframe.closest('[class*="epayco"], [id*="epayco"], [class*="modal"], [class*="overlay"], [class*="checkout"]') || iframe.parentElement;
              if (container && container.style) {
                container.style.display = 'none';
                container.style.visibility = 'hidden';
                container.style.opacity = '0';
                container.style.pointerEvents = 'none';
                container.style.zIndex = '-1';
              }
              iframe.style.display = 'none';
              iframe.style.visibility = 'hidden';
              // Verificar que el iframe tenga un padre antes de remover
              if (iframe.parentNode) {
                iframe.remove();
              }
            }
          } catch (e) {
            // Ignorar errores
          }
        });
        
        // Remover SOLO overlays y backdrops relacionados con ePayco
        const epaycoOverlays = document.querySelectorAll('[class*="epayco"], [id*="epayco"], [class*="epayco-modal"], [class*="epayco-overlay"], [class*="epayco-backdrop"], [class*="epayco-checkout"]');
        epaycoOverlays.forEach((overlay: any) => {
          try {
            if (overlay && overlay.style) {
              overlay.style.display = 'none';
              overlay.style.visibility = 'hidden';
              overlay.style.opacity = '0';
              overlay.style.pointerEvents = 'none';
              overlay.style.zIndex = '-1';
            }
            // Verificar que el overlay tenga un padre antes de remover
            if (overlay.parentNode) {
              overlay.remove();
            }
          } catch (e) {
            // Ignorar errores
          }
        });
        
        // Remover el div específico que causa el blur negro (background-color: rgba(0, 0, 0, 0.7))
        const blurDivs = document.querySelectorAll('div[style*="background-color: rgba(0, 0, 0"], div[style*="background-color:rgba(0,0,0"], div[id^="oK"], div[style*="position: fixed"][style*="z-index: 99999"]');
        blurDivs.forEach((div: any) => {
          try {
            const style = div.getAttribute('style') || '';
            if (style.includes('rgba(0, 0, 0') || style.includes('rgba(0,0,0') || style.includes('position: fixed')) {
              const computedStyle = window.getComputedStyle(div);
              if (computedStyle.backgroundColor.includes('rgba(0, 0, 0') || computedStyle.backgroundColor.includes('rgba(0,0,0')) {
                console.log("🔒 Removiendo div de blur negro:", div.id || div.className);
                div.style.display = 'none';
                div.style.visibility = 'hidden';
                div.style.opacity = '0';
                div.style.pointerEvents = 'none';
                // Verificar que el div tenga un padre antes de remover
                if (div.parentNode) {
                  div.remove();
                }
              }
            }
          } catch (e) {
            // Ignorar errores
          }
        });
        
        // También buscar por z-index muy alto (99999) que suele ser el overlay
        const highZIndexElements = document.querySelectorAll('div[style*="z-index: 99999"], div[style*="z-index:99999"]');
        highZIndexElements.forEach((el: any) => {
          try {
            const computedStyle = window.getComputedStyle(el);
            if (computedStyle.position === 'fixed' && (computedStyle.backgroundColor.includes('rgba(0, 0, 0') || computedStyle.backgroundColor.includes('rgba(0,0,0'))) {
              console.log("🔒 Removiendo elemento con z-index alto y fondo negro:", el.id || el.className);
              el.style.display = 'none';
              el.style.visibility = 'hidden';
              el.style.opacity = '0';
              el.style.pointerEvents = 'none';
              // Verificar que el elemento tenga un padre antes de remover
              if (el.parentNode) {
                el.remove();
              }
            }
          } catch (e) {
            // Ignorar errores
          }
        });
        
        // Restaurar estilos del body SOLO si fueron modificados por ePayco
        if (document.body) {
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
          // NO tocar filter ni backdropFilter del body para no romper la página
        }
        
        // Remover clases de modal activo (solo las de ePayco)
        document.body.classList.remove('epayco-modal-open', 'epayco-checkout-open');
        
        // Buscar y cerrar modales que contengan texto de ePayco
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
              // Verificar que el modal tenga un padre antes de remover
              if (modal.parentNode) {
                modal.remove();
              }
            }
          } catch (e) {
            // Ignorar errores
          }
        });
        
        console.log("✅ Modal de ePayco cerrado completamente");
      } catch (e) {
        console.log("⚠️ Error al cerrar modal:", e);
      }
    };
    
    // Variable para marcar que el pago ya fue procesado
    let pagoProcesado = false;
    let modalCerrado = false;
    
    // Callback para manejar la respuesta en el cliente (OnPage Checkout)
    // Este callback se ejecuta cuando ePayco procesa el pago
    datosPago.onResponse = async (response: any) => {
      console.log("✅ Respuesta de ePayco recibida via callback:", response);
      
      // Marcar que el pago fue procesado
      pagoProcesado = true;
      modalCerrado = true;
      
      // Cerrar el modal INMEDIATAMENTE (ANTES de procesar)
      cerrarModalEpayco();
      
      // Polling ya no es necesario - se eliminó
      
      // Limpiar listeners (handleMessage se define más abajo)
      
      // Prevenir cualquier navegación/redirección
      if (typeof window !== "undefined") {
        const currentUrl = window.location.href;
        
        // Interceptar beforeunload para prevenir navegación
        const preventNavigation = (e: BeforeUnloadEvent) => {
          if (pagoProcesado) {
            e.preventDefault();
            e.returnValue = '';
            console.log("⚠️ Navegación prevenida - pago ya procesado");
            return '';
          }
        };
        
        window.addEventListener('beforeunload', preventNavigation);
        
        // Interceptar cambios en location cada 5ms (MUY agresivo)
        let checkInterval = setInterval(() => {
          if (window.location.href !== currentUrl) {
            const newUrl = window.location.href;
            if (newUrl.includes('epayco.co') || newUrl.includes('ref_payco') || newUrl.includes('secure.epayco') || newUrl.includes('landingresume') || newUrl.includes('?ref_payco=')) {
              console.log("⚠️ Redirección detectada, revirtiendo:", newUrl);
              // Detener cualquier carga
              window.stop();
              // Revertir la URL inmediatamente
              window.history.replaceState({}, '', currentUrl);
            }
          }
        }, 5); // Verificar cada 5ms
        
        // Limpiar después de 15 segundos
        setTimeout(() => {
          clearInterval(checkInterval);
          window.removeEventListener('beforeunload', preventNavigation);
        }, 15000);
      }
      
      // Procesar respuesta
      if (response.x_response === "Aceptada" || response.x_cod_response === 1) {
        console.log("✅ Pago aprobado - Mostrando toast...");
        console.log("✅ Datos de transacción:", {
          transactionId: response.x_transaction_id,
          amount: response.x_amount,
          invoice: response.x_id_invoice || referencia,
          email: billingDataToUse?.email
        });
        
        setIsLoading(false);
        
        // Reproducir sonido de éxito
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
              console.log("Error en segundo tono:", e);
            }
          }, 150);
        } catch (error) {
          console.log("No se pudo reproducir sonido:", error);
        }
        
        // Generar el acta usando handlePayment
        if (props.handlePayment) {
          console.log("✅ Iniciando generación del acta...");
          props.handlePayment();
        }
        
        // Mostrar toast con datos de la transacción (después de cerrar el modal)
        setTimeout(() => {
          const amount = parseFloat(response.x_amount || "0");
          const transactionId = response.x_transaction_id || "";
          
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
              onClick: () => {},
            },
          });
        }, 600); // Esperar a que se cierre el modal
        
        // Track success
        if (process.env.NEXT_PUBLIC_PAGO !== "soporte" && typeof window !== "undefined" && typeof window.gtag === "function") {
          window.gtag('event', 'epayco_payment_success', {
            'event_category': 'engagement',
            'event_label': 'epayco_payment_completed',
            'value': parseFloat(response.x_amount || "0"),
            'transaction_id': response.x_transaction_id || '',
            'file_name': props.file,
            'duration': props.duration
          });
        }
      } else {
        console.log("❌ Pago rechazado:", response.x_response_reason_text);
        
        // Cerrar el modal primero
        pagoProcesado = true;
        modalCerrado = true;
        setTimeout(() => {
          cerrarModalEpayco();
        }, 500);
        
        setIsLoading(false);
        
        try {
          await ActualizarProceso(
            props.file,
            9, // Estado: Rechazado
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
              'error_message': response.x_response_reason_text || 'Pago rechazado'
            }
          });
          
          // Mostrar toast de error con el motivo
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
                onClick: () => {},
              },
            });
          }, 600);
        } catch (error) {
          console.error("❌ Error al guardar fallo:", error);
          // Mostrar toast de error incluso si falla el guardado
          setTimeout(() => {
            toast.error("Pago Rechazado", {
              description: "Tu transacción fue rechazada. Por favor, intenta nuevamente.",
              duration: Infinity,
              action: {
                label: "Entendido",
                onClick: () => {},
              },
            });
          }, 600);
        }
      }
      
      setIsLoading(false);
      
      // Actualizar el acta en segundo plano (no esperar)
      // El servidor también lo hace en /api/epayco/confirmation, pero por si acaso
      if (response.x_response === "Aceptada" || response.x_cod_response === 1) {
        ActualizarProceso(
          props.file,
          5,
          undefined,
          parseFloat(response.x_amount || "0"),
          response.x_transaction_id || "",
          undefined,
          response.x_id_invoice || referencia,
          undefined, // NO actualizar urlTranscripcion - puede que ya esté guardada
          undefined, // NO actualizar urlborrador - puede que ya esté guardada
          null
        ).catch(err => console.error("Error al actualizar (ignorado):", err));
      }
    };


    // Interceptar redirecciones ANTES de abrir el modal
    const currentUrl = typeof window !== "undefined" ? window.location.href : '';
    const originalPushState = typeof window !== "undefined" ? window.history.pushState.bind(window.history) : null;
    const originalReplaceState = typeof window !== "undefined" ? window.history.replaceState.bind(window.history) : null;
    
    if (typeof window !== "undefined") {
      // Interceptar history.pushState
      if (originalPushState) {
        window.history.pushState = function(...args: any[]) {
          const url = args[2]?.toString() || '';
          if (url.includes('epayco.co') || url.includes('ref_payco') || url.includes('secure.epayco')) {
            console.log("⚠️ history.pushState interceptado:", url);
            return;
          }
          return originalPushState.apply(window.history, args as any);
        };
      }
      
      // Interceptar history.replaceState
      if (originalReplaceState) {
        window.history.replaceState = function(...args: any[]) {
          const url = args[2]?.toString() || '';
          if (url.includes('epayco.co') || url.includes('ref_payco') || url.includes('secure.epayco')) {
            console.log("⚠️ history.replaceState interceptado:", url);
            return;
          }
          return originalReplaceState.apply(window.history, args as any);
        };
      }
      
      // Monitorear cambios en la URL y revertirlos si es necesario (más agresivo)
      let checkLocationInterval = setInterval(() => {
        if (window.location.href !== currentUrl) {
          const newUrl = window.location.href;
          if (newUrl.includes('epayco.co') || newUrl.includes('ref_payco') || newUrl.includes('secure.epayco') || newUrl.includes('landingresume') || newUrl.includes('?ref_payco=')) {
            console.log("⚠️ Cambio en location.href detectado, revirtiendo:", newUrl);
            window.stop();
            window.history.replaceState({}, '', currentUrl);
          }
        }
      }, 10); // Verificar cada 10ms
      
      // Restaurar después de 30 segundos
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
    
    // NO monitorear el DOM mientras el modal está abierto - solo después del pago
    // Los observadores se configurarán solo cuando el pago se complete
    
    // Polling eliminado - ya no es necesario porque no iniciamos procesamiento automáticamente
    
    // Abrir checkout de ePayco
    // ePayco OnPage Checkout abre un modal/iframe
    console.log("🔓 Abriendo modal de ePayco con datos:", {
      invoice: datosPago.invoice,
      amount: datosPago.amount,
      external: datosPago.external
    });
    
    // Mostrar datos de tarjeta de prueba si está en modo TEST
    if (isTestMode) {
      console.log("💳 DATOS DE TARJETA DE PRUEBA:");
      console.log("   Número: 4575623182290326");
      console.log("   Fecha: 12/2025");
      console.log("   CVV: 123");
      console.log("   Documento: 1213123123");
    }
    
    try {
      checkoutHandler.open(datosPago);
      console.log("✅ checkoutHandler.open() ejecutado");
      
      // Escuchar mensajes del iframe de ePayco como respaldo (OnPage Checkout puede usar postMessage)
      const handleMessage = async (event: MessageEvent) => {
        // Verificar origen del mensaje (ePayco) - más permisivo
        if (event.origin && 
            !event.origin.includes("epayco") && 
            !event.origin.includes("checkout") &&
            event.origin !== window.location.origin) {
          return;
        }

        console.log("📨 Mensaje recibido de iframe:", event.origin, event.data);

        // ePayco puede enviar la respuesta de diferentes formas
        let response = null;
        
        // Intentar diferentes formatos de respuesta
        if (event.data && typeof event.data === 'object') {
          // Formato: {event: 'onResponse', response: {...}}
          if (event.data.event === 'onResponse' && event.data.response) {
            response = event.data.response;
            console.log("✅ Respuesta encontrada en event.data.response:", response);
          } else if (event.data.type === "epayco_response") {
            response = event.data.data;
          } else if (event.data.x_response) {
            response = event.data;
          } else if (event.data.response) {
            response = event.data.response;
          } else if (event.data.x_cod_response) {
            response = event.data;
          }
        } else if (typeof event.data === 'string') {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.event === 'onResponse' && parsed.response) {
              response = parsed.response;
            } else if (parsed.x_response || parsed.x_cod_response) {
              response = parsed;
            }
          } catch (e) {
            // No es JSON
          }
        }

        // Si el callback onResponse no se ejecutó, usar este listener como respaldo
        if (response && (response.x_response || response.x_cod_response || response.respuesta || response.estado)) {
          console.log("✅✅✅ RESPUESTA DE PAGO RECIBIDA VIA POSTMESSAGE:", response);
          
          // Verificar si el pago fue exitoso
          const isSuccess = response.x_response === "Aceptada" || 
                           response.x_cod_response === 1 ||
                           response.respuesta === "Aceptada" ||
                           response.estado === "Aceptada";
          
          if (isSuccess) {
            console.log("✅✅✅ PAGO APROBADO - CERRANDO MODAL Y PROCESANDO...");
            
                    // Marcar que el pago fue procesado PRIMERO
                    pagoProcesado = true;
                    modalCerrado = true;
                    
                    // Esperar un momento antes de cerrar para que ePayco termine de procesar
                    setTimeout(() => {
                      cerrarModalEpayco();
                    }, 500);
            
            // Prevenir cualquier navegación/redirección
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
                    console.log("⚠️ Redirección detectada, revirtiendo:", newUrl);
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
            
            // Extraer datos de la respuesta
            const transactionId = response.x_transaction_id || response.transactionId || response.ref_payco || "";
            const amount = response.x_amount || response.amount || response.valor || "0";
            const invoice = response.x_id_invoice || response.factura || referencia;
            
            console.log("✅ Pago exitoso recibido:", { transactionId, amount, invoice });
            
            // Remover el listener después de procesar
            window.removeEventListener("message", handleMessage);
            
            setIsLoading(false);
            
            // Reproducir sonido de éxito
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
                  console.log("Error en segundo tono:", e);
                }
              }, 150);
            } catch (error) {
              console.log("No se pudo reproducir sonido:", error);
            }
            
            // Generar el acta usando handlePayment
            if (props.handlePayment) {
              console.log("✅ Iniciando generación del acta...");
              props.handlePayment();
            }
            
            // Mostrar toast con datos de la transacción (después de cerrar el modal)
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
                  onClick: () => {},
                },
              });
            }, 600); // Esperar a que se cierre el modal
          } else {
            console.log("❌ Pago rechazado:", response);
            
            // Extraer datos de la respuesta
            const transactionIdRejected = response.x_transaction_id || response.transactionId || response.ref_payco || "";
            const amountRejected = response.x_amount || response.amount || response.valor || "0";
            const invoiceRejected = response.x_id_invoice || response.factura || referencia;
            
            // Cerrar modal
            pagoProcesado = true;
            modalCerrado = true;
            setTimeout(() => {
              cerrarModalEpayco();
            }, 500);
            
            setIsLoading(false);
            
            // Remover el listener después de procesar
            window.removeEventListener("message", handleMessage);
            
            // Actualizar acta a rechazado
            try {
              await ActualizarProceso(
                props.file,
                9, // Estado: Rechazado
                undefined,
                parseFloat(amountRejected || "0"),
                transactionIdRejected || "",
                undefined,
                invoiceRejected || "",
                null,
                null,
                null
              ).catch(err => console.error("Error al actualizar (ignorado):", err));
              
              await guardarFalloPagoService({
                nombreActa: props.file,
                detalleFallo: {
                  'event_category': 'error',
                  'event_label': response.x_response || 'Unknown status',
                  'transaction_id': transactionIdRejected || '',
                  'file_name': props.file,
                  'duration': props.duration,
                  'error_message': response.x_response_reason_text || response.x_response_reason || 'Pago rechazado'
                }
              }).catch(err => console.error("Error al guardar fallo (ignorado):", err));
              
              // Mostrar toast de error
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
                    onClick: () => {},
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
                    onClick: () => {},
                  },
                });
              }, 600);
            }
          }
        }
      };

      // Agregar listener para mensajes de ePayco como respaldo
      window.addEventListener("message", handleMessage);

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

  // Si el monto es menor al mínimo, mostrar mensaje de soporte
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
        console.log("🔘 Botón Pagar clickeado", { 
          isLoading, 
          checkoutHandler: !!checkoutHandler,
          onPaymentClick: !!props.onPaymentClick 
        });
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

