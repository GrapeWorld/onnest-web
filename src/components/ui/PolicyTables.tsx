import { legalPrinciples } from "@/data/legalPrinciples";

export function LegalPrincipleTable() {
  return (
    <div className="overflow-hidden rounded-[24px] border border-forest/10 bg-white shadow-soft">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-forest text-white">
          <tr>
            <th className="p-4">구분</th>
            <th className="p-4">온네스트가 집중하는 것</th>
            <th className="p-4">온네스트가 하지 않는 것</th>
          </tr>
        </thead>
        <tbody>
          {legalPrinciples.map(([category, doText, dontText]) => (
            <tr key={category} className="border-t border-forest/10">
              <td className="p-4 font-bold text-forest">{category}</td>
              <td className="p-4 text-ink/75">{doText}</td>
              <td className="p-4 text-ink/75">{dontText}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HandoverRuleTable({ allowed, restricted }: { allowed: string[]; restricted: string[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="rounded-[24px] bg-mint p-6">
        <h3 className="text-xl font-bold text-forest">작성 가능</h3>
        <ul className="mt-5 space-y-3 text-sm text-ink/75">
          {allowed.map((item) => <li key={item}>✓ {item}</li>)}
        </ul>
      </div>
      <div className="rounded-[24px] bg-cream p-6">
        <h3 className="text-xl font-bold text-forest">작성 제한</h3>
        <ul className="mt-5 space-y-3 text-sm text-ink/75">
          {restricted.map((item) => <li key={item}>• {item}</li>)}
        </ul>
      </div>
    </div>
  );
}
