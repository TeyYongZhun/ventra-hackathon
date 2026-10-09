import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useMe } from '../lib/api';

export function RequireAuth() {
  const { data: me, isLoading } = useMe();
  const location = useLocation();

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

  return <Outlet />;
}
