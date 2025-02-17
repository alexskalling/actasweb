import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
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
    "Convierte grabaciones en pre-actas en minutos. Ahorra tiempo, cumple con la Ley 675, garantiza precisión y calidad con nuestra herramienta sencilla.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Script
          src="https://checkout.wompi.co/widget.js"
          strategy="lazyOnload"
        />
        <GoogleAnalytics gaId="G-F2VDTR8RN3" />
        <GoogleTagManager gtmId="GTM-MRMG7JTJ" />
      </body>
    </html>
  );
}
