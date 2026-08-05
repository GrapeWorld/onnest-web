import type { WizardFieldDef } from "@/data/projectSpace";
import { fieldClass, labelClass } from "./shared";

export function DynamicField({
  field,
  value,
  onChange,
}: {
  field: WizardFieldDef;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.type === "select") {
    return (
      <label className={labelClass}>
        {field.label}
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={fieldClass}
        >
          <option value="">선택 안 함</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className={labelClass}>
      {field.label}
      <input
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
        placeholder={field.placeholder}
      />
    </label>
  );
}
