import { requirePartnerStaff } from "@/lib/partnerAuth";

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePartnerStaff();
  return <>{children}</>;
}
