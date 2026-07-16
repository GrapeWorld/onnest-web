import Link from "next/link";
import { cn } from "@/lib/cn";

type ButtonProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
};

export function Button({ href, children, variant = "primary", className }: ButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80",
        variant === "primary" && "bg-forest text-white shadow-soft hover:bg-navy hover:shadow-glow",
        variant === "secondary" && "bg-mint text-forest hover:bg-white hover:shadow-card",
        variant === "ghost" && "border border-forest/15 bg-white text-forest hover:border-forest/40 hover:shadow-card",
        className
      )}
    >
      {children}
    </Link>
  );
}
