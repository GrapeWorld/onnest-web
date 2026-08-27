/** 알림 클릭 시 브라우저에서 호출하는 공통 fetch 헬퍼. */
export async function markNotificationRead(id: string): Promise<{ redirectTo: string } | null> {
  const response = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
  if (!response.ok) return null;
  return response.json();
}

export async function markAllNotificationsRead(): Promise<boolean> {
  const response = await fetch("/api/notifications/read-all", { method: "POST" });
  return response.ok;
}

const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

export function formatNotificationTime(date: Date | string) {
  return timeFormatter.format(new Date(date));
}
