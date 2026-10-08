import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Sidebar({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  viewMode,
  setViewMode,
  onOpenProfile,
  onOpenCreateTask,
  onOpenCommandPalette,
  isAdmin = false,
}) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`sidebar-backdrop ${isOpen ? 'show' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-head">
          <div className="sidebar-brand">
            <span className="brand-mark">
              Ocoder<span className="dot">X</span>
            </span>
            <span className="sidebar-pill">2026</span>
          </div>
          <button className="sidebar-close-btn" onClick={onClose} title="Yopish">
            ✕
          </button>
        </div>

        {onOpenCreateTask && (
          <div className="sidebar-action-wrap">
            <button
              type="button"
              className="btn btn-primary sidebar-create-btn"
              onClick={() => {
                onOpenCreateTask();
                onClose();
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Yangi topshiriq</span>
            </button>
          </div>
        )}

        <div className="sidebar-nav">
          <div className="sidebar-section-label">Asosiy menyu</div>

          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === 'tasks' && viewMode === 'table' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab?.('tasks');
              setViewMode?.('table');
              onClose();
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span>Topshiriqlar jadvali</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === 'tasks' && viewMode === 'kanban' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab?.('tasks');
              setViewMode?.('kanban');
              onClose();
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v6h-4z" />
            </svg>
            <span>Topshiriqlar doskasi</span>
            <span className="sidebar-item-badge">Yangi</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              className={`sidebar-nav-item ${activeTab === 'accounts' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab?.('accounts');
                onClose();
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Xodimlar & Akkauntlar</span>
            </button>
          )}

          <div className="sidebar-section-label">Qidiruv & Tezkor</div>

          {onOpenCommandPalette && (
            <button
              type="button"
              className="sidebar-nav-item"
              onClick={() => {
                onClose();
                onOpenCommandPalette();
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Tezkor qidiruv</span>
              <kbd className="sidebar-kbd">Ctrl+K</kbd>
            </button>
          )}

          <button
            type="button"
            className="sidebar-nav-item"
            onClick={toggleTheme}
          >
            {isDark ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                <span>Kunduzgi mavzu (Light)</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
                <span>Tungi mavzu (Dark)</span>
              </>
            )}
          </button>
        </div>

        <div className="sidebar-footer">
          {user && (
            <div
              className="sidebar-user"
              onClick={() => {
                onOpenProfile?.();
                onClose();
              }}
              title="Profilni ko‘rish va sozlash"
            >
              <div className="sidebar-avatar">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} />
                ) : (
                  <span>{user.name ? user.name.charAt(0).toUpperCase() : '?'}</span>
                )}
              </div>
              <div className="sidebar-user-meta">
                <span className="sidebar-user-name">{user.name}</span>
                <span className="sidebar-user-role">
                  {user.position || (user.role === 'admin' ? 'Bosh rahbar' : 'Xodim')}
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={logout}
            title="Tizimdan chiqish"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Chiqish</span>
          </button>
        </div>
      </aside>
    </>
  );
}
