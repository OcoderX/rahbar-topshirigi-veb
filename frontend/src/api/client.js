import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const client = axios.create({ baseURL });

// Attach the JWT to every request if we have one.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize errors to a readable message and auto-logout on 401.
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const message =
      err.response?.data?.error?.message || err.message || 'Request failed';

    if (status === 401 && localStorage.getItem('token')) {
      // Token expired/invalid — clear it. AuthContext picks this up on next render.
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(new Error(message));
  }
);

export default client;
