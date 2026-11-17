import { Navigate, Route, Routes, useLocation } from 'react-router';
import { ProjectProvider } from './auth/project';
import { SCOPE, type Scope, ScopeContext } from './config';
import { RequireAuth } from './auth/RequireAuth';
import { AppShell, Placeholder } from './layout/AppShell';
import { ComingSoon } from './layout/PublicLayout';
import { LandingPage } from './pages/landing/LandingPage';
import { ConnectionsPage } from './pages/connections/ConnectionsPage';
import { DeliveriesPage } from './pages/deliveries/DeliveriesPage';
import { DestinationsPage } from './pages/destinations/DestinationsPage';
import { EventsPage } from './pages/events/EventsPage';
import { LoginPage } from './pages/login/LoginPage';
import { MePage } from './pages/me/MePage';
import { PricingPage } from './pages/pricing/PricingPage';
import { ProjectSettingsPage } from './pages/settings/ProjectSettingsPage';
import { SourcesPage } from './pages/sources/SourcesPage';
import { UsagePage } from './pages/usage/UsagePage';

// 라우트 표. 화면이 늘 때마다 한 줄씩. 경로가 바뀌면 key가 바뀌어 .page의 페이드인이 다시 돈다
export function App({ scope = SCOPE }: { scope?: Scope }) {
	const { pathname } = useLocation();
	return (
		<ScopeContext.Provider value={scope}>
			<div key={pathname} className="page">
				{scope === 'landing' && (
					<Routes>
						<Route path="/" element={<LandingPage />} />
						<Route path="*" element={<Navigate to="/" replace />} />
					</Routes>
				)}
				{scope === 'login' && (
					<Routes>
						<Route path="/" element={<LandingPage />} />
						<Route path="/login" element={<LoginPage />} />
						{/* 대시보드는 아직 열지 않는다. 로그인 뒤에도 랜딩으로 */}
						<Route path="*" element={<Navigate to="/" replace />} />
					</Routes>
				)}
				{scope === 'all' && (
					<Routes>
						<Route path="/" element={<LandingPage />} />
						<Route path="/pricing" element={<PricingPage />} />
						<Route path="/developers" element={<ComingSoon title="개발자" />} />
						<Route path="/docs" element={<ComingSoon title="문서" />} />
						<Route path="/login" element={<LoginPage />} />
						<Route element={<RequireAuth />}>
							<Route
								path="/app"
								element={
									<ProjectProvider>
										<AppShell />
									</ProjectProvider>
								}
							>
								<Route index element={<Navigate to="/app/events" replace />} />
								<Route path="events" element={<EventsPage />} />
								<Route path="deliveries" element={<DeliveriesPage />} />
								<Route path="connections" element={<ConnectionsPage />} />
								<Route path="sources" element={<SourcesPage />} />
								<Route path="destinations" element={<DestinationsPage />} />
								<Route path="settings" element={<ProjectSettingsPage />} />
								<Route path="usage" element={<UsagePage />} />
								<Route path="me" element={<MePage />} />
								<Route path="*" element={<Placeholder />} />
							</Route>
						</Route>
					</Routes>
				)}
			</div>
		</ScopeContext.Provider>
	);
}
