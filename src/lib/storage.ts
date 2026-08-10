import { put, del, get } from "@vercel/blob";

/**
 * 파일 저장소.
 *
 * Vercel은 서버리스라 파일시스템이 요청마다 초기화된다. 로컬 디스크나 public/에
 * 저장하면 프로덕션에서 파일이 사라지므로, 반드시 외부 스토리지를 쓴다.
 * (docs/DEPLOY.md 참고)
 *
 * 문서함에는 계약서·등기부등본처럼 민감한 파일이 올라온다. 따라서 access는
 * 반드시 "private"으로 둔다. "public"이면 URL을 아는 사람은 로그인 없이도
 * 파일을 열 수 있다.
 */

/** 토큰이 없으면 업로드 기능 전체를 잠근다. 화면에서 미리 안내하는 데도 쓴다. */
export function isStorageConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export type StoredFile = {
  storageKey: string;
};

/**
 * 파일명을 스토리지 키로 안전하게 바꾼다.
 * 한글 파일명과 경로 조작 문자를 그대로 키에 넣지 않는다.
 */
function toSafeKey(projectId: string, filename: string) {
  const dot = filename.lastIndexOf(".");
  const ext = dot > -1 ? filename.slice(dot + 1).toLowerCase() : "";
  const safeExt = /^[a-z0-9]{1,8}$/.test(ext) ? `.${ext}` : "";
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `projects/${projectId}/${unique}${safeExt}`;
}

export async function putProjectFile(
  projectId: string,
  file: File,
): Promise<StoredFile> {
  const storageKey = toSafeKey(projectId, file.name);

  // addRandomSuffix: false — 키를 우리가 정한 값 그대로 유지해 나중에 찾기 쉽게 한다.
  await put(storageKey, file, {
    access: "private",
    addRandomSuffix: false,
    contentType: file.type,
  });

  return { storageKey };
}

/** 업체 인증 서류(사업자등록증·통장사본)용 키. 프로젝트 문서와 경로만 분리한다. */
function toSafePartnerKey(partnerId: string, filename: string) {
  const dot = filename.lastIndexOf(".");
  const ext = dot > -1 ? filename.slice(dot + 1).toLowerCase() : "";
  const safeExt = /^[a-z0-9]{1,8}$/.test(ext) ? `.${ext}` : "";
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `partners/${partnerId}/${unique}${safeExt}`;
}

export async function putPartnerFile(
  partnerId: string,
  file: File,
): Promise<StoredFile> {
  const storageKey = toSafePartnerKey(partnerId, file.name);

  await put(storageKey, file, {
    access: "private",
    addRandomSuffix: false,
    contentType: file.type,
  });

  return { storageKey };
}

/**
 * 비공개 파일을 읽는다. 토큰을 가진 서버만 호출할 수 있으므로,
 * 호출 전에 반드시 소유권을 확인해야 한다.
 */
export async function readProjectFile(storageKey: string) {
  const result = await get(storageKey, { access: "private" });
  return result?.stream ?? null;
}

export async function deleteProjectFile(storageKey: string) {
  await del(storageKey);
}

/**
 * 여러 파일을 Blob에서 지운다. 외부 스토리지와 DB는 하나의 트랜잭션으로 묶을 수
 * 없으므로, 호출부가 실패 개수를 보고 DB를 지울지 스스로 판단해야 한다.
 * 개별 실패 원인(예외 메시지)은 여기서 삼킨다 — 원인 자체는 호출부 로그에
 * 남길 정보가 아니다. 다만 실패한 storageKey 목록은 함께 돌려준다:
 * storageKey는 `projects/{projectId}/{임의문자열}.{ext}` 형태의 내부 경로일
 * 뿐 개인정보나 접근 가능한 URL이 아니고(Blob은 private 접근이라 이 키만으로는
 * 열 수 없다), 회원 탈퇴처럼 실패해도 계속 진행하는 흐름에서는 DB 레코드가
 * 함께 지워지기 때문에 이 반환값이 나중에 재처리할 유일한 단서가 된다.
 */
export async function deleteProjectFiles(storageKeys: string[]) {
  const results = await Promise.allSettled(
    storageKeys.map((key) => deleteProjectFile(key)),
  );
  const failedKeys = storageKeys.filter(
    (_, index) => results[index]!.status === "rejected",
  );
  return { failedCount: failedKeys.length, failedKeys, total: results.length };
}
