import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_PASSWORD = 'password123';

const DEMO_ACCOUNTS = [
  { email: 'rahbar@andijon.uz', label: 'Viloyat rahbari' },
  { email: 'orinbosar@andijon.uz', label: "Viloyat rahbar o'rinbosari" },
  { email: 'kurator1@andijon.uz', label: 'Viloyat kuratori' },
  { email: 'andijon.boshliq@andijon.uz', label: "Tuman bo'lim boshlig'i" },
  { email: 'andijon.xodim1@andijon.uz', label: 'Tuman xodimi' },
];

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
      navigate(user.role === 'admin' ? '/admin' : '/employee', { replace: true });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  function onKeyDown(event) {
    if (event.key === 'Enter') handleSubmit();
  }

  function fill(demoEmail) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
  }

  return (
    <div className="auth-wrap">
      <aside className="auth-art">
        <div className="kicker">OcoderX — Rahbar topshirig'i</div>
        <div>
          <h1>
            Vazifalarni biriktiring,
            <br />
            kuzating va yakunlang.
          </h1>
          <p>
            Andijon viloyati va uning 14 ta tumani uchun vazifalarni boshqarish tizimi. Rahbar
            vazifalarni biriktiradi va nazorat qiladi, xodimlar esa o'z ishlarini bosqichma-bosqich
            bajaradi.
          </p>
        </div>
        <div className="demo">
          <strong>Demo hisoblar</strong> (parol: <code>{DEMO_PASSWORD}</code>)
          <div style={{ marginTop: '.5rem', display: 'grid', gap: '.3rem' }}>
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                className="btn btn-sm btn-ghost"
                style={{ color: '#f0c9b8', justifyContent: 'flex-start', textAlign: 'left' }}
                onClick={() => fill(account.email)}
              >
                {account.email} — {account.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className="auth-form-side">
        <div className="auth-card">
          <div className="auth-mobile-brand">
            <span className="brand-mark">
              Ocoder<span className="dot">X</span>
            </span>
            <span className="brand-sub">Rahbar topshirig'i</span>
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
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="sizning@andijon.uz"
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label>Parol</label>
            <input
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
              <button type="button" className="btn btn-sm demo-chip" onClick={() => fill('rahbar@andijon.uz')}>
                <span className="chip-role">Rahbar:</span> rahbar@andijon.uz
              </button>
              <button
                type="button"
                className="btn btn-sm demo-chip"
                onClick={() => fill('andijon.xodim1@andijon.uz')}
              >
                <span className="chip-role">Xodim:</span> andijon.xodim1@andijon.uz
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
