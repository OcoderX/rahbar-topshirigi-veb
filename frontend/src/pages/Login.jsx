import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const DEMO_PASSWORD = 'password123';

const DEMO_ACCOUNTS = [
  { email: 'rahbar@andijon.uz', label: 'Viloyat rahbari', icon: '👑', role: 'admin' },
  { email: 'orinbosar@andijon.uz', label: "Viloyat rahbar o'rinbosari", icon: '⭐', role: 'admin' },
  { email: 'kurator1@andijon.uz', label: 'Viloyat kuratori', icon: '📋', role: 'admin' },
  { email: 'andijon.boshliq@andijon.uz', label: "Tuman bo'lim boshlig'i", icon: '🏢', role: 'employee' },
  { email: 'andijon.xodim1@andijon.uz', label: 'Tuman xodimi', icon: '👤', role: 'employee' },
];

export default function Login() {
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLoginWithCredentials(userEmail, userPassword) {
    setError('');
    const targetEmail = userEmail || email;
    const targetPass = userPassword || password;

    if (!targetEmail || !targetPass) {
      return setError('Iltimos, email va parolingizni kiriting.');
    }

    setLoading(true);
    try {
      const user = await login(targetEmail, targetPass);
      navigate(user.role === 'admin' ? '/admin' : '/employee', { replace: true });
    } catch (err) {
      setError(err.message || 'Kirishda xatolik yuz berdi');
      setLoading(false);
    }
  }

  function handleSubmit() {
    handleLoginWithCredentials(email, password);
  }

  function onKeyDown(event) {
    if (event.key === 'Enter') handleSubmit();
  }

  function fill(demoEmail) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
  }

  function quickLogin(demoEmail) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    handleLoginWithCredentials(demoEmail, DEMO_PASSWORD);
  }

  return (
    <div className="auth-wrap">
      {/* Theme toggle in login corner */}
      <div className="auth-theme-toggle">
        <button
          type="button"
          className="btn-theme-toggle"
          onClick={toggleTheme}
          title={isDark ? "Kunduzgi mavzu (Light)" : "Tungi mavzu (Dark)"}
          aria-label="Mavzu"
        >
          {isDark ? (
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
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>

      <aside className="auth-art">
        <div className="auth-art-content">
          <div className="kicker">
            <span className="kicker-badge">2026 Yangi avlod</span>
            <span>OcoderX — Rahbar topshirig'i</span>
          </div>

          <div className="auth-hero-text">
            <h1>
              Vazifalarni biriktiring,
              <br />
              <span className="gradient-text">kuzating va yakunlang.</span>
            </h1>
            <p>
              Andijon viloyati va uning 14 ta tumani uchun vazifalarni boshqarish tizimi.
              Rahbar vazifalarni biriktiradi va nazorat qiladi, xodimlar esa o‘z ishlarini
              bosqichma-bosqich bajaradi.
            </p>
          </div>

          {/* Dynamic platform KPI counters */}
          <div className="auth-stats-strip">
            <div className="auth-stat-pill">
              <span className="auth-stat-icon">📊</span>
              <div className="auth-stat-info">
                <strong>1,200+</strong>
                <span>Topshiriqlar</span>
              </div>
            </div>
            <div className="auth-stat-pill">
              <span className="auth-stat-icon">👥</span>
              <div className="auth-stat-info">
                <strong>66</strong>
                <span>Mas’ul xodim</span>
              </div>
            </div>
            <div className="auth-stat-pill">
              <span className="auth-stat-icon">⚡</span>
              <div className="auth-stat-info">
                <strong>99.4%</strong>
                <span>O‘z vaqtida</span>
              </div>
            </div>
          </div>

          {/* Quick Demo Accounts */}
          <div className="demo auth-demo-box">
            <div className="demo-header">
              <strong>Tezkor Demo hisoblar</strong>
              <span className="demo-pass-pill">parol: <code>{DEMO_PASSWORD}</code></span>
            </div>
            <div className="demo-accounts-grid">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  className="demo-account-btn"
                  onClick={() => fill(account.email)}
                  title="Formaga to‘ldirish"
                >
                  <span className="demo-acc-icon">{account.icon}</span>
                  <div className="demo-acc-meta">
                    <span className="demo-acc-label">{account.label}</span>
                    <span className="demo-acc-email">{account.email}</span>
                  </div>
                  <span className="demo-acc-arrow">→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <main className="auth-form-side">
        <div className="auth-card glass-card">
          <div className="auth-mobile-brand">
            <span className="brand-mark">
              Ocoder<span className="dot">X</span>
            </span>
            <span className="brand-sub">Rahbar topshirig'i</span>
          </div>

          <div className="auth-card-header">
            <h2>Tizimga kirish</h2>
            <p className="sub">Shaxsiy kabinetingizga kirish uchun ma’lumotlarni kiriting.</p>
          </div>

          {error && (
            <div className="error-banner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="field">
            <label htmlFor="login-email">Elektron pochta (Email)</label>
            <input
              id="login-email"
              name="email"
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="sizning@andijon.uz"
              autoComplete="username"
            />
          </div>

          <div className="field">
            <label htmlFor="login-password">Parol</label>
            <input
              id="login-password"
              name="password"
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            className="btn btn-primary auth-submit-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" />
                <span>Tekshirilmoqda…</span>
              </>
            ) : (
              <span>Tizimga kirish →</span>
            )}
          </button>

          <div className="mobile-demo-section">
            <div className="demo-divider">
              <span>yoki 1 marta bosish bilan kiring</span>
            </div>
            <div className="demo-chip-buttons">
              <button
                type="button"
                className="btn btn-sm demo-chip"
                onClick={() => quickLogin('rahbar@andijon.uz')}
                disabled={loading}
              >
                <span className="chip-role">👑 Rahbar:</span> rahbar@andijon.uz
              </button>
              <button
                type="button"
                className="btn btn-sm demo-chip"
                onClick={() => quickLogin('andijon.xodim1@andijon.uz')}
                disabled={loading}
              >
                <span className="chip-role">👤 Xodim:</span> andijon.xodim1@andijon.uz
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
