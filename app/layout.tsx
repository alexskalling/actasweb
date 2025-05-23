import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import { headers } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

let title = "Generador de Actas en minutos | ActasDeReuniones.AI";
let description =
  "Convierte grabaciones en pre-actas en minutos. Ahorra tiempo, cumple con la Ley 675, garantiza precisión y calidad con nuestra herramienta sencilla.";

if (process.env.NEXT_PUBLIC_PAGO === "soporte") {
  title = "Soporte ActasDeReuniones.AI - asistencia personalizada";
  description =
    "Escala tu proceso con el soporte de ActasDeReuniones.AI. Descubre asistencia personalizada para garantizar una experiencia fluida en el uso de nuestra herramienta.";
}

export const metadata: Metadata = {
  title: title,
  description: description,
  alternates: {
    canonical: 'https://actasdereuniones.ai/',
  },
};

export default async function RootLayout({
  // Añadimos 'async' aquí
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers(); // Usamos 'await' aquí
  const hostname = headersList.get("host") || "";
  const isGeneradorDomain = hostname === "generador.actasdereuniones.ai";

  return (
    <html lang="es">
      <head>
        {!isGeneradorDomain && (
          <meta name="robots" content="noindex, nofollow" />
        )}
        {/* Otros elementos del head */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}

        {/* Cargar el script de Meta Pixel */}
        <Script
          strategy="afterInteractive"
          src={`https://connect.facebook.net/en_US/fbevents.js`}
          id="meta-pixel-script"
        />

        {/* Meta Pixel Inline Script */}
        <Script
          id="meta-pixel-inline"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s) {
                if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=;t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)
              }(window, document,'script', 'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '968021022066284');
              fbq('track', 'PageView');
            `,
          }}
        />

        {/* Etiqueta <noscript> para usuarios sin JavaScript */}
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=968021022066284&ev=PageView&noscript=1`}
          />
        </noscript>

        {/* Google Analytics and Tag Manager */}
        <GoogleAnalytics gaId="G-VL70D0YN9S" />
        <GoogleTagManager gtmId="GTM-MRMG7JTJ" />
      </body>
    </html>
  );
}
