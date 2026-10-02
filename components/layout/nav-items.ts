import { Barcode, Boxes, FolderTree, LayoutDashboard, ArrowLeftRight, Package, PackagePlus, ScanSearch, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package, exact: true },
  { href: "/products/new", label: "Add Product", icon: PackagePlus },
  { href: "/search", label: "Barcode Search", icon: ScanSearch },
  { href: "/barcodes", label: "Barcode Generator", icon: Barcode },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/movements", label: "Stock Movements", icon: ArrowLeftRight },
  { href: "/categories", label: "Categories", icon: FolderTree },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;
