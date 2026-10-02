"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { adjustStockAction } from "@/lib/actions/products";
import { ADJUST_REASONS, applyAdjustment, type AdjustMode } from "@/lib/stock";
import { cn } from "@/lib/utils";

const MODES: { value: AdjustMode; label: string }[] = [
  { value: "IN", label: "Stock in" },
  { value: "OUT", label: "Stock out" },
  { value: "SET", label: "Set stock" },
];

export type AdjustableProduct = { id: string; name: string; stock: number; unit: string };

type Props = {
  product: AdjustableProduct;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdjusted?: (newStock: number) => void;
};

export function AdjustStockDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {/* Mounted only while open, so every opening starts with a fresh form. */}
      {props.open && <AdjustStockForm {...props} />}
    </Dialog>
  );
}

function AdjustStockForm({ product, onOpenChange, onAdjusted }: Props) {
  const [mode, setMode] = useState<AdjustMode>("IN");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState(ADJUST_REASONS.IN[0]);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const blockWhilePending = (e: Event) => pending && e.preventDefault();

  function changeMode(next: AdjustMode) {
    setMode(next);
    setReason(ADJUST_REASONS[next][0]);
    setErrors({});
  }

  // Live preview of the result; the server re-validates everything.
  let preview: { newStock: number; delta: number } | null = null;
  let previewError: string | null = null;
  if (quantity !== "") {
    try {
      preview = applyAdjustment(product.stock, mode, Number(quantity));
    } catch (e) {
      previewError = (e as Error).message;
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (quantity === "") return setErrors({ quantity: "Enter a quantity." });
    if (previewError) return setErrors({ quantity: previewError });
    const form = new FormData();
    form.set("productId", product.id);
    form.set("mode", mode);
    form.set("quantity", quantity);
    form.set("reason", reason);
    form.set("note", note);
    startTransition(async () => {
      const res = await adjustStockAction(form);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.message);
        return;
      }
      toast.success(res.message);
      onAdjusted?.(res.data!.newStock);
      onOpenChange(false);
    });
  }

  return (
      <DialogContent
        title="Adjust stock"
        description={product.name}
        onEscapeKeyDown={blockWhilePending}
        onInteractOutside={blockWhilePending}
      >
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="flex items-baseline justify-between rounded-md bg-canvas px-4 py-3">
            <span className="text-[13px] text-muted">Current stock</span>
            <span className="num text-xl font-semibold text-ink">
              {product.stock} <span className="text-sm font-normal text-muted">{product.unit}</span>
            </span>
          </div>

          <div>
            <p className="mb-1.5 text-[13px] font-medium text-ink-2" id="adjust-mode-label">Adjustment type</p>
            <div role="radiogroup" aria-labelledby="adjust-mode-label" className="grid grid-cols-3 gap-1 rounded-md border border-line-strong p-0.5">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={mode === m.value}
                  onClick={() => changeMode(m.value)}
                  className={cn(
                    "h-8 rounded-[5px] text-sm font-medium text-ink-2 transition-colors hover:bg-canvas",
                    mode === m.value && "bg-accent text-white hover:bg-accent",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field id="adjust-qty" label={mode === "SET" ? "New stock level" : "Quantity"} error={errors.quantity} required>
              <Input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                className="num"
                value={quantity}
                autoFocus
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setErrors((x) => ({ ...x, quantity: "" }));
                }}
              />
            </Field>
            <Field id="adjust-reason" label="Reason" error={errors.reason} required>
              <Select value={reason} onChange={(e) => setReason(e.target.value)}>
                {ADJUST_REASONS[mode].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Field id="adjust-note" label="Note" hint="Optional, e.g. invoice or order number.">
            <Input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
          </Field>

          <div className="flex h-6 items-center gap-2 text-sm" aria-live="polite">
            {preview && (
              <>
                <span className="num text-muted">{product.stock}</span>
                <ArrowRight className="size-3.5 text-muted" />
                <span className="num font-semibold text-ink">{preview.newStock}</span>
                <span className={cn("num text-[13px]", preview.delta > 0 ? "text-ok" : preview.delta < 0 ? "text-danger" : "text-muted")}>
                  ({preview.delta > 0 ? "+" : ""}
                  {preview.delta})
                </span>
              </>
            )}
            {previewError && <span className="text-[13px] text-danger">{previewError}</span>}
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Save adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
  );
}
