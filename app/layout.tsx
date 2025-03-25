import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Generador de Actas en minutos | ActasDeReuniones.AI",
  description:
    "Convierte grabaciones en pre-actas en minutos. Ahorra tiempo, cumple con la Ley 675, garantiza precisión y calidad con nuestra herramienta sencilla",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}

        <GoogleAnalytics gaId="G-VL70D0YN9S" />
        <GoogleTagManager gtmId="GTM-MRMG7JTJ" />
      </body>
    </html>
  );
}
