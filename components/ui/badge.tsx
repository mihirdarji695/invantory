import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-canvas text-ink-2 ring-1 ring-inset ring-line",
        ok: "bg-ok-soft text-ok",
        warn: "bg-warn-soft text-warn",
        danger: "bg-danger-soft text-danger",
        accent: "bg-accent-soft text-accent",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  dot,
  children,
}: VariantProps<typeof badgeVariants> & { className?: string; dot?: boolean; children: React.ReactNode }) {
  return (
    <span className={cn(badgeVariants({ tone }), className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
