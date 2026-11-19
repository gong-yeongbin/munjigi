import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { decideGoogleLogin } from './domain/google-login';
import { ACCOUNT_REPOSITORY, type AccountRepository } from './ports/account.repository';
import { GOOGLE_ID_TOKEN_VERIFIER, type GoogleIdTokenVerifier } from './ports/google-id-token.verifier';
import { TOKEN_ISSUER, type TokenIssuer } from './ports/token.issuer';
import { newSigningSecret } from '@/modules/projects/domain/signing-secret';

export const DEFAULT_PROJECT_NAME = 'default';

@Injectable()
export class AuthService {
	constructor(
		@Inject(GOOGLE_ID_TOKEN_VERIFIER) private readonly google: GoogleIdTokenVerifier,
		@Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
		@Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuer,
	) {}

	// projectName은 가입일 때만 쓴다. 랜딩의 새 프로젝트 폼에서 넘어온 이름
	async loginWithGoogle(idToken: string, projectName?: string): Promise<{ access_token: string }> {
		const profile = await this.google.verify(idToken);
		if (!profile) throw new UnauthorizedException({ code: 'unauthenticated', message: '구글 토큰이 유효하지 않습니다.' });

		const decision = decideGoogleLogin({
			identity_user_id: await this.accounts.findUserIdByGoogleSub(profile.sub),
			email_user_id: await this.accounts.findUserIdByEmail(profile.email),
			email_verified: profile.email_verified,
		});

		let userId: number;
		switch (decision.kind) {
			case 'reject':
				throw new UnauthorizedException({ code: 'unauthenticated', message: '구글에서 검증되지 않은 이메일입니다.' });
			case 'link':
				await this.accounts.linkGoogleIdentity(decision.user_id, profile.sub);
				userId = decision.user_id;
				break;
			case 'login':
				userId = decision.user_id;
				break;
			case 'signup':
				// 가입하면 프로젝트 하나를 같이 만든다. 빈 대시보드로 시작하지 않게
				userId = await this.accounts.signUpWithGoogle(profile, { name: projectName?.trim() || DEFAULT_PROJECT_NAME, signing_secret: newSigningSecret() });
				break;
		}

		return { access_token: await this.tokens.issue(userId) };
	}
}
