import { cn } from "@/lib/cn";

export function Section({
  children,
  className,
  containerClassName,
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}) {
  return (
    <section className={cn("px-5 py-16 md:py-24", className)}>
      <div className={cn("mx-auto max-w-7xl", containerClassName)}>{children}</div>
    </section>
  );
}
