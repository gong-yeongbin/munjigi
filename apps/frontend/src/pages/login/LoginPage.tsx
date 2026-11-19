import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { loginWithGoogle } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { renderGoogleButton } from '@/auth/google';
import { getToken, setToken } from '@/auth/token';
import { Button } from '@/components/ui/button';
import { useScope } from '@/config';

// 가입과 로그인이 같은 버튼이다. 구글 계정을 고르면 ID 토큰을 백엔드에 넘겨 우리 JWT를 받는다.
// VITE_GOOGLE_CLIENT_ID가 없는 로컬에서는 .env.local의 VITE_DEV_TOKEN(시드 유저)으로 들어가는 개발용 버튼
export function LoginPage() {
	// 렌더 때 읽는다(테스트가 바꿔 끼울 수 있게)
	const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || undefined;
	// 대시보드가 열려 있으면(all) 거기로, 아니면 랜딩으로
	const home = useScope() === 'all' ? '/app' : '/';
	const navigate = useNavigate();
	// 랜딩의 새 프로젝트 폼이 넘긴 이름. 가입이면 백엔드가 이 이름으로 첫 프로젝트를 만든다
	const projectName = useSearchParams()[0].get('project') ?? undefined;
	const slot = useRef<HTMLDivElement>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const loggedIn = getToken() !== null;

	useEffect(() => {
		if (loggedIn || !CLIENT_ID || !slot.current) return;
		renderGoogleButton(slot.current, CLIENT_ID, async (idToken) => {
			setBusy(true);
			setError(null);
			try {
				setToken(await loginWithGoogle(idToken, projectName));
				void navigate(home, { replace: true });
			} catch (e) {
				setError(errorMessage(e));
				setBusy(false);
			}
		}).catch((e: unknown) => setError(errorMessage(e)));
	}, [loggedIn, navigate, CLIENT_ID, home, projectName]);

	if (loggedIn) return <Navigate to={home} replace />;

	const devLogin = () => {
		setToken(import.meta.env.VITE_DEV_TOKEN || 'dev');
		void navigate(home, { replace: true });
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-paper-2">
			<div className="w-[400px] rounded-lg bg-card px-8 py-10 text-center text-card-foreground">
				<Link to="/" className="font-heading text-2xl font-bold tracking-tight text-primary">
					munjigi
				</Link>
				{CLIENT_ID ? (
					<div ref={slot} aria-label="Google 계정으로 로그인" aria-busy={busy} className="mt-8 flex min-h-[44px] justify-center" />
				) : (
					<Button type="button" size="lg" className="mt-8 w-full" onClick={devLogin}>
						Google 계정으로 로그인
					</Button>
				)}
				{busy && <p className="mt-3 text-[13px] text-muted-foreground">로그인하는 중</p>}
				{error && (
					<p role="alert" className="mt-3 text-[13px] text-destructive">
						{error}
					</p>
				)}
				<p className="mt-4 text-[13px] text-muted-foreground">처음 로그인하면 계정이 자동으로 만들어집니다</p>
			</div>
		</div>
	);
}
