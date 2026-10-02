"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Download, FileCode2, Loader2, Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Label, Select } from "@/components/ui/input";
import { generateBarcodeAction } from "@/lib/actions/products";
import { BARCODE_TYPES, BARCODE_TYPE_LABEL, validateBarcode, type BarcodeTypeValue } from "@/lib/barcode";
import { formatMoney } from "@/lib/money";
import { BarcodeLabel } from "./label";
import { LabelQuantity } from "./label-quantity";
import { PrintSheet } from "./print-sheet";
import { downloadBlob, labelToPngBlob, labelToSvg, safeFileName, type LabelContent } from "./render";

export type GeneratorProduct = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  barcodeType: BarcodeTypeValue;
  sellingPrice: number;
};

const SHEET_SIZE = 21;

export function BarcodeGenerator({
  products,
  initialProductId,
  currency,
  defaultType,
}: {
  products: GeneratorProduct[];
  initialProductId?: string;
  currency: string;
  defaultType: BarcodeTypeValue;
}) {
  const initial = products.find((p) => p.id === initialProductId);
  const [productId, setProductId] = useState(initial?.id ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [value, setValue] = useState(initial?.barcode ?? "");
  const [type, setType] = useState<BarcodeTypeValue>(initial?.barcodeType ?? defaultType);
  const [price, setPrice] = useState<number | null>(initial?.sellingPrice ?? null);
  const [showPrice, setShowPrice] = useState(Boolean(initial));
  const [quantity, setQuantity] = useState(1);
  const [generating, startGenerate] = useTransition();
  const [exporting, setExporting] = useState(false);

  const selected = products.find((p) => p.id === productId);
  const check = validateBarcode(value, type);
  const label: LabelContent = {
    name: name.trim(),
    sku: sku.trim(),
    barcode: value.trim(),
    barcodeType: type,
    price: showPrice && price !== null ? formatMoney(price, currency) : null,
  };
  const differsFromSaved = selected && (selected.barcode !== label.barcode || selected.barcodeType !== type);

  function pickProduct(id: string) {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p) {
      setName(p.name);
      setSku(p.sku);
      setValue(p.barcode);
      setType(p.barcodeType);
      setPrice(p.sellingPrice);
      setShowPrice(true);
    } else {
      setPrice(null);
      setShowPrice(false);
    }
  }

  function generate() {
    startGenerate(async () => {
      const res = await generateBarcodeAction(type);
      if (res.ok && res.data) setValue(res.data.barcode);
      else if (!res.ok) toast.error(res.message);
    });
  }

  async function exportAs(kind: "png" | "svg") {
    if (!check.ok) return toast.error(check.error);
    setExporting(true);
    try {
      const file = `${safeFileName(label.sku || label.name || "barcode")}-${label.barcode}`;
      if (kind === "svg") downloadBlob(new Blob([labelToSvg(label)], { type: "image/svg+xml" }), `${file}.svg`);
      else downloadBlob(await labelToPngBlob(label), `${file}.png`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      <Card className="self-start">
        <CardHeader title="Label details" />
        <CardBody className="space-y-4">
          <Field id="gen-product" label="Product" hint="Pick a saved product, or fill in the fields for a custom label.">
            <Select value={productId} onChange={(e) => pickProduct(e.target.value)}>
              <option value="">Custom label</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} · {p.sku}</option>
              ))}
            </Select>
          </Field>
          <Field id="gen-name" label="Product name">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </Field>
          <Field id="gen-sku" label="SKU">
            <Input value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} className="font-mono" maxLength={64} />
          </Field>
          <Field id="gen-type" label="Barcode type">
            <Select value={type} onChange={(e) => setType(e.target.value as BarcodeTypeValue)}>
              {BARCODE_TYPES.map((t) => <option key={t} value={t}>{BARCODE_TYPE_LABEL[t]}</option>)}
            </Select>
          </Field>
          <Field id="gen-value" label="Barcode value" error={value && !check.ok ? check.error : undefined}>
            <Input value={value} onChange={(e) => setValue(e.target.value)} className="font-mono tracking-wide" autoComplete="off" spellCheck={false} />
          </Field>
          {differsFromSaved && (
            <p className="rounded-md bg-warn-soft px-3 py-2 text-[12.5px] text-warn">
              This differs from the barcode saved on {selected.name}. Labels will print the new value, but the product keeps its saved barcode.{" "}
              <Link href={`/products/${selected.id}/edit`} className="font-medium underline">Edit product</Link> to change it.
            </p>
          )}
          {!selected && check.ok && (
            <p className="text-[12.5px] text-muted">
              New code?{" "}
              <Link href={`/products/new?barcode=${encodeURIComponent(label.barcode)}`} className="font-medium text-accent hover:underline">
                Create a product with this barcode
              </Link>
            </p>
          )}
          <Button variant="secondary" className="w-full" onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Generate
          </Button>
        </CardBody>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Preview"
            description="Actual print size is 63.5 × 38.1 mm. Shown enlarged."
            action={
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => exportAs("png")} disabled={!check.ok || exporting}><Download />PNG</Button>
                <Button variant="secondary" size="sm" onClick={() => exportAs("svg")} disabled={!check.ok || exporting}><FileCode2 />SVG</Button>
              </div>
            }
          />
          <CardBody className="flex min-h-72 items-center justify-center bg-canvas/60">
            {/* zoom keeps the label's real mm layout while enlarging it on screen */}
            <div style={{ zoom: 1.7 }} className="shadow-[0_1px_2px_rgba(23,32,27,0.12),0_8px_24px_-12px_rgba(23,32,27,0.25)]">
              <BarcodeLabel label={{ ...label, name: label.name || "Product name", sku: label.sku || "—" }} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Print labels" description="A4 sheet, 3 × 7 labels. Only the labels are printed." />
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-2">
                <Label>Quantity to print</Label>
                <LabelQuantity value={quantity} onChange={setQuantity} id="gen-qty" />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-ink-2">
                  <input type="checkbox" className="size-4 accent-accent" checked={showPrice} disabled={price === null} onChange={(e) => setShowPrice(e.target.checked)} />
                  Show price
                </label>
                <Button onClick={() => window.print()} disabled={!check.ok}>
                  <Printer />
                  Print labels
                </Button>
              </div>
            </div>
            {check.ok && (
              <div className="overflow-x-auto rounded-md border border-line bg-canvas/60 p-4">
                <div style={{ zoom: 0.55 }} className="label-grid mx-auto w-max bg-white">
                  {Array.from({ length: Math.min(quantity, SHEET_SIZE) }, (_, i) => (
                    <BarcodeLabel key={i} label={label} outline />
                  ))}
                </div>
                {quantity > SHEET_SIZE && (
                  <p className="mt-3 text-center text-[12.5px] text-muted">
                    First sheet shown · {quantity} labels over {Math.ceil(quantity / SHEET_SIZE)} sheets
                  </p>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {check.ok && <PrintSheet label={label} quantity={quantity} />}
    </div>
  );
}
