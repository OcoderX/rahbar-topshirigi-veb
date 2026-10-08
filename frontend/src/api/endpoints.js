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
  logout: () => client.post('/auth/logout').then((r) => r.data),
};

export const userApi = {
  list: (role) => client.get(`/users${qs({ role })}`).then((r) => r.data.data),
  get: (id) => client.get(`/users/${id}`).then((r) => r.data.data),
  tasks: (id, params) => client.get(`/users/${id}/tasks${qs(params)}`).then((r) => r.data),
  updateProfile: (payload) => client.put('/users/profile', payload).then((r) => r.data),
};

export const taskApi = {
  list: (params) => client.get(`/tasks${qs(params)}`).then((r) => r.data),
  get: (id) => client.get(`/tasks/${id}`).then((r) => r.data.data),
  create: (payload) => client.post('/tasks', payload).then((r) => r.data.data),
  update: (id, payload) => client.put(`/tasks/${id}`, payload).then((r) => r.data.data),
  markViewed: (id) => client.post(`/tasks/${id}/view`).then((r) => r.data.data),
  complete: (id, payload) => client.post(`/tasks/${id}/complete`, payload).then((r) => r.data.data),
  approve: (id) => client.post(`/tasks/${id}/approve`).then((r) => r.data.data),
  sendToRework: (id, reason) =>
    client.post(`/tasks/${id}/rework`, { reason }).then((r) => r.data.data),
  upload: (payload) => client.post('/tasks/upload', payload).then((r) => r.data.data),
  exportExcel: () =>
    client
      .get('/tasks/export/excel', { responseType: 'blob' })
      .then((r) => {
        const disposition = r.headers['content-disposition'];
        let filename = 'hisobot.xlsx';
        if (disposition) {
          const match = disposition.match(/filename="?([^";]+)"?/);
          if (match && match[1]) filename = match[1];
        }
        return { blob: r.data, filename };
      }),
};

export const activityApi = {
  list: (limit) => client.get(`/activity-logs${qs({ limit })}`).then((r) => r.data.data),
};

export const messageApi = {
  send: (payload) => client.post('/messages', payload).then((r) => r.data.data),
  inbox: () => client.get('/messages/inbox').then((r) => r.data.data),
  conversation: (userId) => client.get(`/messages/conversation/${userId}`).then((r) => r.data.data),
  unreadCount: () => client.get('/messages/unread-count').then((r) => r.data.count),
  markRead: (userId) => client.post(`/messages/read/${userId}`).then((r) => r.data),
  taskMessages: (taskId) => client.get(`/messages/task/${taskId}`).then((r) => r.data.data),
  edit: (id, payload) => client.put(`/messages/${id}`, payload).then((r) => r.data.data),
  history: (id) => client.get(`/messages/${id}/history`).then((r) => r.data.data),
};

