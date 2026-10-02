"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ImagePlus, Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { BarcodeLabel } from "@/components/barcode/label";
import { BARCODE_TYPES, BARCODE_TYPE_LABEL, type BarcodeTypeValue } from "@/lib/barcode";
import { checkBarcodeAction, createProductAction, generateBarcodeAction, updateProductAction } from "@/lib/actions/products";
import { formatMoney, minorToInput, toMinor } from "@/lib/money";
import { cn } from "@/lib/utils";

export type ProductFormValues = {
  id: string;
  name: string;
  sku: string;
  categoryId: string | null;
  brand: string | null;
  description: string | null;
  stock: number;
  minStock: number;
  maxStock: number | null;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  barcode: string;
  barcodeType: BarcodeTypeValue;
  image: string | null;
};

type Props = {
  product?: ProductFormValues;
  categories: { id: string; name: string }[];
  defaults: { barcodeType: BarcodeTypeValue; unit: string; minStock: number; currency: string };
  initialBarcode?: string;
};

const UNITS = ["pcs", "bottle", "box", "pack", "set", "tube", "jar", "ml", "g", "kg", "l"];

export function ProductForm({ product, categories, defaults, initialBarcode }: Props) {
  const router = useRouter();
  const isEdit = Boolean(product);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [sellingPrice, setSellingPrice] = useState(product ? minorToInput(product.sellingPrice) : "");
  const [costPrice, setCostPrice] = useState(product ? minorToInput(product.costPrice) : "");
  const [barcodeType, setBarcodeType] = useState<BarcodeTypeValue>(product?.barcodeType ?? defaults.barcodeType);
  const [barcode, setBarcode] = useState(product?.barcode ?? initialBarcode ?? "");
  // Last server answer for a (value, type) pair. Status is derived from it during render.
  const [checked, setChecked] = useState<{ key: string; ok: boolean; message?: string } | null>(null);
  const [generating, setGenerating] = useState(false);

  const [imagePreview, setImagePreview] = useState<string | null>(product?.image ? `/api/images/${product.image}` : null);
  const [removeImage, setRemoveImage] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const trimmedBarcode = barcode.trim();
  const checkKey = `${barcodeType}:${trimmedBarcode}`;
  const isSavedBarcode = isEdit && trimmedBarcode === product?.barcode && barcodeType === product?.barcodeType;
  const barcodeStatus: { state: "idle" | "checking" | "ok" | "error"; message?: string } = !trimmedBarcode
    ? { state: "idle" }
    : isSavedBarcode
      ? { state: "ok", message: "Current barcode" }
      : checked?.key === checkKey
        ? checked.ok
          ? { state: "ok", message: "Available" }
          : { state: "error", message: checked.message }
        : { state: "checking" };

  // Debounced live validation + duplicate check for the barcode.
  useEffect(() => {
    if (!trimmedBarcode || isSavedBarcode) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await checkBarcodeAction(trimmedBarcode, barcodeType, product?.id);
      if (!cancelled) setChecked({ key: `${barcodeType}:${trimmedBarcode}`, ok: res.ok, message: res.error });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [trimmedBarcode, barcodeType, isSavedBarcode, product?.id]);

  async function generate() {
    setGenerating(true);
    const res = await generateBarcodeAction(barcodeType);
    setGenerating(false);
    if (res.ok && res.data) {
      setBarcode(res.data.barcode);
      setErrors((e) => ({ ...e, barcode: "" }));
    } else if (!res.ok) toast.error(res.message);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (removeImage) form.set("removeImage", "1");
    if (barcodeStatus.state === "error") {
      setErrors((x) => ({ ...x, barcode: barcodeStatus.message ?? "Invalid barcode." }));
      document.getElementById("barcode")?.focus();
      return;
    }
    startTransition(async () => {
      const res = isEdit ? await updateProductAction(product!.id, form) : await createProductAction(form);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.message);
        const first = res.fieldErrors && Object.keys(res.fieldErrors)[0];
        if (first) document.getElementById(first)?.focus();
        return;
      }
      toast.success(res.message ?? "Saved.");
      router.push(`/products/${res.data!.id}`);
    });
  }

  const err = (k: string) => errors[k] || undefined;
  const clear = (k: string) => {
    if (errors[k]) setErrors((x) => ({ ...x, [k]: "" }));
  };

  const cost = toMinor(costPrice || "0");
  const sell = toMinor(sellingPrice || "0");
  const margin = sell > 0 && !Number.isNaN(cost) && !Number.isNaN(sell) ? ((sell - cost) / sell) * 100 : null;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <Card>
          <CardHeader title="Basic information" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field id="name" label="Product name" error={err("name")} required className="sm:col-span-2">
              <Input name="name" value={name} onChange={(e) => { setName(e.target.value); clear("name"); }} autoFocus={!isEdit} maxLength={120} />
            </Field>
            <Field id="sku" label="SKU" error={err("sku")} hint="Your internal code. Saved in capitals." required>
              <Input name="sku" value={sku} onChange={(e) => { setSku(e.target.value.toUpperCase()); clear("sku"); }} className="font-mono" maxLength={64} />
            </Field>
            <Field
              id="categoryId"
              label="Category"
              error={err("categoryId")}
              hint={categories.length === 0 ? <Link href="/categories" className="text-accent hover:underline">Add categories first</Link> : undefined}
            >
              <Select name="categoryId" defaultValue={product?.categoryId ?? ""}>
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field id="brand" label="Brand" error={err("brand")}>
              <Input name="brand" defaultValue={product?.brand ?? ""} maxLength={80} />
            </Field>
            <Field id="description" label="Description" error={err("description")} className="sm:col-span-2">
              <Textarea name="description" defaultValue={product?.description ?? ""} rows={3} maxLength={2000} />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Inventory"
            description={isEdit ? "Stock changes go through Adjust stock so every change is recorded." : undefined}
          />
          <CardBody className="grid gap-4 sm:grid-cols-4">
            <Field id="stock" label="Current stock" error={err("stock")} hint={isEdit ? "Use Adjust stock" : "Recorded as opening stock"}>
              <Input name="stock" type="number" min={0} step={1} inputMode="numeric" className="num" defaultValue={product?.stock ?? 0} disabled={isEdit} />
            </Field>
            <Field id="minStock" label="Minimum stock" error={err("minStock")} hint="Low-stock alert level">
              <Input name="minStock" type="number" min={0} step={1} inputMode="numeric" className="num" defaultValue={product?.minStock ?? defaults.minStock} />
            </Field>
            <Field id="maxStock" label="Maximum stock" error={err("maxStock")} hint="Optional">
              <Input name="maxStock" type="number" min={0} step={1} inputMode="numeric" className="num" defaultValue={product?.maxStock ?? ""} />
            </Field>
            <Field id="unit" label="Unit" error={err("unit")} required>
              <Input name="unit" list="unit-options" defaultValue={product?.unit ?? defaults.unit} maxLength={20} />
            </Field>
            <datalist id="unit-options">
              {UNITS.map((u) => <option key={u} value={u} />)}
            </datalist>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Pricing" description={`Prices in ${defaults.currency}`} />
          <CardBody className="grid gap-4 sm:grid-cols-3">
            <Field id="costPrice" label="Cost price" error={err("costPrice")}>
              <Input name="costPrice" type="number" min={0} step="0.01" inputMode="decimal" className="num" placeholder="0.00" value={costPrice} onChange={(e) => { setCostPrice(e.target.value); clear("costPrice"); }} />
            </Field>
            <Field id="sellingPrice" label="Selling price" error={err("sellingPrice")}>
              <Input name="sellingPrice" type="number" min={0} step="0.01" inputMode="decimal" className="num" placeholder="0.00" value={sellingPrice} onChange={(e) => { setSellingPrice(e.target.value); clear("sellingPrice"); }} />
            </Field>
            <div className="flex flex-col justify-end pb-2 text-[13px] text-muted">
              {margin !== null && (
                <span>
                  Margin <span className={cn("num font-medium", margin < 0 ? "text-danger" : "text-ink")}>{margin.toFixed(1)}%</span>
                  {" · "}
                  <span className="num">{formatMoney(sell - cost, defaults.currency)}</span> per unit
                </span>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader title="Barcode" />
          <CardBody className="space-y-4">
            <Field id="barcodeType" label="Barcode type" error={err("barcodeType")}>
              <Select name="barcodeType" value={barcodeType} onChange={(e) => setBarcodeType(e.target.value as BarcodeTypeValue)}>
                {BARCODE_TYPES.map((t) => (
                  <option key={t} value={t}>{BARCODE_TYPE_LABEL[t]}</option>
                ))}
              </Select>
            </Field>

            <div className="space-y-1.5">
              <Field
                id="barcode"
                label="Barcode value"
                required
                error={err("barcode") ?? (barcodeStatus.state === "error" ? barcodeStatus.message : undefined)}
                hint="Generate one, or type/scan an existing barcode."
              >
                <Input
                  name="barcode"
                  value={barcode}
                  className="font-mono tracking-wide"
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => { setBarcode(e.target.value); clear("barcode"); }}
                  // Scanners press Enter after the code — don't submit the whole form.
                  onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                />
              </Field>
              <div className="flex h-5 items-center text-[12.5px]" aria-live="polite">
                {barcodeStatus.state === "checking" && <span className="flex items-center gap-1.5 text-muted"><Loader2 className="size-3 animate-spin" />Checking…</span>}
                {barcodeStatus.state === "ok" && <span className="flex items-center gap-1.5 text-ok"><Check className="size-3.5" />{barcodeStatus.message}</span>}
              </div>
            </div>

            <Button variant="secondary" className="w-full" onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Generate barcode automatically
            </Button>

            <div className="flex justify-center rounded-md border border-line bg-canvas py-5">
              <BarcodeLabel
                outline
                label={{
                  name: name || "Product name",
                  sku: sku || "SKU",
                  barcode: barcode.trim(),
                  barcodeType,
                  price: sell > 0 ? formatMoney(sell, defaults.currency) : null,
                }}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Image" description="Optional · JPG, PNG or WEBP up to 3 MB" />
          <CardBody>
            <input
              ref={fileInput}
              id="image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setImagePreview(URL.createObjectURL(f));
                  setRemoveImage(false);
                  clear("image");
                }
              }}
            />
            <div className="flex items-center gap-4">
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="" className="size-20 rounded-md object-cover ring-1 ring-line" />
              ) : (
                <div className="grid size-20 place-items-center rounded-md bg-canvas text-muted ring-1 ring-inset ring-line">
                  <ImagePlus className="size-6" />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Button variant="secondary" size="sm" onClick={() => fileInput.current?.click()}>
                  {imagePreview ? "Replace image" : "Upload image"}
                </Button>
                {imagePreview && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setImagePreview(null);
                      setRemoveImage(true);
                      if (fileInput.current) fileInput.current.value = "";
                    }}
                  >
                    <X />
                    Remove
                  </Button>
                )}
              </div>
            </div>
            {errors.image && <p className="mt-2 text-[12.5px] text-danger">{errors.image}</p>}
          </CardBody>
        </Card>

        <div className="flex gap-2">
          <Link href={isEdit ? `/products/${product!.id}` : "/products"} className={cn(buttonVariants({ variant: "secondary" }), "flex-1")}>
            Cancel
          </Link>
          <Button type="submit" className="flex-1" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {isEdit ? "Save changes" : "Save product"}
          </Button>
        </div>
      </div>
    </form>
  );
}
