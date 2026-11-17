import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, useContext, useState } from 'react';
import { createProject, listProjects, type Project } from '@/api/projects';

// 지금 보고 있는 프로젝트. 내 프로젝트 목록을 한 번 읽고, 고른 프로젝트는 이 브라우저에 기억한다
const KEY = 'munjigi.project';
const remembered = () => {
	try {
		return localStorage.getItem(KEY);
	} catch {
		return null;
	}
};

export type ProjectContext = {
	projects: Project[];
	current: Project | null;
	loading: boolean;
	select: (projectId: number) => void;
	create: (name: string) => Promise<Project>;
};

const Context = createContext<ProjectContext | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
	const client = useQueryClient();
	const [selected, setSelected] = useState<string | null>(remembered);

	const query = useQuery({ queryKey: ['projects'], queryFn: listProjects });

	const projects = query.data ?? [];
	const current = projects.find((p) => String(p.id) === selected) ?? projects[0] ?? null;

	const select = (projectId: number) => {
		setSelected(String(projectId));
		try {
			localStorage.setItem(KEY, String(projectId));
		} catch {
			// 기억 못 해도 동작엔 지장 없다
		}
	};
	const create = async (name: string) => {
		const created = await createProject(name);
		await client.invalidateQueries({ queryKey: ['projects'] });
		select(created.id);
		return created;
	};

	return <Context.Provider value={{ projects, current, loading: query.isPending, select, create }}>{children}</Context.Provider>;
}

export function useProject(): ProjectContext {
	const value = useContext(Context);
	if (!value) throw new Error('ProjectProvider 밖에서 useProject를 불렀다');
	return value;
}
