"use client";

import { useRouter } from "next/navigation";
import { useKeyboardScanner } from "./use-keyboard-scanner";

/** Scanning anywhere in the app (outside text fields) jumps to Barcode Search. */
export function GlobalScannerListener() {
  const router = useRouter();
  useKeyboardScanner((code) => router.push(`/search?code=${encodeURIComponent(code)}`));
  return null;
}
