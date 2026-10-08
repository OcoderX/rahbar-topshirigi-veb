import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ProfileModal from './ProfileModal';

export default function Navbar({ onOpenSidebar, onOpenCommandPalette }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
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
          <div className="nav-left-group">
            {onOpenSidebar && (
              <button
                type="button"
                className="nav-hamburger-btn"
                onClick={onOpenSidebar}
                title="Menyuni ochish"
                aria-label="Menyu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            )}

            <div className="brand">
              <span className="brand-mark">
                Ocoder<span className="dot">X</span>
              </span>
              <span className="brand-sub">Rahbar topshirig'i</span>
            </div>
          </div>

          <div className="nav-center-actions">
            {onOpenCommandPalette && (
              <button
                type="button"
                className="nav-search-trigger"
                onClick={onOpenCommandPalette}
                title="Tezkor qidiruv (Ctrl+K)"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span className="nav-search-text">Qidiruv…</span>
                <kbd className="nav-search-kbd">Ctrl+K</kbd>
              </button>
            )}
          </div>

          {user && (
            <div className="nav-user">
              {/* Theme toggle switch */}
              <button
                type="button"
                className="btn-theme-toggle"
                onClick={toggleTheme}
                title={isDark ? "Kunduzgi mavzuga o'tish (Light)" : "Tungi mavzuga o'tish (Dark)"}
                aria-label="Mavzuni almashtirish"
              >
                {isDark ? (
                  <svg className="theme-icon sun-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg className="theme-icon moon-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>

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
