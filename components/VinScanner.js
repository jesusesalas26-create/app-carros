"use client";

import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function VinScanner({ onScan }) {
  const scannerRef = useRef(null);
  const isRunningRef = useRef(false);

  useEffect(() => {
    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;

    const startScanner = async () => {
      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 300, height: 120 },
          },
          async (decodedText) => {
            const cleanVin = decodedText.trim().toUpperCase();

            if (/^[A-HJ-NPR-Z0-9]{17}$/.test(cleanVin)) {
              onScan(cleanVin);

              if (isRunningRef.current) {
                isRunningRef.current = false;
                await scanner.stop().catch(() => {});
              }
            }
          },
          () => {}
        );

        isRunningRef.current = true;
      } catch (error) {
        alert(
          "No pude abrir la cámara. En celular necesitas HTTPS o prueba en localhost desde la PC."
        );
        console.log(error);
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current && isRunningRef.current) {
        isRunningRef.current = false;
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return <div id="reader" style={{ width: "100%" }} />;
}