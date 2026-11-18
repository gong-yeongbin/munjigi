import { useQuery } from '@tanstack/react-query';
import { cn } from 'cn';
import { type ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { getMe } from '@/api/users';
import { clearToken, getToken } from '@/auth/token';
import { buttonVariants } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useScope } from '@/config';

// 상단 메뉴. 페이지가 생기면 여기 경로만 바꾼다. open이 true면 login 범위에서도 보인다
const NAV = [
	{ to: '/developers', label: '개발자', open: false },
	{ to: '/docs', label: '문서', open: false },
	{ to: '/pricing', label: '요금', open: true },
];

// 시작 버튼이 "준비 중"인 경우. 랜딩만 공개했거나, 로그인은 됐지만 대시보드가 아직 안 열렸을 때. 랜딩과 요금이 같이 쓴다
export function useWaiting() {
	const scope = useScope();
	return scope === 'landing' || (scope === 'login' && getToken() !== null);
}

// 로그인한 사람의 상단 메뉴. 구글 프로필 사진 동그라미를 누르면 이메일, 대시보드·설정(비활성), 로그아웃.
// 사진이 없거나 못 불러오면 이름 첫 글자. 구글 사진 주소는 리퍼러가 있으면 거부하므로 no-referrer
function AccountMenu({ onLogout }: { onLogout: () => void }) {
	const me = useQuery({ queryKey: ['me'], queryFn: getMe });
	const [broken, setBroken] = useState(false);
	const avatar = broken ? null : (me.data?.avatar_url ?? null);
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={<button type="button" aria-label="내 계정" />}
				className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-semibold text-sand"
			>
				{avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" className="size-full object-cover" onError={() => setBroken(true)} /> : me.data?.name.slice(0, 1)}
			</DropdownMenuTrigger>
			{/* 기본 팝업은 트리거(40px 동그라미) 폭에 맞춰져 이메일이 잘린다. 내용 폭으로 */}
			<DropdownMenuContent align="end" className="w-max min-w-48 max-w-80">
				{me.data && <p className="truncate px-1.5 py-1 text-sm text-muted-foreground">{me.data.email}</p>}
				<DropdownMenuSeparator />
				{/* 대시보드가 열리기 전까지 비활성. 열리면 /app·/app/settings로 보낸다 */}
				<DropdownMenuItem disabled>대시보드</DropdownMenuItem>
				<DropdownMenuItem disabled>설정</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={onLogout}>로그아웃</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

// 로그인 전 화면(랜딩·요금)의 공통 틀. 모래색 바탕, 워드마크 왼쪽, 글자 링크 오른쪽. 푸터는 맨 아래 한 줄
export function PublicLayout({ children }: { children: ReactNode }) {
	const { pathname } = useLocation();
	const scope = useScope();
	// 로그인만 열린 배포에서는 로그인한 사람도 랜딩에 머문다. 그때 상단에는 프로필 메뉴만 두고, 로그아웃은 대시보드와 같이 /login으로
	const navigate = useNavigate();
	const loggedIn = scope === 'login' && getToken() !== null;
	const logout = () => {
		clearToken();
		void navigate('/login', { replace: true });
	};
	return (
		<div className="min-h-screen bg-sand text-primary">
			<header className="wrap flex items-center justify-between pt-7">
				<Link to="/" className="font-heading text-2xl font-bold tracking-tight">
					munjigi
				</Link>
				<nav className="flex items-center gap-7 text-[15px]">
					{/* 메뉴는 전부 공개할 때. login 범위에서는 open인 것(요금)만. 로그인·시작하기는 로그인이 열려 있으면 둔다 */}
					{scope !== 'landing' &&
						NAV.filter((item) => scope === 'all' || item.open).map((item) => (
							<Link key={item.to} to={item.to} className={cn('underline-offset-4 hover:underline', pathname === item.to ? 'font-semibold' : 'text-cobalt-muted')}>
								{item.label}
							</Link>
						))}
					{loggedIn && <AccountMenu onLogout={logout} />}
					{scope !== 'landing' && !loggedIn && (
						<>
							<Link to="/login" className="text-cobalt-muted underline-offset-4 hover:underline">
								로그인
							</Link>
							<Link to="/login" className={buttonVariants({ size: 'lg' })}>
								시작하기
							</Link>
						</>
					)}
				</nav>
			</header>

			<main>{children}</main>

			{/* 푸터는 한 줄. 왼쪽에 설명·GitHub, 오른쪽에 저작권. 앞 블록에 바로 붙는다 */}
			<footer className="wrap flex items-baseline gap-6 py-10 text-[15px] text-cobalt-muted">
				<span>웹훅 수신 게이트웨이</span>
				<a href="https://github.com/gong-yeongbin/munjigi" target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
					GitHub
				</a>
				<span className="ml-auto">© 2026 munjigi</span>
			</footer>
		</div>
	);
}

// 아직 없는 공개 페이지 자리
export function ComingSoon({ title }: { title: string }) {
	return (
		<PublicLayout>
			<section className="wrap pt-[110px]">
				<h1 className="text-[40px] font-bold tracking-tight">{title}</h1>
				<p className="mt-3 text-lg text-cobalt-muted">준비 중입니다.</p>
			</section>
		</PublicLayout>
	);
}
