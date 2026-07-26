import type { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "./ui/button";

const UHID_PATTERN = /^UHID-[A-Z0-9]{10,40}$/;

export function UhidQrScanner({ onDetected }: { onDetected: (uhid: string) => void }) {
  const readerId = `uhid-reader-${useId().replaceAll(":", "")}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanningRef = useRef(false);
  const mountedRef = useRef(true);
  const [starting, setStarting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      if (scanningRef.current) await scanner.stop();
      scanner.clear();
    } catch {
      // The browser may already have released the stream.
    } finally {
      scanningRef.current = false;
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      void stopScanner();
    };
  }, [stopScanner]);

  const startScanner = async () => {
    setStarting(true);
    setError("");
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(readerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1 },
        (decodedText) => {
          const uhid = decodedText.trim().toUpperCase();
          if (!UHID_PATTERN.test(uhid)) {
            setError("This is not a valid Naadi Patient UHID QR code.");
            return;
          }
          void stopScanner().then(() => onDetected(uhid));
        },
        () => undefined,
      );
      scanningRef.current = true;
      if (!mountedRef.current) {
        await stopScanner();
        return;
      }
      setScanning(true);
    } catch {
      await stopScanner();
      setError(
        "Camera access was unavailable. Allow camera permission, use HTTPS or localhost, or enter the UHID manually.",
      );
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => (scanning ? void stopScanner() : void startScanner())}
        disabled={starting}
      >
        {starting ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : scanning ? (
          <CameraOff className="size-4" />
        ) : (
          <Camera className="size-4" />
        )}
        {starting ? "Starting camera…" : scanning ? "Stop scanner" : "Scan Patient QR"}
      </Button>
      <div
        id={readerId}
        className={
          scanning || starting
            ? "overflow-hidden rounded-2xl border border-primary/20 bg-black [&_video]:rounded-2xl"
            : "hidden"
        }
      />
      {error ? (
        <p
          className="rounded-xl bg-warning/10 px-4 py-3 text-sm leading-5 text-warning"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
