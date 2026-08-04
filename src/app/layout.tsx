import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bloom Studio — Estúdio de Criação Literária",
  description:
    "Estúdio colaborativo de criação literária com coautora IA Flora 🌸 Escreva histórias com inteligência, organize personagens, capítulos e mais.",
  keywords: ["Bloom Studio", "escrita criativa", "coautoria IA", "literatura", "Flora", "PWA"],
  authors: [{ name: "Bloom Studio" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bloom Studio",
  },
  openGraph: {
    title: "Bloom Studio",
    description: "Estúdio de criação literária com coautora IA Flora 🌸",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#C48D9E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Bloom Studio" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${inter.variable} ${playfair.variable} antialiased`}
        style={{
          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        }}
      >
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#FFFFFF",
              border: "1px solid #E6C2C7",
              color: "#4A2C3A",
            },
          }}
        />
      </body>
    </html>
  );
}
