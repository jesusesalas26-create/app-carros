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
    const upper = text.toUpperCase().replace(/[IOQ]/g, "");
    const candidates = upper.match(/[A-HJ-NPR-Z0-9]{10,17}/g) || [];

    const best =
      candidates
        .map((item) => item.replace(/[^A-HJ-NPR-Z0-9]/g, ""))
        .filter((item) => item.length >= 10)
        .sort((a, b) => b.length - a.length)[0] || "";

    return best.slice(0, 17);
  };

  const submitVin = (value: string) => {
    const cleanVin = cleanVinText(value);

    if (!isValidVin(cleanVin)) {
      alert("VIN inválido. Debe tener 17 caracteres.");
      setManualVin(cleanVin);
      return;
    }

    onScan(cleanVin);
  };

  const stopScanner = async () => {
    if (scannerRef.current && isRunningRef.current) {
      isRunningRef.current = false;
      await scannerRef.current.stop().catch(() => {});
    }
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
              await stopScanner();
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
      stopScanner();
    };
  }, [onScan]);

  const prepareImageFast = async (file: File) => {
    const bitmap = await createImageBitmap(file);

    const shouldRotate = bitmap.height > bitmap.width;
    const maxSize = 1200;

    const originalWidth = shouldRotate ? bitmap.height : bitmap.width;
    const originalHeight = shouldRotate ? bitmap.width : bitmap.height;

    const scale = Math.min(1, maxSize / Math.max(originalWidth, originalHeight));

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = Math.round(originalWidth * scale);
    canvas.height = Math.round(originalHeight * scale);

    if (!ctx) throw new Error("No se pudo procesar la imagen");

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.filter = "contrast(160%) brightness(115%) grayscale(100%)";

    if (shouldRotate) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(
        bitmap,
        (-bitmap.width * scale) / 2,
        (-bitmap.height * scale) / 2,
        bitmap.width * scale,
        bitmap.height * scale
      );
    } else {
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    }

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("No se pudo crear la imagen"));
        },
        "image/jpeg",
        0.75
      );
    });
  };

  const handleImageOCR = async (file: File) => {
    try {
      setOcrLoading(true);
      setManualVin("");

      const fastImage = await prepareImageFast(file);

      const result = await Tesseract.recognize(fastImage, "eng", {
        logger: () => {},
      });

      const rawText = result.data.text || "";
      const cleanVin = cleanVinText(rawText);

      if (isValidVin(cleanVin)) {
        onScan(cleanVin);
        await stopScanner();
      } else {
        alert("No lo leyó completo. Escríbelo manual rápido o toma foto más cerca.");
      }
    } catch (error: any) {
      alert("Error leyendo foto: " + error.message);
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
          Leer VIN rápido
        </h3>

        <p className="text-gray-300 text-sm mb-4 leading-relaxed">
          En subasta: primero prueba el código de la puerta. Si es texto, toma
          foto cerca del VIN. Si falla, escríbelo manual.
        </p>

        <label className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-4 rounded-xl font-bold mb-4 cursor-pointer text-lg">
          📸 Tomar foto rápida del VIN
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
              Leyendo VIN rápido...
            </p>
            <p className="text-yellow-100 text-sm">
              Si tarda mucho, ciérralo y escríbelo manual.
            </p>
          </div>
        )}

        <label className="block text-sm text-gray-400 mb-2 font-semibold">
          VIN manual
        </label>

        <input
          value={manualVin}
          onChange={(e) => setManualVin(cleanVinText(e.target.value))}
          placeholder="Ej: 5YJSA1E26HF000337"
          maxLength={17}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
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
          Tip rápido: el sticker de la puerta suele leer mejor que el vidrio.
        </p>
      </div>
    </div>
  );
}