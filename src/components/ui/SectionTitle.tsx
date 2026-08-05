import { Badge } from "./Badge";

type SectionTitleProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

export function SectionTitle({ eyebrow, title, description, align = "left" }: SectionTitleProps) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {eyebrow ? <Badge>{eyebrow}</Badge> : null}
      <h2 className="mt-4 break-keep text-balance text-3xl font-bold text-forest md:text-5xl">{title}</h2>
      {description ? <p className="mt-5 text-base leading-8 text-ink/70 md:text-lg">{description}</p> : null}
    </div>
  );
}
