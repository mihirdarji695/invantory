"use client";

import { useRef, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Download, FileUp, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { importCsvAction } from "@/lib/actions/import";
import type { ImportReport } from "@/lib/services/csv";

export function CsvImportExport({ columns }: { columns: readonly string[] }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardHeader title="Import and export" description="Move products in and out as CSV (opens in Excel or Google Sheets)." />
      <CardBody className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <a href="/api/products/export" className={buttonVariants({ variant: "secondary" })}><Download />Export products CSV</a>
          <a href="/api/products/template" className={buttonVariants({ variant: "ghost" })}><Download />Download import template</a>
        </div>

        <form
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await importCsvAction(form);
              setReport(res.report ?? null);
              setMessage({ ok: res.ok, text: res.message });
              if (res.ok) {
                toast.success(res.message);
                formRef.current?.reset();
                setFileName(null);
              } else toast.error(res.message);
            });
          }}
          className="space-y-3 rounded-md border border-dashed border-line-strong p-4"
        >
          <p className="text-[13px] text-ink-2">
            Columns: <code className="font-mono text-[12px] text-muted">{columns.join(", ")}</code>. Only <b>name</b> and <b>sku</b> are required.
            Empty barcodes are generated automatically; unknown categories are created. Prices are in normal units (e.g. 449.00).
          </p>
          <label className="flex cursor-pointer items-center gap-3">
            <span className={buttonVariants({ variant: "secondary", size: "sm" })}><FileUp />Choose CSV</span>
            <span className="truncate text-sm text-muted">{fileName ?? "No file chosen"}</span>
            <input name="file" type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
          </label>
          <div className="flex flex-col gap-1.5 text-sm text-ink-2">
            <label className="flex items-center gap-2"><input name="updateExisting" type="checkbox" className="size-4 accent-accent" />Update existing products with the same SKU</label>
            <label className="flex items-center gap-2"><input name="skipInvalid" type="checkbox" className="size-4 accent-accent" />Import valid rows even if some rows have errors</label>
          </div>
          <Button type="submit" disabled={pending || !fileName}>
            {pending ? <Loader2 className="animate-spin" /> : <Upload />}
            Validate and import
          </Button>
        </form>

        {message && (
          <div className={`flex items-start gap-2 rounded-md px-3 py-2.5 text-sm ${message.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`} role="status">
            {message.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
            <span>
              {message.text}
              {report && report.categoriesCreated > 0 && ` ${report.categoriesCreated} new categor${report.categoriesCreated === 1 ? "y" : "ies"} created.`}
            </span>
          </div>
        )}

        {report && report.errors.length > 0 && (
          <div className="overflow-hidden rounded-md border border-line">
            <div className="border-b border-line bg-canvas/60 px-4 py-2 text-[13px] font-medium text-ink-2">
              {report.errors.length} problem{report.errors.length === 1 ? "" : "s"} in {report.skipped || 1} row{report.skipped === 1 ? "" : "s"}
            </div>
            <div className="max-h-72 overflow-y-auto">
              <Table>
                <thead><tr><Th className="w-16">Row</Th><Th className="w-32">Column</Th><Th>Problem</Th></tr></thead>
                <tbody>
                  {report.errors.slice(0, 200).map((e, i) => (
                    <Tr key={i}>
                      <Td className="num">{e.row}</Td>
                      <Td className="font-mono text-[12.5px]">{e.field ?? "—"}</Td>
                      <Td className="text-danger">{e.message}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
