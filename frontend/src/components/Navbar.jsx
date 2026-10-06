import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProfileModal from './ProfileModal';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : '?';

  return (
    <>
      <nav className="navbar">
        <div className="container navbar-inner">
          <div className="brand">
            <span className="brand-mark">
              Ocoder<span className="dot">X</span>
            </span>
            <span className="brand-sub">Rahbar topshirig'i</span>
          </div>
          {user && (
            <div className="nav-user">
              <div
                className="user-badge clickable-user-badge"
                onClick={() => setProfileOpen(true)}
                title="Mening profilim va rasmimni o‘zgartirish"
              >
                <div className="nav-avatar-wrap">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="user-avatar-img"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <span className={`user-avatar ${user.avatar ? 'hidden' : ''}`}>{initial}</span>
                  <span className="avatar-edit-dot" title="Rasm yuklash">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </span>
                </div>
                <div className="who">
                  <strong>{user.name}</strong>
                  <span>{user.position || (user.role === 'admin' ? 'Bosh rahbar' : 'Xodim')}</span>
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

      {profileOpen && (
        <ProfileModal onClose={() => setProfileOpen(false)} />
      )}
    </>
  );
}
