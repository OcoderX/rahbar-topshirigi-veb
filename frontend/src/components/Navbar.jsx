import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : '?';

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <div className="brand">
          <span className="brand-mark">
            Task<span className="dot">Flow</span>
          </span>
          <span className="brand-sub">Xodimlar vazifalarini boshqarish</span>
        </div>
        {user && (
          <div className="nav-user">
            <div className="user-badge">
              <span className="user-avatar">{initial}</span>
              <div className="who">
                <strong>{user.name}</strong>
                <span>{user.role === 'admin' ? 'Administrator' : 'Xodim'}</span>
              </div>
            </div>
            <button className="btn btn-sm btn-logout" onClick={handleLogout} title="Tizimdan chiqish">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="logout-text">Chiqish</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
