import { cn } from "@/lib/cn";

export function Section({
  id,
  children,
  className,
  containerClassName,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}) {
  return (
    <section id={id} className={cn("px-5 py-16 md:py-24", className)}>
      <div className={cn("mx-auto max-w-7xl", containerClassName)}>{children}</div>
    </section>
  );
}
