/**
 * THRIVE&CO - Main Application Controller (Java/Spring Boot edition)
 * Handles navigation, rendering, search, modals, forms and the live alert feed.
 *
 * All data now comes from the Java REST API in src/main/java instead of the
 * browser's localStorage.
 */
document.addEventListener('DOMContentLoaded', () => {
  const state = {
    currentTab: 'dashboard',
    currentRole: 'System Admin',
    searchMode: 'all',
    searchBloodGroup: 'ALL',
    facilities: []
  };

  const tabPanes = document.querySelectorAll('.tab-pane');
  const navItems = document.querySelectorAll('.nav-item');
  const roleSelect = document.getElementById('userRoleSelect');
  const liveClockEl = document.getElementById('liveClock');

  // ---------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------
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

  function showTableMessage(tableBody, columns, message, color) {
    if (!tableBody) return;
    tableBody.innerHTML = `
      <tr>
        <td colspan="${columns}" style="text-align:center; padding:30px; color:${color || '#64748b'};">
          ${escapeHtml(message)}
        </td>
      </tr>`;
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
  // Toast notifications
  // ---------------------------------------------------------------------
  window.showToast = function (message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const icon = document.createElement('span');
    icon.textContent = icons[type] || icons.info;
    const body = document.createElement('div');
    body.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(body);
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };

  function showBackendOffline(message) {
    if (document.getElementById('backendOfflineBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'backendOfflineBanner';
    banner.style.cssText = 'margin:16px 0;padding:14px 18px;border:1px solid #fecaca;background:#fef2f2;color:#991b1b;border-radius:10px;font-size:13px;font-weight:600;';
    banner.textContent = message;
    const content = document.querySelector('.content-area');
    if (content) content.prepend(banner);
  }

  function clearBackendOffline() {
    const banner = document.getElementById('backendOfflineBanner');
    if (banner) banner.remove();
  }

  // ---------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------
  function switchTab(tabId) {
    state.currentTab = tabId;
    navItems.forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-tab') === tabId);
    });
    tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === `tab-${tabId}`);
    });
    renderCurrentTab();
  }

  navItems.forEach(item => {
    item.addEventListener('click', event => {
      event.preventDefault();
      const tab = item.getAttribute('data-tab');
      if (tab) switchTab(tab);
    });
  });

  if (roleSelect) {
    roleSelect.addEventListener('change', event => {
      state.currentRole = event.target.value;
      showToast(`Switched active view to: ${state.currentRole}`);
      applyRolePermissions();
    });
  }

  function applyRolePermissions() {
    document.querySelectorAll('.admin-only-action').forEach(button => {
      button.style.display = state.currentRole === 'Emergency Search User' ? 'none' : '';
    });
  }

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
        alertListEl.innerHTML = '<div style="padding:20px; text-align:center; color:#10b981;">No active stock alerts. All inventories optimal.</div>';
      } else {
        alertListEl.innerHTML = activeAlerts.map(alert => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid #f1f5f9;">
            <div>
              <span class="status-pill ${statusClass(alert.severity)}">${escapeHtml(alert.severity)}</span>
              <strong style="margin-left:8px; color:#1e293b;">${escapeHtml(alert.resourceName)}</strong>
              <span style="font-size:12px; color:#64748b; margin-left:8px;">(${escapeHtml(facilityName(alert.facilityId))})</span>
              <p style="font-size:12px; color:#475569; margin-top:2px;">${escapeHtml(alert.message)}</p>
            </div>
            <button class="btn btn-outline btn-sm" onclick="window.viewInResource('${escapeHtml(alert.resourceType)}')">Inspect</button>
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
        statusText = 'CRITICAL';
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
        <div style="grid-column: 1 / -1; padding: 40px; text-align: center; background: white; border-radius: 12px; border: 1px dashed #cbd5e1;">
          <div style="font-size: 32px; margin-bottom: 8px;">🔍</div>
          <h4 style="color: #0f172a; font-weight: 700;">No Matching Resources Reported</h4>
          <p style="color: #64748b; font-size: 13px; max-width: 500px; margin: 6px auto;">
            No records matched your search in connected facility databases. <em>Note: This does not guarantee unavailability across non-participating clinics.</em>
          </p>
          <button class="btn btn-outline btn-sm" onclick="window.resetEmergencySearch()" style="margin-top: 10px;">Clear Search Filters</button>
        </div>
      `;
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
              <span>🏥</span> ${escapeHtml(item.facility)}
              <span class="badge badge-primary" style="font-size:10px;">${escapeHtml(item.facilityType)}</span>
            </div>
            <div class="facility-address">📍 ${escapeHtml(item.address)}</div>
            <div style="font-size:11px; color:#0369a1; margin-top:4px;">
              📞 Dispatch: <strong>${escapeHtml(item.emergencyPhone || item.phone)}</strong>
            </div>
          </div>
        </div>

        <div class="result-card-footer">
          <span style="font-size:11px; color:#64748b;">Updated: ${escapeHtml(item.lastUpdated)}</span>
          <button class="btn btn-primary btn-sm" onclick="window.openDirectConfirmationModal('${escapeHtml(item.id)}', '${escapeHtml(item.type)}', '${escapeHtml(item.facilityId)}')">
            📞 Direct Confirm
          </button>
        </div>
      </div>
    `).join('');
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
          <span>⚠️</span>
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
          <div style="font-weight:700; color:#166534; font-size:14px;">🏥 ${escapeHtml(facility.facilityName)}</div>
          <div style="font-size:12px; color:#14532d; margin-top:2px;">📍 ${escapeHtml(facility.address)}</div>
          <div style="font-size:12px; color:#14532d; margin-top:4px;">Lead Officer: <strong>${escapeHtml(contact.coordinator || 'Duty Officer')}</strong></div>

          <a href="tel:${escapeHtml(contact.emergencyPhone || '')}" class="phone-dial-btn">
            <span>📞 Call Emergency Dispatch: ${escapeHtml(contact.emergencyPhone || 'N/A')}</span>
          </a>
          <a href="tel:${escapeHtml(contact.phone || '')}" class="phone-dial-btn" style="background:#0284c7; margin-top:8px;">
            <span>☎️ Call Desk Phone: ${escapeHtml(contact.phone || 'N/A')}</span>
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
    showTableMessage(tableBody, 8, 'Loading medicine stock…');

    const medicines = await API.getMedicines({
      facilityId: facilityFilter ? facilityFilter.value : undefined,
      name: nameSearch ? nameSearch.value : undefined,
      lowStockOnly: lowStockCheck && lowStockCheck.checked ? 'true' : undefined
    });

    if (medicines.length === 0) {
      showTableMessage(tableBody, 8, 'No medicine stock records found matching filters.');
      return;
    }

    tableBody.innerHTML = medicines.map(medicine => {
      const low = Number(medicine.quantity) <= Number(medicine.reorderLevel);
      const critical = Number(medicine.quantity) <= Math.floor(Number(medicine.reorderLevel) / 2);
      const pillClass = critical ? 'status-critical' : (low ? 'status-low' : 'status-available');
      const pillText = critical ? 'Critical Low' : (low ? 'Low Stock' : 'In Stock');
      const facility = facilityById(medicine.facilityId);

      return `
        <tr>
          <td><code style="font-weight:700; color:#0284c7;">${escapeHtml(medicine.medicineId)}</code></td>
          <td>
            <div style="font-weight:700; color:#0f172a;">${escapeHtml(medicine.medicineName)}</div>
            <div style="font-size:12px; color:#64748b;">Batch: ${escapeHtml(medicine.batchNumber || 'N/A')} • Exp: ${escapeHtml(medicine.expiryDate || 'N/A')}</div>
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
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-outline btn-sm admin-only-action" onclick="window.openEditMedicineModal('${escapeHtml(medicine.medicineId)}')" title="Edit stock">✏️</button>
              <button class="btn btn-outline btn-sm admin-only-action" onclick="window.deleteMedicine('${escapeHtml(medicine.medicineId)}')" style="color:#ef4444;" title="Delete record">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    applyRolePermissions();
  }

  const pharmaSearch = document.getElementById('pharmaSearchInput');
  if (pharmaSearch) pharmaSearch.addEventListener('input', debounce(() => renderPharmacy(), 250));
  const pharmaFacility = document.getElementById('pharmaFacilityFilter');
  if (pharmaFacility) pharmaFacility.addEventListener('change', () => renderPharmacy());
  const pharmaLowStock = document.getElementById('pharmaLowStockFilter');
  if (pharmaLowStock) pharmaLowStock.addEventListener('change', () => renderPharmacy());

  window.openAddMedicineModal = function () {
    document.getElementById('medFormTitle').textContent = 'Add Medicine Stock Record';
    document.getElementById('medFormId').value = '';
    document.getElementById('medFormName').value = '';
    document.getElementById('medFormCategory').value = 'Emergency & Critical Care';
    document.getElementById('medFormQty').value = '50';
    document.getElementById('medFormUnit').value = 'Ampoules';
    document.getElementById('medFormReorder').value = '25';
    document.getElementById('medFormBatch').value = 'BAT-2026';
    document.getElementById('medicineForm').dataset.expiryDate = '';

    fillFacilitySelect(document.getElementById('medFormFacility'));
    openModal('medicineModal');
  };

  window.openEditMedicineModal = async function (id) {
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
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  }

  window.deleteMedicine = async function (id) {
    if (!confirm(`Are you sure you want to delete medicine record ${id}?`)) return;
    try {
      await API.deleteMedicine(id);
      showToast(`Medicine ${id} removed`, 'info');
      renderCurrentTab();
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
    showTableMessage(tableBody, 8, 'Loading blood stock…');

    const [allStock, records] = await Promise.all([
      API.getBloodStock(),
      API.getBloodStock({
        group: groupFilter ? groupFilter.value : undefined,
        facilityId: facilityFilter ? facilityFilter.value : undefined
      })
    ]);

    renderBloodMatrix('bloodBankMatrix', allStock);

    if (records.length === 0) {
      showTableMessage(tableBody, 8, 'No blood stock records match selected filters.');
      return;
    }

    tableBody.innerHTML = records.map(record => {
      const facility = facilityById(record.facilityId);
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
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-outline btn-sm admin-only-action" onclick="window.openEditBloodModal('${escapeHtml(record.recordId)}')">✏️ Edit Units</button>
              <button class="btn btn-outline btn-sm admin-only-action" onclick="window.deleteBlood('${escapeHtml(record.recordId)}')" style="color:#ef4444;">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    applyRolePermissions();
  }

  const bloodGroupFilter = document.getElementById('bloodGroupFilter');
  if (bloodGroupFilter) bloodGroupFilter.addEventListener('change', () => renderBloodBank());
  const bloodFacilityFilter = document.getElementById('bloodFacilityFilter');
  if (bloodFacilityFilter) bloodFacilityFilter.addEventListener('change', () => renderBloodBank());

  window.openAddBloodModal = function () {
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
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  }

  window.deleteBlood = async function (id) {
    if (!confirm(`Remove blood stock record ${id}?`)) return;
    try {
      await API.deleteBloodStock(id);
      showToast(`Blood record ${id} removed`, 'info');
      renderCurrentTab();
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

    showTableMessage(tableBody, 8, 'Loading hospital resources…');
    const resources = await API.getHospitalResources();

    if (resources.length === 0) {
      showTableMessage(tableBody, 8, 'No hospital resources recorded.');
      return;
    }

    tableBody.innerHTML = resources.map(resource => {
      const facility = facilityById(resource.facilityId);
      const low = Number(resource.availableQuantity) <= Number(resource.reorderLevel);
      const occupancy = resource.totalCapacity > 0
        ? Math.round(((resource.totalCapacity - resource.availableQuantity) / resource.totalCapacity) * 100)
        : 0;

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
            <div style="height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
              <div style="width:${Math.max(0, Math.min(100, occupancy))}%; height:100%; background:${occupancy > 85 ? '#ef4444' : '#0284c7'};"></div>
            </div>
          </td>
          <td style="font-size:12px; color:#64748b;">${escapeHtml(resource.lastUpdated)}</td>
          <td>
            <button class="btn btn-outline btn-sm admin-only-action" onclick="window.openEditHospitalResModal('${escapeHtml(resource.resourceId)}')">✏️ Adjust</button>
          </td>
        </tr>
      `;
    }).join('');

    applyRolePermissions();
  }

  window.openAddHospitalResModal = function () {
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

    container.innerHTML = '<div style="padding:30px;text-align:center;color:#64748b;">Loading live alerts…</div>';
    const alerts = await API.getAlerts();

    if (alerts.length === 0) {
      container.innerHTML = `
        <div style="padding:40px; text-align:center; background:white; border-radius:12px; border:1px solid #e2e8f0;">
          <div style="font-size:32px; margin-bottom:8px;">🎉</div>
          <h4 style="color:#0f172a; font-weight:700;">No Active Low-Stock Alerts</h4>
          <p style="color:#64748b; font-size:13px;">All medicines, blood units, and hospital assets are currently maintained above reorder thresholds.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = alerts.map(alert => {
      const critical = alert.severity === 'Critical';
      return `
        <div class="result-card" style="border-left: 5px solid ${critical ? '#ef4444' : '#f59e0b'}; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="status-pill ${critical ? 'status-critical' : 'status-low'}">${escapeHtml(alert.severity)} Flag</span>
                <span style="font-size:12px; color:#64748b;">${escapeHtml(alert.resourceType)} • Ref: <code>${escapeHtml(alert.resourceId)}</code></span>
              </div>
              <h4 style="font-size:17px; font-weight:700; color:#0f172a; margin-top:6px;">${escapeHtml(alert.resourceName)}</h4>
              <p style="color:#475569; font-size:13px; margin:4px 0 10px 0;">${escapeHtml(alert.message)}</p>
              <div style="font-size:12px; color:#64748b;">
                Reporting Facility: <strong>${escapeHtml(facilityName(alert.facilityId))}</strong> | Created: ${escapeHtml(alert.createdAt)}
              </div>
            </div>

            <div style="text-align:right;">
              <div style="font-size:22px; font-weight:800; color:${critical ? '#dc2626' : '#d97706'};">
                ${alert.currentQuantity} <span style="font-size:12px; font-weight:500;">/ Reorder ${alert.threshold} ${escapeHtml(alert.unit)}</span>
              </div>
              <div style="margin-top:10px; display:flex; gap:6px; justify-content:flex-end;">
                <button class="btn btn-primary btn-sm" onclick="window.quickRestockAlert('${escapeHtml(alert.resourceType)}', '${escapeHtml(alert.resourceId)}')">⚡ Replenish Stock</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  window.quickRestockAlert = async function (type, id) {
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

    container.innerHTML = '<div style="padding:30px;text-align:center;color:#64748b;">Loading connected facilities…</div>';

    const [facilities, medicines, bloodStock] = await Promise.all([
      API.getFacilities(),
      API.getMedicines(),
      API.getBloodStock()
    ]);
    state.facilities = facilities;

    container.innerHTML = facilities.map(facility => {
      let icon = '🏥';
      let tagClass = 'badge-primary';
      if (facility.facilityType === 'Pharmacy') {
        icon = '💊';
        tagClass = 'badge-success';
      }
      if (facility.facilityType === 'Blood Bank') {
        icon = '🩸';
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
              <span class="badge ${tagClass}">${icon} ${escapeHtml(facility.facilityType)}</span>
              <span style="font-size:11px; color:#10b981; font-weight:700;">✓ Network Verified</span>
            </div>
            <h4 style="font-size:18px; font-weight:700; color:#0f172a; margin-top:8px;">${escapeHtml(facility.facilityName)}</h4>
            <p style="color:#64748b; font-size:12px; margin-top:4px;">📍 ${escapeHtml(facility.address)}</p>

            <div style="background:#f8fafc; border-radius:8px; padding:10px; margin:12px 0; font-size:12px;">
              <div>👤 Coordinator: <strong>${escapeHtml(contact.coordinator)}</strong></div>
              <div style="margin-top:2px;">📞 Main Line: <strong>${escapeHtml(contact.phone)}</strong></div>
              <div style="color:#dc2626; margin-top:2px;">🚨 24/7 Hotline: <strong>${escapeHtml(contact.emergencyPhone)}</strong></div>
              <div style="color:#0369a1; margin-top:2px;">✉️ ${escapeHtml(contact.email)}</div>
            </div>

            <div style="display:flex; gap:12px; font-size:12px; color:#475569;">
              <div>💊 <strong>${medCount}</strong> Meds Tracked</div>
              <div>🩸 <strong>${bloodCount}</strong> Blood Units</div>
            </div>
          </div>

          <div style="margin-top:14px; padding-top:10px; border-top:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; color:#94a3b8;">Audited: ${escapeHtml(facility.lastAudit || 'Recent')}</span>
            <a href="tel:${escapeHtml(contact.phone || '')}" class="btn btn-outline btn-sm">Direct Call</a>
          </div>
        </div>
      `;
    }).join('');
  }

  window.openAddFacilityModal = function () {
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
  // MODAL UTILITIES
  // =====================================================================
  window.openModal = function (id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
  };

  window.closeModal = function (id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
  };

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', event => {
      if (event.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(modal => modal.classList.remove('active'));
    }
  });

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

  async function boot() {
    await loadFacilities();
    applyRolePermissions();
    switchTab('dashboard');
  }

  boot();

  // Exposed for the inline quick-navigation buttons in index.html.
  window.thriveState = state;
});
