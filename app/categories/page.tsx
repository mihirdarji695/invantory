import { CategoryManager } from "@/components/categories/category-manager";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return (
    <CategoryManager
      categories={categories.map((c) => ({ id: c.id, name: c.name, description: c.description, productCount: c._count.products }))}
    />
  );
}
