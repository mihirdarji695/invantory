"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Printer, SlidersHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AdjustStockDialog } from "@/components/inventory/adjust-stock-dialog";
import { PrintLabelsDialog } from "@/components/barcode/print-labels-dialog";
import { deleteProductAction } from "@/lib/actions/products";
import type { ProductSummary } from "./types";

export function ProductDetailActions({ product, currency }: { product: ProductSummary; currency: string }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<null | "adjust" | "print" | "delete">(null);
  return (
    <>
      <Button variant="secondary" onClick={() => setDialog("print")}><Printer />Print barcode</Button>
      <Link href={`/products/${product.id}/edit`} className={buttonVariants({ variant: "secondary" })}><Pencil />Edit</Link>
      <Button variant="ghost" onClick={() => setDialog("delete")} className="text-danger hover:bg-danger-soft hover:text-danger"><Trash2 />Delete</Button>
      <Button onClick={() => setDialog("adjust")}><SlidersHorizontal />Adjust stock</Button>

      <AdjustStockDialog product={product} open={dialog === "adjust"} onOpenChange={(o) => setDialog(o ? "adjust" : null)} />
      <PrintLabelsDialog product={product} currency={currency} open={dialog === "print"} onOpenChange={(o) => setDialog(o ? "print" : null)} />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(o) => setDialog(o ? "delete" : null)}
        title={`Delete ${product.name}?`}
        description="The product and its barcode will be removed. Its stock movement history is kept. This can't be undone."
        confirmLabel="Delete product"
        onConfirm={async () => {
          const res = await deleteProductAction(product.id);
          if (res.ok) {
            toast.success(res.message);
            router.push("/products");
          } else toast.error(res.message);
        }}
      />
    </>
  );
}
