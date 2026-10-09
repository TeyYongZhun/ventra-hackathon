import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useMe } from '../lib/api';

// Extra large text: the design sizes are already large, so XL scales everything up a step.
const ZOOM: Record<string, string> = { xl: '1.15' };

export function RequireAuth() {
  const { data: me, isLoading } = useMe();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.style.zoom = (me?.text_size && ZOOM[me.text_size]) || '';
  }, [me?.text_size]);

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontSize: 'var(--text-body)' }}>
        Loading…
      </div>
    );
  }

  if (!me) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // A new patient finishes set-up (their own limits and medicines) before anything else.
  if (!me.set_up && !location.pathname.startsWith('/setup')) {
    return <Navigate to="/setup/1" replace />;
  }

  return <Outlet />;
}
