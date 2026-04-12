const BASE = process.env.REACT_APP_API_URL || '/api';

const getToken = () => localStorage.getItem('crm_token');

const request = async (path, options = {}) => {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export const api = {
  // Auth
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  setup: (body) => request('/auth/setup', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),

  // Users
  getUsers: () => request('/auth/users'),
  createUser: (body) => request('/auth/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id, body) => request(`/auth/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteUser: (id) => request(`/auth/users/${id}`, { method: 'DELETE' }),

  // Leads
  getLeads: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([,v]) => v)).toString();
    return request(`/leads${qs ? `?${qs}` : ''}`);
  },
  getLead: (id) => request(`/leads/${id}`),
  createLead: (body) => request('/leads', { method: 'POST', body: JSON.stringify(body) }),
  updateLead: (id, body) => request(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteLead: (id) => request(`/leads/${id}`, { method: 'DELETE' }),
  getStats: () => request('/leads/stats/overview'),

  // Notes
  addNote: (leadId, body) => request(`/leads/${leadId}/notes`, { method: 'POST', body: JSON.stringify(body) }),
  deleteNote: (leadId, noteId) => request(`/leads/${leadId}/notes/${noteId}`, { method: 'DELETE' }),

  // Tasks
  addTask: (leadId, body) => request(`/leads/${leadId}/tasks`, { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (leadId, taskId, body) => request(`/leads/${leadId}/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteTask: (leadId, taskId) => request(`/leads/${leadId}/tasks/${taskId}`, { method: 'DELETE' }),
  getAllTasks: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([,v]) => v)).toString();
    return request(`/tasks${qs ? `?${qs}` : ''}`);
  },
};
