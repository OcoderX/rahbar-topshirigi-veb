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
    if (!email || !password) return setError('Please enter your email and password.');
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
            Assign, track,
            <br />
            and finish work.
          </h1>
          <p>
            A focused task tracker for teams. Admins assign and oversee; employees
            move their work forward, one status at a time.
          </p>
        </div>
        <div className="demo">
          <strong>Demo accounts</strong> (password: <code>password123</code>)
          <div style={{ marginTop: '.5rem', display: 'grid', gap: '.3rem' }}>
            <button className="btn btn-sm btn-ghost" style={{ color: '#f0c9b8', justifyContent: 'flex-start' }} onClick={() => fill('admin@demo.com')}>
              admin@demo.com — Admin
            </button>
            <button className="btn btn-sm btn-ghost" style={{ color: '#f0c9b8', justifyContent: 'flex-start' }} onClick={() => fill('aisha@demo.com')}>
              aisha@demo.com — Employee
            </button>
          </div>
        </div>
      </aside>

      <main className="auth-form-side">
        <div className="auth-card">
          <h2>Welcome back</h2>
          <p className="sub">Sign in to your account to continue.</p>

          {error && <div className="error-banner">{error}</div>}

          <div className="field">
            <label>Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="you@company.com"
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label>Password</label>
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
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </main>
    </div>
  );
}
