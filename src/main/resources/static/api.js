/**
 * THRIVE&CO - REST API Client
 * Thin wrapper around fetch() for the Spring Boot backend.
 *
 * When the frontend is served by Spring Boot, API_BASE is simply "/api".
 * If you serve the static files from another dev server, set
 * window.THRIVECO_API_BASE before loading this file (e.g. http://localhost:8080/api).
 */
(function () {
  const API_BASE = window.THRIVECO_API_BASE || '/api';

  async function request(path, options = {}) {
    const config = {
      headers: { 'Content-Type': 'application/json' },
      ...options
    };

    if (config.body && typeof config.body !== 'string') {
      config.body = JSON.stringify(config.body);
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
      const error = new Error(message || `Request failed (HTTP ${response.status})`);
      error.status = response.status;
      throw error;
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

  window.API = {
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
