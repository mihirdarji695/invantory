"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MobileNav } from "./sidebar";

export function Topbar({ today, inventoryName }: { today: string; inventoryName: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");

  // Press "/" anywhere to jump to search.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      if (e.key !== "/" || el?.tagName === "INPUT" || el?.tagName === "TEXTAREA" || el?.tagName === "SELECT") return;
      e.preventDefault();
      input.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-15 items-center gap-3 border-b border-line bg-paper/95 px-4 backdrop-blur sm:px-6">
      <MobileNav inventoryName={inventoryName} />
      <form
        role="search"
        className="relative w-full max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          const code = q.trim();
          if (!code) return;
          router.push(`/search?code=${encodeURIComponent(code)}`);
          setQ("");
          input.current?.blur();
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search barcode, SKU or name"
          aria-label="Search barcode, SKU or product name"
          className="h-9 w-full rounded-md border border-line bg-canvas pl-9 pr-10 text-sm text-ink placeholder:text-muted/80 focus:border-accent focus:bg-paper focus:outline-none focus:ring-2 focus:ring-accent/15"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-paper px-1.5 font-mono text-[11px] text-muted sm:block">
          /
        </kbd>
      </form>
      <div className="ml-auto flex items-center gap-4">
        <span className="hidden text-[13px] text-muted md:block">{today}</span>
        <Link href="/products/new" className={cn(buttonVariants({ size: "sm" }))}>
          <Plus />
          <span className="hidden sm:inline">Add product</span>
        </Link>
      </div>
    </header>
  );
}
