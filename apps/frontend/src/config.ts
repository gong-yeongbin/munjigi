import { createContext, useContext } from 'react';

// 지금 공개하는 범위. 환경 변수가 아니라 코드 상수다. 테스트는 App에 값을 넘겨 원하는 범위로 돈다.
// landing: 랜딩 한 장만. 다른 경로는 /로, 상단 메뉴·시작 버튼 숨김.
// login: 랜딩·로그인·요금·문서. 상단 메뉴는 문서·요금. 로그인 뒤에도 랜딩에 머물고 /app/*·개발자는 /로.
// all: 전부.
// admin: 관리자(user.is_admin)에게는 all, 나머지에게는 login. 지금 배포 값(2026-11-19). App이 둘 중 하나로 풀어 내려보내므로 화면은 admin을 보지 않는다
export type Scope = 'landing' | 'login' | 'all';
export const SCOPE: Scope | 'admin' = 'admin';

export const ScopeContext = createContext<Scope>('all');
export const useScope = () => useContext(ScopeContext);
