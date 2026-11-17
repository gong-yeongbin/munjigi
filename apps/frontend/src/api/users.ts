import { api } from './client';

// 백엔드 DTO 그대로(snake_case). plan은 상한·보존일의 기준, is_admin은 서비스 관리자 표시(아직 쓰는 화면 없음)
export type Me = { id: number; email: string; name: string; avatar_url: string | null; plan: 'free' | 'team' | 'business'; is_admin: boolean; created_at: string; updated_at: string };

export const getMe = async () => (await api.get<Me>('/users/me')).data;
