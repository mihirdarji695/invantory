"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { SCANNER_DEFAULTS, type OnScan } from "./types";

function isEditable(el: Element | null) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el as HTMLElement).isContentEditable;
}

/**
 * Listens for keyboard-wedge scanner bursts anywhere on the page *while no
 * text field is focused*. A burst is a run of rapid keystrokes ending in Enter.
 */
export function useKeyboardScanner(onScan: OnScan, { enabled = true } = {}) {
  const buffer = useRef("");
  const last = useRef(0);
  const emitScan = useEffectEvent(onScan);

  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isEditable(document.activeElement)) return;
      if (document.querySelector("[role=dialog], [role=alertdialog]")) return;

      const now = performance.now();
      if (now - last.current > SCANNER_DEFAULTS.maxKeyIntervalMs) buffer.current = "";
      last.current = now;

      if (e.key === "Enter") {
        const code = buffer.current;
        buffer.current = "";
        if (code.length >= SCANNER_DEFAULTS.minLength) {
          e.preventDefault();
          emitScan(code, "scanner");
        }
        return;
      }
      if (e.key.length === 1) buffer.current += e.key;
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
