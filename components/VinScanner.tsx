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

  const isValidVin = (value: string) => /^[A-HJ-NPR-Z0-9]{17}$/.test(value);

  const cleanVinText = (text: string) => {
    const upper = text.toUpperCase();

    const candidates = upper.match(/[A-HJ-NPR-Z0-9]{8,17}/g) || [];

    const best =
      candidates
        .map((item) => item.replace(/[IOQ]/g, ""))
        .filter((item) => item.length >= 10)
        .sort((a, b) => b.length - a.length)[0] || "";

    return best.slice(0, 17);
  };

  const submitVin = (value: string) => {
    const cleanVin = cleanVinText(value);

    if (!isValidVin(cleanVin)) {
      alert("VIN inválido. Debe tener 17 caracteres y no usar I, O o Q.");
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
      setManualVin("");

      const result = await Tesseract.recognize(file, "eng", {
        logger: () => {},
      });

      const text = result.data.text || "";
      const cleanVin = cleanVinText(text);

      if (isValidVin(cleanVin)) {
        onScan(cleanVin);
      } else {
        alert(
          "No pude leer el VIN completo. Toma la foto más cerca, horizontal y solo al VIN."
        );
      }
    } catch (error: any) {
      alert("Error leyendo la foto: " + error.message);
    } finally {
      setOcrLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="rounded-xl overflow-hidden border border-blue-500 bg-black">
        <div id="reader" style={{ width: "100%" }} />
      </div>

      <div className="mt-4 bg-[#0f172a] border border-blue-500 rounded-2xl p-4">
        <h3 className="text-xl font-bold text-blue-400 mb-2">
          Leer VIN por foto
        </h3>

        <p className="text-gray-300 text-sm mb-4 leading-relaxed">
          Si la cámara no detecta el VIN en vivo, toca el botón y toma una foto
          cerca del VIN. Intenta que solo salga el número, horizontal y con buena
          luz.
        </p>

        <label className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-4 rounded-xl font-bold mb-4 cursor-pointer text-lg">
          📸 Tomar foto del VIN
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageOCR(file);
            }}
            className="hidden"
          />
        </label>

        {ocrLoading && (
          <div className="mb-4 bg-yellow-900/40 border border-yellow-500 rounded-xl p-3">
            <p className="text-yellow-300 font-bold">
              Leyendo foto del VIN...
            </p>
            <p className="text-yellow-100 text-sm">
              Espera unos segundos. No cierres esta pantalla.
            </p>
          </div>
        )}

        <label className="block text-sm text-gray-400 mb-2 font-semibold">
          VIN manual o corregido
        </label>

        <input
          value={manualVin}
          onChange={(e) => setManualVin(cleanVinText(e.target.value))}
          placeholder="Ej: 2LMDJ8JK9EBL12143"
          maxLength={17}
          className="w-full p-4 rounded-xl bg-black border border-gray-700 text-white font-bold text-lg mb-3 uppercase"
        />

        <button
          type="button"
          onClick={() => submitVin(manualVin)}
          className="w-full bg-green-600 hover:bg-green-700 py-4 rounded-xl font-bold text-lg"
        >
          ✅ Usar este VIN
        </button>

        <p className="text-gray-500 text-xs mt-3">
          Tip: si el VIN del vidrio no sale bien, prueba el sticker de la puerta.
        </p>
      </div>
    </div>
  );
}