import { cn } from 'cn';
import type { ReactNode } from 'react';
import { StatusTag } from '@/components/StatusTag';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// 랜딩에 올리는 실제 화면 조각. 대시보드와 같은 컴포넌트·같은 밀도(행 42px·본문 13px)로 그린다.
// 데이터는 예시지만 숫자·상태는 제품이 실제로 내는 값만 쓴다

const ROWS = [
	{ at: '방금', source: 'toss-payments', req: 'POST /webhooks/pay', size: '1,204 B', status: 'pending' },
	{ at: '3분 전', source: 'portone', req: 'POST /pg/v2', size: '862 B', status: 'failed' },
	{ at: '32분 전', source: 'github', req: 'POST /hooks?ref=main', size: '5,118 B', status: 'succeeded' },
	{ at: '1시간 전', source: 'toss-payments', req: 'POST /webhooks/pay', size: '1,190 B', status: 'dead' },
	{ at: '2시간 전', source: 'shopify', req: 'POST /orders/paid', size: '3,402 B', status: 'succeeded' },
] as const;

// 흰 카드 하나. 모든 조각의 바깥 틀
export function Panel({ className, children, label }: { className?: string; children: ReactNode; label: string }) {
	return (
		<div data-ui role="group" aria-label={label} className={cn('overflow-hidden rounded-lg bg-card text-[13px] text-card-foreground', className)}>
			{children}
		</div>
	);
}

// 이벤트 목록. 히어로 무대와 "받음" 응답에 쓴다
export function EventsFragment({ rows = ROWS.length, className }: { rows?: number; className?: string }) {
	return (
		<Panel label="이벤트 화면 예시" className={cn('w-[620px]', className)}>
			<div className="flex items-center gap-5 border-b px-4 pt-3 text-muted-foreground">
				<span className="-mb-px border-b-2 border-primary pb-2 font-medium text-foreground">받은 요청</span>
				<span className="pb-2">거부된 요청</span>
				<span className="ml-auto pb-2">1,284건</span>
			</div>
			<Table>
				<TableHeader>
					<TableRow className="hover:bg-transparent">
						<TableHead>받은 시각</TableHead>
						<TableHead>소스</TableHead>
						<TableHead>요청</TableHead>
						<TableHead className="text-right">크기</TableHead>
						<TableHead>전달</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{ROWS.slice(0, rows).map((row) => (
						<TableRow key={row.req + row.at} className="h-[42px]">
							<TableCell>{row.at}</TableCell>
							<TableCell>{row.source}</TableCell>
							<TableCell>{row.req}</TableCell>
							<TableCell className="text-right">{row.size}</TableCell>
							<TableCell>
								<StatusTag status={row.status} />
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</Panel>
	);
}
