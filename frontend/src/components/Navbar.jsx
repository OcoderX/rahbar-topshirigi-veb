import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <div className="brand">
          <span className="brand-mark">
            Task<span className="dot">Flow</span>
          </span>
          <span className="brand-sub">Employee Task Tracker</span>
        </div>
        {user && (
          <div className="nav-user">
            <div className="who">
              <strong>{user.name}</strong>
              <br />
              <span>{user.role}</span>
            </div>
            <button className="btn btn-sm" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
