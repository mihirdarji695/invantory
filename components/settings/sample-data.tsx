"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { removeSampleDataAction } from "@/lib/actions/settings";

export function RemoveSampleData({ count }: { count: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} disabled={count === 0}>
        <Trash2 />
        Remove sample data
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Remove ${count} sample products?`}
        description="Sample products, their stock movements, and sample categories you aren't using will be deleted. Products you added yourself are not affected."
        confirmLabel="Remove sample data"
        onConfirm={async () => {
          const res = await removeSampleDataAction();
          if (res.ok) {
            toast.success(res.message);
            router.refresh();
          } else toast.error(res.message);
        }}
      />
    </>
  );
}
