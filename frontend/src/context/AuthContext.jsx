import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on first load and verify with server cookie.
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('user');
      }
    }

    // Verify session via HttpOnly cookie
    authApi
      .me()
      .then((res) => {
        if (res && res.user) {
          setUser((prev) => {
            const next = { ...(prev || {}), ...res.user };
            localStorage.setItem('user', JSON.stringify(next));
            return next;
          });
        }
      })
      .catch(() => {
        // Cookie is expired or missing
        setUser(null);
        localStorage.removeItem('user');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function login(email, password) {
    const { user: u } = await authApi.login(email, password);
    localStorage.removeItem('token');
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    return u;
  }

  function updateUser(updated) {
    setUser((prev) => {
      const next = { ...(prev || {}), ...updated };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
