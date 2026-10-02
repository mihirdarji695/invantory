"use client";

import { toCanvas, toSVG } from "bwip-js/browser";
import { BWIP_ENCODER, validateBarcode, type BarcodeTypeValue } from "@/lib/barcode";

export type RenderResult = { ok: true; svg: string } | { ok: false; error: string };

/** Render just the bars as an SVG string (scales to any size via viewBox). */
export function renderBarcodeSvg(value: string, type: BarcodeTypeValue): RenderResult {
  const check = validateBarcode(value, type);
  if (!check.ok) return { ok: false, error: check.error };
  try {
    const svg = toSVG({
      bcid: BWIP_ENCODER[type],
      text: check.value,
      scale: 2,
      height: 14,
      includetext: false,
      paddingwidth: 8, // quiet zone so scanners can find the start/stop bars
    });
    return { ok: true, svg };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.replace(/^bwipp\.\w+#\d+:\s*/, "") : "Could not render barcode." };
  }
}

export type LabelContent = {
  name: string;
  sku: string;
  barcode: string;
  barcodeType: BarcodeTypeValue;
  price?: string | null; // pre-formatted, e.g. "₹549.00"
};

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);
}

function truncate(s: string, max: number) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** A complete, self-contained label as SVG (for "Download SVG"). */
export function labelToSvg(label: LabelContent): string {
  const bars = renderBarcodeSvg(label.barcode, label.barcodeType);
  if (!bars.ok) throw new Error(bars.error);
  const vb = /viewBox="([^"]+)"/.exec(bars.svg)?.[1] ?? "0 0 100 40";
  const inner = bars.svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

  const W = 400;
  const hasPrice = Boolean(label.price);
  const H = hasPrice ? 250 : 226;
  const font = "'IBM Plex Sans', Arial, sans-serif";
  const mono = "'IBM Plex Mono', 'Courier New', monospace";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="${W / 2}" y="34" text-anchor="middle" font-family="${font}" font-size="20" font-weight="600" fill="#000">${escapeXml(truncate(label.name, 32))}</text>
  <text x="${W / 2}" y="58" text-anchor="middle" font-family="${mono}" font-size="14" fill="#000">SKU: ${escapeXml(label.sku)}</text>
  <svg x="40" y="72" width="${W - 80}" height="100" viewBox="${vb}" preserveAspectRatio="xMidYMid meet">${inner}</svg>
  <text x="${W / 2}" y="198" text-anchor="middle" font-family="${mono}" font-size="17" letter-spacing="2" fill="#000">${escapeXml(label.barcode)}</text>
  ${hasPrice ? `<text x="${W / 2}" y="230" text-anchor="middle" font-family="${font}" font-size="17" font-weight="600" fill="#000">${escapeXml(label.price!)}</text>` : ""}
</svg>`;
}

/** A complete label drawn on a high-resolution canvas (for "Download PNG"). */
export async function labelToPngBlob(label: LabelContent): Promise<Blob> {
  const check = validateBarcode(label.barcode, label.barcodeType);
  if (!check.ok) throw new Error(check.error);
  await document.fonts?.ready;

  const bars = document.createElement("canvas");
  toCanvas(bars, {
    bcid: BWIP_ENCODER[label.barcodeType],
    text: check.value,
    scale: 6,
    height: 14,
    includetext: false,
    paddingwidth: 8,
    backgroundcolor: "FFFFFF",
  });

  const S = 3; // output scale (crisp when printed)
  const W = 400 * S;
  const H = (label.price ? 250 : 226) * S;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";

  ctx.font = `600 ${20 * S}px "IBM Plex Sans", Arial, sans-serif`;
  ctx.fillText(truncate(label.name, 32), W / 2, 34 * S);
  ctx.font = `${14 * S}px "IBM Plex Mono", "Courier New", monospace`;
  ctx.fillText(`SKU: ${label.sku}`, W / 2, 58 * S);

  const boxW = W - 80 * S;
  const boxH = 100 * S;
  const ratio = Math.min(boxW / bars.width, boxH / bars.height);
  const bw = bars.width * ratio;
  const bh = bars.height * ratio;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bars, (W - bw) / 2, 72 * S + (boxH - bh) / 2, bw, bh);

  ctx.font = `${17 * S}px "IBM Plex Mono", "Courier New", monospace`;
  ctx.fillText(label.barcode.split("").join(" "), W / 2, 198 * S);
  if (label.price) {
    ctx.font = `600 ${17 * S}px "IBM Plex Sans", Arial, sans-serif`;
    ctx.fillText(label.price, W / 2, 230 * S);
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create PNG."))), "image/png"),
  );
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFileName(s: string) {
  return s.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "barcode";
}
