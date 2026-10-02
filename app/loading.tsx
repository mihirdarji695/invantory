import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-2 h-7 w-48" />
      <Skeleton className="mb-6 h-4 w-80" />
      <div className="rounded-lg border border-line bg-paper p-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="mb-3 h-9 w-full last:mb-0" />
        ))}
      </div>
    </div>
  );
}
