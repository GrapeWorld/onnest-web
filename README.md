# ONNEST

집·사무실·공장 입주 준비를 프로젝트로 관리하는 주거 전환 플랫폼입니다.
Next.js 15(App Router), TypeScript, Tailwind CSS, Prisma로 만들었습니다.

## 시작하기

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

`.env`의 `SESSION_SECRET`은 아래로 만들어 넣습니다.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 구현된 기능

- 회원가입·로그인·로그아웃 (bcrypt 해싱, iron-session 쿠키, 약관 동의 기록)
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
- 문의·신청 이메일 알림 (발송 서비스 API 키 필요)
- 비밀번호 재설정

## 명령어

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run test:content` | 금칙 표현·문구 검사 |
| `npm run db:check-postgres` | Prisma 스키마의 Postgres 이식성 검사 |
| `npm run set-admin -- 이메일` | 관리자 권한 부여 |

## 데이터베이스

로컬은 SQLite, 배포는 Postgres를 씁니다. 스키마는 항상 Postgres 이식성을
유지하며, 모델을 바꾼 뒤에는 `npm run db:check-postgres`로 확인합니다.
전환 절차와 환경변수는 [docs/DEPLOY.md](docs/DEPLOY.md)에 있습니다.
