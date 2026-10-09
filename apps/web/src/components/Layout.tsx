import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomNav, SOSSlot } from './index';
import type { NavTab } from './BottomNav';

// Pages that show SOS in their own header row (Home next to the date, others next to Back).
const OWN_SOS = new Set(['home', 'status', 'cap']);

const PARENT_TAB: Record<string, NavTab> = { alert: 'home', status: 'home', nurse: 'home', family: 'more', report: 'more', weigh: 'track', feel: 'track', cap: 'track' };

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
      <main style={{ flex: 1, padding: '1.5rem', paddingBottom: 140 }}>
        {/* These pages put SOS in their own header row. */}
        {!OWN_SOS.has(segment) && (
          <div data-noprint style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
            <SOSSlot />
          </div>
        )}
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
        <BottomNav activeTab={activeTab} onChange={(tab) => navigate(`/${tab}`)} />
      </div>
    </div>
  );
}
