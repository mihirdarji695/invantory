"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { FolderTree, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { deleteCategoryAction, saveCategoryAction } from "@/lib/actions/categories";

export type CategoryRow = { id: string; name: string; description: string | null; productCount: number };

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<CategoryRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<CategoryRow | null>(null);

  return (
    <>
      <PageHeader
        title="Categories"
        description="Group products so they are easier to filter and report on."
        actions={<Button onClick={() => setEditing("new")}><Plus />Add category</Button>}
      />
      <Card className="overflow-hidden">
        {categories.length === 0 ? (
          <EmptyState icon={FolderTree} title="No categories yet" description="Create categories like Shampoo, Treatment or Tools." action={<Button onClick={() => setEditing("new")}><Plus />Add category</Button>} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Category</Th>
                <Th>Description</Th>
                <Th className="text-right">Products</Th>
                <Th className="w-24"><span className="sr-only">Actions</span></Th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <Tr key={c.id}>
                  <Td className="font-medium text-ink">{c.name}</Td>
                  <Td className="max-w-md truncate">{c.description ?? <span className="text-muted">—</span>}</Td>
                  <Td className="num text-right">
                    <Link href={`/products?category=${c.id}`} className="hover:text-accent hover:underline">{c.productCount}</Link>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)}><Pencil /></Button>
                      <Button variant="ghost" size="icon" aria-label={`Delete ${c.name}`} className="hover:bg-danger-soft hover:text-danger" onClick={() => setDeleting(c)}><Trash2 /></Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <CategoryDialog category={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "category"}?`}
        description={
          deleting && deleting.productCount > 0
            ? `${deleting.productCount} product${deleting.productCount === 1 ? "" : "s"} will become uncategorized. The products themselves are not deleted.`
            : "This category has no products."
        }
        confirmLabel="Delete category"
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteCategoryAction(deleting.id);
          if (res.ok) {
            toast.success(res.message);
            router.refresh();
          } else toast.error(res.message);
        }}
      />
    </>
  );
}

function CategoryDialog({ category, onClose }: { category: CategoryRow | "new" | null; onClose: () => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const existing = category && category !== "new" ? category : null;

  return (
    <Dialog open={category !== null} onOpenChange={(o) => { if (!o && !pending) { onClose(); setErrors({}); } }}>
      <DialogContent title={existing ? "Edit category" : "Add category"}>
        <form
          key={existing?.id ?? "new"}
          noValidate
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await saveCategoryAction(existing?.id ?? null, form);
              if (!res.ok) {
                setErrors(res.fieldErrors ?? {});
                if (!res.fieldErrors) toast.error(res.message);
                return;
              }
              toast.success(res.message);
              setErrors({});
              onClose();
            });
          }}
        >
          <Field id="category-name" label="Category name" error={errors.name} required>
            <Input name="name" defaultValue={existing?.name ?? ""} autoFocus maxLength={60} />
          </Field>
          <Field id="category-description" label="Description" error={errors.description}>
            <Textarea name="description" defaultValue={existing?.description ?? ""} rows={3} maxLength={300} />
          </Field>
          <DialogFooter>
            <Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {existing ? "Save changes" : "Add category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
