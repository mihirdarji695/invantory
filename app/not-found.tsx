import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";

export default function NotFound() {
  return (
    <Card>
      <EmptyState
        icon={SearchX}
        title="This page or product doesn't exist"
        description="It may have been deleted. Search by barcode or go back to the product list."
        action={<Link href="/products" className={buttonVariants()}>Go to products</Link>}
      />
    </Card>
  );
}
