import { Injectable } from '@nestjs/common';
import { CipherService } from '@/infra/cipher/cipher.service';
import { PrismaService } from '@/infra/prisma/prisma.service';
import type { AccountRepository } from '../ports/account.repository';
import type { GoogleProfile } from '../ports/google-id-token.verifier';

@Injectable()
export class PrismaAccountRepository implements AccountRepository {
	constructor(
		private readonly prisma: PrismaService,
		private readonly cipher: CipherService,
	) {}

	async findUserIdByGoogleSub(sub: string): Promise<number | null> {
		const identity = await this.prisma.user_identity.findUnique({
			where: { provider_provider_user_id: { provider: 'google', provider_user_id: sub } },
			select: { user_id: true },
		});
		return identity?.user_id ?? null;
	}

	async findUserIdByEmail(email: string): Promise<number | null> {
		const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
		return user?.id ?? null;
	}

	async linkGoogleIdentity(userId: number, sub: string): Promise<void> {
		await this.prisma.user_identity.create({ data: { user_id: userId, provider: 'google', provider_user_id: sub } });
	}

	async signUpWithGoogle(profile: GoogleProfile, project: { name: string; signing_secret: string }): Promise<number> {
		const user = await this.prisma.user.create({
			data: {
				email: profile.email,
				name: profile.name,
				avatar_url: profile.picture,
				identities: { create: { provider: 'google', provider_user_id: profile.sub } },
				projects: { create: { name: project.name, signing_secret_enc: this.cipher.encrypt(project.signing_secret) } },
			},
			select: { id: true },
		});
		return user.id;
	}
}
