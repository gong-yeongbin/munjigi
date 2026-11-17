export interface ProjectAccessRepository {
	// project가 그 user의 것이면 true. 없는 project도 false(가드가 404로 바꾼다)
	isOwner(projectId: number, userId: number): Promise<boolean>;
}

export const PROJECT_ACCESS_REPOSITORY = Symbol('ProjectAccessRepository');
