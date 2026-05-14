"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import Tesseract from "tesseract.js";

type VinScannerProps = {
  onScan: (vin: string) => void;
};

export default function VinScanner({ onScan }: VinScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef(false);

  const [ocrLoading, setOcrLoading] = useState(false);
  const [manualVin, setManualVin] = useState("");

  const cleanVinText = (text: string) => {
    const cleaned = text
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .replace(/[IOQ]/g, "");

    const match = cleaned.match(/[A-HJ-NPR-Z0-9]{17}/);
    return match ? match[0] : cleaned.slice(0, 17);
  };

  const isValidVin = (value: string) => /^[A-HJ-NPR-Z0-9]{17}$/.test(value);

  const submitVin = (value: string) => {
    const cleanVin = cleanVinText(value);

    if (!isValidVin(cleanVin)) {
      alert("No parece un VIN válido. Debe tener 17 caracteres y no usar I, O o Q.");
      setManualVin(cleanVin);
      return;
    }

    onScan(cleanVin);
  };

  useEffect(() => {
    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;

    const startScanner = async () => {
      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 320, height: 140 },
          },
          async (decodedText) => {
            const cleanVin = cleanVinText(decodedText);

            if (isValidVin(cleanVin)) {
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

  const handleImageOCR = async (file: File) => {
    try {
      setOcrLoading(true);

      const result = await Tesseract.recognize(file, "eng", {
        logger: () => {},
      });

      const text = result.data.text || "";
      const cleanVin = cleanVinText(text);

      if (isValidVin(cleanVin)) {
        onScan(cleanVin);
      } else {
        setManualVin(cleanVin);
        alert("No pude leer el VIN completo. Revísalo y corrígelo manualmente.");
      }
    } catch (error: any) {
      alert("Error leyendo la foto: " + error.message);
    } finally {
      setOcrLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div id="reader" style={{ width: "100%" }} />

      <div className="mt-4 bg-[#0f172a] border border-gray-700 rounded-xl p-4">
        <p className="text-sm text-gray-300 mb-3">
          Si no detecta el VIN, toma una foto clara del VIN del vidrio o de la puerta.
        </p>

        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageOCR(file);
          }}
          className="w-full text-sm text-white mb-3"
        />

        {ocrLoading && (
          <p className="text-yellow-400 font-bold mb-3">
            Leyendo foto del VIN...
          </p>
        )}

        <input
          value={manualVin}
          onChange={(e) => setManualVin(cleanVinText(e.target.value))}
          placeholder="VIN leído o manual"
          maxLength={17}
          className="w-full p-3 rounded bg-black border border-gray-700 text-white font-bold mb-3"
        />

        <button
          type="button"
          onClick={() => submitVin(manualVin)}
          className="w-full bg-green-600 hover:bg-green-700 py-3 rounded font-bold"
        >
          Usar este VIN
        </button>
      </div>
    </div>
  );
}