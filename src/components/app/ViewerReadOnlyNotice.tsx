/** 조회전용(viewer) 관리자에게 변경 UI 대신 보여주는 안내 문구. */
export function ViewerReadOnlyNotice({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <p className="rounded-2xl bg-cream px-4 py-3 text-sm text-ink/55">
      {children ?? "조회전용 관리자는 이 항목을 변경할 수 없습니다."}
    </p>
  );
}
