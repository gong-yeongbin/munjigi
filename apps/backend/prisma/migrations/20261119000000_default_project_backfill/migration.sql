-- 프로젝트가 하나도 없는 기존 계정에 default 프로젝트를 채운다. 가입 때 프로젝트를 같이 만들기 전에 가입한 계정이 대상이다.
-- 서명 키는 앱의 암호화 키로만 만들 수 있어 NULL로 둔다. 처음 조회하거나 처음 전달할 때 앱이 만든다
INSERT INTO "project" ("user_id", "name")
SELECT u."id", 'default'
FROM "user" u
WHERE NOT EXISTS (SELECT 1 FROM "project" p WHERE p."user_id" = u."id");
