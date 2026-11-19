// 문서 화면. 공개 틀 안에 왼쪽 장 목록, 가운데 본문, 오른쪽 "이 장의 내용"을 둔다. 장마다 주소 하나(/docs/:chapter)
import { cn } from 'cn';
import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { CHAPTERS, type Chapter, sectionsOf } from './chapters';
import { useScope } from '@/config';
import { PublicLayout } from '@/layout/PublicLayout';

// /docs와 없는 장은 첫 장으로 보낸다. 대시보드가 아직 닫혀 있으면 따라 할 수 없다는 안내를 위에 둔다
export function DocsPage() {
	const { chapter } = useParams();
	const scope = useScope();
	const index = CHAPTERS.findIndex((item) => item.slug === chapter);
	const current = CHAPTERS[index];

	// 장을 옮기면 맨 위에서 읽기 시작한다. 라우터는 스크롤 위치를 그대로 둔다
	useEffect(() => {
		document.documentElement.scrollTop = 0;
	}, [chapter]);

	if (!current) return <Navigate to={`/docs/${CHAPTERS[0]!.slug}`} replace />;
	const sections = sectionsOf(current);

	return (
		<PublicLayout>
			<section className="wrap pt-[110px] pb-[160px]">
				<p className="text-[40px] font-bold tracking-tight">문서</p>
				{scope !== 'all' && <p className="mt-6 rounded-lg bg-paper-2 px-6 py-4 text-[15px]">대시보드는 아직 준비 중입니다. 이 문서는 대시보드가 열렸을 때의 사용 방법을 미리 안내합니다.</p>}

				{/* 좁은 화면(1280px 미만)에서는 오른쪽 열을 접고 본문 폭을 지킨다 */}
				<div className="mt-12 grid grid-cols-[220px_minmax(0,1fr)] items-start gap-14 xl:grid-cols-[220px_minmax(0,1fr)_200px]">
					{/* 지금 장은 칸으로 표시하고 무엇을 다루는지 한 줄을 붙인다. 스크롤해도 따라온다 */}
					<nav aria-label="문서 목차" className="sticky top-8 flex flex-col gap-1">
						{CHAPTERS.map((item) => {
							const active = item.slug === current.slug;
							return (
								<Link key={item.slug} to={`/docs/${item.slug}`} aria-current={active ? 'page' : undefined} className={cn('rounded-lg px-4 py-3 transition-colors', active ? 'bg-paper-2' : 'hover:bg-paper-2/60')}>
									<span className={cn('block text-[15px]', active ? 'font-semibold' : 'font-medium')}>{item.title}</span>
									<span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">{item.hint}</span>
								</Link>
							);
						})}
					</nav>

					<article className="text-base">
						<h1 className="text-[30px] font-bold tracking-tight">{current.title}</h1>
						<p className="mt-4 text-lg leading-relaxed text-ink-muted">{current.lead}</p>
						{current.body}

						{/* 앞 장과 다음 장. 없는 쪽은 비워 자리를 지킨다 */}
						<nav aria-label="앞뒤 장" className="mt-20 grid grid-cols-2 gap-2">
							<Step chapter={CHAPTERS[index - 1]} label="이전" />
							<Step chapter={CHAPTERS[index + 1]} label="다음" align="right" />
						</nav>
					</article>

					<nav aria-label="이 장의 내용" className="sticky top-8 hidden text-[14px] xl:block">
						<p className="font-semibold">이 장의 내용</p>
						<ul className="mt-3 flex list-none flex-col gap-2.5 p-0">
							{sections.map((item) => (
								<li key={item.id}>
									<a href={`#${item.id}`} className="text-ink-muted underline-offset-4 hover:text-foreground hover:underline">
										{item.title}
									</a>
								</li>
							))}
						</ul>
					</nav>
				</div>
			</section>
		</PublicLayout>
	);
}


function Step({ chapter, label, align }: { chapter: Chapter | undefined; label: string; align?: 'right' }) {
	if (!chapter) return <span />;
	return (
		<Link to={`/docs/${chapter.slug}`} className={cn('rounded-lg bg-paper-2 px-6 py-5 transition-colors hover:bg-paper-2/70', align === 'right' && 'text-right')}>
			<span className="block text-[13px] text-ink-muted">{label}</span>
			<span className="mt-1 block text-[17px] font-semibold">{chapter.title}</span>
		</Link>
	);
}
