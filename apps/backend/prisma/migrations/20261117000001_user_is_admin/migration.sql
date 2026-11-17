-- 서비스 관리자 구분. 쓰는 곳(어드민 화면·API)은 다음 단계. 값은 SQL로만 바꾼다
ALTER TABLE "user" ADD COLUMN "is_admin" BOOLEAN NOT NULL DEFAULT false;
