import client from './client';

// Build a querystring from a params object, dropping empty values.
function qs(params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  );
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : '';
}

export const authApi = {
  login: (email, password) => client.post('/auth/login', { email, password }).then((r) => r.data),
  register: (payload) => client.post('/auth/register', payload).then((r) => r.data),
  me: () => client.get('/auth/me').then((r) => r.data),
};

export const userApi = {
  list: (role) => client.get(`/users${qs({ role })}`).then((r) => r.data.data),
  tasks: (id, params) => client.get(`/users/${id}/tasks${qs(params)}`).then((r) => r.data),
};

export const taskApi = {
  list: (params) => client.get(`/tasks${qs(params)}`).then((r) => r.data),
  get: (id) => client.get(`/tasks/${id}`).then((r) => r.data.data),
  create: (payload) => client.post('/tasks', payload).then((r) => r.data.data),
  update: (id, payload) => client.put(`/tasks/${id}`, payload).then((r) => r.data.data),
};

export const activityApi = {
  list: (limit) => client.get(`/activity-logs${qs({ limit })}`).then((r) => r.data.data),
};
