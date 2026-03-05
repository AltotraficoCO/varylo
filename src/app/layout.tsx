import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/pwa-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: '#0f172a',
};

export const metadata: Metadata = {
  title: "Varylo — Atención al cliente con IA | WhatsApp, Instagram y más",
  description: "Centraliza WhatsApp, Instagram y más canales en una sola bandeja. Agentes IA que responden 24/7, chatbots inteligentes y analíticas avanzadas. Empieza gratis.",
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/favicon.png?v=2',
    apple: '/favicon.png?v=2',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Varylo',
  },
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<any>;
}>) {
  const { lang } = await params;
  return (
    <html lang={lang || 'en'}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PwaRegister />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
