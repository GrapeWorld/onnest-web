import { SectionTitle } from "./SectionTitle";

export function PolicyLayout({
  eyebrow,
  title,
  description,
  children
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="bg-cream/45">
      <section className="mx-auto max-w-5xl px-5 py-16 md:py-24">
        <SectionTitle eyebrow={eyebrow} title={title} description={description} />
        <div className="prose-policy mt-10 rounded-[28px] bg-white p-6 shadow-soft md:p-10">{children}</div>
      </section>
    </main>
  );
}
