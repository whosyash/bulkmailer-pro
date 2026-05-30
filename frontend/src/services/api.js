import axios from 'axios';

const TOKEN_KEY = 'bmp_token';

const api = axios.create({ baseURL: '/api', timeout: 30000 });

// Attach stored token to every request
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) cfg.headers['x-app-token'] = token;
  return cfg;
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const checkAuth = () => axios.get('/api/auth/check', {
  headers: { 'x-app-token': sessionStorage.getItem(TOKEN_KEY) || '' }
}).then(r => r.data);

export const login = (password) =>
  axios.post('/api/auth/login', { password }).then(r => {
    if (r.data.success && r.data.token) {
      sessionStorage.setItem(TOKEN_KEY, r.data.token);
    }
    return r.data;
  });

export const logout = () => sessionStorage.removeItem(TOKEN_KEY);

// ─── Config ───────────────────────────────────────────────────────────────────
export const getConfig = () => api.get('/config').then(r => r.data);
export const saveConfig = (data) => api.post('/config/save', data).then(r => r.data);
export const verifyConfig = (data) => api.post('/config/verify', data).then(r => r.data);

// ─── Templates ────────────────────────────────────────────────────────────────
export const getTemplates = () => api.get('/templates').then(r => r.data);
export const createTemplate = (data) => api.post('/templates', data).then(r => r.data);
export const updateTemplate = (id, data) => api.put(`/templates/${id}`, data).then(r => r.data);
export const deleteTemplate = (id) => api.delete(`/templates/${id}`).then(r => r.data);

// ─── Upload ───────────────────────────────────────────────────────────────────
export const uploadFile = (formData) =>
  api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);

// ─── Limits ───────────────────────────────────────────────────────────────────
export const getLimits = () => api.get('/limits').then(r => r.data);
export const updateLimits = (limit) => api.post('/limits/update', { limit }).then(r => r.data);
export const resetLimits = () => api.post('/limits/reset').then(r => r.data);

// ─── Send ─────────────────────────────────────────────────────────────────────
export const startSend = (data) => api.post('/send', data).then(r => r.data);
export const getSendStatus = (sessionId) => api.get('/send/status', { params: { sessionId } }).then(r => r.data);
export const pauseSend = (sessionId) => api.post('/send/pause', { sessionId }).then(r => r.data);
export const cancelSend = (sessionId) => api.post('/send/cancel', { sessionId }).then(r => r.data);
export const getSendReport = (id) => api.get(`/send/report/${id}`).then(r => r.data);
export const getSendHistory = () => api.get('/send/history').then(r => r.data);
export const checkSpam = (subject) => api.get('/send/spam-check', { params: { subject } }).then(r => r.data);

export function openSendStream(sessionId, handlers) {
  const token = sessionStorage.getItem(TOKEN_KEY) || '';
  const es = new EventSource(`/api/send/stream/${sessionId}?token=${token}`);
  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      handlers[data.event]?.(data);
    } catch {}
  };
  es.onerror = () => handlers.streamError?.();
  return es;
}

export default api;
