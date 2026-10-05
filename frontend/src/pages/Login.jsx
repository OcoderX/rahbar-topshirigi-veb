import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError('');
    if (!email || !password) return setError('Iltimos, email va parolingizni kiriting.');
    setLoading(true);
    try {
      const user = await login(email, password);
      // Redirect based on role.
      navigate(user.role === 'admin' ? '/admin' : '/employee', { replace: true });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  // Submit on Enter from either field.
  function onKeyDown(e) {
    if (e.key === 'Enter') handleSubmit();
  }

  function fill(demoEmail) {
    setEmail(demoEmail);
    setPassword('password123');
  }

  return (
    <div className="auth-wrap">
      <aside className="auth-art">
        <div className="kicker">TaskFlow</div>
        <div>
          <h1>
            Vazifalarni biriktiring,
            <br />
            kuzating va yakunlang.
          </h1>
          <p>
            Jamoalar uchun qulay va ixcham vazifalar boshqaruv tizimi. Administratorlar vazifalarni
            biriktiradi va nazorat qiladi; xodimlar esa o‘z ishlarini bosqichma-bosqich bajaradi.
          </p>
        </div>
        <div className="demo">
          <strong>Demo hisoblar</strong> (parol: <code>password123</code>)
          <div style={{ marginTop: '.5rem', display: 'grid', gap: '.3rem' }}>
            <button className="btn btn-sm btn-ghost" style={{ color: '#f0c9b8', justifyContent: 'flex-start' }} onClick={() => fill('admin@demo.com')}>
              admin@demo.com — Administrator
            </button>
            <button className="btn btn-sm btn-ghost" style={{ color: '#f0c9b8', justifyContent: 'flex-start' }} onClick={() => fill('aisha@demo.com')}>
              aisha@demo.com — Xodim
            </button>
          </div>
        </div>
      </aside>

      <main className="auth-form-side">
        <div className="auth-card">
          <div className="auth-mobile-brand">
            <span className="brand-mark">
              Task<span className="dot">Flow</span>
            </span>
            <span className="brand-sub">Xodimlar vazifalarini boshqarish</span>
          </div>

          <h2>Xush kelibsiz</h2>
          <p className="sub">Davom etish uchun hisobingizga kiring.</p>

          {error && <div className="error-banner">{error}</div>}

          <div className="field">
            <label>Elektron pochta (Email)</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="sizning@kompaniya.uz"
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label>Parol</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '.5rem' }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Kirilmoqda…' : 'Kirish'}
          </button>

          <div className="mobile-demo-section">
            <div className="demo-divider">
              <span>yoki demo hisob bilan kiring</span>
            </div>
            <div className="demo-chip-buttons">
              <button
                type="button"
                className="btn btn-sm demo-chip"
                onClick={() => fill('admin@demo.com')}
              >
                <span className="chip-role">Admin:</span> admin@demo.com
              </button>
              <button
                type="button"
                className="btn btn-sm demo-chip"
                onClick={() => fill('aisha@demo.com')}
              >
                <span className="chip-role">Xodim:</span> aisha@demo.com
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
