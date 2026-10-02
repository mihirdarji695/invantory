"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { OnScan } from "./types";

export function CameraScanner({
  onOpenChange,
  onScan,
}: {
  onOpenChange: (open: boolean) => void;
  onScan: OnScan;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("Starting camera…");
  const [error, setError] = useState<string | null>(null);
  const finishScan = useEffectEvent((code: string) => {
    onScan(code, "camera");
    onOpenChange(false);
  });

  useEffect(() => {
    let cancelled = false;
    let stopScanning: (() => void) | undefined;

    async function startCamera() {
      try {
        if (!window.isSecureContext) {
          throw new Error("Camera access requires HTTPS. Open this app over HTTPS or on the same phone using localhost.");
        }
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser does not support camera access.");

        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled || !video.current) return;

        const reader = new BrowserMultiFormatReader();
        setStatus("Point the camera at a barcode.");
        const controls = await reader.decodeFromVideoDevice(undefined, video.current, (result, _decodeError, scannerControls) => {
          if (cancelled || !result) return;
          const code = result.getText().trim();
          if (!code) return;
          cancelled = true;
          scannerControls.stop();
          finishScan(code);
        });

        if (cancelled) controls.stop();
        else stopScanning = () => controls.stop();
      } catch (cause) {
        if (cancelled) return;
        const message = cause instanceof Error ? cause.message : "Unable to start the camera.";
        setError(message);
      }
    }

    void startCamera();
    return () => {
      cancelled = true;
      stopScanning?.();
    };
  }, []);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent title="Scan with camera" description="Allow camera access and center the barcode in view." className="max-w-xl">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-md bg-ink">
            <video ref={video} autoPlay muted playsInline className="aspect-[4/3] w-full object-cover" />
          </div>
          <p aria-live="polite" className={error ? "text-sm text-danger" : "text-sm text-muted"}>
            {error ?? status}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}