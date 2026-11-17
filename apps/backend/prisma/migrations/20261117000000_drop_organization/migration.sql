-- 조직 모델 제거(2026-11-17). user가 project를 직접 소유하고 plan은 user에 붙는다.
-- 기존 행은 조직의 owner 멤버를 소유자로 옮긴 뒤 조직·멤버·초대 테이블을 지운다.

-- user.plan: owner인 조직의 plan을 물려받는다(없으면 free)
ALTER TABLE "user" ADD COLUMN "plan" "Plan" NOT NULL DEFAULT 'free';
UPDATE "user" u
SET "plan" = o."plan"
FROM "organization_member" m
JOIN "organization" o ON o."id" = m."organization_id"
WHERE m."user_id" = u."id" AND m."role" = 'owner';

-- project.user_id ← 조직 owner. 컬럼을 지우면 organization_id의 인덱스·FK·식 인덱스도 같이 지워진다
ALTER TABLE "project" ADD COLUMN "user_id" INTEGER;
UPDATE "project" p
SET "user_id" = m."user_id"
FROM "organization_member" m
WHERE m."organization_id" = p."organization_id" AND m."role" = 'owner';
ALTER TABLE "project" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "project" DROP COLUMN "organization_id";
ALTER TABLE "project" ADD CONSTRAINT "project_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "project_user_id_idx" ON "project"("user_id");
-- 같은 user 안에서 project 이름은 대소문자를 무시하고 유일하다. 식 인덱스라 Prisma 스키마로 표현할 수 없어 직접 추가한다
CREATE UNIQUE INDEX "project_user_id_lower_name_key" ON "project"("user_id", lower("name"));

-- subscription.user_id ← 조직 owner
ALTER TABLE "subscription" ADD COLUMN "user_id" INTEGER;
UPDATE "subscription" s
SET "user_id" = m."user_id"
FROM "organization_member" m
WHERE m."organization_id" = s."organization_id" AND m."role" = 'owner';
ALTER TABLE "subscription" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "subscription" DROP COLUMN "organization_id";
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "subscription_user_id_key" ON "subscription"("user_id");

-- usage_period.user_id ← 조직 owner
ALTER TABLE "usage_period" ADD COLUMN "user_id" INTEGER;
UPDATE "usage_period" up
SET "user_id" = m."user_id"
FROM "organization_member" m
WHERE m."organization_id" = up."organization_id" AND m."role" = 'owner';
ALTER TABLE "usage_period" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "usage_period" DROP COLUMN "organization_id";
ALTER TABLE "usage_period" ADD CONSTRAINT "usage_period_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "usage_period_user_id_period_start_key" ON "usage_period"("user_id", "period_start");

-- 조직·멤버·초대 테이블과 enum 제거
DROP TABLE "invitation";
DROP TABLE "organization_member";
DROP TABLE "organization";
DROP TYPE "InvitationRole";
DROP TYPE "MemberRole";
