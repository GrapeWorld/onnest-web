# ONNEST

집·사무실·공장 입주 준비를 프로젝트로 관리하는 주거 전환 플랫폼입니다.
Next.js 15(App Router), TypeScript, Tailwind CSS, Prisma로 만들었습니다.

## 시작하기

```bash
npm install
cp .env.example .env
# .env의 DATABASE_URL을 개발용 Postgres 연결 문자열로 변경
npx prisma migrate dev
npm run dev
```

`.env`의 `SESSION_SECRET`은 아래로 만들어 넣습니다.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 구현된 기능

- 회원가입·로그인·로그아웃 (bcrypt 해싱, iron-session 쿠키, 약관 동의 기록)
- 아이디 찾기(이름·휴대폰 대조 후 가입 이메일 안내), 비밀번호 찾기·재설정(이메일 링크) — 모두 이메일로 발송
- 입주 프로젝트 생성·수정·삭제 (집/사무실/공장/기타)
- 입주 10단계 진행 상태와 단계별 체크리스트 저장
- 인수인계서 작성·조회·링크 공유 (기본 비공개, 개인정보·금칙 표현 서버 검증)
- 입주 일정 관리
- 입주 서비스 연결 신청 (이사·청소·인터넷·보수·인테리어)
- 문서함 업로드·내려받기·삭제 (Vercel Blob 비공개 저장)
- 문의 접수와 관리자 문의함·서비스 리드·회원·인수인계서 관리
- 요청 횟수 제한, 회원 탈퇴와 데이터 삭제

모든 프로젝트 데이터는 소유자만 접근할 수 있고, 관리자 화면은 `role: admin`
계정만 열 수 있습니다.

## 아직 없는 것

MVP 범위 밖으로 미룬 기능입니다.

- 매물 검색 (`/search`, `/buildings/[id]` 코드는 남아 있으나 내비게이션에서 숨김)
- 결제·구독, 리워드, 파트너 자동 매칭, AI 자동 검수
- 문의·신청 이메일 알림 (아이디/비밀번호 찾기와 같은 발송 서비스 API 키가 필요. [docs/DEPLOY.md](docs/DEPLOY.md) 참고)

## 명령어

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | ESLint |
| `npm test` | 보안·데이터 정합성 단위 테스트 |
| `npm run test:integration` | 임베디드 Postgres migration·동시성 통합 테스트 |
| `npm run format` | Prettier |
| `npm run test:content` | 금칙 표현·문구 검사 |
| `npm run db:check-postgres` | Prisma 스키마의 Postgres 이식성 검사 |
| `npm run set-admin -- 이메일` | 관리자 권한 부여 |

## 데이터베이스

로컬과 배포 모두 Postgres를 씁니다. 모델을 바꾼 뒤에는 migration을 만들고
`npm run db:check-postgres`로 빈 DB 기준 스키마 SQL 생성을 확인합니다. 이전
SQLite migration은 `prisma/migrations-sqlite-legacy`에 참고용으로만 보관합니다.
환경변수와 배포 절차는 [docs/DEPLOY.md](docs/DEPLOY.md)에 있습니다.
