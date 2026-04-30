import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JSE Auto App",
  description: "Analiza carros, precios y profit automáticamente",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-512.png",
    apple: "/icon-512.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* PWA para iPhone */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="JSE Auto" />
        <link rel="apple-touch-icon" href="/icon-512.png" />

        {/* Theme */}
        <meta name="theme-color" content="#000000" />
      </head>

      <body>
        {children}
      </body>
    </html>
  );
}