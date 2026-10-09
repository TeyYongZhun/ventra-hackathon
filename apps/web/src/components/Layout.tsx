import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomNav } from './index';
import type { NavTab } from './BottomNav';

const PARENT_TAB: Record<string, NavTab> = { alert: 'home', status: 'home', nurse: 'home', family: 'more', report: 'more', weigh: 'track', feel: 'track', cap: 'track', privacy: 'more', settings: 'more', visit: 'more' };

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  // Sub-screens light up the tab they belong to.
  const segment = location.pathname.split('/')[1] || 'home';
  const activeTab = (PARENT_TAB[segment] ?? segment) as NavTab;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'var(--color-canvas)',
      }}
    >
      {/* Page padding from the design screens: 28px top, 20px sides. */}
      <main style={{ flex: 1, padding: '28px 20px', paddingBottom: 140 }}>
        {/* Every page puts SOS in its own header row (PageHeader, or next to the date on Home). */}
        <Outlet />
      </main>
      <div
        data-noprint
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 40,
        }}
      >
        {/* Pages can dock something right above the menu (Ask AI's composer) via a portal. */}
        <div id="dock-above-nav" />
        <BottomNav activeTab={activeTab} onChange={(tab) => navigate(`/${tab}`)} />
      </div>
    </div>
  );
}
