'use client'
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import LoginPopup from "@/components/ui/loginPopup";
import NavComponent from "./(generador)/components/navComponent";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session) {
      router.replace('/plataforma');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const epaycoResponse = params.get('epayco_response');
    const refPayco = params.get('ref_payco') || params.get('x_ref_payco');

    if (!epaycoResponse && !refPayco) {
      return;
    }

    console.log("🔍 Redirección de ePayco detectada");

    const file = params.get('file');
    const folder = params.get('folder');
    const fileid = params.get('fileid');

    console.log("🔍 Parámetros:", { refPayco, file, folder, fileid });

    window.history.replaceState({}, '', '/');

    const processEpaycoRedirect = async () => {
      try {
        if (!refPayco || !file) {
          console.error("❌ Faltan parámetros necesarios");
          window.location.href = '/plataforma';
          return;
        }

        const verifyUrl = `https://api.secure.epayco.co/v1/transaction/response.json?ref_payco=${refPayco}&public_key=${process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY}`;

        console.log("🔍 Verificando pago...");
        const response = await fetch(verifyUrl);
        const data = await response.json();

        if (data.success && data.data) {
          const transaction = data.data;

          if (transaction.x_response === "Aceptada" || transaction.x_cod_response === 1) {
            console.log("✅ Pago aprobado, procesando...");

            try {
              const processResponse = await fetch('/api/epayco/process-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  file,
                  folder,
                  fileid,
                  transactionId: transaction.x_transaction_id || transaction.transaction_id,
                  amount: transaction.x_amount || transaction.amount,
                  invoice: transaction.x_id_invoice || transaction.invoice,
                  email: session?.user?.email || '',
                  name: session?.user?.name || '',
                }),
              });

              await processResponse.json();
              console.log("✅ Pago procesado, redirigiendo a /plataforma");
            } catch (error) {
              console.error("❌ Error al procesar:", error);
            }
          }
        }
      } catch (error) {
        console.error("❌ Error:", error);
      } finally {
        window.location.href = '/plataforma';
      }
    };

    processEpaycoRedirect();
  }, [session]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#5A2D8E] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Cargando...</p>
        </div>
      </div>
    );
  }

  if (status === "authenticated" && session) {
    return (
      <div className="min-h-screen bg-[#5A2D8E] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#5A2D8E] flex flex-col">
      <NavComponent />
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <LoginPopup />
      </main>
      <footer className="w-full py-6 px-4">
        <div className="max-w-md mx-auto text-center">
          <p className="text-white/80 text-sm mb-3">¿Necesitas ayuda?</p>
          <a
            href="https://wa.me/573122995191?text=Hola%20Sebastián,%20necesito%20ayuda%20con%20mi%20cuenta%20en%20ActasDeReuniones.AI"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium text-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214l-3.741.982l.998-3.648l-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884c2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            <span>Contactar soporte por WhatsApp</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
