"use client";

import { useEffect, useRef, useState } from "react";

import {
  CameraEnhancer,
  CameraView,
  CaptureVisionRouter,
  LicenseManager,
} from "dynamsoft-capture-vision-bundle";

type VinScannerProps = {
  onScan: (vin: string) => void;
};

const LICENSE_KEY = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMTA1NTc5MzQzLU1UQTFOVGM1TXpRekxYZGxZaTFVY21saGJGQnliMm8iLCJtYWluU2VydmVyVVJMIjoiaHR0cHM6Ly9tZGxzLmR5bmFtc29mdG9ubGluZS5jb20vIiwib3JnYW5pemF0aW9uSUQiOiIxMDU1NzkzNDMiLCJzdGFuZGJ5U2VydmVyVVJMIjoiaHR0cHM6Ly9zZGxzLmR5bmFtc29mdG9ubGluZS5jb20vIiwiY2hlY2tDb2RlIjoxNDk5NDUyOTUxfQ==";

export default function VinScanner({
  onScan,
}: VinScannerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let enhancer: any;
    let router: any;

    const startScanner = async () => {
      try {
        await LicenseManager.initLicense(
          LICENSE_KEY
        );

        const view =
          await CameraView.createInstance();

        enhancer =
          await CameraEnhancer.createInstance(
            view
          );

        router =
          await CaptureVisionRouter.createInstance();

        if (containerRef.current) {
          containerRef.current.innerHTML = "";

          containerRef.current.appendChild(
            view.getUIElement()
          );
        }

        await enhancer.open();

        router.setInput(enhancer);

        router.addResultReceiver({
          onCapturedResultReceived: (
            result: any
          ) => {
            const items =
              result?.items || [];

            for (const item of items) {
              const text = item?.text
                ?.toUpperCase()
                ?.replace(/O/g, "0")
                ?.replace(/I/g, "1")
                ?.replace(/Q/g, "")
                ?.replace(
                  /[^A-Z0-9]/g,
                  ""
                );

              const vin =
                text?.match(
                  /[A-HJ-NPR-Z0-9]{17}/
                );

              if (vin) {
                navigator.vibrate?.(100);

                onScan(vin[0]);

                enhancer.close();

                break;
              }
            }
          },
        });

        await router.startCapturing(
          "ReadVIN"
        );

        setLoading(false);
      } catch (error) {
        console.error(error);

        alert(
          "Error iniciando scanner VIN."
        );
      }
    };

    startScanner();

    return () => {
      enhancer?.close();
    };
  }, [onScan]);

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="rounded-2xl overflow-hidden border border-blue-500 bg-black min-h-[320px]"
      />

      {loading && (
        <div className="mt-4 bg-yellow-900/40 border border-yellow-500 rounded-xl p-4">
          <p className="text-yellow-300 font-bold">
            Iniciando scanner VIN...
          </p>
        </div>
      )}

      <div className="mt-4 bg-[#0f172a] border border-blue-500 rounded-2xl p-4">
        <h3 className="text-2xl font-bold text-blue-400 mb-2">
          🚗 Scanner VIN Pro
        </h3>

        <p className="text-gray-300 text-sm">
          Apunta directamente al VIN del
          vidrio o sticker.
        </p>
      </div>
    </div>
  );
}