import { Button } from "./Button";
import { Card } from "./Card";

type PricingCardProps = {
  name: string;
  price: string;
  description: string;
  features: string[];
  featured?: boolean;
};

export function PricingCard({ name, price, description, features, featured }: PricingCardProps) {
  return (
    <Card className={featured ? "border-forest bg-forest text-white" : ""}>
      <p className={featured ? "text-mint" : "text-sage"}>{name}</p>
      <h3 className="mt-3 text-3xl font-bold">{price}</h3>
      <p className={featured ? "mt-3 text-white/75" : "mt-3 text-ink/70"}>{description}</p>
      <ul className="mt-6 space-y-3 text-sm">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <span>{featured ? "•" : "✓"}</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Button href="/contact" variant={featured ? "secondary" : "ghost"} className="mt-6 w-full">
        문의하기
      </Button>
    </Card>
  );
}
