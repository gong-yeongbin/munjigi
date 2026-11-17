import { api, type Page } from './client';

// 조직 없이 user가 project를 직접 소유한다. 백엔드 DTO 그대로(snake_case)
export type Project = { id: number; user_id: number; name: string; suspended_at: string | null };

export const listProjects = async () => (await api.get<Page<Project>>('/projects', { params: { limit: 200 } })).data.data;
export const createProject = async (name: string) => (await api.post<Project>('/projects', { name })).data;
export const updateProject = async (id: number, name: string) => (await api.patch<Project>(`/projects/${id}`, { name })).data;
// 안의 소스·목적지·이벤트·전달 기록이 전부 같이 지워진다
export const deleteProject = async (id: number) => {
	await api.delete(`/projects/${id}`);
};
// 전달 서명 키. 목적지가 X-Munjigi-Signature를 검증할 때 쓴다
export const getSigningSecret = async (id: number) => (await api.get<{ signing_secret: string }>(`/projects/${id}/signing-secret`)).data.signing_secret;
export const rotateSigningSecret = async (id: number) => (await api.post<{ signing_secret: string }>(`/projects/${id}/signing-secret/rotate`)).data.signing_secret;
