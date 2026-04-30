import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JSE Auto App",
  description: "Analiza carros, precios y profit automáticamente",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-512.png",
    shortcut: "/icon-512.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="JSE Auto" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />

        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon-512.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}