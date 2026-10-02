"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Eye, Loader2, PackagePlus, Printer, SearchX, SlidersHorizontal } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState, Mono } from "@/components/ui/misc";
import { AdjustStockDialog } from "@/components/inventory/adjust-stock-dialog";
import { ProductThumb } from "@/components/products/product-thumb";
import { StockBadge } from "@/components/products/stock-badge";
import type { LookupProduct } from "@/app/api/products/lookup/route";
import type { BarcodeTypeValue } from "@/lib/barcode";
import { formatMoney } from "@/lib/money";
import { cn, formatDate } from "@/lib/utils";
import { PrintLabelsDialog } from "./print-labels-dialog";
import { CameraScanner } from "./scanner/camera-scanner";
import { ScannerInput, type ScannerInputHandle } from "./scanner/scanner-input";
import type { OnScan } from "./scanner/types";

type LookupResult = { exact: LookupProduct | null; matches: LookupProduct[] };
type State =
  | { kind: "idle" }
  | { kind: "loading"; code: string }
  | { kind: "done"; code: string; result: LookupResult }
  | { kind: "error"; code: string; message: string };

async function requestLookup(code: string): Promise<State> {
  try {
    const res = await fetch(`/api/products/lookup?code=${encodeURIComponent(code)}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Lookup failed (${res.status})`);
    return { kind: "done", code, result: (await res.json()) as LookupResult };
  } catch (e) {
    return { kind: "error", code, message: (e as Error).message };
  }
}

export function BarcodeSearch({ initialCode, currency }: { initialCode: string; currency: string }) {
  const [state, setState] = useState<State>(initialCode ? { kind: "loading", code: initialCode } : { kind: "idle" });
  const [recent, setRecent] = useState<{ code: string; name: string | null }[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const input = useRef<ScannerInputHandle>(null);
  const requestId = useRef(0);

  /** Resolve a code to the next UI state. Ignores responses superseded by a newer scan. */
  const applyLookup = useCallback((code: string) => {
    const id = ++requestId.current;
    // Keep the URL shareable / refresh-safe without a navigation.
    window.history.replaceState(null, "", `/search?code=${encodeURIComponent(code)}`);
    void requestLookup(code).then((next) => {
      if (id !== requestId.current) return; // a newer scan won
      setState(next);
      if (next.kind === "done") {
        setRecent((r) => [{ code, name: next.result.exact?.name ?? null }, ...r.filter((x) => x.code !== code)].slice(0, 8));
      }
    });
  }, []);

  const lookup = (code: string) => {
    setState({ kind: "loading", code });
    applyLookup(code);
  };

  // Code arrived via URL (top-bar search or a scan on another page); state already starts as "loading".
  useEffect(() => {
    if (initialCode) applyLookup(initialCode);
  }, [initialCode, applyLookup]);

  const onScan: OnScan = (code) => lookup(code);
  const refocus = () => setTimeout(() => input.current?.focus(), 0);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-6">
        <Card>
          <CardBody>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ScannerInput ref={input} onScan={onScan} defaultValue={initialCode} className="min-w-0 flex-1" />
              <Button variant="secondary" onClick={() => setCameraOpen(true)} className="shrink-0">
                <Camera />
                Scan with camera
              </Button>
            </div>
            <p className="mt-2.5 text-[12.5px] text-muted">
              Use your phone camera or a USB/Bluetooth scanner, or type a SKU or part of a name.
            </p>
          </CardBody>
        </Card>

        {cameraOpen && <CameraScanner onOpenChange={setCameraOpen} onScan={onScan} />}

        <div aria-live="polite">
          {state.kind === "loading" && (
            <Card>
              <div className="flex items-center gap-3 px-5 py-8 text-sm text-muted">
                <Loader2 className="size-4 animate-spin" /> Looking up <Mono>{state.code}</Mono>…
              </div>
            </Card>
          )}
          {state.kind === "error" && (
            <Card>
              <EmptyState icon={SearchX} title="Search failed" description={`${state.message}. Check the terminal running npm run dev.`} />
            </Card>
          )}
          {state.kind === "done" && state.result.exact && (
            <ProductResult product={state.result.exact} currency={currency} onDialogClosed={refocus} onAdjusted={() => lookup(state.code)} />
          )}
          {state.kind === "done" && !state.result.exact && state.result.matches.length > 0 && (
            <Card className="overflow-hidden">
              <div className="border-b border-line px-5 py-3 text-sm text-ink-2">
                No exact barcode match for <Mono>{state.code}</Mono>. Similar products:
              </div>
              <ul className="divide-y divide-line">
                {state.result.matches.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => lookup(p.barcode)}
                      className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-canvas/60"
                    >
                      <ProductThumb image={p.image} name={p.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{p.name}</span>
                        <Mono className="text-[12px] text-muted">{p.sku} · {p.barcode}</Mono>
                      </span>
                      <StockBadge stock={p.stock} minStock={p.minStock} />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {state.kind === "done" && !state.result.exact && state.result.matches.length === 0 && (
            <Card>
              <EmptyState
                icon={SearchX}
                title={`No product with barcode ${state.code}`}
                description="This code isn't assigned to any product yet."
                action={
                  <Link href={`/products/new?barcode=${encodeURIComponent(state.code)}`} className={buttonVariants()}>
                    <PackagePlus />
                    Add product with this barcode
                  </Link>
                }
              />
            </Card>
          )}
          {state.kind === "idle" && (
            <Card>
              <EmptyState icon={SearchX} title="Ready to scan" description="Scan a barcode or type one above and press Enter." />
            </Card>
          )}
        </div>
      </div>

      <Card className="self-start">
        <div className="border-b border-line px-5 py-3 text-[13px] font-medium text-ink-2">Recent scans</div>
        {recent.length === 0 ? (
          <p className="px-5 py-4 text-[13px] text-muted">Scans from this session appear here.</p>
        ) : (
          <ul className="py-1">
            {recent.map((r) => (
              <li key={r.code}>
                <button type="button" onClick={() => lookup(r.code)} className="w-full px-5 py-2 text-left hover:bg-canvas/60">
                  <Mono className="block">{r.code}</Mono>
                  <span className={cn("block truncate text-[12.5px]", r.name ? "text-ink-2" : "text-muted")}>{r.name ?? "Not found"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ProductResult({
  product,
  currency,
  onDialogClosed,
  onAdjusted,
}: {
  product: LookupProduct;
  currency: string;
  onDialogClosed: () => void;
  onAdjusted: () => void;
}) {
  const [dialog, setDialog] = useState<null | "adjust" | "print">(null);
  const close = (o: boolean, which: "adjust" | "print") => {
    setDialog(o ? which : null);
    if (!o) onDialogClosed();
  };
  const details: [string, React.ReactNode][] = [
    ["SKU", <Mono key="s">{product.sku}</Mono>],
    ["Barcode", <Mono key="b">{product.barcode}</Mono>],
    ["Category", product.category ?? "Uncategorized"],
    ["Price", <span key="p" className="num">{formatMoney(product.sellingPrice, currency)}</span>],
    ["Last updated", formatDate(product.updatedAt)],
  ];

  return (
    <Card className="overflow-hidden border-accent/40">
      <div className="flex flex-wrap items-start gap-5 p-5">
        <ProductThumb image={product.image} name={product.name} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-ink">{product.name}</h2>
          {product.brand && <p className="text-[13px] text-muted">{product.brand}</p>}
          <div className="mt-3 flex items-baseline gap-3">
            <span className="num text-[32px] font-semibold leading-none tracking-[-0.02em] text-ink">{product.stock}</span>
            <span className="text-sm text-muted">{product.unit} in stock</span>
            <StockBadge stock={product.stock} minStock={product.minStock} />
          </div>
          <dl className="mt-4 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {details.map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="w-28 shrink-0 text-muted">{k}</dt>
                <dd className="text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-line bg-canvas/50 px-5 py-3">
        <Button onClick={() => setDialog("adjust")}><SlidersHorizontal />Adjust stock</Button>
        <Link href={`/products/${product.id}`} className={buttonVariants({ variant: "secondary" })}><Eye />View product</Link>
        <Button variant="secondary" onClick={() => setDialog("print")}><Printer />Print barcode</Button>
      </div>
      <AdjustStockDialog product={product} open={dialog === "adjust"} onOpenChange={(o) => close(o, "adjust")} onAdjusted={onAdjusted} />
      <PrintLabelsDialog
        product={{ ...product, barcodeType: product.barcodeType as BarcodeTypeValue }}
        currency={currency}
        open={dialog === "print"}
        onOpenChange={(o) => close(o, "print")}
      />
    </Card>
  );
}
