import { cn } from "@/lib/cn";

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex rounded-full bg-mint px-3 py-1 text-xs font-semibold text-forest", className)}>
      {children}
    </span>
  );
}
