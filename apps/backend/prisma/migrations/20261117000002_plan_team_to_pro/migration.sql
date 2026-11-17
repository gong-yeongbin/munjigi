-- 유료 플랜 이름 team → pro. 조직을 없앤 뒤로 플랜은 사용자 한 명이 사므로 "팀"이 맞지 않는다. 기존 행의 값도 같이 바뀐다
ALTER TYPE "Plan" RENAME VALUE 'team' TO 'pro';
ALTER TYPE "SubscriptionPlan" RENAME VALUE 'team' TO 'pro';
