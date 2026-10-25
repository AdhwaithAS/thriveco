/**
 * THRIVE&CO - REST API Client
 * Thin wrapper around fetch() for the Spring Boot backend.
 *
 * Adds the RBAC session layer:
 *  - every request carries the X-Auth-Token from the stored session;
 *  - 401 responses clear the session and fire "thriveco:session-expired"
 *    so the app can show the sign-in gate again;
 *  - 403 responses surface the server's permission message.
 *
 * When the frontend is served by Spring Boot, API_BASE is simply "/api".
 * If you serve the static files from another dev server, set
 * window.THRIVECO_API_BASE before loading this file (e.g. http://localhost:8080/api).
 */
(function () {
  const API_BASE = window.THRIVECO_API_BASE || '/api';
  const SESSION_KEY = 'thriveco.session';

  function readSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch (error) {
      return null;
    }
  }

  function writeSession(session) {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  async function request(path, options = {}) {
    const config = {
      method: options.method || 'GET',
      headers: { ...(options.headers || {}) }
    };

    // Object bodies are sent as JSON (fetch() would otherwise stringify the
    // object to "[object Object]" with a text/plain content type, which the
    // backend rejects with 415).
    if (options.body !== undefined && options.body !== null) {
      if (typeof options.body === 'string') {
        config.body = options.body;
      } else if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
        config.body = options.body; // browser sets the multipart headers
      } else {
        config.body = JSON.stringify(options.body);
        config.headers['Content-Type'] = 'application/json';
      }
    }

    const session = readSession();

    if (session && session.token) {
      config.headers['X-Auth-Token'] = session.token;
    }

    let response;
    try {
      response = await fetch(API_BASE + path, config);
    } catch (error) {
      throw new Error('Cannot reach the Thrive&Co backend. Is the Spring Boot server running?');
    }

    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (error) {
        data = text;
      }
    }

    if (!response.ok) {
      const message = data && typeof data === 'object'
        ? (data.message || data.error)
        : data;

      if (response.status === 401) {
        // Token missing/invalid/expired: drop the stale session and let the
        // app show the sign-in gate again.
        writeSession(null);
        window.dispatchEvent(new CustomEvent('thriveco:session-expired', {
          detail: { message: message || 'Session expired' }
        }));
        throw new Error(message || 'Session expired - sign in again');
      }

      if (response.status === 403) {
        throw new Error(message || 'Your account does not have permission for this action');
      }

      throw new Error(message || `Request failed (HTTP ${response.status})`);
    }

    return data;
  }

  function query(params = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '' || value === 'ALL') return;
      search.set(key, value);
    });
    const qs = search.toString();
    return qs ? `?${qs}` : '';
  }

  // Exposed so the UI can persist/clear the sign-in session.
  window.ThriveAuth = {
    get: readSession,
    set: writeSession
  };

  window.API = {
    // RBAC session
    login: (userId, password) =>
      request('/auth/login', { method: 'POST', body: { userId, password } }),
    me: () => request('/auth/me'),
    accounts: () => request('/auth/accounts'),
    logout: () => request('/auth/logout', { method: 'POST' }),

    // Facilities
    getFacilities: () => request('/facilities'),
    getFacility: (id) => request(`/facilities/${encodeURIComponent(id)}`),
    createFacility: (payload) => request('/facilities', { method: 'POST', body: payload }),

    // Medicines
    getMedicines: (params = {}) => request(`/medicines${query(params)}`),
    getMedicine: (id) => request(`/medicines/${encodeURIComponent(id)}`),
    createMedicine: (payload) => request('/medicines', { method: 'POST', body: payload }),
    updateMedicine: (id, payload) => request(`/medicines/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: payload
    }),
    deleteMedicine: (id) => request(`/medicines/${encodeURIComponent(id)}`, { method: 'DELETE' }),

    // Blood stock
    getBloodStock: (params = {}) => request(`/blood-stock${query(params)}`),
    getBloodStockRecord: (id) => request(`/blood-stock/${encodeURIComponent(id)}`),
    createBloodStock: (payload) => request('/blood-stock', { method: 'POST', body: payload }),
    updateBloodStock: (id, payload) => request(`/blood-stock/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: payload
    }),
    deleteBloodStock: (id) => request(`/blood-stock/${encodeURIComponent(id)}`, { method: 'DELETE' }),

    // Hospital resources
    getHospitalResources: (params = {}) => request(`/hospital-resources${query(params)}`),
    getHospitalResource: (id) => request(`/hospital-resources/${encodeURIComponent(id)}`),
    createHospitalResource: (payload) => request('/hospital-resources', { method: 'POST', body: payload }),
    updateHospitalResource: (id, payload) => request(`/hospital-resources/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: payload
    }),
    deleteHospitalResource: (id) => request(`/hospital-resources/${encodeURIComponent(id)}`, { method: 'DELETE' }),

    // Alerts, dashboard, users
    getAlerts: (params = {}) => request(`/alerts${query(params)}`),
    getMetrics: () => request('/dashboard/metrics'),
    getUsers: () => request('/users'),

    // Emergency multi-facility search
    searchEmergency: (params = {}) => request(`/emergency/search${query(params)}`),

    // Admin / health
    health: () => request('/health'),
    request
  };
})();
