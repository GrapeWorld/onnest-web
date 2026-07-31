# 배포 가이드 (Vercel + Postgres)

로컬 개발은 SQLite, 배포는 Postgres를 쓴다. 스키마는 두 곳 모두에서 동작하도록
SQLite에 없는 기능(enum, 배열, native type)을 쓰지 않는다.

`npm run db:check-postgres`로 이 전제가 아직 유효한지 언제든 확인할 수 있다.
실제 DB 접속 없이 검사하므로 로컬에 Postgres가 없어도 된다. CI에 넣어두면
SQLite 전용 구문이 섞여 들어가는 순간 실패한다.

## 1. Postgres 준비

Vercel Postgres, Neon, Supabase 중 아무거나 만들고 연결 문자열을 받는다.
Vercel Postgres를 쓰면 프로젝트에 연결하는 순간 `DATABASE_URL`이 자동 주입된다.

## 2. provider 변경

`prisma/schema.prisma`에서 한 줄만 바꾼다.

```prisma
datasource db {
  provider = "postgresql"   // sqlite에서 변경
  url      = env("DATABASE_URL")
}
```

## 3. 마이그레이션 재생성

기존 마이그레이션은 SQLite 문법이라 Postgres에서 쓸 수 없다. 삭제하고 새로 만든다.
(운영 데이터가 아직 없는 MVP 단계라 가능한 방법이다.)

```bash
rm -rf prisma/migrations && npx prisma migrate dev --name init
```

## 4. 환경변수

Vercel 프로젝트 설정에 등록한다.

| 이름 | 설명 |
| --- | --- |
| `DATABASE_URL` | Postgres 연결 문자열 |
| `SESSION_SECRET` | 세션 쿠키 암호화 키. 32자 이상 랜덤 문자열 |

`SESSION_SECRET` 생성:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

로컬 `.env`의 값을 그대로 쓰지 말고 배포용으로 새로 만든다.

## 5. 빌드 설정

`postinstall`에 `prisma generate`가 들어 있어 Vercel 빌드 시 클라이언트가 자동 생성된다.
별도 빌드 명령 수정은 필요 없다.

배포 후 마이그레이션 적용은 다음 명령으로 한다.

```bash
npx prisma migrate deploy
```

## 6. 관리자 계정

배포 환경에서 첫 관리자를 지정한다. 회원가입으로 계정을 만든 뒤:

```bash
npm run set-admin -- 이메일주소
```

## 파일 저장소 (문서함)

문서함은 Vercel Blob을 쓴다. 로컬 디스크는 서버리스에서 요청 간에 유지되지
않으므로 쓰지 않는다.

1. Vercel 대시보드 > Storage > Blob 에서 스토어를 만든다.
2. 발급된 `BLOB_READ_WRITE_TOKEN`을 환경변수에 넣는다.
   로컬에서 시험하려면 `.env`에 같은 값을 넣는다.

토큰이 없으면 업로드 API가 503을 돌려주고 문서함 화면은 "스토리지 미설정"
안내를 보여준다. 나머지 기능은 영향받지 않는다.

파일은 Blob에 `public` 접근으로 올라가지만, URL을 화면에 노출하지 않고
`GET /api/projects/[id]/documents/[docId]`가 소유권을 확인한 뒤 중계한다.
계약서·등기부처럼 민감한 문서가 URL만으로 열리지 않게 하기 위한 것이다.

## 아직 남은 것

- 문의·서비스 신청 이메일 알림 (발송 서비스 API 키 필요)
