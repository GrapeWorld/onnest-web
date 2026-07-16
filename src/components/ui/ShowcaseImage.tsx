import Image from "next/image";
import { cn } from "@/lib/cn";

type ShowcaseImageProps = {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
  priority?: boolean;
};

export function ShowcaseImage({ src, alt, caption, className, priority }: ShowcaseImageProps) {
  return (
    <figure className={cn("overflow-hidden rounded-[28px] border border-forest/10 bg-white p-3 shadow-soft", className)}>
      <Image
        src={src}
        alt={alt}
        width={1366}
        height={768}
        priority={priority}
        className="h-auto w-full rounded-[20px] object-cover"
      />
      {caption ? <figcaption className="px-2 pb-1 pt-3 text-sm font-semibold text-ink/60">{caption}</figcaption> : null}
    </figure>
  );
}
