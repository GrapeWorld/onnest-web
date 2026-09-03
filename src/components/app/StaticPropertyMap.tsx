"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * 저장한 매물 후보 하나의 정지 이미지 지도(/api/my/candidate-properties/[id]/map)를
 * 안전하게 보여준다. 지도 API 미설정·좌표 없음·이미지 로딩 실패 세 가지
 * 실패 상태를 전부 처리하고, 실패해도 이 컴포넌트만 안내 문구로 바뀔 뿐
 * 주소·기본정보·프로젝트 생성 같은 나머지 화면은 항상 그대로 쓸 수 있다.
 * 매물 후보 탐색 화면(PropertyExplorer)과 매물 상세 화면이 이 컴포넌트를
 * 공유한다.
 */
export function StaticPropertyMap({
  candidateId,
  address,
  title,
  mapConfigured,
  hasCoordinates,
  noCoordinatesMessage = "이 매물은 아직 위치 정보가 없습니다.",
  className,
  imgClassName,
}: {
  candidateId: string;
  address: string | null;
  title: string;
  mapConfigured: boolean;
  hasCoordinates: boolean;
  /** "좌표가 없음" 상태의 안내 문구를 상황에 맞게 바꿀 때 쓴다(예: 관리자 공유 매물은 저장을 유도하는 문구). */
  noCoordinatesMessage?: string;
  /** 실패 안내 박스에 적용할 클래스. */
  className?: string;
  /** 성공 시 img 태그에 적용할 클래스(className과 별도로 둔다 — 성공/실패 레이아웃이 다를 수 있다). */
  imgClassName?: string;
}) {
  const [imageError, setImageError] = useState(false);
  const canShowMap = mapConfigured && hasCoordinates && !imageError;

  if (canShowMap) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 우리 서버가 프록시하는 동적 이미지라 next/image 대상이 아니다.
      <img
        src={`/api/my/candidate-properties/${candidateId}/map`}
        alt={`${address ?? title} 위치 지도`}
        width={600}
        height={300}
        className={imgClassName}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div className={cn("flex items-center justify-center bg-cream/60 p-6 text-center text-sm text-ink/55", className)}>
      {!mapConfigured
        ? "지도를 사용할 수 없습니다. 주소 정보는 계속 확인할 수 있습니다."
        : !hasCoordinates
          ? noCoordinatesMessage
          : "지도를 불러오지 못했습니다. 주소 정보는 계속 확인할 수 있습니다."}
    </div>
  );
}
