/**
 * THRIVE&CO - Main Application Controller (Java/Spring Boot edition)
 * Handles authentication, RBAC gating, navigation, rendering, search,
 * modals, forms and the live alert feed.
 *
 * All data comes from the Java REST API in src/main/java. Mutating actions
 * are additionally guarded client-side by the role of the signed-in account;
 * the backend re-checks every call (defence in depth).
 */
document.addEventListener('DOMContentLoaded', () => {
  const state = {
    currentTab: 'dashboard',
    user: null,
    accounts: [],
    searchMode: 'all',
    searchBloodGroup: 'ALL',
    facilities: []
  };

  // ---------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------
  const I = window.THI; // icon markup helper from icons.js

  function escapeHtml(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function facilityById(id) {
    return state.facilities.find(facility => facility.facilityId === id);
  }

  function facilityName(id) {
    const facility = facilityById(id);
    return facility ? facility.facilityName : id;
  }

  function contactOf(facility) {
    return facility && facility.contactDetails ? facility.contactDetails : {};
  }

  function statusClass(status) {
    switch (status) {
      case 'Low Stock':
      case 'Warning':
        return 'status-low';
      case 'Critical Alert':
      case 'Critical':
      case 'Out of Stock':
        return 'status-critical';
      case 'Reserved':
        return 'status-reserved';
      default:
        return 'status-available';
    }
  }

  function showTableMessage(tableBody, columns, message, icon = 'info') {
    if (!tableBody) return;
    tableBody.innerHTML = `
      <tr>
        <td colspan="${columns}">
          <div class="table-message">${I(icon, 18)}<span>${escapeHtml(message)}</span></div>
        </td>
      </tr>`;
  }

  function emptyState(icon, title, description, actionHtml = '') {
    return `
      <div class="empty-state">
        <span class="empty-state-icon">${I(icon, 30)}</span>
        <h4>${escapeHtml(title)}</h4>
        <p>${description}</p>
        ${actionHtml}
      </div>`;
  }

  function spinnerText(message) {
    return `<div class="loading-line"><span class="spinner"></span>${escapeHtml(message)}</div>`;
  }

  function fillFacilitySelect(select, allLabel, selectedId) {
    if (!select) return;
    const options = [];
    if (allLabel) {
      options.push(`<option value="ALL">${escapeHtml(allLabel)}</option>`);
    }
    state.facilities.forEach(facility => {
      options.push(`<option value="${escapeHtml(facility.facilityId)}">${escapeHtml(facility.facilityName)}</option>`);
    });
    select.innerHTML = options.join('');
    if (selectedId) {
      select.value = selectedId;
    }
  }

  function fillFacilitySelectOnce(select, allLabel) {
    if (!select || select.options.length > 1) return;
    fillFacilitySelect(select, allLabel);
  }

  // ---------------------------------------------------------------------
  // Live clock
  // ---------------------------------------------------------------------
  const liveClockEl = document.getElementById('liveClock');

  function updateClock() {
    if (!liveClockEl) return;
    const now = new Date();
    liveClockEl.textContent = now.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true
    });
  }
  setInterval(updateClock, 1000);
  updateClock();

  // ---------------------------------------------------------------------
  // Toast notifications (icon per type, manual close button)
  // ---------------------------------------------------------------------
  const TOAST_ICONS = {
    success: { icon: 'check-circle', label: 'Success' },
    error: { icon: 'x-circle', label: 'Error' },
    warning: { icon: 'alert-triangle', label: 'Warning' },
    info: { icon: 'info', label: 'Info' }
  };

  window.showToast = function (message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const meta = TOAST_ICONS[type] || TOAST_ICONS.info;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconWrap = document.createElement('span');
    iconWrap.className = 'toast-icon';
    iconWrap.innerHTML = I(meta.icon, 17);
    iconWrap.setAttribute('aria-hidden', 'true');

    const body = document.createElement('div');
    body.className = 'toast-body';
    body.textContent = message;

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'toast-close';
    close.setAttribute('aria-label', 'Dismiss notification');
    close.innerHTML = I('x', 13);
    close.addEventListener('click', () => removeToast(toast));

    toast.append(iconWrap, body, close);
    container.appendChild(toast);

    const timer = setTimeout(() => removeToast(toast), 4200);
    toast.addEventListener('mouseenter', () => clearTimeout(timer));
  };

  function removeToast(toast) {
    if (!toast.isConnected) return;
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 260);
  }

  function showBackendOffline(message) {
    if (document.getElementById('backendOfflineBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'backendOfflineBanner';
    banner.style.cssText = 'margin:0 0 20px 0;padding:14px 18px;border:1px solid #fecaca;background:#fef2f2;color:#991b1b;border-radius:10px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:10px;';
    banner.innerHTML = `${I('alert-triangle', 17)}<span>${escapeHtml(message)}</span>`;
    const content = document.querySelector('.content-area');
    if (content) content.prepend(banner);
  }

  function clearBackendOffline() {
    const banner = document.getElementById('backendOfflineBanner');
    if (banner) banner.remove();
  }

  // =====================================================================
  // AUTHENTICATION (RBAC sign-in gate)
  // =====================================================================
  const authGate = document.getElementById('authGate');
  const loginForm = document.getElementById('loginForm');
  const loginUserSelect = document.getElementById('loginUserSelect');
  const loginPassword = document.getElementById('loginPassword');
  const loginMessage = document.getElementById('loginMessage');
  const loginSubmitBtn = document.getElementById('loginSubmitBtn');
  const loginSubmitLabel = document.getElementById('loginSubmitLabel');
  const demoChipsEl = document.getElementById('demoAccountChips');
  const togglePasswordBtn = document.getElementById('togglePassword');

  function initialsOf(name) {
    if (!name) return '--';
    const parts = String(name).trim().split(/\s+/);
    const letters = parts.slice(0, 2).map(part => part[0] || '');
    return (letters.join('') || '--').toUpperCase();
  }

  function showLoginMessage(message, type = 'error') {
    if (!loginMessage) return;
    loginMessage.hidden = false;
    loginMessage.className = `login-message ${type}`;
    loginMessage.innerHTML = `${I(type === 'error' ? 'x-circle' : 'info', 15)}<span>${escapeHtml(message)}</span>`;
  }

  function clearLoginMessage() {
    if (loginMessage) loginMessage.hidden = true;
  }

  function setLoginLoading(loading) {
    if (!loginSubmitBtn) return;
    loginSubmitBtn.disabled = loading;
    if (loginSubmitLabel) loginSubmitLabel.textContent = loading ? 'Signing in...' : 'Sign in';
    loginSubmitBtn.classList.toggle('is-loading', loading);
  }

  async function loadDemoAccounts() {
    try {
      state.accounts = await API.accounts();
    } catch (error) {
      showLoginMessage(error.message, 'error');
      return;
    }

    if (loginUserSelect) {
      const options = state.accounts.map(account =>
        `<option value="${escapeHtml(account.userId)}">${escapeHtml(account.userId)} - ${escapeHtml(account.name)} (${escapeHtml(account.role)})</option>`
      );
      loginUserSelect.innerHTML = options.join('') || '<option value="">No accounts configured</option>';
    }

    if (demoChipsEl) {
      demoChipsEl.innerHTML = state.accounts.map(account => `
        <button type="button" class="demo-chip" data-user="${escapeHtml(account.userId)}"
                title="Fill sign-in with ${escapeHtml(account.name)}">
          <strong>${escapeHtml(account.role)}</strong>
          <span>${escapeHtml(account.userId)} &middot; ${escapeHtml(account.name)}</span>
        </button>
      `).join('');
      demoChipsEl.querySelectorAll('.demo-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          if (loginUserSelect) loginUserSelect.value = chip.getAttribute('data-user');
          clearLoginMessage();
          if (loginPassword) loginPassword.focus();
        });
      });
    }
  }

  function renderSession() {
    const user = state.user;
    if (!user) return;

    const avatar = initialsOf(user.name);
    const avatarEl = document.getElementById('userAvatar');
    const menuAvatar = document.getElementById('userMenuAvatar');
    if (avatarEl) avatarEl.textContent = avatar;
    if (menuAvatar) menuAvatar.textContent = avatar;

    const name = document.getElementById('userNameText');
    const role = document.getElementById('userRoleText');
    if (name) name.textContent = user.name || user.userId;
    if (role) role.textContent = user.role || '';

    const menuName = document.getElementById('userMenuName');
    const menuMeta = document.getElementById('userMenuMeta');
    if (menuName) menuName.textContent = user.name || user.userId;
    if (menuMeta) {
      menuMeta.textContent = `${user.userId}${user.facilityId ? ' · ' + user.facilityId : ''} · ${user.role}`;
    }

    const privileges = document.getElementById('userMenuPrivileges');
    if (privileges) privileges.textContent = describePrivileges(user.role);

    applyRbac();
  }

  function openAuthGate(message) {
    if (!authGate) return;
    state.user = null;
    renderSignedOutChip();
    if (message) {
      showLoginMessage(message, 'info');
    } else {
      clearLoginMessage();
    }
    if (loginPassword) loginPassword.value = '';
    authGate.classList.add('active');
  }

  function closeAuthGate() {
    if (!authGate) return;
    authGate.classList.remove('active');
  }

  function renderSignedOutChip() {
    const avatar = document.getElementById('userAvatar');
    const name = document.getElementById('userNameText');
    const role = document.getElementById('userRoleText');
    if (avatar) avatar.textContent = '--';
    if (name) name.textContent = 'Signed out';
    if (role) role.textContent = '\u00A0';
  }

  function enterApp() {
    closeAuthGate();
    renderSession();
    bootApplication();
  }

  async function tryRestoreSession() {
    const session = window.ThriveAuth.get();
    if (session && session.token && session.user) {
      try {
        const me = await API.me();
        state.user = me.user;
        enterApp();
        return;
      } catch (error) {
        window.ThriveAuth.set(null); // token invalid - fall through to sign-in
      }
    }
    openAuthGate();
    loadDemoAccounts();
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async event => {
      event.preventDefault();
      clearLoginMessage();

      const userId = loginUserSelect ? loginUserSelect.value : '';
      const password = loginPassword ? loginPassword.value : '';

      if (!userId) {
        showLoginMessage('Choose a demo account to continue.', 'error');
        return;
      }

      setLoginLoading(true);
      try {
        const session = await API.login(userId, password);
        window.ThriveAuth.set(session);
        state.user = session.user;
        await loadFacilities(); // preload facility names for the dashboard
        enterApp();
        showToast(`Signed in as ${session.user.name} (${session.user.role})`, 'success');
      } catch (error) {
        showLoginMessage(error.message, 'error');
      } finally {
        setLoginLoading(false);
      }
    });
  }

  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      const showing = loginPassword.type === 'text';
      loginPassword.type = showing ? 'password' : 'text';
      togglePasswordBtn.classList.toggle('active', !showing);
      togglePasswordBtn.innerHTML = I(showing ? 'eye' : 'eye-off', 16);
      loginPassword.focus();
    });
  }

  // User chip dropdown
  const userChipBtn = document.getElementById('userChipBtn');
  const userMenu = document.getElementById('userMenu');

  function toggleUserMenu(open) {
    if (!userMenu || !userChipBtn) return;
    const shouldOpen = open !== undefined ? open : userMenu.hidden;
    userMenu.hidden = !shouldOpen;
    userChipBtn.setAttribute('aria-expanded', String(shouldOpen));
  }

  if (userChipBtn) {
    userChipBtn.addEventListener('click', event => {
      event.stopPropagation();
      toggleUserMenu();
    });
  }

  document.addEventListener('click', event => {
    if (userMenu && userMenu.hidden === false
        && !userMenu.contains(event.target) && event.target !== userChipBtn
        && !userChipBtn.contains(event.target)) {
      toggleUserMenu(false);
    }
  });

  async function signOut() {
    try { await API.logout(); } catch (error) { /* stateless - ignore */ }
    window.ThriveAuth.set(null);
    state.user = null;
    toggleUserMenu(false);
    openAuthGate();
    loadDemoAccounts();
    showToast('Signed out', 'info');
  }

  const signOutBtn = document.getElementById('signOutBtn');
  if (signOutBtn) signOutBtn.addEventListener('click', signOut);

  const switchAccountBtn = document.getElementById('switchAccountBtn');
  if (switchAccountBtn) {
    switchAccountBtn.addEventListener('click', async () => {
      try { await API.logout(); } catch (error) { /* stateless - ignore */ }
      window.ThriveAuth.set(null);
      state.user = null;
      toggleUserMenu(false);
      openAuthGate();
      loadDemoAccounts();
    });
  }

  // 401 from any API call -> return to the sign-in gate.
  window.addEventListener('thriveco:session-expired', event => {
    if (authGate && authGate.classList.contains('active')) return; // already signing in
    openAuthGate('Your session has expired. Please sign in again.');
    loadDemoAccounts();
  });

  // =====================================================================
  // RBAC - client-side mirror of the server-side permission matrix
  // =====================================================================
  const ROLE_WRITE_ACCESS = {
    'System Admin': ['facilities', 'medicines', 'blood-stock', 'hospital-resources'],
    'Hospital Staff': ['hospital-resources'],
    'Pharmacy Staff': ['medicines'],
    'Blood Bank Officer': ['blood-stock'],
    'Emergency Search User': []
  };

  function canWrite(resource) {
    if (!state.user) return false;
    const allowed = ROLE_WRITE_ACCESS[state.user.role] || [];
    return allowed.includes(resource);
  }

  /** Human description of privileges (mirrors backend AccessPolicy.describe). */
  function describePrivileges(roleName) {
    switch (roleName) {
      case 'System Admin':
        return 'Full access - can manage every module, including the facility network.';
      case 'Hospital Staff':
        return 'Can manage hospital resources (beds, ventilators, oxygen) for all facilities.';
      case 'Pharmacy Staff':
        return 'Can manage medicine stock records for all connected pharmacies.';
      case 'Blood Bank Officer':
        return 'Can manage blood unit records and transfusion ledger entries.';
      default:
        return 'Read-only access - emergency search and monitoring, no editing.';
    }
  }

  function resourceForType(resourceType) {
    switch (resourceType) {
      case 'Medicine': return 'medicines';
      case 'Blood Unit': return 'blood-stock';
      case 'Hospital Resource': return 'hospital-resources';
      default: return null;
    }
  }

  function applyRbac() {
    const role = state.user ? state.user.role : null;
    document.querySelectorAll('[data-sec]').forEach(element => {
      element.classList.toggle('sec-hidden', !canWrite(element.getAttribute('data-sec')));
    });

    // Emergency Search User sees an explicit read-only chip next to their name.
    const roleText = document.getElementById('userRoleText');
    if (roleText && state.user) {
      roleText.classList.toggle('readonly-chip', role === 'Emergency Search User');
    }
  }

  // If a signed-in user manually triggers a guarded write, show guidance.
  function roleHintFor(resource) {
    const target = {
      'facilities': 'System Admin',
      'medicines': 'Pharmacy Staff (or System Admin)',
      'blood-stock': 'Blood Bank Officer (or System Admin)',
      'hospital-resources': 'Hospital Staff (or System Admin)'
    }[resource] || 'System Admin';
    return `Ask a ${target} account - your ${state.user ? state.user.role : ''} role is read-only here.`;
  }

  // =====================================================================
  // Navigation
  // =====================================================================
  const tabPanes = document.querySelectorAll('.tab-pane');
  const navItems = document.querySelectorAll('.nav-item');

  function switchTab(tabId) {
    state.currentTab = tabId;
    navItems.forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-tab') === tabId);
    });
    tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === `tab-${tabId}`);
    });
    if (state.user) renderCurrentTab();
  }

  navItems.forEach(item => {
    item.addEventListener('click', event => {
      event.preventDefault();
      const tab = item.getAttribute('data-tab');
      if (tab) switchTab(tab);
    });
  });

  async function updateBadges(metrics) {
    try {
      const data = metrics || await API.getMetrics();
      const badge = document.getElementById('sidebarAlertBadge');
      if (!badge) return;
      badge.textContent = data.totalAlerts;
      badge.className = `badge ${data.criticalAlertsCount > 0 ? 'badge-danger' : 'badge-warning'}`;
    } catch (error) {
      // The main render will surface backend errors.
    }
  }

  async function renderCurrentTab() {
    try {
      if (state.currentTab !== 'dashboard') {
        await updateBadges();
      }
      switch (state.currentTab) {
        case 'dashboard':
          await renderDashboard();
          break;
        case 'emergency-search':
          await renderEmergencySearch();
          break;
        case 'pharmacy':
          await renderPharmacy();
          break;
        case 'blood-bank':
          await renderBloodBank();
          break;
        case 'hospital':
          await renderHospital();
          break;
        case 'alerts':
          await renderAlerts();
          break;
        case 'facilities':
          await renderFacilities();
          break;
        case 'api-explorer':
          await renderApiExplorer();
          break;
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  // =====================================================================
  // 1. DASHBOARD
  // =====================================================================
  async function renderDashboard() {
    const [metrics, alerts, bloodStock] = await Promise.all([
      API.getMetrics(),
      API.getAlerts(),
      API.getBloodStock()
    ]);

    updateBadges(metrics);

    const countFac = document.getElementById('dashCountFacilities');
    const countMed = document.getElementById('dashCountMedicines');
    const countBld = document.getElementById('dashCountBlood');
    const countAlt = document.getElementById('dashCountAlerts');
    const countIcu = document.getElementById('dashCountBeds');

    if (countFac) countFac.textContent = metrics.totalFacilities;
    if (countMed) countMed.textContent = `${metrics.totalMedicines.toLocaleString()} units (${metrics.medicineTypesCount} types)`;
    if (countBld) countBld.textContent = `${metrics.totalBloodUnits} units`;
    if (countAlt) countAlt.textContent = metrics.totalAlerts;
    if (countIcu) countIcu.textContent = `${metrics.availableIcuBeds} Available`;

    const alertListEl = document.getElementById('dashAlertsList');
    if (alertListEl) {
      const activeAlerts = alerts.slice(0, 5);
      if (activeAlerts.length === 0) {
        alertListEl.innerHTML = `
          <div style="padding:22px;">
            ${I('check-circle', 18)}
            <strong style="color:#065f46; font-weight:700; vertical-align:1px;">No active stock alerts.</strong>
            <span style="color:#64748b; font-size:13px; margin-left:6px;">All inventories are optimal.</span>
          </div>`;
      } else {
        alertListEl.innerHTML = activeAlerts.map(alert => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid #f1f5f9; gap:12px;">
            <div style="min-width:0;">
              <span class="status-pill ${statusClass(alert.severity)}">${escapeHtml(alert.severity)}</span>
              <strong style="margin-left:8px; color:#1e293b;">${escapeHtml(alert.resourceName)}</strong>
              <span style="font-size:12px; color:#64748b; margin-left:8px;">(${escapeHtml(facilityName(alert.facilityId))})</span>
              <p style="font-size:12px; color:#475569; margin-top:2px;">${escapeHtml(alert.message)}</p>
            </div>
            <button type="button" class="btn btn-outline btn-sm" onclick="window.viewInResource('${escapeHtml(alert.resourceType)}')">
              ${I('search', 13)} Inspect
            </button>
          </div>
        `).join('');
      }
    }

    renderBloodMatrix('dashBloodMatrix', bloodStock);
  }

  window.viewInResource = function (type) {
    if (type === 'Medicine') switchTab('pharmacy');
    else if (type === 'Blood Unit') switchTab('blood-bank');
    else switchTab('hospital');
  };

  function renderBloodMatrix(containerId, stockRecords) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const groups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
    container.innerHTML = groups.map(group => {
      const totalUnits = (stockRecords || [])
        .filter(record => record.bloodGroup === group)
        .reduce((sum, record) => sum + Number(record.quantity), 0);

      let statusColor = '#10b981';
      let statusText = 'Adequate';
      if (totalUnits <= 5) {
        statusColor = '#ef4444';
        statusText = 'Critical';
      } else if (totalUnits <= 10) {
        statusColor = '#f59e0b';
        statusText = 'Low Reserve';
      }

      return `
        <div class="blood-card" style="border-top: 3px solid ${statusColor};">
          <div class="blood-badge-type">${escapeHtml(group)}</div>
          <div class="blood-units-count">${totalUnits} <span style="font-size:12px; font-weight:500;">Units</span></div>
          <div class="blood-card-status" style="color:${statusColor};">${statusText}</div>
        </div>
      `;
    }).join('');
  }

  // =====================================================================
  // 2. EMERGENCY RESOURCE SEARCH
  // =====================================================================
  let emergencyRequestId = 0;

  async function renderEmergencySearch() {
    const resultsContainer = document.getElementById('emergencySearchResults');
    const searchInput = document.getElementById('emergencySearchInput');
    if (!resultsContainer) return;

    const requestId = ++emergencyRequestId;
    const query = searchInput ? searchInput.value : '';

    if (!(resultsContainer.dataset.loaded) && !query) {
      resultsContainer.innerHTML = `<div style="grid-column:1/-1;">${spinnerText('Searching resources across every connected facility...')}</div>`;
    }

    let results;
    try {
      results = await API.searchEmergency({
        type: state.searchMode,
        query,
        bloodGroup: state.searchBloodGroup
      });
    } catch (error) {
      if (requestId === emergencyRequestId) {
        resultsContainer.innerHTML = '';
        showToast(error.message, 'error');
      }
      return;
    }

    if (requestId !== emergencyRequestId) return;

    const countHeader = document.getElementById('searchResultsCount');
    if (countHeader) countHeader.textContent = `${results.length} resources found`;

    if (results.length === 0) {
      resultsContainer.innerHTML = `
        <div style="grid-column: 1 / -1;">
          ${emptyState('search', 'No Matching Resources Reported',
            `No records matched your search in connected facility databases. <em>Note: this does not guarantee unavailability across non-participating clinics.</em>`,
            `<button type="button" class="btn btn-outline btn-sm" onclick="window.resetEmergencySearch()" style="margin-top:12px;">Clear Search Filters</button>`)}
        </div>`;
      return;
    }

    resultsContainer.innerHTML = results.map(item => `
      <div class="result-card">
        <div>
          <div class="result-card-top">
            <div>
              <span class="status-pill ${statusClass(item.status)}">${escapeHtml(item.status)}</span>
              <h4 class="result-name" style="margin-top:6px;">${escapeHtml(item.name)}</h4>
              <span class="result-category">${escapeHtml(item.category)}</span>
            </div>
            <div style="text-align:right;">
              <div class="result-quantity">${item.quantity} <span>${escapeHtml(item.unit)}</span></div>
            </div>
          </div>

          <div class="result-facility-info">
            <div class="facility-name">
              ${I('hospital', 15)} ${escapeHtml(item.facility)}
              <span class="badge badge-primary" style="font-size:10px;">${escapeHtml(item.facilityType)}</span>
            </div>
            <div class="facility-address">${I('map-pin', 13)} ${escapeHtml(item.address)}</div>
            <div style="font-size:11px; color:#0369a1; margin-top:4px; display:inline-flex; align-items:center; gap:4px;">
              ${I('phone-call', 12)} Dispatch: <strong>${escapeHtml(item.emergencyPhone || item.phone)}</strong>
            </div>
          </div>
        </div>

        <div class="result-card-footer">
          <span style="font-size:11px; color:#64748b;">Updated: ${escapeHtml(item.lastUpdated)}</span>
          <button type="button" class="btn btn-primary btn-sm" onclick="window.openDirectConfirmationModal('${escapeHtml(item.id)}', '${escapeHtml(item.type)}', '${escapeHtml(item.facilityId)}')">
            ${I('phone-call', 13)} Direct Confirm
          </button>
        </div>
      </div>
    `).join('');
    resultsContainer.dataset.loaded = 'true';
  }

  const emergencyInput = document.getElementById('emergencySearchInput');
  if (emergencyInput) {
    emergencyInput.addEventListener('input', debounce(() => renderEmergencySearch(), 250));
  }

  document.querySelectorAll('.search-mode-btn').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.search-mode-btn').forEach(b => b.classList.remove('active'));
      button.classList.add('active');
      state.searchMode = button.getAttribute('data-mode');

      const chipsWrapper = document.getElementById('searchBloodChipsWrapper');
      if (chipsWrapper) {
        chipsWrapper.style.display = state.searchMode === 'medicine' ? 'none' : 'flex';
        chipsWrapper.style.alignItems = 'center';
        chipsWrapper.style.flexWrap = 'wrap';
      }
      renderEmergencySearch();
    });
  });

  document.querySelectorAll('.blood-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.blood-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.searchBloodGroup = chip.getAttribute('data-group');
      renderEmergencySearch();
    });
  });

  window.resetEmergencySearch = function () {
    if (emergencyInput) emergencyInput.value = '';
    state.searchBloodGroup = 'ALL';
    document.querySelectorAll('.blood-chip').forEach(chip => {
      chip.classList.toggle('active', chip.getAttribute('data-group') === 'ALL');
    });
    renderEmergencySearch();
  };

  window.openDirectConfirmationModal = async function (id, type, facilityId) {
    try {
      let facility = facilityById(facilityId);
      if (!facility) {
        facility = await API.getFacility(facilityId);
      }

      let resourceTitle = id;
      if (type === 'Medicine') {
        const medicine = await API.getMedicine(id);
        resourceTitle = `${medicine.medicineName} (${medicine.quantity} ${medicine.unit} on file)`;
      } else if (type === 'Blood Unit') {
        const blood = await API.getBloodStockRecord(id);
        resourceTitle = `Blood Group ${blood.bloodGroup} (${blood.quantity} Units on file)`;
      }

      const contact = contactOf(facility);
      const modalBody = document.getElementById('confirmModalBody');
      if (!modalBody) return;

      modalBody.innerHTML = `
        <div class="verification-notice">
          <span class="notice-icon">${I('alert-triangle', 18)}</span>
          <div>
            <strong>Mandatory Direct Confirmation Protocol</strong>
            <p style="margin-top:2px; font-size:12px;">
              As per Thrive&Co safety policy, availability data represents reported facility records. Before dispatching emergency staff or patients, verbal confirmation with the reporting facility desk is required.
            </p>
          </div>
        </div>

        <div style="margin-bottom:16px;">
          <label style="font-size:12px; color:#64748b; font-weight:600;">REQUESTED RESOURCE</label>
          <div style="font-size:16px; font-weight:700; color:#0f172a;">${escapeHtml(resourceTitle)}</div>
        </div>

        <div class="call-confirm-box">
          <div style="font-weight:700; color:#166534; font-size:14px; display:flex; align-items:center; gap:6px;">
            ${I('hospital', 15)} ${escapeHtml(facility.facilityName)}
          </div>
          <div style="font-size:12px; color:#14532d; margin-top:2px; display:flex; align-items:center; gap:5px;">${I('map-pin', 12)} ${escapeHtml(facility.address)}</div>
          <div style="font-size:12px; color:#14532d; margin-top:4px;">Lead Officer: <strong>${escapeHtml(contact.coordinator || 'Duty Officer')}</strong></div>

          <a href="tel:${escapeHtml(contact.emergencyPhone || '')}" class="phone-dial-btn">
            ${I('phone-call', 17)}
            <span>Call Emergency Dispatch: ${escapeHtml(contact.emergencyPhone || 'N/A')}</span>
          </a>
          <a href="tel:${escapeHtml(contact.phone || '')}" class="phone-dial-btn" style="background:#0284c7; margin-top:8px;">
            ${I('phone', 17)}
            <span>Call Desk Phone: ${escapeHtml(contact.phone || 'N/A')}</span>
          </a>
        </div>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; font-size:12px;">
          <div style="font-weight:600; color:#334155; margin-bottom:6px;">Staff Checklist prior to reservation:</div>
          <label style="display:flex; align-items:center; gap:8px; margin-bottom:4px; cursor:pointer;">
            <input type="checkbox" id="chk1"> Verify batch / units currently unreserved
          </label>
          <label style="display:flex; align-items:center; gap:8px; margin-bottom:4px; cursor:pointer;">
            <input type="checkbox" id="chk2"> Confirm cold chain / storage criteria
          </label>
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
            <input type="checkbox" id="chk3"> Request emergency transit hold (30 mins)
          </label>
        </div>
      `;

      openModal('confirmModal');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  // =====================================================================
  // 3. PHARMACY INVENTORY
  // =====================================================================
  async function renderPharmacy() {
    const tableBody = document.getElementById('pharmacyTableBody');
    const facilityFilter = document.getElementById('pharmaFacilityFilter');
    const nameSearch = document.getElementById('pharmaSearchInput');
    const lowStockCheck = document.getElementById('pharmaLowStockFilter');
    if (!tableBody) return;

    fillFacilitySelectOnce(facilityFilter, 'All Connected Facilities');
    showTableMessage(tableBody, 8, 'Loading medicine stock\u2026', 'pill');

    const medicines = await API.getMedicines({
      facilityId: facilityFilter ? facilityFilter.value : undefined,
      name: nameSearch ? nameSearch.value : undefined,
      lowStockOnly: lowStockCheck && lowStockCheck.checked ? 'true' : undefined
    });

    if (medicines.length === 0) {
      tableBody.innerHTML = `
        <tr><td colspan="8">
          ${emptyStateIconOnly('pill', 'No medicine stock records found matching the filters.')}
        </td></tr>`;
      return;
    }

    const mayEdit = canWrite('medicines');

    tableBody.innerHTML = medicines.map(medicine => {
      const low = Number(medicine.quantity) <= Number(medicine.reorderLevel);
      const critical = Number(medicine.quantity) <= Math.floor(Number(medicine.reorderLevel) / 2);
      const pillClass = critical ? 'status-critical' : (low ? 'status-low' : 'status-available');
      const pillText = critical ? 'Critical Low' : (low ? 'Low Stock' : 'In Stock');
      const facility = facilityById(medicine.facilityId);

      const actions = mayEdit ? `
        <div style="display:flex; gap:6px;">
          <button type="button" class="btn btn-outline btn-sm icon-btn" data-sec="medicines" aria-label="Edit ${escapeHtml(medicine.medicineName)}" onclick="window.openEditMedicineModal('${escapeHtml(medicine.medicineId)}')">${I('edit', 14)}</button>
          <button type="button" class="btn btn-outline btn-sm icon-btn danger" data-sec="medicines" aria-label="Delete ${escapeHtml(medicine.medicineName)}" onclick="window.deleteMedicine('${escapeHtml(medicine.medicineId)}', '${escapeHtml(medicine.medicineName)}')">${I('trash', 14)}</button>
        </div>` : `<span class="readonly-note" title="${escapeHtml(roleHintFor('medicines'))}">${I('lock', 13)} Read-only</span>`;

      return `
        <tr>
          <td><code style="font-weight:700; color:#0284c7;">${escapeHtml(medicine.medicineId)}</code></td>
          <td>
            <div style="font-weight:700; color:#0f172a;">${escapeHtml(medicine.medicineName)}</div>
            <div style="font-size:12px; color:#64748b;">Batch: ${escapeHtml(medicine.batchNumber || 'N/A')} &middot; Exp: ${escapeHtml(medicine.expiryDate || 'N/A')}</div>
          </td>
          <td><span class="badge badge-primary" style="font-size:11px;">${escapeHtml(medicine.category)}</span></td>
          <td>
            <div style="font-weight:800; font-size:15px; color:${low ? '#dc2626' : '#0f172a'};">${medicine.quantity} ${escapeHtml(medicine.unit)}</div>
            <span class="status-pill ${pillClass}">${pillText}</span>
          </td>
          <td><span style="font-weight:600; color:#64748b;">${medicine.reorderLevel} ${escapeHtml(medicine.unit)}</span></td>
          <td>
            <div style="font-weight:600;">${escapeHtml(facility ? facility.facilityName : medicine.facilityId)}</div>
            <div style="font-size:11px; color:#64748b;">${escapeHtml(facility ? facility.facilityType : '')}</div>
          </td>
          <td style="font-size:12px; color:#64748b;">${escapeHtml(medicine.lastUpdated)}</td>
          <td>${actions}</td>
        </tr>
      `;
    }).join('');

    applyRbac();
  }

  function emptyStateIconOnly(icon, message) {
    return `<div class="table-message">${I(icon, 18)}<span>${escapeHtml(message)}</span></div>`;
  }

  const pharmaSearch = document.getElementById('pharmaSearchInput');
  if (pharmaSearch) pharmaSearch.addEventListener('input', debounce(() => renderPharmacy(), 250));
  const pharmaFacility = document.getElementById('pharmaFacilityFilter');
  if (pharmaFacility) pharmaFacility.addEventListener('change', () => renderPharmacy());
  const pharmaLowStock = document.getElementById('pharmaLowStockFilter');
  if (pharmaLowStock) pharmaLowStock.addEventListener('change', () => renderPharmacy());

  window.openAddMedicineModal = function () {
    if (!guardWrite('medicines')) return;

    document.getElementById('medFormTitle').textContent = 'Add Medicine Stock Record';
    document.getElementById('medFormId').value = '';
    document.getElementById('medFormName').value = '';
    document.getElementById('medFormCategory').value = 'Emergency & Critical Care';
    document.getElementById('medFormQty').value = '50';
    document.getElementById('medFormUnit').value = 'Ampoules';
    document.getElementById('medFormReorder').value = '25';
    document.getElementById('medFormBatch').value = '';
    document.getElementById('medicineForm').dataset.expiryDate = '';

    fillFacilitySelect(document.getElementById('medFormFacility'));
    openModal('medicineModal');
  };

  window.openEditMedicineModal = async function (id) {
    if (!guardWrite('medicines')) return;
    try {
      const medicine = await API.getMedicine(id);
      document.getElementById('medFormTitle').textContent = `Edit Stock: ${medicine.medicineName}`;
      document.getElementById('medFormId').value = medicine.medicineId;
      document.getElementById('medFormName').value = medicine.medicineName;
      document.getElementById('medFormCategory').value = medicine.category;
      document.getElementById('medFormQty').value = medicine.quantity;
      document.getElementById('medFormUnit').value = medicine.unit;
      document.getElementById('medFormReorder').value = medicine.reorderLevel;
      document.getElementById('medFormBatch').value = medicine.batchNumber || '';
      document.getElementById('medicineForm').dataset.expiryDate = medicine.expiryDate || '';

      fillFacilitySelect(document.getElementById('medFormFacility'), null, medicine.facilityId);
      openModal('medicineModal');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const medicineForm = document.getElementById('medicineForm');
  if (medicineForm) {
    medicineForm.addEventListener('submit', async event => {
      event.preventDefault();

      const id = document.getElementById('medFormId').value;
      const payload = {
        medicineName: document.getElementById('medFormName').value.trim(),
        facilityId: document.getElementById('medFormFacility').value,
        category: document.getElementById('medFormCategory').value,
        quantity: Number(document.getElementById('medFormQty').value),
        unit: document.getElementById('medFormUnit').value,
        reorderLevel: Number(document.getElementById('medFormReorder').value),
        batchNumber: document.getElementById('medFormBatch').value.trim(),
        expiryDate: medicineForm.dataset.expiryDate || ''
      };

      if (!payload.medicineName) {
        showToast('Validation Error: Medicine name is required (TC-02)', 'error');
        return;
      }
      if (Number.isNaN(payload.quantity) || payload.quantity < 0) {
        showToast('Validation Error: Quantity cannot be negative (TC-03)', 'error');
        return;
      }
      if (Number.isNaN(payload.reorderLevel) || payload.reorderLevel < 0) {
        showToast('Validation Error: Reorder threshold cannot be negative', 'error');
        return;
      }

      try {
        if (id) {
          await API.updateMedicine(id, payload);
          showToast(`Updated medicine record: ${payload.medicineName}`, 'success');
        } else {
          await API.createMedicine(payload);
          showToast(`Saved new medicine: ${payload.medicineName} (TC-01)`, 'success');
        }
        closeModal('medicineModal');
        renderCurrentTab();
        updateBadges();
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  }

  window.deleteMedicine = async function (id, name) {
    const confirmed = await confirmDelete(
      'Delete Medicine Record',
      `Medicine record <strong>${escapeHtml(id)}</strong>${name ? ` (${escapeHtml(name)})` : ''} will be removed from the pharmacy inventory permanently. This also clears any alert generated for it (TC-08).`
    );
    if (!confirmed) return;
    try {
      await API.deleteMedicine(id);
      showToast(`Medicine ${id} removed`, 'success');
      renderCurrentTab();
      updateBadges();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  // =====================================================================
  // 4. BLOOD BANK TRACKING
  // =====================================================================
  async function renderBloodBank() {
    const tableBody = document.getElementById('bloodTableBody');
    const groupFilter = document.getElementById('bloodGroupFilter');
    const facilityFilter = document.getElementById('bloodFacilityFilter');
    if (!tableBody) return;

    fillFacilitySelectOnce(facilityFilter, 'All Connected Blood Banks');
    showTableMessage(tableBody, 8, 'Loading blood stock\u2026', 'droplet');

    const [allStock, records] = await Promise.all([
      API.getBloodStock(),
      API.getBloodStock({
        group: groupFilter ? groupFilter.value : undefined,
        facilityId: facilityFilter ? facilityFilter.value : undefined
      })
    ]);

    renderBloodMatrix('bloodBankMatrix', allStock);

    if (records.length === 0) {
      tableBody.innerHTML = `
        <tr><td colspan="8">
          ${emptyStateIconOnly('droplet', 'No blood stock records match the selected filters.')}
        </td></tr>`;
      return;
    }

    const mayEdit = canWrite('blood-stock');

    tableBody.innerHTML = records.map(record => {
      const facility = facilityById(record.facilityId);
      const actions = mayEdit ? `
        <div style="display:flex; gap:6px;">
          <button type="button" class="btn btn-outline btn-sm" data-sec="blood-stock" onclick="window.openEditBloodModal('${escapeHtml(record.recordId)}')">${I('edit', 13)} Edit Units</button>
          <button type="button" class="btn btn-outline btn-sm icon-btn danger" data-sec="blood-stock" aria-label="Delete blood record ${escapeHtml(record.recordId)}" onclick="window.deleteBlood('${escapeHtml(record.recordId)}', '${escapeHtml(record.bloodGroup)}')">${I('trash', 14)}</button>
        </div>` : `<span class="readonly-note" title="${escapeHtml(roleHintFor('blood-stock'))}">${I('lock', 13)} Read-only</span>`;

      return `
        <tr>
          <td><code style="font-weight:700; color:#dc2626;">${escapeHtml(record.recordId)}</code></td>
          <td><strong style="font-size:16px; color:#dc2626;">${escapeHtml(record.bloodGroup)}</strong></td>
          <td><span style="font-weight:600;">${escapeHtml(record.component)}</span></td>
          <td><span style="font-size:16px; font-weight:800; color:#0f172a;">${record.quantity} Units</span></td>
          <td><span class="status-pill ${statusClass(record.availabilityStatus)}">${escapeHtml(record.availabilityStatus)}</span></td>
          <td>
            <div>${escapeHtml(facility ? facility.facilityName : record.facilityId)}</div>
            <div style="font-size:11px; color:#64748b;">${escapeHtml(record.storageTemp || '2°C - 6°C')}</div>
          </td>
          <td style="font-size:12px; color:#64748b;">${escapeHtml(record.lastUpdated)}</td>
          <td>${actions}</td>
        </tr>
      `;
    }).join('');

    applyRbac();
  }

  const bloodGroupFilter = document.getElementById('bloodGroupFilter');
  if (bloodGroupFilter) bloodGroupFilter.addEventListener('change', () => renderBloodBank());
  const bloodFacilityFilter = document.getElementById('bloodFacilityFilter');
  if (bloodFacilityFilter) bloodFacilityFilter.addEventListener('change', () => renderBloodBank());

  window.openAddBloodModal = function () {
    if (!guardWrite('blood-stock')) return;

    document.getElementById('bloodFormTitle').textContent = 'Add Blood Unit Record';
    document.getElementById('bloodFormId').value = '';
    document.getElementById('bloodFormGroup').value = 'O+';
    document.getElementById('bloodFormComponent').value = 'Whole Blood';
    document.getElementById('bloodFormQty').value = '10';
    document.getElementById('bloodFormTemp').value = '2°C - 6°C';

    fillFacilitySelect(document.getElementById('bloodFormFacility'));
    openModal('bloodModal');
  };

  window.openEditBloodModal = async function (id) {
    if (!guardWrite('blood-stock')) return;
    try {
      const record = await API.getBloodStockRecord(id);
      document.getElementById('bloodFormTitle').textContent = `Update Blood Units: ${record.bloodGroup} (${record.component})`;
      document.getElementById('bloodFormId').value = record.recordId;
      document.getElementById('bloodFormGroup').value = record.bloodGroup;
      document.getElementById('bloodFormComponent').value = record.component;
      document.getElementById('bloodFormQty').value = record.quantity;
      document.getElementById('bloodFormTemp').value = record.storageTemp || '2°C - 6°C';

      fillFacilitySelect(document.getElementById('bloodFormFacility'), null, record.facilityId);
      openModal('bloodModal');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const bloodForm = document.getElementById('bloodForm');
  if (bloodForm) {
    bloodForm.addEventListener('submit', async event => {
      event.preventDefault();

      const id = document.getElementById('bloodFormId').value;
      const payload = {
        bloodGroup: document.getElementById('bloodFormGroup').value,
        component: document.getElementById('bloodFormComponent').value,
        facilityId: document.getElementById('bloodFormFacility').value,
        quantity: Number(document.getElementById('bloodFormQty').value),
        storageTemp: document.getElementById('bloodFormTemp').value.trim()
      };

      if (Number.isNaN(payload.quantity) || payload.quantity < 0) {
        showToast('Validation Error: Quantity cannot be negative', 'error');
        return;
      }

      try {
        if (id) {
          await API.updateBloodStock(id, payload);
          showToast(`Updated ${payload.bloodGroup} units to ${payload.quantity} (TC-06)`, 'success');
        } else {
          await API.createBloodStock(payload);
          showToast(`Added blood stock: ${payload.bloodGroup}`, 'success');
        }
        closeModal('bloodModal');
        renderCurrentTab();
        updateBadges();
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  }

  window.deleteBlood = async function (id, groupName) {
    const confirmed = await confirmDelete(
      'Delete Blood Stock Record',
      `Blood record <strong>${escapeHtml(id)}</strong>${groupName ? ` (${escapeHtml(groupName)})` : ''} will be removed from the transfusion ledger permanently.`
    );
    if (!confirmed) return;
    try {
      await API.deleteBloodStock(id);
      showToast(`Blood record ${id} removed`, 'success');
      renderCurrentTab();
      updateBadges();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  // =====================================================================
  // 5. HOSPITAL RESOURCES
  // =====================================================================
  async function renderHospital() {
    const tableBody = document.getElementById('hospitalTableBody');
    if (!tableBody) return;

    showTableMessage(tableBody, 8, 'Loading hospital resources\u2026', 'bed');
    const resources = await API.getHospitalResources();

    if (resources.length === 0) {
      tableBody.innerHTML = `
        <tr><td colspan="8">
          ${emptyStateIconOnly('bed', 'No hospital resources recorded yet.')}
        </td></tr>`;
      return;
    }

    const mayEdit = canWrite('hospital-resources');

    tableBody.innerHTML = resources.map(resource => {
      const facility = facilityById(resource.facilityId);
      const low = Number(resource.availableQuantity) <= Number(resource.reorderLevel);
      const occupancy = resource.totalCapacity > 0
        ? Math.round(((resource.totalCapacity - resource.availableQuantity) / resource.totalCapacity) * 100)
        : 0;

      const actions = mayEdit
        ? `<button type="button" class="btn btn-outline btn-sm" data-sec="hospital-resources" onclick="window.openEditHospitalResModal('${escapeHtml(resource.resourceId)}')">${I('edit', 13)} Adjust</button>`
        : `<span class="readonly-note" title="${escapeHtml(roleHintFor('hospital-resources'))}">${I('lock', 13)} Read-only</span>`;

      return `
        <tr>
          <td><code style="font-weight:700; color:#0d9488;">${escapeHtml(resource.resourceId)}</code></td>
          <td>
            <div style="font-weight:700; color:#0f172a;">${escapeHtml(resource.resourceName)}</div>
            <div style="font-size:12px; color:#64748b;">${escapeHtml(resource.category)}</div>
          </td>
          <td>${escapeHtml(facility ? facility.facilityName : resource.facilityId)}</td>
          <td><strong>${resource.totalCapacity}</strong> ${escapeHtml(resource.unit)}</td>
          <td>
            <span style="font-size:16px; font-weight:800; color:${low ? '#dc2626' : '#10b981'};">${resource.availableQuantity}</span> ${escapeHtml(resource.unit)}
            <span class="status-pill ${low ? 'status-critical' : 'status-available'}">${low ? 'Critical Capacity' : 'Available'}</span>
          </td>
          <td style="width:160px;">
            <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:2px;">
              <span>Occupancy</span><span>${occupancy}%</span>
            </div>
            <div class="utilization-bar"><div class="utilization-fill" style="width:${Math.max(0, Math.min(100, occupancy))}%; background:${occupancy > 85 ? '#ef4444' : '#0284c7'};"></div></div>
          </td>
          <td style="font-size:12px; color:#64748b;">${escapeHtml(resource.lastUpdated)}</td>
          <td>${actions}</td>
        </tr>
      `;
    }).join('');

    applyRbac();
  }

  window.openAddHospitalResModal = function () {
    if (!guardWrite('hospital-resources')) return;

    document.getElementById('hospFormTitle').textContent = 'Add Hospital Medical Resource';
    document.getElementById('hospFormId').value = '';
    document.getElementById('hospFormName').value = '';
    document.getElementById('hospFormCat').value = 'Intensive Care Beds';
    document.getElementById('hospFormTotal').value = '20';
    document.getElementById('hospFormAvail').value = '5';
    document.getElementById('hospFormThreshold').value = '3';
    document.getElementById('hospFormUnit').value = 'Beds';

    fillFacilitySelect(document.getElementById('hospFormFacility'));
    openModal('hospitalModal');
  };

  window.openEditHospitalResModal = async function (id) {
    if (!guardWrite('hospital-resources')) return;
    try {
      const resource = await API.getHospitalResource(id);
      document.getElementById('hospFormTitle').textContent = `Adjust Capacity: ${resource.resourceName}`;
      document.getElementById('hospFormId').value = resource.resourceId;
      document.getElementById('hospFormName').value = resource.resourceName;
      document.getElementById('hospFormCat').value = resource.category;
      document.getElementById('hospFormTotal').value = resource.totalCapacity;
      document.getElementById('hospFormAvail').value = resource.availableQuantity;
      document.getElementById('hospFormThreshold').value = resource.reorderLevel;
      document.getElementById('hospFormUnit').value = resource.unit;

      fillFacilitySelect(document.getElementById('hospFormFacility'), null, resource.facilityId);
      openModal('hospitalModal');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const hospitalForm = document.getElementById('hospitalForm');
  if (hospitalForm) {
    hospitalForm.addEventListener('submit', async event => {
      event.preventDefault();

      const id = document.getElementById('hospFormId').value;
      const payload = {
        resourceName: document.getElementById('hospFormName').value.trim(),
        facilityId: document.getElementById('hospFormFacility').value,
        category: document.getElementById('hospFormCat').value,
        totalCapacity: Number(document.getElementById('hospFormTotal').value),
        availableQuantity: Number(document.getElementById('hospFormAvail').value),
        reorderLevel: Number(document.getElementById('hospFormThreshold').value),
        unit: document.getElementById('hospFormUnit').value.trim()
      };

      if (!payload.resourceName) {
        showToast('Resource name is required', 'error');
        return;
      }
      if (payload.availableQuantity < 0 || payload.totalCapacity < 0) {
        showToast('Capacities cannot be negative', 'error');
        return;
      }
      if (payload.availableQuantity > payload.totalCapacity) {
        showToast('Available quantity cannot exceed total capacity', 'error');
        return;
      }

      try {
        if (id) {
          await API.updateHospitalResource(id, payload);
          showToast(`Adjusted resource capacity: ${payload.resourceName}`, 'success');
        } else {
          await API.createHospitalResource(payload);
          showToast(`Added hospital resource: ${payload.resourceName}`, 'success');
        }
        closeModal('hospitalModal');
        renderCurrentTab();
        updateBadges();
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  }

  // =====================================================================
  // 6. LOW-STOCK ALERTS
  // =====================================================================
  async function renderAlerts() {
    const container = document.getElementById('alertsListContainer');
    if (!container) return;

    container.innerHTML = spinnerText('Loading live alerts...') ;
    const alerts = await API.getAlerts();
    updateBadges();

    if (alerts.length === 0) {
      container.innerHTML = emptyState(
        'check-circle',
        'No Active Low-Stock Alerts',
        'All medicines, blood units, and hospital assets are currently maintained above reorder thresholds.'
      );
      return;
    }

    container.innerHTML = alerts.map(alert => {
      const critical = alert.severity === 'Critical';
      const resource = resourceForType(alert.resourceType);
      const mayRestock = resource && canWrite(resource);

      const actionArea = mayRestock
        ? `<button type="button" class="btn btn-primary btn-sm" onclick="window.quickRestockAlert('${escapeHtml(alert.resourceType)}', '${escapeHtml(alert.resourceId)}')">
             ${I('zap', 13)} Replenish Stock
           </button>`
        : `<span class="readonly-note" title="${escapeHtml(roleHintFor(resource))}">${I('lock', 13)} Read-only session</span>`;

      return `
        <div class="result-card alert-card" style="border-left: 5px solid ${critical ? '#ef4444' : '#f59e0b'};">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap;">
            <div style="min-width:0;">
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span class="status-pill ${critical ? 'status-critical' : 'status-low'}">${escapeHtml(alert.severity)} Flag</span>
                <span style="font-size:12px; color:#64748b;">${escapeHtml(alert.resourceType)} &middot; Ref: <code>${escapeHtml(alert.resourceId)}</code></span>
              </div>
              <h4 style="font-size:17px; font-weight:700; color:#0f172a; margin-top:6px;">${escapeHtml(alert.resourceName)}</h4>
              <p style="color:#475569; font-size:13px; margin:4px 0 10px 0;">${escapeHtml(alert.message)}</p>
              <div style="font-size:12px; color:#64748b;">
                Reporting Facility: <strong>${escapeHtml(facilityName(alert.facilityId))}</strong> | Created: ${escapeHtml(alert.createdAt)}
              </div>
            </div>

            <div style="text-align:right; margin-left:auto;">
              <div style="font-size:22px; font-weight:800; color:${critical ? '#dc2626' : '#d97706'};">
                ${alert.currentQuantity} <span style="font-size:12px; font-weight:500;">/ Reorder ${alert.threshold} ${escapeHtml(alert.unit)}</span>
              </div>
              <div style="margin-top:10px; display:flex; gap:6px; justify-content:flex-end;">
                ${actionArea}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  window.quickRestockAlert = async function (type, id) {
    const resource = resourceForType(type);
    if (!guardWrite(resource)) return;
    try {
      if (type === 'Medicine') {
        const medicine = await API.getMedicine(id);
        const added = medicine.reorderLevel * 2;
        await API.updateMedicine(id, {
          medicineName: medicine.medicineName,
          facilityId: medicine.facilityId,
          category: medicine.category,
          quantity: medicine.quantity + added,
          unit: medicine.unit,
          reorderLevel: medicine.reorderLevel,
          batchNumber: medicine.batchNumber,
          expiryDate: medicine.expiryDate
        });
        showToast(`Stock for ${medicine.medicineName} replenished by +${added} ${medicine.unit} (TC-08: Alert Cleared)`, 'success');
      } else if (type === 'Blood Unit') {
        const blood = await API.getBloodStockRecord(id);
        await API.updateBloodStock(id, {
          bloodGroup: blood.bloodGroup,
          facilityId: blood.facilityId,
          component: blood.component,
          quantity: blood.quantity + 10,
          storageTemp: blood.storageTemp
        });
        showToast(`Added +10 units to blood reserve ${blood.bloodGroup}`, 'success');
      } else if (type === 'Hospital Resource') {
        const resource = await API.getHospitalResource(id);
        await API.updateHospitalResource(id, {
          resourceName: resource.resourceName,
          facilityId: resource.facilityId,
          category: resource.category,
          totalCapacity: resource.totalCapacity,
          availableQuantity: resource.totalCapacity,
          reorderLevel: resource.reorderLevel,
          unit: resource.unit
        });
        showToast(`Hospital resource ${resource.resourceName} reset to full capacity`, 'success');
      }

      renderCurrentTab();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  // =====================================================================
  // 7. FACILITIES DIRECTORY
  // =====================================================================
  async function renderFacilities() {
    const container = document.getElementById('facilitiesGrid');
    if (!container) return;

    container.innerHTML = spinnerText('Loading connected facilities...');

    const [facilities, medicines, bloodStock] = await Promise.all([
      API.getFacilities(),
      API.getMedicines(),
      API.getBloodStock()
    ]);
    state.facilities = facilities;

    if (facilities.length === 0) {
      container.innerHTML = `
        <div style="grid-column:1/-1;">
          ${emptyState('map-pin', 'No Facilities Connected Yet',
            'Connect the first hospital, pharmacy or blood bank to bring facilities into the network.',
            canWrite('facilities')
              ? '<button type="button" class="btn btn-primary btn-sm" onclick="window.openAddFacilityModal()" style="margin-top:12px;">Connect New Facility</button>'
              : '')}
        </div>`;
      return;
    }

    container.innerHTML = facilities.map(facility => {
      let icon = 'hospital';
      let tagClass = 'badge-primary';
      if (facility.facilityType === 'Pharmacy') {
        icon = 'pill';
        tagClass = 'badge-success';
      }
      if (facility.facilityType === 'Blood Bank') {
        icon = 'droplet';
        tagClass = 'badge-danger';
      }

      const medCount = medicines.filter(medicine => medicine.facilityId === facility.facilityId).length;
      const bloodCount = bloodStock
        .filter(blood => blood.facilityId === facility.facilityId)
        .reduce((sum, blood) => sum + Number(blood.quantity), 0);
      const contact = contactOf(facility);

      return `
        <div class="result-card">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <span class="badge ${tagClass}" style="display:inline-flex; align-items:center; gap:5px;">${I(icon, 13)} ${escapeHtml(facility.facilityType)}</span>
              <span style="font-size:11px; color:#10b981; font-weight:700; display:inline-flex; align-items:center; gap:4px;">${I('shield-check', 13)} Network Verified</span>
            </div>
            <h4 style="font-size:18px; font-weight:700; color:#0f172a; margin-top:8px;">${escapeHtml(facility.facilityName)}</h4>
            <p style="color:#64748b; font-size:12px; margin-top:4px; display:flex; align-items:center; gap:5px;">${I('map-pin', 13)} ${escapeHtml(facility.address)}</p>

            <div class="contact-box">
              <div style="display:flex; align-items:center; gap:6px;">${I('user', 13)} Coordinator: <strong>${escapeHtml(contact.coordinator)}</strong></div>
              <div style="margin-top:4px; display:flex; align-items:center; gap:6px;">${I('phone', 13)} Main Line: <strong>${escapeHtml(contact.phone)}</strong></div>
              <div style="color:#dc2626; margin-top:4px; display:flex; align-items:center; gap:6px;">${I('siren', 13)} 24/7 Hotline: <strong>${escapeHtml(contact.emergencyPhone)}</strong></div>
              <div style="color:#0369a1; margin-top:4px; display:flex; align-items:center; gap:6px;">${I('mail', 13)} ${escapeHtml(contact.email)}</div>
            </div>

            <div style="display:flex; gap:14px; font-size:12px; color:#475569; flex-wrap:wrap;">
              <div style="display:flex; align-items:center; gap:5px;">${I('pill', 13)} <strong>${medCount}</strong> Meds Tracked</div>
              <div style="display:flex; align-items:center; gap:5px;">${I('droplet', 13)} <strong>${bloodCount}</strong> Blood Units</div>
            </div>
          </div>

          <div style="margin-top:14px; padding-top:10px; border-top:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; color:#64748b; display:inline-flex; align-items:center; gap:4px;">${I('clock', 12)} Audited: ${escapeHtml(facility.lastAudit || 'Recent')}</span>
            <a href="tel:${escapeHtml(contact.phone || '')}" class="btn btn-outline btn-sm">${I('phone', 13)} Direct Call</a>
          </div>
        </div>
      `;
    }).join('');
  }

  window.openAddFacilityModal = function () {
    if (!guardWrite('facilities')) return;

    document.getElementById('facFormName').value = '';
    document.getElementById('facFormType').value = 'Hospital';
    document.getElementById('facFormAddress').value = '';
    document.getElementById('facFormPhone').value = '';
    document.getElementById('facFormEmergency').value = '';
    document.getElementById('facFormCoordinator').value = '';
    openModal('facilityModal');
  };

  const facilityForm = document.getElementById('facilityForm');
  if (facilityForm) {
    facilityForm.addEventListener('submit', async event => {
      event.preventDefault();

      const payload = {
        facilityName: document.getElementById('facFormName').value.trim(),
        facilityType: document.getElementById('facFormType').value,
        address: document.getElementById('facFormAddress').value.trim(),
        phone: document.getElementById('facFormPhone').value.trim(),
        emergencyPhone: document.getElementById('facFormEmergency').value.trim(),
        coordinator: document.getElementById('facFormCoordinator').value.trim()
      };

      if (!payload.facilityName || !payload.address) {
        showToast('Please provide facility name and address', 'error');
        return;
      }

      try {
        const created = await API.createFacility(payload);
        state.facilities.push(created);
        showToast(`Connected new facility: ${payload.facilityName}`, 'success');
        closeModal('facilityModal');
        renderCurrentTab();
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  }

  // =====================================================================
  // 8. API & SCHEMA EXPLORER
  // =====================================================================
  async function renderApiExplorer() {
    const liveJsonBox = document.getElementById('apiResponseJson');
    if (!liveJsonBox) return;

    try {
      const [facilities, medicines, blood, resources, alerts, users] = await Promise.all([
        API.getFacilities(),
        API.getMedicines(),
        API.getBloodStock(),
        API.getHospitalResources(),
        API.getAlerts(),
        API.getUsers()
      ]);

      liveJsonBox.textContent = JSON.stringify({
        status: 'success',
        timestamp: new Date().toLocaleString('en-IN'),
        database: 'Neon PostgreSQL (JPA) / H2 local profile',
        backend: 'Java 21 + Spring Boot',
        active_collections: {
          facilities: facilities.length,
          medicines: medicines.length,
          bloodStock: blood.length,
          hospitalResources: resources.length,
          alerts: alerts.length,
          users: users.length
        }
      }, null, 2);
    } catch (error) {
      liveJsonBox.textContent = JSON.stringify({ status: 'error', message: error.message }, null, 2);
    }
  }

  window.testApiRoute = async function (route) {
    const liveJsonBox = document.getElementById('apiResponseJson');
    const routeTitle = document.getElementById('apiActiveRouteTitle');
    if (routeTitle) routeTitle.textContent = `Response: ${route}`;

    const routes = {
      'GET /api/facilities': () => API.getFacilities(),
      'GET /api/medicines': () => API.getMedicines(),
      'GET /api/blood-stock': () => API.getBloodStock(),
      'GET /api/alerts': () => API.getAlerts(),
      'GET /api/hospital-resources': () => API.getHospitalResources(),
      'GET /api/users': () => API.getUsers(),
      'GET /api/dashboard/metrics': () => API.getMetrics()
    };

    try {
      const loader = routes[route];
      if (!loader) {
        throw new Error(`Unknown API route: ${route}`);
      }
      const response = await loader();
      if (liveJsonBox) liveJsonBox.textContent = JSON.stringify(response, null, 2);
      showToast(`Tested endpoint: ${route}`, 'info');
    } catch (error) {
      if (liveJsonBox) {
        liveJsonBox.textContent = JSON.stringify({ status: 'error', message: error.message }, null, 2);
      }
      showToast(error.message, 'error');
    }
  };

  // =====================================================================
  // RBAC write guard for user-initiated actions
  // =====================================================================
  function guardWrite(resource) {
    if (!state.user) {
      openAuthGate('Sign in to perform this action.');
      return false;
    }
    if (!resource) return true; // non-resource actions (e.g. confirm modal)
    if (canWrite(resource)) return true;

    showToast(`Not permitted: ${roleHintFor(resource)}`, 'error');
    return false;
  }

  // =====================================================================
  // MODAL UTILITIES + DESTRUCTIVE ACTION CONFIRMATION
  // =====================================================================
  window.openModal = function (id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
  };

  window.closeModal = function (id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
    if (id === 'deleteModal') settleConfirm(false);
  };

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', event => {
      if (event.target === overlay) {
        overlay.classList.remove('active');
        if (overlay.id === 'deleteModal') settleConfirm(false);
      }
    });
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (confirmState) {
        settleConfirm(false);
      } else {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => modal.classList.remove('active'));
      }
      toggleUserMenu(false);
    }
  });

  let confirmState = null;
  const deleteModal = document.getElementById('deleteModal');
  const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
  const deleteCancelBtn = document.getElementById('deleteCancelBtn');
  const deleteModalCloseBtn = document.getElementById('deleteModalCloseBtn');

  function settleConfirm(result) {
    if (!confirmState) return;
    const settle = confirmState.resolve;
    confirmState = null;
    if (deleteModal) deleteModal.classList.remove('active');
    settle(result);
  }

  if (deleteConfirmBtn) deleteConfirmBtn.addEventListener('click', () => settleConfirm(true));
  if (deleteCancelBtn) deleteCancelBtn.addEventListener('click', () => settleConfirm(false));
  if (deleteModalCloseBtn) deleteModalCloseBtn.addEventListener('click', () => settleConfirm(false));

  /**
   * Styled confirmation dialog for destructive actions.
   * Returns a Promise<boolean> resolved with the user's decision.
   */
  function confirmDelete(title, messageHtml) {
    const titleEl = document.getElementById('deleteModalTitle');
    const messageEl = document.getElementById('deleteModalMessage');
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.innerHTML = messageHtml;

    confirmState = null;
    openModal('deleteModal');
    return new Promise(resolve => {
      confirmState = { resolve };
    });
  }

  // =====================================================================
  // DATA BOOTSTRAP
  // =====================================================================
  async function loadFacilities() {
    try {
      state.facilities = await API.getFacilities();
      clearBackendOffline();
    } catch (error) {
      state.facilities = [];
      showBackendOffline('Backend not reachable. Start the Spring Boot server (./mvnw spring-boot:run) and refresh this page.');
    }
  }

  async function bootApplication() {
    await loadFacilities();
    applyRbac();
    switchTab(state.currentTab || 'dashboard');
  }

  // Start: validate any stored session, otherwise open the sign-in gate.
  tryRestoreSession();
  setLoginLoading(false);

  // Exposed for the inline quick-navigation buttons in index.html.
  window.thriveState = state;
});
