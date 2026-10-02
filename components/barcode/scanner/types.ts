/**
 * Scanner abstraction.
 *
 * Every barcode source reports codes through the same callback, so the rest of
 * the app doesn't care where a code came from. Version 1 ships keyboard-wedge
 * support (USB/Bluetooth scanners type the code and press Enter).
 *
 * To add camera scanning later, create e.g. `camera-scanner.tsx` that uses a
 * library such as @zxing/browser or the BarcodeDetector API and calls
 * `onScan(code, "camera")` — no other component needs to change.
 */
export type ScanSource = "keyboard" | "scanner" | "camera";
export type OnScan = (code: string, source: ScanSource) => void;

export const SCANNER_DEFAULTS = {
  /** Scanners type much faster than people; gaps above this are treated as human typing. */
  maxKeyIntervalMs: 50,
  /** Ignore bursts shorter than this (avoids treating fast typing of short words as a scan). */
  minLength: 4,
} as const;
