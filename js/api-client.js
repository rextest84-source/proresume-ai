/**
 * ProResume AI — API client for Railway backend
 */
const ProResumeAPI = (() => {
  const TOKEN_KEY = 'proresume_token';
  const USER_KEY = 'proresume_user';

  function apiUrl(path) {
    const base = (window.PRORESUME_CONFIG?.apiUrl || '').replace(/\/$/, '');
    return `${base}${path}`;
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function isLoggedIn() {
    return !!getToken();
  }

  function getStoredUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new CustomEvent('proresume:auth', { detail: { user } }));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new CustomEvent('proresume:auth', { detail: { user: null } }));
  }

  async function request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(apiUrl(path), { ...options, headers });
    const data = await res.json().catch(() => ({}));

    if (res.status === 401 && token) {
      clearSession();
    }
    if (!res.ok) {
      const err = new Error(data.error || `Request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  return {
    getToken,
    isLoggedIn,
    getStoredUser,
    clearSession,

    async register(email, password, name) {
      const data = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name })
      });
      setSession(data.token, data.user);
      return data;
    },

    async login(email, password) {
      const data = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      setSession(data.token, data.user);
      return data;
    },

    async logout() {
      clearSession();
    },

    async me() {
      const data = await request('/api/auth/me');
      if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return data.user;
    },

    async useCredits(amount, reason) {
      return request('/api/auth/use-credits', {
        method: 'POST',
        body: JSON.stringify({ amount, reason })
      });
    },

    async listResumes() {
      return request('/api/resumes');
    },

    async getResume(id) {
      return request(`/api/resumes/${id}`);
    },

    async saveResume(id, data, title) {
      return request(`/api/resumes/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ data, title })
      });
    },

    async createResume(title, data) {
      return request('/api/resumes', {
        method: 'POST',
        body: JSON.stringify({ title, data })
      });
    },

    async deleteResume(id) {
      return request(`/api/resumes/${id}`, { method: 'DELETE' });
    },

    async checkoutSubscription(plan) {
      const data = await request('/api/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ type: 'subscription', plan })
      });
      if (data.url) window.location.href = data.url;
      return data;
    },

    async checkoutCredits(pack) {
      const data = await request('/api/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({ type: 'credits', pack })
      });
      if (data.url) window.location.href = data.url;
      return data;
    },

    async billingPortal() {
      const data = await request('/api/stripe/create-portal-session', { method: 'POST' });
      if (data.url) window.location.href = data.url;
      return data;
    }
  };
})();

window.ProResumeAPI = ProResumeAPI;
