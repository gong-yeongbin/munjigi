import type { GoogleProfile } from './google-id-token.verifier';

export interface AccountRepository {
	findUserIdByGoogleSub(sub: string): Promise<number | null>;
	findUserIdByEmail(email: string): Promise<number | null>;
	linkGoogleIdentity(userId: number, sub: string): Promise<void>;
	// user(plan free) + user_identity를 만든다
	signUpWithGoogle(profile: GoogleProfile): Promise<number>;
}

export const ACCOUNT_REPOSITORY = Symbol('AccountRepository');
