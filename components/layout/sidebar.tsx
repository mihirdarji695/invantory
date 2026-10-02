"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

function isActive(pathname: string, href: string, exact?: boolean) {
  if (href === "/products" && exact) {
    // "Products" is active for list + detail pages, but not for "Add Product".
    return pathname === "/products" || (/^\/products\/[^/]+/.test(pathname) && pathname !== "/products/new");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5 px-3" aria-label="Main">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href, "exact" in item ? item.exact : undefined);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-9 items-center gap-3 rounded-md px-3 text-[13.5px] text-ink-2 transition-colors hover:bg-canvas hover:text-ink",
              active && "bg-accent-soft font-medium text-accent hover:bg-accent-soft hover:text-accent",
            )}
          >
            {active && <span className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-accent" aria-hidden />}
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ name }: { name: string }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-6">
      {/* Mark: a few barcode bars — the one decorative flourish in the app */}
      <svg viewBox="0 0 22 18" className="h-[18px] w-[22px] text-accent" aria-hidden>
        {[0, 3, 5, 9, 12, 14, 18, 20].map((x, i) => (
          <rect key={x} x={x} y="0" width={i % 3 === 0 ? 2 : 1} height="18" fill="currentColor" />
        ))}
      </svg>
      <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">{name}</span>
    </Link>
  );
}

export function Sidebar({ inventoryName }: { inventoryName: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-paper lg:flex">
      <div className="flex h-15 items-center border-b border-line">
        <Brand name={inventoryName} />
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <Nav />
      </div>
      <p className="border-t border-line px-6 py-3 text-[12px] text-muted">Local · data stays on this computer</p>
    </aside>
  );
}

export function MobileNav({ inventoryName }: { inventoryName: string }) {
  const [open, setOpen] = useState(false); // links close the menu via onNavigate

  return (
    <>
      <button
        type="button"
        className="grid size-9 place-items-center rounded-md text-ink-2 hover:bg-canvas lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-paper py-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between pr-3">
              <Brand name={inventoryName} />
              <button type="button" className="rounded-md p-1.5 text-muted hover:bg-canvas" onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="size-4" />
              </button>
            </div>
            <Nav onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
