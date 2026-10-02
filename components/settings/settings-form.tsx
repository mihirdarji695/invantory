"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { saveSettingsAction } from "@/lib/actions/settings";
import { BARCODE_TYPES, BARCODE_TYPE_LABEL } from "@/lib/barcode";
import { SUPPORTED_CURRENCIES } from "@/lib/money";

const CURRENCY_NAMES: Record<string, string> = {
  INR: "Indian rupee (₹)",
  USD: "US dollar ($)",
  EUR: "Euro (€)",
  GBP: "British pound (£)",
  AED: "UAE dirham (AED)",
};

export function SettingsForm({
  settings,
}: {
  settings: { inventoryName: string; currency: string; defaultBarcodeType: string; defaultUnit: string; lowStockThreshold: number };
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader title="Inventory" description="Defaults used when you add products." />
      <CardBody>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await saveSettingsAction(form);
              setErrors(res.ok ? {} : (res.fieldErrors ?? {}));
              if (res.ok) toast.success(res.message ?? "Settings saved.");
              else toast.error(res.message);
            });
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Field id="inventoryName" label="Inventory name" error={errors.inventoryName} required className="sm:col-span-2">
            <Input name="inventoryName" defaultValue={settings.inventoryName} maxLength={80} />
          </Field>
          <Field id="currency" label="Currency" error={errors.currency}>
            <Select name="currency" defaultValue={settings.currency}>
              {SUPPORTED_CURRENCIES.map((c) => <option key={c} value={c}>{CURRENCY_NAMES[c] ?? c}</option>)}
            </Select>
          </Field>
          <Field id="defaultBarcodeType" label="Default barcode type" error={errors.defaultBarcodeType}>
            <Select name="defaultBarcodeType" defaultValue={settings.defaultBarcodeType}>
              {BARCODE_TYPES.map((t) => <option key={t} value={t}>{BARCODE_TYPE_LABEL[t]}</option>)}
            </Select>
          </Field>
          <Field id="defaultUnit" label="Default unit" error={errors.defaultUnit} required>
            <Input name="defaultUnit" defaultValue={settings.defaultUnit} maxLength={20} />
          </Field>
          <Field id="lowStockThreshold" label="Low stock threshold" error={errors.lowStockThreshold} hint="Default minimum stock for new products.">
            <Input name="lowStockThreshold" type="number" min={0} step={1} className="num" defaultValue={settings.lowStockThreshold} />
          </Field>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Save settings
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
