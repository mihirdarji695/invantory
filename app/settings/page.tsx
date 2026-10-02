import { stat } from "node:fs/promises";
import path from "node:path";
import { DatabaseBackup, HardDrive } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { CsvImportExport } from "@/components/settings/csv-import";
import { RemoveSampleData } from "@/components/settings/sample-data";
import { SettingsForm } from "@/components/settings/settings-form";
import { databaseFilePath, UPLOADS_DIR } from "@/lib/db-path";
import { prisma } from "@/lib/prisma";
import { CSV_COLUMNS } from "@/lib/services/csv";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Settings" };

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default async function SettingsPage() {
  const dbPath = databaseFilePath();
  const [settings, sampleCount, dbStat] = await Promise.all([
    getSettings(),
    prisma.product.count({ where: { isSample: true } }),
    stat(dbPath).catch(() => null),
  ]);
  const relative = (p: string) => path.relative(process.cwd(), p) || p;

  return (
    <>
      <PageHeader title="Settings" description="Inventory defaults, data import/export and backups." />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <SettingsForm settings={settings} />

          <Card>
            <CardHeader title="Backup" description="Everything lives in one SQLite file on this computer." />
            <CardBody className="space-y-4">
              <dl className="space-y-2 text-sm">
                <div className="flex gap-3">
                  <dt className="w-24 shrink-0 text-muted">Database</dt>
                  <dd className="min-w-0 break-all font-mono text-[12.5px] text-ink">{relative(dbPath)}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-24 shrink-0 text-muted">Full path</dt>
                  <dd className="min-w-0 break-all font-mono text-[12.5px] text-ink-2">{dbPath}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-24 shrink-0 text-muted">Size</dt>
                  <dd className="num text-ink">{dbStat ? formatBytes(dbStat.size) : "—"}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-24 shrink-0 text-muted">Images</dt>
                  <dd className="min-w-0 break-all font-mono text-[12.5px] text-ink-2">{relative(UPLOADS_DIR)}</dd>
                </div>
              </dl>
              <a href="/api/backup" className={buttonVariants()}>
                <DatabaseBackup />
                Export database
              </a>
              <p className="flex items-start gap-2 text-[12.5px] text-muted">
                <HardDrive className="mt-0.5 size-3.5 shrink-0" />
                The download is a consistent copy, safe to take while the app is running. To restore, stop the app and replace the database
                file with a backup. Product images are not inside the database — copy the images folder too.
              </p>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <CsvImportExport columns={CSV_COLUMNS} />
          <Card>
            <CardHeader title="Sample data" description="The products created on first setup are marked as samples." />
            <CardBody className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-ink-2">
                {sampleCount > 0 ? <><span className="num font-medium">{sampleCount}</span> sample products in the database.</> : "No sample products left."}
              </p>
              <RemoveSampleData count={sampleCount} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
