import { Check, Copy, Download, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

export function UhidQrCode({ uhid }: { uhid: string }) {
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setError("");
    void QRCode.toDataURL(uhid, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#123f3a",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (active) setImageUrl(url);
      })
      .catch(() => {
        if (active) setError("The UHID QR code could not be generated.");
      });
    return () => {
      active = false;
    };
  }, [uhid]);

  const copyUhid = async () => {
    await navigator.clipboard.writeText(uhid);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-primary-soft/35 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-white text-primary shadow-sm">
            <QrCode className="size-5" />
          </div>
          <div>
            <h2 className="font-bold text-primary-ink">Your UHID QR code</h2>
            <p className="mt-0.5 text-xs text-muted">
              A Hospital can scan this code to start the consent-based linking flow.
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center p-5 text-center sm:p-7">
        {imageUrl ? (
          <div className="rounded-[1.75rem] border border-border bg-white p-3 shadow-sm">
            <img
              src={imageUrl}
              alt={`QR code for Patient UHID ${uhid}`}
              className="size-56 sm:size-64"
            />
          </div>
        ) : error ? (
          <div className="grid size-56 place-items-center rounded-3xl bg-warning/10 px-6 text-sm text-warning">
            {error}
          </div>
        ) : (
          <div
            className="size-56 animate-pulse rounded-3xl bg-primary-soft sm:size-64"
            aria-label="Generating UHID QR code"
            role="status"
          />
        )}

        <p className="mt-5 break-all font-mono text-sm font-bold text-primary-ink">{uhid}</p>
        <p className="mt-2 max-w-sm text-xs leading-5 text-muted">
          This QR contains only your UHID. The Hospital must still confirm your OTP before access is
          linked.
        </p>

        <div className="mt-5 flex w-full flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => void copyUhid()}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy UHID"}
          </Button>
          {imageUrl ? (
            <Button asChild className="flex-1">
              <a href={imageUrl} download={`${uhid}.png`}>
                <Download className="size-4" />
                Download QR
              </a>
            </Button>
          ) : (
            <Button type="button" className="flex-1" disabled>
              <Download className="size-4" />
              Download QR
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
