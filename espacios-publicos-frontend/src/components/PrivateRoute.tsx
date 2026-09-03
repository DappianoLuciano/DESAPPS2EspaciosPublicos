import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function PrivateRoute({ requireAdmin = false }: { requireAdmin?: boolean }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== 'municipal_admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
