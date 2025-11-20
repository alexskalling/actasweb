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
      <div className="min-h-screen bg-purple-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Cargando...</p>
        </div>
      </div>
    );
  }

  if (status === "authenticated" && session) {
    return (
      <div className="min-h-screen bg-purple-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-950">
      <NavComponent />
      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <LoginPopup />
      </main>
    </div>
  );
}
