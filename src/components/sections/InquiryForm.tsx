"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { inquiryTypes, spaceTypes } from "@/data/inquiries";

const fieldClass =
  "rounded-2xl border border-forest/15 px-4 py-3 font-normal outline-none focus:border-forest";

export function InquiryForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    organization: "",
    email: "",
    phone: "",
    type: inquiryTypes[0],
    region: "",
    spaceType: "",
    message: "",
  });
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form) {
    return (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!agreePrivacy) {
      setError("개인정보 수집 및 이용에 동의해야 문의를 보낼 수 있습니다.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, agreePrivacy }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "문의 전송에 실패했습니다.");
        return;
      }

      router.push("/contact/complete");
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
        <label className="grid gap-2 text-sm font-semibold text-forest">
          이름
          <input
            required
            value={form.name}
            onChange={update("name")}
            className={fieldClass}
            placeholder="이름을 입력하세요"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-forest">
          회사명/소속 <span className="font-normal text-ink/50">선택 입력</span>
          <input
            value={form.organization}
            onChange={update("organization")}
            className={fieldClass}
            placeholder="개인 고객은 비워두셔도 됩니다"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-forest">
          이메일
          <input
            type="email"
            required
            value={form.email}
            onChange={update("email")}
            className={fieldClass}
            placeholder="이메일을 입력하세요"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-forest">
          연락처
          <input
            type="tel"
            required
            value={form.phone}
            onChange={update("phone")}
            className={fieldClass}
            placeholder="010-1234-5678"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-forest">
          문의 유형
          <select
            value={form.type}
            onChange={update("type")}
            className={fieldClass}
          >
            {inquiryTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-forest">
            공간 유형 <span className="font-normal text-ink/50">선택 입력</span>
            <select
              value={form.spaceType}
              onChange={update("spaceType")}
              className={fieldClass}
            >
              <option value="">선택 안 함</option>
              {spaceTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-forest">
            지역 <span className="font-normal text-ink/50">선택 입력</span>
            <input
              value={form.region}
              onChange={update("region")}
              className={fieldClass}
              placeholder="예: 남양주 별내동"
            />
          </label>
        </div>
        <label className="grid gap-2 text-sm font-semibold text-forest">
          문의 내용
          <textarea
            required
            value={form.message}
            onChange={update("message")}
            className={`min-h-36 ${fieldClass}`}
            placeholder="확인하고 싶은 공간 유형, 지역, 입주/이전 일정, 궁금한 점을 적어주세요"
          />
        </label>
        <label className="flex gap-3 text-sm text-ink/70">
          <input
            type="checkbox"
            checked={agreePrivacy}
            onChange={(event) => setAgreePrivacy(event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-forest/30 text-forest focus:ring-forest"
          />
          개인정보 수집 및 이용에 동의합니다.
        </label>
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white shadow-soft transition duration-300 hover:-translate-y-0.5 hover:bg-navy hover:shadow-glow focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {loading ? "보내는 중..." : "문의 보내기"}
        </button>
      </form>
    </Card>
  );
}
