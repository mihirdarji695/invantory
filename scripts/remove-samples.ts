/** Deletes sample data created by prisma/seed.ts. Your own products are not touched. */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../lib/generated/prisma/client";
import { databaseFilePath } from "../lib/db-path";

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: databaseFilePath() }) });

async function main() {
  const samples = await prisma.product.findMany({ where: { isSample: true }, select: { id: true } });
  const ids = samples.map((s) => s.id);
  const [movements, products, categories] = await prisma.$transaction([
    prisma.stockMovement.deleteMany({ where: { productId: { in: ids } } }),
    prisma.product.deleteMany({ where: { id: { in: ids } } }),
    prisma.category.deleteMany({ where: { isSample: true, products: { none: {} } } }),
  ]);
  console.log(`Removed ${products.count} sample products, ${movements.count} movements, ${categories.count} unused sample categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
