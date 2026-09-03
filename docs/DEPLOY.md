# 배포 가이드 (Vercel + Postgres)

로컬과 배포 모두 Postgres를 쓴다. 같은 provider와 마이그레이션 이력을 사용해
환경별 스키마 차이를 없앤다.

`npm run db:check-postgres`로 이 전제가 아직 유효한지 언제든 확인할 수 있다.
실제 DB 접속 없이 검사하므로 로컬에 Postgres가 없어도 된다. CI에 넣어두면
SQLite 전용 구문이 섞여 들어가는 순간 실패한다.

## 0. 사전 요구사항

- Node.js 20 이상, npm (저장소에 포함된 `package-lock.json` 기준)
- PostgreSQL (로컬 개발도 포함 — SQLite로 대체 불가)
- Docker + Docker Compose — 로컬에서 `docker-compose.yml`로 Postgres를 띄울
  때만 필요하다. 대신 Neon·Supabase 같은 클라우드 Postgres를 쓴다면 없어도
  된다.

## 1. Postgres 준비

Vercel Postgres, Neon, Supabase 중 아무거나 만들고 연결 문자열을 받는다.
Vercel Postgres를 쓰면 프로젝트에 연결하는 순간 `DATABASE_URL`이 자동 주입된다.

## 2. 마이그레이션

`prisma/migrations`에는 빈 Postgres DB를 위한 baseline이 저장되어 있다. 기존
SQLite 이력은 삭제하지 않고 `prisma/migrations-sqlite-legacy`에 참고용으로
보관한다. legacy 폴더의 SQL은 Postgres에 적용하지 않는다.

새 Postgres DB에는 다음 명령으로 저장소에 고정된 이력을 적용한다.

```bash
npx prisma migrate deploy
```

이미 테이블이나 `_prisma_migrations` 이력이 있는 Postgres DB에는 baseline을 바로
적용하지 않는다. 먼저 스키마 diff와 백업을 확인하고 `prisma migrate resolve`를
포함한 별도 baseline 절차를 수립해야 한다.

**배포 전 반드시 확인**: 대상 Postgres가 정말 비어 있는 새 DB인지 아래 쿼리로
직접 확인한다(`migrate deploy`를 실행하기 전에).

```sql
SELECT * FROM "_prisma_migrations" ORDER BY "finished_at" DESC;
```

이 쿼리가 오류 없이 행을 반환하거나(=이미 이력이 있음), `User`/`Project` 같은
주요 테이블이 이미 존재한다면 **절대 이 baseline을 그대로 적용하지 않는다.**
그 경우:

- `prisma migrate reset` 실행 금지 (기존 데이터를 지운다)
- baseline 자동 적용 금지
- 백업 전 어떤 변경도 금지
- 운영 스키마와 `prisma/schema.prisma`의 차이를 먼저 분석
- 적용 방법을 결정하기 전까지 작업을 중단하고 보고

> **주의**
> 이 baseline은 신규·빈 PostgreSQL 데이터베이스를 기준으로 작성되었습니다.
> 기존 데이터 또는 Prisma 마이그레이션 이력이 있는 운영 DB에 그대로
> 적용하면 안 됩니다.

정말 비어 있는 새 DB인 경우에만 아래 흐름을 따른다.

```bash
npx prisma generate
npx prisma migrate deploy
```

## 3. 로컬 Postgres 띄우기

저장소에 포함된 `docker-compose.yml`로 로컬 Postgres를 재현 가능하게 띄운다.
Docker Desktop이 설치돼 있다면:

```bash
docker compose up -d
```

`postgres:16-alpine` 컨테이너가 `localhost:5432`에 뜨고, 데이터는
`onnest_postgres_data` 볼륨에 남아 컨테이너를 내렸다 올려도 유지된다. `.env`의
`DATABASE_URL`을 이 컨테이너에 맞춰 두면(`.env.example` 참고) 그대로
`npx prisma migrate deploy`(2번 참고)로 로컬 DB에 스키마를 적용할 수 있다.

Docker를 쓰지 않는다면 Neon·Supabase 같은 무료 클라우드 Postgres를 로컬
개발에도 그대로 써도 된다 — 그 경우 이 단계를 건너뛰고 발급받은 연결 문자열을
`DATABASE_URL`에 넣는다.

> 이 저장소를 작업한 환경에는 Docker가 설치돼 있지 않아 `docker compose up -d`는
> 직접 확인하지 못했다. 다만 같은 Postgres baseline은 `npm run test:integration`의
> 임베디드 Postgres에서 실제 `prisma migrate deploy`로 적용해 검증한다.

## 4. 환경변수

Vercel 프로젝트 설정에 등록한다.

| 이름 | 설명 |
| --- | --- |
| `DATABASE_URL` | Postgres 연결 문자열 |
| `SESSION_SECRET` | 세션 쿠키 암호화 키. 32자 이상 랜덤 문자열 |
| `APP_URL` | 서비스의 정식 URL(예: `https://onnesthome.com`). 비밀번호 재설정 메일의 링크를 만들 때 요청 Host 헤더 대신 이 값을 쓴다 — 프록시·리버스프록시 설정에 따라 Host 헤더가 실제 서비스 도메인과 다를 수 있기 때문이다. 운영에서 값이 없거나 http/https가 아니면 요청이 실패한다. |

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

파일은 Blob에 `private` 접근으로 올라가며, URL을 화면에 노출하지 않고
`GET /api/projects/[id]/documents/[docId]`가 소유권을 확인한 뒤 중계한다.
계약서·등기부처럼 민감한 문서가 URL만으로 열리지 않게 하기 위한 것이다.

## 이메일 발송 (아이디/비밀번호 찾기)

아이디 찾기(가입 이메일 안내)와 비밀번호 재설정 링크는 모두 [Resend](https://resend.com)로 보낸다.
휴대폰 번호는 본인 확인(이름+번호 대조) 용도로만 쓰고, 문자 발송은 하지 않는다 —
발신번호 사전등록 같은 별도 인증 절차 없이 이메일 발송 하나로 두 기능을 다 처리하기 위해서다.

1. resend.com에서 발신 도메인을 인증(SPF/DKIM 등록)하고 API 키를 발급받는다.
   도메인 인증 전에는 계정 소유자 본인 이메일로만 테스트 발송이 된다.
2. 환경변수에 등록한다.

| 이름 | 설명 |
| --- | --- |
| `RESEND_API_KEY` | Resend API 키 |
| `RESEND_FROM` | 발신 표시 이름/주소. 예: `ONNEST <no-reply@onnesthome.com>` |

키가 없으면 실제 발송 대신 콘솔에 수신자(마스킹됨)와 제목만 남기고 건너뛴다.
비밀번호 재설정 링크나 아이디 본문 같은 민감한 내용은 로컬이든 배포든 로그에
남기지 않는다. 로컬에서 실제 흐름을 끝까지 확인하려면 Resend 테스트 설정과
본인이 확인할 수 있는 수신 주소를 사용한다. DB에는 토큰 원문이 아니라 해시만
저장되므로 DB 조회로 재설정 링크를 복구할 수 없다. 배포 환경에는 반드시 키를
등록해야 한다.

## 운영 알림 (신규 문의·서비스 연결 신청)

신규 문의(`POST /api/inquiries`)와 서비스 연결 신청(`POST /api/projects/[id]/service-requests`)이
저장되면 관리자에게 알림 메일을 보낸다(`src/lib/email.ts`의 `notifyAdmin()`).
위 Resend 설정을 그대로 재사용하고, 수신 주소만 별도 환경변수로 받는다.

| 이름 | 설명 |
| --- | --- |
| `ADMIN_NOTIFICATION_EMAIL` | 알림을 받을 관리자 이메일 주소(선택) |

`ADMIN_NOTIFICATION_EMAIL`이 없으면 콘솔에만 남기고 건너뛴다. 설정했더라도
`RESEND_API_KEY`가 없으면(로컬 등) 마찬가지로 콘솔 로그로만 남는다 — 실제
발송에는 위 Resend 설정이 함께 필요하다. 알림 발송(또는 URL 조립) 실패는
문의·신청 저장 자체를 막지 않는다 — 응답은 항상 저장 성공 여부만 반영하고,
알림 실패는 서버 콘솔에 에러로만 남는다.

## 문의 지연 경고 (크론)

처리기한 필드 없이 접수일(`createdAt`) 기준으로만 판단하는 가벼운 지연
경고다(`src/lib/inquirySla.ts`) — 종결(`답변 완료`)되지 않은 문의가
담당자 없이 2일 이상 방치되거나, `신규` 상태로 3일 이상 방치되면
관리자 목록 화면에 배지로 표시된다. 별도로 `GET /api/cron/inquiry-sla`가
같은 기준으로 전수 점검해 지연 건이 하나라도 있으면 `notifyAdmin()`으로
요약 메일을 보낸다(없으면 메일을 보내지 않는다).

`vercel.json`에 매일 00:00 UTC 스케줄이 이미 등록돼 있다. Vercel Cron이
호출할 때 `CRON_SECRET` 값을 `Authorization: Bearer` 헤더로 자동 첨부하는데,
라우트는 이 값을 직접 검증한다 — 다른 알림과 달리 미설정을 "건너뛰기"로
취급하지 않고 항상 401을 돌려준다(외부에서 트리거 가능한 GET이라 기본값이
열려 있으면 안 된다). 즉 `CRON_SECRET`을 설정하지 않으면 스케줄은 돌아도
매번 401로 끝난다 — 기능이 꺼진 것과 같다.

| 이름 | 설명 |
| --- | --- |
| `CRON_SECRET` | 크론 엔드포인트 인증용 랜덤 문자열(선택, 없으면 항상 401) |

## 소셜 로그인 (Google/Kakao/Naver)

기존 이메일·비밀번호 로그인(iron-session, `onnest_session` 쿠키)은 그대로
유지하고, 세 provider를 Authorization Code 흐름으로 추가한다. 인가 흐름
중에만 쓰는 state/PKCE/nonce는 별도의 단기 쿠키(`onnest_oauth`, 10분
만료)에 저장하고 실제 로그인 세션과 섞지 않는다(`src/lib/oauth/session.ts`).

**사용 라이브러리와 선택 이유**: OAuth2 인가 코드 교환 자체(각 provider
토큰 엔드포인트에 POST)는 표준 HTTP 요청이라 직접 구현했다(`src/lib/oauth/
{google,kakao,naver}.ts`) — 처음에는 Google·Kakao·Naver를 모두 기본
지원하는 [arctic](https://www.npmjs.com/package/arctic)을 검토했지만,
`npm view arctic`에서 유지관리자가 직접 "Package no longer supported"로
표시해 배포판이 1년 넘게 갱신되지 않은 상태였다 — 보안이 중요한 인증
코드의 기반으로 삼기에 적합하지 않아 채택하지 않았다. 대신 서명 검증이
실제로 필요한 유일한 지점(Google ID Token의 JWKS 서명·issuer·audience·
만료 확인)에는 [jose](https://www.npmjs.com/package/jose)(panva 작성,
Auth.js·openid-client 등이 내부적으로 쓰는 사실상 표준 JOSE/JWT 라이브러리,
활발히 유지관리됨)를 쓴다 — "토큰 검증을 직접 구현하지 않는다"는 원칙은
이 지점에 적용했다. Kakao·Naver는 ID Token을 발급하지 않고(OIDC가 아닌
순수 OAuth2) 자체 REST API(`/v2/user/me`, `/v1/nid/me`)를 access token으로
직접 호출해 사용자 정보를 받으므로, 서드파티가 서명한 토큰을 검증할 필요
자체가 없다(HTTPS로 provider 서버에서 직접 받는 응답이라 이미 신뢰 가능).

**PKCE 적용 범위**: Google에는 state+PKCE+nonce를 모두 쓴다(OIDC 모범
사례, Google 자체 문서 권장). Kakao·Naver는 state만 쓴다 — redirect_uri가
공개 클라이언트가 아닌 이 서버 자신의 콜백 라우트이고 토큰 교환에
`client_secret`(confidential client)을 항상 함께 쓰므로, Authorization
Code Interception을 막는 PKCE 없이도 이미 기밀 클라이언트 수준의 보안을
갖춘다.

### 1. Google

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials)에서
   OAuth 2.0 클라이언트 ID(웹 애플리케이션)를 만든다.
2. 승인된 리디렉션 URI에 `{APP_URL}/api/auth/oauth/google/callback`을
   환경별로(로컬/스테이징/운영) 각각 등록한다.
3. OAuth 동의 화면에서 scope `openid`, `profile`, `email`을 요청 목록에
   추가한다.
4. 발급된 Client ID/Secret을 환경변수에 등록한다(`GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`).

### 2. Kakao

1. [Kakao Developers](https://developers.kakao.com)에서 애플리케이션을
   만들고 "카카오 로그인"을 활성화한다.
2. Redirect URI에 `{APP_URL}/api/auth/oauth/kakao/callback`을 등록한다.
3. 보안 > Client Secret을 발급하고 "사용함"으로 설정한다(코드가
   `client_secret`을 항상 함께 보낸다 — 발급하지 않으면 토큰 교환이
   실패한다).
4. 동의항목에서 닉네임·프로필 이미지·카카오계정(이메일)을 필수 또는
   선택 동의로 설정한다. **이메일 동의항목은 카카오 심사를 통과해야
   실제 서비스에서 받을 수 있다** — 심사 전에는 테스트로 등록된 카카오
   계정에서만 이메일이 내려온다. 심사에는 서비스의 회원가입·탈퇴 화면과
   개인정보처리방침 URL 제출이 필요하다(`/privacy`, 회원가입은
   `/auth/signup`, 탈퇴는 로그인 후 마이페이지 하단 "회원 탈퇴").
5. 발급된 REST API 키를 `KAKAO_CLIENT_ID`에, Client Secret을
   `KAKAO_CLIENT_SECRET`에 등록한다.

### 3. Naver

1. [네이버 개발자센터](https://developers.naver.com/apps)에서 애플리케이션을
   등록하고 "네아로(네이버 아이디로 로그인)" API를 사용 설정한다.
2. 서비스 URL과 콜백 URL에 각각 `{APP_URL}`과
   `{APP_URL}/api/auth/oauth/naver/callback`을 등록한다.
3. 제공 정보 선택에서 이메일·이름(또는 별명)을 요청 항목으로 추가한다.
4. 발급된 Client ID/Secret을 `NAVER_CLIENT_ID`/`NAVER_CLIENT_SECRET`에
   등록한다.

> 네이버 API는 이메일 인증 여부를 별도 필드로 내려주지 않는다. 네이버
> 아이디 자체가 가입 시 실명 확인을 거치는 점을 감안해 이메일이 존재하면
> 검증된 것으로 간주하는 v1 정책을 썼다(`src/lib/oauth/naver.ts`의 주석
> 참고) — 정책을 더 보수적으로 바꾸려면 이 파일의 `emailVerified` 계산만
> 수정하면 된다.

### 공통 동작

- 환경변수가 설정된 provider의 로그인 버튼만 노출된다(하나만 설정하면
  시작 시 실패 — `src/lib/env.ts`).
- 같은 이메일이어도 기존 이메일·비밀번호 계정에 소셜 계정을 자동
  연결하지 않는다. 사용자가 로그인한 뒤 마이페이지 "로그인 방법"에서
  명시적으로 연결해야 한다.
- provider의 access/refresh token은 로그인 확인 직후 버리고 DB에 저장하지
  않는다(`SocialAccount`에는 provider·providerAccountId·이메일만 남는다).
- 소셜 전용 회원(비밀번호 없음)의 회원 탈퇴는 비밀번호 대신 연결된
  provider로 다시 인증해야 한다(`mode=delete-confirm`) — 재인증 성공 후
  5분 안에만 실제 삭제 요청이 통과한다.

### 배포 전 확인

```text
[ ] Google/Kakao/Naver 각 콘솔에 운영 도메인 기준 redirect URI 등록
[ ] Kakao 이메일 동의항목 심사 완료(또는 테스트 계정으로만 우선 배포)
[ ] 세 provider 모두 실제 계정으로 로그인 → 최초 가입 → 재로그인 확인
[ ] 같은 이메일의 기존 계정 로그인 시 자동 연결되지 않고 안내 문구가 뜨는지 확인
[ ] 마이페이지에서 연결·해제, 마지막 로그인 방법 해제 차단 확인
[ ] 개인정보처리방침에 provider로부터 받는 항목(이메일·이름·프로필사진)과 목적 반영
```

## 매물 후보 지도 (네이버 클라우드 플랫폼 Maps)

`/my/candidate-properties`(매물 후보 탐색 화면)에서 저장한 주소를 지도로
보여줄 때 쓴다. **네이버 로그인(NAVER_CLIENT_ID/SECRET)과는 완전히 다른
서비스**다 — 로그인은 [developers.naver.com](https://developers.naver.com),
지도는 [console.ncloud.com](https://console.ncloud.com)(네이버 클라우드
플랫폼, 결제수단 등록 필요)에서 따로 신청해야 한다.

두 갈래로 쓴다: 서버 전용 **Geocoding**(주소→좌표 변환)·**Static Map**(정지
이미지, 상세 화면·지도 실패 시 폴백용)과, 브라우저에서 직접 로딩하는
**Dynamic Map**(탐색 화면의 인터랙티브 다중 마커 지도)이다. 후자는 반드시
클라이언트에 Client ID가 노출되는 방식이지만, 이 값 자체는 비밀값이 아니다.

이 지도와 관련해 서로 다른 보안 장치 두 가지를 혼동하지 않는다:

- **도메인 허용 목록(Web 서비스 URL)** — NCP 쪽 **API 사용 제한**이다.
  "이 Client ID로 어느 도메인에서 지도를 띄울 수 있는가"만 결정한다.
  등록되지 않은 도메인에서 쓰면 인증 실패로 폴백될 뿐, 이 자체는 어떤
  고객이 어떤 좌표를 볼 수 있는지와는 무관하다.
- **고객 데이터 접근 권한** — 우리 서버의 **소유권 검사**다. 마커에 실릴
  좌표 자체는 각 화면이 이미 `userId`/프로젝트 소유권으로 필터링한
  쿼리에서만 나온다(아래 항목). NCP 콘솔 설정과 무관하게, 이 서버 쪽
  검사가 "이 고객이 이 매물 좌표를 받을 자격이 있는가"를 결정하는
  유일한 경계다.

1. NCP 콘솔에서 Maps → Application 등록. 사용할 API로 **Geocoding**,
   **Static Map**, **Dynamic Map** 셋 다 켠다.
2. Web 서비스 URL을 등록한다(Dynamic Map이 실제로 뜨려면 필수 — 등록하지
   않거나 등록된 값이 실제 접속 URL과 정확히 일치하지 않으면 지도 SDK가
   "실패" 상태로 폴백되고, 매물 목록·정지 지도·주소 텍스트는 계속 정상
   동작한다). **NCP 공식 Maps 문제 해결 문서 기준으로, Web 서비스 URL은
   포트 번호와 경로(URI)를 제외한 프로토콜+호스트만 등록한다** — 예를
   들어 `http://localhost:8080`이 아니라 `http://localhost`로,
   `http://127.0.0.1/main`이 아니라 `http://127.0.0.1`로 등록한다. 쿼리
   스트링·해시(fragment)도 넣지 않는다. 등록 전에는 항상 NCP 콘솔의
   Application Services → Maps → Application → 인증 정보 화면에서 현재
   UI가 요구하는 형식을 최종 기준으로 확인한다:
   - 로컬 개발(`npm run dev`, 포트 무관): `http://localhost` — 포트
     번호(3000 등)는 넣지 않는다. 이 저장소의 E2E(`npx playwright test`,
     포트 3100)는 `NEXT_PUBLIC_NCP_MAP_CLIENT_ID`를 항상 빈 값으로
     덮어써 지도 SDK를 아예 안 띄우므로(`playwright.config.ts`) 별도
     등록이 필요 없다.
   - 현재 운영 배포: `https://onnest-web.vercel.app`
   - 커스텀 도메인 연결 후(예정, 아직 미완료): `https://onnest.co.kr`,
     그리고 `www` 리다이렉트를 쓰기로 하면 `https://www.onnest.co.kr`도
     별도로 추가 등록
   - Vercel이 배포마다 만드는 임시 Preview URL(`*-<hash>.vercel.app`)은
     매번 값이 달라져 Web 서비스 URL로 등록해 관리할 수 없다 — Dynamic
     Map을 Preview 단계에서 확인해야 한다면, 값이 고정되는 별도 스테이징
     도메인(예: Vercel의 프로덕션 브랜치 별칭이나 전용 서브도메인)을 두고
     그 도메인만 등록해 검증한다.
   - 실제로 로컬 수동 검증 중 `navermap_authFailure`(NCP 인증 실패)가
     포트가 포함된 URL(`http://localhost:3000` 등)로 접속했을 때 재현된
     적이 있다 — 스크립트 로딩 자체는 성공해도 등록된 Web 서비스 URL과
     실제 접속 origin(포트 포함 여부까지)이 정확히 일치해야 인증까지
     통과한다는 뜻이므로, 폴백이 뜨면 가장 먼저 등록된 값에 포트·경로가
     남아있지 않은지부터 재확인한다.
3. 발급된 Client ID/Secret을 환경변수에 등록한다. `NEXT_PUBLIC_NCP_MAP_CLIENT_ID`가
   실제로 위 2번에서 확인한 Application의 Client ID와 같은 값인지(다른
   Application의 키를 잘못 넣지 않았는지)도 함께 확인한다.
4. NCP 콘솔의 Maps 이용량·과금 대시보드(Service → AI·NAVER API →
   이용 내역/청구서)에서 Geocoding·Static Map·Dynamic Map 각각의 무료
   할당량과 현재 사용량을 확인한다 — Dynamic Map은 사용자 브라우저가
   직접 호출하므로 트래픽이 늘면 서버 쪽 Geocoding/Static Map과 별도로
   빠르게 과금 구간에 들어갈 수 있다.

| 이름 | 설명 |
| --- | --- |
| `NCP_MAP_CLIENT_ID` | NCP Maps Application의 Client ID(서버 전용 — Geocoding·Static Map) |
| `NCP_MAP_CLIENT_SECRET` | NCP Maps Application의 Client Secret(서버 전용, 브라우저에 절대 노출 안 함) |
| `NEXT_PUBLIC_NCP_MAP_CLIENT_ID` | 인터랙티브 지도(Dynamic Map JS SDK)용 공개 Client ID. 값 자체는 위 `NCP_MAP_CLIENT_ID`와 같아도 되지만 **반드시 별도 환경변수로 등록**한다(NEXT_PUBLIC_ 접두사가 붙은 값은 빌드 시 클라이언트 번들에 그대로 들어간다) |

**동작 방식과 안전장치**:

- Geocoding·Static Map 요청은 모두 서버에서만 호출한다(`src/lib/naverMap.ts`).
  Client Secret은 브라우저로 전달되지 않으며, 정지 지도 이미지도
  `GET /api/my/candidate-properties/[id]/map`이 소유권을 확인한 뒤 좌표를
  DB 캐시(`CandidateProperty.latitude/longitude`)에서 읽어 대신 요청해
  그대로 흘려보낸다 — 클라이언트가 임의의 좌표를 넣어 이 라우트를 익명 지도
  프록시로 악용할 수 없다.
- 인터랙티브 지도(`src/components/app/property-explorer/NaverMapLoader.ts`,
  `InteractivePropertyMap.tsx`)는 공개 Client ID로 브라우저가 직접
  `oapi.map.naver.com`에서 SDK 스크립트를 지연 로딩한다(지도 화면이 실제로
  보일 때만) — 서버를 거치지 않으므로 Client Secret이 이 경로에는 아예
  등장하지 않는다. 마커는 로그인한 고객 자신의 매물과, 그 고객의 프로젝트에
  공유된 매물의 좌표만 쓴다(서버 쿼리가 이미 `userId`/프로젝트 소유권으로
  범위를 좁힌 뒤 내려주는 값이라 업체·다른 고객에게는 애초에 조회되지
  않는다).
- 매물 등록·수정(고객이 직접 저장하는 `CandidateProperty`), 관리자의 매물
  공유·수정(`ProjectPropertySuggestion`) 모두 주소가 있으면(또는 실제로
  바뀌면) 좌표를 한 번만 조회해 캐시한다. 조회에 실패하거나(네트워크
  오류·타임아웃·매칭 결과 없음) 아예 키가 설정돼 있지 않아도 예외를 던지지
  않고 항상 null을 돌려주므로, 저장·공유 자체는 지도 API 상태와 무관하게
  항상 성공한다. 기존에 저장된 행은 이번 변경으로 일괄 재조회하지 않는다 —
  좌표가 없던 행은 계속 null로 남고, 다음에 그 주소를 수정하면 그때 채워진다.
- `NCP_MAP_CLIENT_ID`/`NCP_MAP_CLIENT_SECRET` 둘 중 하나만 설정되면
  `validateServerEnv()`가 시작 시점에 바로 실패시킨다(설정 실수 방지, 소셜
  로그인 provider 쌍과 같은 원칙). `NEXT_PUBLIC_NCP_MAP_CLIENT_ID`는 이
  쌍과 독립적인 선택값이다 — 없으면 인터랙티브 지도가 곧바로 "미설정"
  상태로 폴백되고, 선택된 매물 하나만 기존 정지 지도(직접 저장·관리자
  공유에서 저장한 매물)나 주소 텍스트(아직 저장 전인 공유 매물)로 보인다.
  세 값이 전부 없으면 주소는 항상 텍스트로만 표시된다 — 화면이 깨지지 않는다.
- Static Map 이미지 자체에 네이버 측 표시가 포함되는지와 별개로, 화면에도
  "지도 제공: 네이버 클라우드 플랫폼" 캡션을 함께 표시해 출처 표시 의무를
  보수적으로 지킨다.

### 배포 전 확인

```text
[ ] NCP 콘솔에 로컬·운영 도메인이 Web 서비스 URL로 등록됐는지(정지 지도용 서버 키 + 인터랙티브 지도용 공개 키 둘 다) — 포트 번호·경로 없이 프로토콜+호스트만 등록했는지(예: `http://localhost`, `https://onnest.co.kr`)
[ ] NCP 콘솔에서 이 Application에 Geocoding·Static Map·Dynamic Map API가 모두 켜져 있는지
[ ] NCP 콘솔의 이용량·과금 대시보드에서 무료 할당량 대비 현재 사용량과 과금 발생 여부를 확인했는지
[ ] 실제 주소로 매물을 등록·공유해 지도가 뜨는지, 등록·공유 자체는 항상 성공하는지
[ ] 매물 탐색 화면에서 검색·필터 결과에 맞춰 지도 마커가 바뀌는지, 목록 카드↔마커 선택이 서로 맞물리는지
[ ] NEXT_PUBLIC_NCP_MAP_CLIENT_ID를 지운 상태에서도(로컬 등) 탐색 화면이 깨지지 않고 선택된 매물의 정지 지도/주소 텍스트로 대체되는지
[ ] 환경변수를 전부 지운 상태에서도(로컬 등) 페이지가 깨지지 않고 주소 텍스트만 보이는지
[ ] NCP 콘솔의 Maps 이용약관·표시 의무 최신 내용 재확인(정책은 바뀔 수 있다)
```

## 요청 횟수 제한

`src/lib/clientIp.ts`의 `getClientIp()`는 `x-forwarded-for`(없으면
`x-real-ip`) 헤더에서 클라이언트 IP를 읽는다. 여러 프록시를 거쳐 값이
`client, proxy1, proxy2`처럼 쌓이면 첫 값만 쓰고, 대괄호로 감싼
IPv6·IPv4-mapped IPv6(`::ffff:203.0.113.5`) 표기도 정규화한다. 헤더가
아예 없으면(로컬 등) `"unknown"` 하나로 묶인다.

> **Rate Limit 보안 주의**
> 현재 클라이언트 IP 판별은 신뢰 가능한 프록시 환경을 전제로 합니다.
> 애플리케이션을 프록시 없이 직접 노출하거나 임의의 X-Forwarded-For 헤더를
> 신뢰하면 IP 기반 제한이 우회될 수 있습니다.

**Vercel처럼 신뢰할 수 있는 프록시가 이 헤더를 항상 실제 클라이언트 IP로
채워준다는 전제**가 있다. 신뢰할 수 없는 프록시(또는 프록시 없이 직접 노출)
뒤에 배포하면 클라이언트가 헤더를 마음대로 위조해 IP 기준 제한을 우회할 수
있다 — `x-forwarded-for`는 클라이언트가 보내는 일반 HTTP 헤더이고, 신뢰할 수
있는 프록시가 앞단에서 그 값을 검증된 실제 주소로 덮어써 주지 않는 이상 그대로
믿을 수 없다. **배포 환경이 바뀌면(Vercel → 다른 인프라 등) 이 신뢰 전제도
다시 검토해야 한다.**

로그인은 IP 제한과 별개로 이메일 기준 보조 제한(`loginEmail`)도 걸려 있어, IP를
바꿔가며 시도해도 특정 계정에 대한 시도 총량은 제한된다 — 다만 이 보조 제한도
결국 같은 DB 버킷 모델이라 IP 신뢰 여부와는 무관하게 동작한다(계정 자체를
identifier로 쓰므로).

`getClientIp()` 자체는 단위 테스트(`src/lib/clientIp.test.ts`)로 검증한다:
단일 `x-forwarded-for`, 다중 프록시 체인, `x-real-ip` 폴백, 헤더 없음, 비정상
문자열, 대괄호+포트 붙은 IPv6, IPv4-mapped IPv6 케이스를 포함한다.

## HEIC/HEIF 업로드 범위

문서함 업로드는 `src/lib/documents.ts`의 `detectUploadMimeType()`으로 파일
앞부분의 `ftyp` 박스를 읽어 `heic`, `heix`, `hevc`, `hevx`, `mif1`, `msf1`
브랜드 코드를 확인한다(코드에 실제로 있는 값만 여기 적는다 — 다른 브랜드
코드는 지원하지 않는다). 이 검증이 보장하는 것과 보장하지 않는 것을
구분한다.

```text
HEIC/HEIF 파일은 파일 시그니처(ftyp 박스) 검증을 통과하면 업로드를 허용합니다.
다만 브라우저 미리보기, 서버 측 디코딩, JPEG·WebP 자동 변환은 이 기능에
포함되어 있지 않습니다. 업로드된 HEIC 파일은 원본 그대로 저장되며, 이후
내려받기도 원본 그대로 제공됩니다.
```

즉 "HEIC 완전 지원"이 아니라 **확장자 위장 방지 목적의 시그니처 검증**과
저장·내려받기만 지원한다. 실제 이미지로 디코딩 가능한지, 특정 브라우저에서
미리보기가 뜨는지는 검증하지 않는다.

## RateLimitHit 테이블 유지

`RateLimitHit`은 이전 rate limit 구현(요청마다 행을 하나씩 쌓고 카운트하던
방식)이 쓰던 테이블이다. 현재 `checkRateLimit()`(`src/lib/rateLimit.ts`)은
`RateLimitBucket`(고정 시간창 upsert 방식)만 쓰고 `RateLimitHit`은 신규
코드 어디에서도 참조하지 않는다 — `prisma/schema.prisma`의 모델 주석에도
명시돼 있다.

```text
RateLimitHit는 과거 마이그레이션 호환을 위해 유지됩니다.
현재 신규 rate limit 로직에서는 사용하지 않습니다.
```

**이 작업에서는 테이블을 지우지 않는다.** 삭제하려면 별도 마이그레이션과
운영 승인이 필요하다(이미 쌓인 운영 데이터가 있을 수 있고, 마이그레이션
이력과의 정합성도 확인해야 한다).

## 계정 삭제와 Blob 삭제 실패 정책

계정 삭제(`POST /api/auth/delete-account`)는 사용자가 비밀번호를 다시
확인한 뒤 수행하는 명시적인 탈퇴 요청이다. 이 흐름은 **프로젝트 삭제와 다른
정책**을 쓴다 — 혼동하지 않는다.

```text
사용자가 본인확인을 다시 완료하고 계정 삭제를 명시적으로 요청한 경우,
외부 Blob 삭제 실패만으로 전체 계정 탈퇴를 중단하지 않습니다.
실패한 storageKey는 운영 로그에 남기고, 계정 삭제 절차는 계속 진행합니다.
```

(반대로 프로젝트 삭제는 Blob 삭제가 하나라도 실패하면 DB 레코드를 남겨
재시도할 수 있게 한다 — "이메일 발송" 절 위쪽, P0-1 문서 참고.)

계정 삭제 쪽에서 특히 확인한 사항:

- Blob 삭제 실패는 사용자 화면에 `{ deleted: true }`로만 응답하고 내부
  오류를 노출하지 않는다.
- 실패한 storageKey는 콘솔 로그에 남긴다 — User를 지우는 순간 Document
  행도 cascade로 함께 삭제되므로, 이 로그가 나중에 고아 파일을 정리할
  유일한 단서다. storageKey는 개인정보나 접근 가능한 URL이 아니라 Blob
  안의 내부 경로일 뿐이라 로그에 남겨도 안전하다(Blob은 `private`
  접근이라 키만으로 열 수 없다).
- User 삭제는 Prisma의 단일 `delete()` 호출이 DB의 `ON DELETE CASCADE`로
  Project·Document·PasswordResetToken 등을 함께 지우므로, 애플리케이션
  코드에서 별도 트랜잭션을 감쌀 필요 없이 DB 수준에서 원자적이다.
- 삭제 직후 `session.destroy()`로 현재 세션을 무효화한다. User 행 자체가
  없어졌으므로 같은 이메일로 재로그인은 401로 실패하고, 연관
  PasswordResetToken도 cascade로 함께 사라져 재사용할 수 없다.
- 법적 보존이 필요한 `Inquiry`(문의) 기록은 애초에 계정과 연결돼 있지 않은
  별도 접수 데이터라 계정 삭제의 영향을 받지 않는다.
- 소셜 전용 회원(비밀번호 없음)은 비밀번호 확인 대신 연결된 provider로
  다시 인증해야 한다("소셜 로그인" 절 참고). 단순 로그인 세션만으로는
  삭제가 진행되지 않는다 — provider 재인증 성공 후 5분 안에만 통과한다.
- User 삭제는 `SocialAccount`도 cascade로 함께 지운다. 이는 ONNEST DB의
  연결 기록만 지우는 것이며, Google·Kakao·Naver 쪽의 실제 계정이나 그
  provider에 등록된 앱 연동 권한 자체를 삭제하는 것은 아니다 — 필요하면
  사용자가 각 provider 설정에서 직접 연결을 해제해야 한다(안내 문구에
  이를 명시했다).

## 서버 환경변수 검증

`src/lib/env.ts`의 `validateServerEnv()`가 `src/instrumentation.ts`를 통해
애플리케이션 시작 시(Node.js 런타임, 개발·운영 공통) 한 번 실행된다. 다음이
누락되거나 잘못되면 서버가 뜨는 시점에 바로 실패한다.

- `DATABASE_URL` 미설정
- `SESSION_SECRET` 미설정 또는 32자 미만
- `APP_URL` 미설정(운영에서만 강제 — 로컬은 localhost로 자동 대체)
- `RESEND_API_KEY`/`RESEND_FROM` 둘 중 하나만 설정된 경우
- `ADMIN_NOTIFICATION_EMAIL`이 설정됐지만 이메일 형식이 아닌 경우
- `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`,
  `KAKAO_CLIENT_ID`/`KAKAO_CLIENT_SECRET`,
  `NAVER_CLIENT_ID`/`NAVER_CLIENT_SECRET` — provider별로 둘 중 하나만
  설정된 경우

`BLOB_READ_WRITE_TOKEN`과 `ADMIN_NOTIFICATION_EMAIL`, `CRON_SECRET`, 소셜
로그인 6개 환경변수는 여기서 미설정 자체를 강제하지 않는다 — 없어도 앱은
정상적으로 뜨고, 각각 문서함 업로드 API는 503과 "스토리지 미설정" 안내를,
알림 발송은 콘솔 로그 건너뛰기로, 미설정 provider는 로그인 버튼 숨김으로,
`CRON_SECRET` 미설정은 크론 요청 401로 대체된다.

## 배포 후 확인

```text
[ ] 메인 페이지 접속
[ ] 회원가입·로그인
[ ] 세션 유지 (새로고침 후에도 로그인 상태 유지)
[ ] 프로젝트 생성
[ ] PostgreSQL에 데이터 정상 저장
[ ] 문서 업로드 (BLOB_READ_WRITE_TOKEN 설정 시)
[ ] 이메일 발송 (RESEND_API_KEY 설정 시)
[ ] 비밀번호 재설정 링크 (APP_URL 기준으로 만들어지는지)
[ ] 문의·서비스 신청 시 관리자 알림 메일 수신 (ADMIN_NOTIFICATION_EMAIL·RESEND_API_KEY 둘 다 설정 시)
[ ] 문의 지연 경고 크론 수동 호출 시 200과 정확한 checked/warnings 반환 (CRON_SECRET 설정 시)
[ ] 요청 제한 (429 응답과 재시도 안내 문구)
[ ] 소셜 로그인 (Google/Kakao/Naver 각각 설정 시) — 최초 가입·재로그인·마이페이지 연결·해제
[ ] 계정 삭제 (비밀번호 회원·소셜 전용 회원 각각)
[ ] Blob 삭제 실패 시에도 계정 삭제가 끝까지 진행되는지
[ ] 로그에 비밀번호·토큰·세션·전체 개인정보가 남지 않는지
```

## 고객·관리자·업체 서비스 흐름 — 배포 후 스모크 테스트

자동화 테스트(`npm test`/`test:integration`/`test:e2e`)는 항상 `RESEND_API_KEY`가
없는 환경에서 돈다 — 즉 "이메일 발송 함수가 호출됐다"까지만 검증하고, **실제
메일이 Resend를 거쳐 수신함에 도착했는지는 자동화로 확인하지 못한다.** 아래
두 가지는 반드시 구분해서 보고한다.

- **자동화로 확인됨**: 상태 저장 성공, 저장 실패 시 롤백, 이메일 발송 함수가
  올바른 인자로 호출됐는지, 발송 실패가 저장을 막지 않는지.
- **실제 운영 환경에서 별도로 확인해야 함**: `RESEND_API_KEY`/`RESEND_FROM`이
  설정된 배포 환경에서 진짜 메일이 수신함(스팸함 포함)에 도착하는지, 발신
  도메인 SPF/DKIM이 통과해 스팸 처리되지 않는지.

### 업체 검증 상태 관련 운영 주의사항

이번 변경으로 `Partner.verificationStatus`가 추가됐다. **새로 등록하는 업체는
기본값이 `PENDING`(검토 대기)이라 관리자가 명시적으로 `APPROVED`로 바꾸기
전까지는 고객 요청에 배정할 수 없다** — 배포 후 신규 업체를 등록했는데
배정 후보 목록에 나타나지 않으면 가장 먼저 이 상태부터 확인한다
(`/admin/partners`에서 검증 상태 변경). 기존에 이미 등록돼 있던 업체는
마이그레이션으로 `APPROVED`로 일괄 전환됐으므로 영향받지 않는다.

### 스모크 테스트 체크리스트

```text
[ ] 고객 계정으로 로그인 → 프로젝트 생성 → 서비스 신청 접수 확인
[ ] 신청 직후 안내 문구("영업일 기준 1일 이내...")와 서비스 범위 고지가 보이는지
[ ] 관리자 알림 메일이 실제로 수신되는지 (ADMIN_NOTIFICATION_EMAIL 설정 시)
[ ] 관리자 로그인 → 서비스 리드 목록에서 방금 신청이 검색되는지
[ ] 관리자가 APPROVED 상태의 업체를 배정 → 저장 성공
[ ] 업체 배정 알림 메일이 실제로 수신되는지
[ ] 업체 계정으로 로그인 → 배정된 요청 확인 → 수락 → 견적 등록
[ ] 상태를 "견적 전달"로 변경 → 고객에게 실제 메일이 수신되는지
[ ] 고객이 마이페이지·프로젝트 서비스 화면에서 견적을 확인하고 선택
[ ] 업체가 고객 선택을 확인 → 작업 예정 → 작업 중 → 작업 완료로 순서대로 변경
[ ] 작업 완료 알림 메일이 실제로 수신되는지
[ ] 고객이 최종 상태와 활동 이력을 확인 (업체 내부 메모·연락기록이 보이지 않는지도 함께 확인)
[ ] 고객이 배정 전 신청을 직접 취소 → 즉시 "취소" 상태로 반영되는지
[ ] 고객이 배정 후 취소를 요청(사유 포함) → 관리자·업체 화면에 표시되는지, 알림 메일이 실제 수신되는지
[ ] 관리자가 미배정 요청에 "연결 어려움 안내"를 발송 → 고객 화면에 내부 사유 없이 고정 문구만 보이는지, 안내 메일이 실제 수신되는지
[ ] PENDING/REJECTED/SUSPENDED 업체가 배정 후보 목록에 나타나지 않는지
[ ] 서비스 유형이 다른 업체가 배정 후보 목록에 나타나지 않는지
[ ] 조회전용 관리자 계정으로 로그인 시 상태·배정 변경 버튼이 보이지 않는지
[ ] 모바일 폭(360~390px)에서 위 화면들에 가로 스크롤이 생기지 않는지
```

## 제한된 베타 운영 정책

현재 구현 수준(파트너 검증 게이트, 고객 취소·알림, 관리자 미배정 관리,
역할별 권한 분리, E2E 130개·단위 710개·통합 31개 테스트 통과)은 소수 실제
고객을 상대로 한 **제한된 프라이빗 베타**에 적합하다고 판단한다. 아직
결제·구독, 지역/서비스 유형별 자동 매칭, 다건 동시 처리를 전제로 한 대량
트래픽 대응은 구현돼 있지 않으므로 전면 공개(오픈 베타)나 유료 운영 단계로는
아직 이르다.

**권장 순서**:

1. 특정 지역 1곳 + 서비스 유형 1~2개(예: 이사)로 시작 — 관리자가 배정
   후보를 쉽게 좁혀볼 수 있는 범위.
2. 실제 검증(`APPROVED`) 완료된 업체 소수(1~3곳)로 시작 — 검증 상태
   게이트가 이미 막아주므로, 관리자가 신뢰하는 업체만 `APPROVED`로
   전환하면 그 자체가 운영 범위 제한 수단이 된다.
3. 관리자가 실시간으로 확인·응대 가능한 신청량으로 제한 — 코드에 일일
   신청 건수 상한을 하드코딩하지 않는다(요청과 실제 명시돼 있음). 기존
   `serviceRequest` rate limit(IP당 시간당 10건)은 남용 방지용이지 운영
   정책 도구가 아니다 — 신청량 자체를 제한하고 싶다면 관리자 운영으로
   조절하거나(예: 신청 폼 노출 범위를 좁힘), 별도 논의를 거쳐 명시적인
   비즈니스 규칙으로 추가한다.
4. 지인·소규모 실제 고객 3~5명으로 먼저 시작해 전체 흐름(신청→배정→견적→
   선택→작업→완료)이 실제로 끊기지 않는지 확인한다.
5. 위 사이클에서 실제 요청 10~20건을 무리 없이 처리한 뒤 지역·서비스
   유형·업체 수를 단계적으로 넓힌다.

이 문서의 "배포 후 확인"·바로 위 스모크 테스트 체크리스트를 각 확장
단계 직전에 다시 수행하는 것을 권장한다.

## 롤백·백업 주의사항

- 마이그레이션을 적용하기 전에는 항상 운영 DB 백업을 먼저 받는다.
- 이번 baseline(`20260802033000_postgresql_baseline`)은 신규·빈 DB
  전용이다. 이미 데이터가 있는 DB에 실수로 적용했다면 백업에서 복구하고,
  `_prisma_migrations` 이력부터 다시 진단한다 — `migrate reset`으로
  "해결"하지 않는다(데이터가 지워진다).
- 마이그레이션 롤백용 `down` 스크립트는 Prisma가 자동 생성하지 않는다.
  스키마를 되돌려야 한다면 반대 방향 마이그레이션을 새로 작성해 적용한다.
