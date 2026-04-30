[8:11 p.m., 29/4/2026] Jesus Esalas🤠: import type { Metadata } from "next";
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
[8:12 p.m., 29/4/2026] Jesus Esalas🤠: git add .
git commit -m "fix iphone icon pwa"
git push
[8:16 p.m., 29/4/2026] Jesus Esalas🤠: import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JSE Auto App",
  description: "Analiza carros, precios y profit automáticamente",
  manifest: "/manifest.json",
  themeColor: "#000000",
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