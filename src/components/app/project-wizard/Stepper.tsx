import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

const steps = [
  { number: 1, label: "공간 선택" },
  { number: 2, label: "거래 조건" },
  { number: 3, label: "일정 및 확인" },
];

export function Stepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="mb-8 flex items-center gap-2 sm:gap-4">
      {steps.map((step, index) => {
        const done = step.number < current;
        const active = step.number === current;
        return (
          <li key={step.number} className="flex flex-1 items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  done && "bg-mint text-forest",
                  active && "bg-forest text-white",
                  !done && !active && "bg-cream text-ink/50",
                )}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3} /> : step.number}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-semibold sm:inline",
                  active ? "text-forest" : "text-ink/50",
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <span className="h-px flex-1 bg-forest/10" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
