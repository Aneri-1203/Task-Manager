const API_BASE = ''; // Uses relative URLs proxied by Vite or same origin in production

export const getAuthToken = () => localStorage.getItem('token');
export const setAuthToken = (token) => {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
};

const getHeaders = (customHeaders = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      // Token might be expired or invalid
      // Dispatch custom event for session expired
      window.dispatchEvent(new CustomEvent('session-expired'));
    }
    const errorMsg = data.message || 'Request failed with status ' + response.status;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    error.remainingSeconds = data.remainingSeconds;
    throw error;
  }
  return data;
};

export const api = {
  // Authentication & RBAC
  login: async (credentials) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return handleResponse(res);
  },

  register: async (userData) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return handleResponse(res);
  },

  googleLogin: async (credential) => {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });
    return handleResponse(res);
  },

  getGoogleClientId: async () => {
    const res = await fetch(`${API_BASE}/auth/google/client-id`, {
      method: 'GET',
    });
    return handleResponse(res);
  },

  getCurrentUser: async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  verifySession: async () => {
    const res = await fetch(`${API_BASE}/auth/verify-session`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  forgotPassword: async (email) => {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return handleResponse(res);
  },

  resetPassword: async (token, newPassword) => {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: newPassword }),
    });
    return handleResponse(res);
  },

  logout: async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getHeaders(),
      });
    } catch (e) {
      console.warn('Logout request ignored:', e);
    }
    setAuthToken(null);
  },

  // Team & Users (RBAC)
  getUsers: async () => {
    const res = await fetch(`${API_BASE}/auth/users`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  updateUserRole: async (userId, data) => {
    const res = await fetch(`${API_BASE}/auth/users/${userId}/role`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // Tasks Management
  getTasks: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.priority) query.append('priority', params.priority);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.userId) query.append('userId', params.userId);
    if (params.self) query.append('self', params.self);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE}/tasks${queryString}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  getTaskById: async (id) => {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  createTask: async (taskData) => {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(taskData),
    });
    return handleResponse(res);
  },

  updateTask: async (id, taskData) => {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(taskData),
    });
    return handleResponse(res);
  },

  deleteTask: async (id) => {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  getStats: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.userId) query.append('userId', params.userId);
    if (params.allUsers) query.append('allUsers', params.allUsers);
    if (params.self) query.append('self', params.self);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE}/tasks/report/stats${queryString}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  downloadPdfUrl: (status = '', filters = {}) => {
    const token = getAuthToken();
    const query = new URLSearchParams();
    if (token) query.append('token', token);
    if (filters.startDate) query.append('startDate', filters.startDate);
    if (filters.endDate) query.append('endDate', filters.endDate);
    if (filters.priority) query.append('priority', filters.priority);
    if (filters.allUsers) query.append('allUsers', filters.allUsers);
    if (filters.userId) query.append('userId', filters.userId);

    const base = status ? `${API_BASE}/tasks/download/${status}` : `${API_BASE}/tasks/report/pdf`;
    return `${base}?${query.toString()}`;
  },

  // Practical 13: AI Task Description Generator
  generateAIDescription: async (title) => {
    const res = await fetch(`${API_BASE}/api/ai/generate-description`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ title }),
    });
    return handleResponse(res);
  },
};
