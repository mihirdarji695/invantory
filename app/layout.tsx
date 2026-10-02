import type { Metadata } from "next";
import { Toaster } from "sonner";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { GlobalScannerListener } from "@/components/barcode/scanner/global-scanner-listener";
import { getSettings } from "@/lib/settings";

// Every page reads live data from the local SQLite database.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return { title: { default: settings.inventoryName, template: `%s · ${settings.inventoryName}` } };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const today = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  return (
    <html lang="en">
      <body>
        <Sidebar inventoryName={settings.inventoryName} />
        <div className="lg:pl-60">
          <Topbar today={today} inventoryName={settings.inventoryName} />
          <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
        <GlobalScannerListener />
        <Toaster position="bottom-right" richColors closeButton toastOptions={{ style: { fontFamily: "var(--font-sans)" } }} />
      </body>
    </html>
  );
}
