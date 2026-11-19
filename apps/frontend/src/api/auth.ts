import { api } from './client';

// 구글 ID 토큰 → 우리 JWT(7일). 첫 로그인이면 백엔드가 계정(free)과 프로젝트 하나를 만든다.
// projectName은 그 프로젝트의 이름(랜딩 폼에서 넘어온 값). 없으면 백엔드가 default로 만든다
export const loginWithGoogle = async (idToken: string, projectName?: string) => (await api.post<{ access_token: string }>('/auth/google', { id_token: idToken, project_name: projectName })).data.access_token;
