import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ToastHost from "@/components/ToastHost";
import NavRol from "@/components/NavRol";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EcoRoute AI",
  description:
    "Sistema web de optimización dinámica de rutas para la recolección eficiente de residuos sólidos municipales",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NavRol />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <ToastHost />
      </body>
    </html>
  );
}
