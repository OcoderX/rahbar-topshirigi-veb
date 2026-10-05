import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Guards routes. Redirects unauthenticated users to /login, and users whose
 * role isn't allowed to their own dashboard. (Bonus: role-based protection.)
 */
export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="center-screen">
        <span className="spinner" /> Yuklanmoqda…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    const home = user.role === 'admin' ? '/admin' : '/employee';
    return <Navigate to={home} replace />;
  }

  return children;
}
