-- Partner.memo 컬럼 하나를 관리자 전용 메모(adminMemo)와 파트너가 직접
-- 쓰는 소개(companyDescription)로 분리한다. 지금까지 이 필드는 관리자
-- 화면(PartnerEditForm)에서만 "내부 메모"로 채워졌으므로, 기존 값은 전부
-- 관리자가 작성한 것으로 보고 adminMemo로 백필한다. companyDescription은
-- 파트너가 예전 관리자 메모를 그대로 보게 되는 걸 막기 위해 빈 값으로
-- 시작한다.

ALTER TABLE "Partner" ADD COLUMN "adminMemo" TEXT;

UPDATE "Partner" SET "adminMemo" = "memo" WHERE "memo" IS NOT NULL;

ALTER TABLE "Partner" RENAME COLUMN "memo" TO "companyDescription";

UPDATE "Partner" SET "companyDescription" = NULL;
