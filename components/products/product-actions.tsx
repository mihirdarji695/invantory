"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Barcode, Eye, MoreHorizontal, Pencil, Printer, SlidersHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AdjustStockDialog } from "@/components/inventory/adjust-stock-dialog";
import { PrintLabelsDialog } from "@/components/barcode/print-labels-dialog";
import { deleteProductAction } from "@/lib/actions/products";
import type { ProductSummary } from "./types";

/** Row action menu used in product and inventory tables. */
export function ProductActions({ product, currency }: { product: ProductSummary; currency: string }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<null | "adjust" | "print" | "delete">(null);

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${product.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem asChild>
            <Link href={`/products/${product.id}`}><Eye />View</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/products/${product.id}/edit`}><Pencil />Edit</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("adjust")}><SlidersHorizontal />Adjust stock</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/barcodes?productId=${product.id}`}><Barcode />Generate barcode</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("print")}><Printer />Print barcode</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => setDialog("delete")}><Trash2 />Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AdjustStockDialog product={product} open={dialog === "adjust"} onOpenChange={(o) => setDialog(o ? "adjust" : null)} />
      <PrintLabelsDialog product={product} currency={currency} open={dialog === "print"} onOpenChange={(o) => setDialog(o ? "print" : null)} />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(o) => setDialog(o ? "delete" : null)}
        title={`Delete ${product.name}?`}
        description={
          <>
            The product and its barcode <span className="font-mono">{product.barcode}</span> will be removed. Its stock movement history is
            kept for your records. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete product"
        onConfirm={async () => {
          const res = await deleteProductAction(product.id);
          if (res.ok) {
            toast.success(res.message);
            router.refresh();
          } else toast.error(res.message);
        }}
      />
    </>
  );
}
