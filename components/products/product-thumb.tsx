import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductThumb({ image, name, size = "sm" }: { image: string | null; name: string; size?: "sm" | "lg" }) {
  const box = size === "lg" ? "size-28 rounded-lg" : "size-9 rounded-md";
  if (!image) {
    return (
      <div className={cn("grid shrink-0 place-items-center bg-canvas text-muted ring-1 ring-inset ring-line", box)} aria-hidden>
        <Package className={size === "lg" ? "size-8" : "size-4"} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local uploads served by our own route
    <img src={`/api/images/${image}`} alt={name} className={cn("shrink-0 bg-canvas object-cover ring-1 ring-inset ring-line", box)} loading="lazy" />
  );
}
