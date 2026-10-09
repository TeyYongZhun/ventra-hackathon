import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomNav, SOSButton } from './index';
import type { NavTab } from './BottomNav';

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = (location.pathname.slice(1) || 'home') as NavTab;

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
        <Outlet />
      </main>
      <div
        style={{
          position: 'fixed',
          bottom: 100,
          right: 20,
          zIndex: 50,
        }}
      >
        <SOSButton />
      </div>
      <div
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
