"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

export type HandoverBentoCardProps = {
  title: string;
  description: string;
  tags: string[];
  image: string;
  className?: string;
  report: {
    title: string;
    description: string;
    tags: string[];
  };
};

/**
 * 기본 상태에서는 사진과 제목만 보여주고, 마우스를 올리거나 키보드로 focus하면
 * 태그와 유료 리포트 패널이 나타난다.
 *
 * 모바일에는 hover가 없어 카드를 눌러 펼치도록 open 상태를 따로 둔다.
 * 숨김은 display가 아니라 opacity로 처리해 카드 높이가 변하지 않게 한다.
 */
export function HandoverBentoCard({
  title,
  description,
  tags,
  image,
  className,
  report,
}: HandoverBentoCardProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  // hover/focus는 CSS로, 터치는 open 상태로 처리한다.
  const revealed =
    "opacity-0 translate-y-2 transition duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 motion-reduce:translate-y-0 motion-reduce:transition-none";
  const revealedWhenOpen = "opacity-100 translate-y-0";

  return (
    <Card
      className={cn("group relative isolate overflow-hidden p-0", className)}
    >
      <Image
        src={image}
        alt=""
        fill
        sizes="(min-width: 768px) 50vw, 100vw"
        className="absolute inset-0 z-0 object-cover transition-transform duration-300 ease-out group-focus-within:scale-[1.03] group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none"
      />

      {/* 기본 상태: 글자만 읽히게 하는 약한 상하 그라데이션 */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/60 via-black/10 to-black/55" />

      {/* hover·focus·펼침 상태: 온네스트 초록 오버레이 */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 z-20 bg-forest/85 opacity-0 transition-opacity duration-300 ease-out group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none",
          open && "opacity-100",
        )}
      />

      {/* 카드 전체를 누르면 펼쳐진다. 키보드 focus 대상이기도 하다. */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={panelId}
        className="absolute inset-0 z-40 rounded-[24px] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-mint"
      >
        <span className="sr-only">
          {open ? `${title} 상세 접기` : `${title} 상세 보기`}
        </span>
      </button>

      <div className="pointer-events-none relative z-30 flex min-h-[430px] flex-col p-6 md:min-h-[500px]">
        <div>
          <h3 className="text-2xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">
            {title}
          </h3>
          <p className="mt-4 max-w-md text-sm leading-7 text-white/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)]">
            {description}
          </p>
        </div>

        <div id={panelId} className="mt-auto pt-6">
          <div
            className={cn(
              "flex flex-wrap gap-2",
              revealed,
              open && revealedWhenOpen,
            )}
          >
            {tags.map((tag) => (
              <Badge key={tag} className="bg-white/85 text-forest">
                {tag}
              </Badge>
            ))}
          </div>

          <div
            className={cn(
              "mt-4 rounded-lg border border-white/15 bg-navy/90 p-4 shadow-lg backdrop-blur-sm delay-75",
              revealed,
              open && revealedWhenOpen,
            )}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-md">
                <p className="text-[11px] font-black uppercase tracking-wide text-mint">
                  Premium Report
                </p>
                <h4 className="mt-1 text-lg font-black text-white sm:text-xl">
                  {report.title}
                </h4>
                <p className="mt-1 text-xs leading-5 text-white/70">
                  {report.description}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {report.tags.map((tag) => (
                  <Badge key={tag} className="bg-white/90 text-navy">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 터치로 펼친 뒤 닫을 수단. hover가 없는 화면에서만 쓴다. */}
      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 z-50 rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-forest shadow-card sm:hidden"
        >
          닫기
        </button>
      )}
    </Card>
  );
}
