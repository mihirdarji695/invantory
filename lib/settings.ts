import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

/** Settings live in a single row (id = 1). Created on first access. */
export const getSettings = cache(async () => {
  return prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
});

export type AppSettings = Awaited<ReturnType<typeof getSettings>>;
