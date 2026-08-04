import type { Metadata } from "next";
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
    "Estúdio colaborativo de criação literária com coautora IA. Escreva histórias com a Flora 🌸",
  keywords: ["Bloom Studio", "escrita criativa", "coautoria IA", "literatura", "Flora"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
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
