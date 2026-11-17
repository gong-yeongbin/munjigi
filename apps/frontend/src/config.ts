import { createContext, useContext } from 'react';

// 지금 공개하는 범위. 환경 변수가 아니라 코드 상수다. 테스트는 App에 값을 넘겨 원하는 범위로 돈다.
// landing: 랜딩 한 장만. 다른 경로는 /로, 상단 메뉴·시작 버튼 숨김.
// login: 랜딩과 로그인만. 로그인 뒤 /app/*는 "준비 중" 화면 하나. 요금·문서 등 나머지 경로는 /로.
// all: 전부. 기능이 준비되면 이 값으로 바꾼다
export type Scope = 'landing' | 'login' | 'all';
export const SCOPE: Scope = 'login';

export const ScopeContext = createContext<Scope>('all');
export const useScope = () => useContext(ScopeContext);
