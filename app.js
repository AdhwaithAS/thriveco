/**
 * THRIVE&CO - Main Application Controller
 * Handles Navigation, State, Rendering, Search, Modals, Forms & Alerts
 * Marian College of Engineering - Academic Project 2026-2027
 */

document.addEventListener('DOMContentLoaded', () => {
  const store = window.thriveStore;
  
  // App State
  const state = {
    currentTab: 'dashboard',
    currentRole: 'System Admin',
    searchMode: 'all',
    searchBloodGroup: 'ALL',
    searchQuery: '',
    selectedFacilityForConfirm: null
  };

  // DOM Elements
  const tabPanes = document.querySelectorAll('.tab-pane');
  const navItems = document.querySelectorAll('.nav-item');
  const roleSelect = document.getElementById('userRoleSelect');
  const liveClockEl = document.getElementById('liveClock');

  // Initialize Clock
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

  // Navigation Controller
  function switchTab(tabId) {
    state.currentTab = tabId;
    navItems.forEach(item => {
      if (item.getAttribute('data-tab') === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    tabPanes.forEach(pane => {
      if (pane.id === `tab-${tabId}`) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    // Refresh content for active tab
    renderCurrentTab();
  }

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = item.getAttribute('data-tab');
      if (tab) switchTab(tab);
    });
  });

  // Role Switcher Controller
  if (roleSelect) {
    roleSelect.addEventListener('change', (e) => {
      state.currentRole = e.target.value;
      showToast(`Switched active view to: ${state.currentRole}`);
      applyRolePermissions();
    });
  }

  function applyRolePermissions() {
    const roleBadge = document.getElementById('activeRoleDisplay');
    if (roleBadge) roleBadge.textContent = state.currentRole;
    
    // Toggle admin / facility-only actions if necessary
    const adminOnlyBtns = document.querySelectorAll('.admin-only-action');
    adminOnlyBtns.forEach(btn => {
      if (state.currentRole === 'Emergency Search User') {
        btn.style.display = 'none';
      } else {
        btn.style.display = '';
      }
    });
  }

  // Toast Notification System
  window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';
    
    toast.innerHTML = `<span>${icon}</span> <div>${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };

  // Master Render Router
  function renderCurrentTab() {
    updateBadges();
    switch (state.currentTab) {
      case 'dashboard':
        renderDashboard();
        break;
      case 'emergency-search':
        renderEmergencySearch();
        break;
      case 'pharmacy':
        renderPharmacy();
        break;
      case 'blood-bank':
        renderBloodBank();
        break;
      case 'hospital':
        renderHospital();
        break;
      case 'alerts':
        renderAlerts();
        break;
      case 'facilities':
        renderFacilities();
        break;
      case 'api-explorer':
        renderApiExplorer();
        break;
    }
  }

  function updateBadges() {
    const metrics = store.getDashboardMetrics();
    const alertBadge = document.getElementById('sidebarAlertBadge');
    if (alertBadge) {
      alertBadge.textContent = metrics.totalAlerts;
      alertBadge.className = `badge ${metrics.criticalAlertsCount > 0 ? 'badge-danger' : 'badge-warning'}`;
    }
  }

  // =========================================================================
  // 1. DASHBOARD TAB
  // =========================================================================
  function renderDashboard() {
    const metrics = store.getDashboardMetrics();
    
    const countFac = document.getElementById('dashCountFacilities');
    const countMed = document.getElementById('dashCountMedicines');
    const countBld = document.getElementById('dashCountBlood');
    const countAlt = document.getElementById('dashCountAlerts');
    const countIcu = document.getElementById('dashCountBeds');

    if (countFac) countFac.textContent = metrics.totalFacilities;
    if (countMed) countMed.textContent = `${metrics.totalMedicines.toLocaleString()} units (${metrics.medicineTypesCount} types)`;
    if (countBld) countBld.textContent = `${metrics.totalBloodUnits} units`;
    if (countAlt) countAlt.textContent = metrics.totalAlerts;
    if (countIcu) countIcu.textContent = `${metrics.availableICUBeds} Available`;

    // Render Recent Critical Alerts preview
    const alertListEl = document.getElementById('dashAlertsList');
    if (alertListEl) {
      const activeAlerts = store.getAlerts().slice(0, 5);
      if (activeAlerts.length === 0) {
        alertListEl.innerHTML = `<div style="padding:20px; text-align:center; color:#10b981;">No active stock alerts. All inventories optimal.</div>`;
      } else {
        alertListEl.innerHTML = activeAlerts.map(a => {
          const fac = store.getFacilityById(a.facilityId);
          return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid #f1f5f9;">
              <div>
                <span class="status-pill ${a.severity === 'Critical' ? 'status-critical' : 'status-low'}">${a.severity}</span>
                <strong style="margin-left:8px; color:#1e293b;">${a.resourceName}</strong>
                <span style="font-size:12px; color:#64748b; margin-left:8px;">(${fac ? fac.facilityName : a.facilityId})</span>
                <p style="font-size:12px; color:#475569; margin-top:2px;">${a.message}</p>
              </div>
              <button class="btn btn-outline btn-sm" onclick="window.viewInResource('${a.resourceType}')">Inspect</button>
            </div>
          `;
        }).join('');
      }
    }

    // Render Quick Blood Matrix
    renderBloodMatrix('dashBloodMatrix');
  }

  window.viewInResource = function(type) {
    if (type === 'Medicine') switchTab('pharmacy');
    else if (type === 'Blood Unit') switchTab('blood-bank');
    else switchTab('hospital');
  };

  // =========================================================================
  // 2. EMERGENCY RESOURCE SEARCH (Section 5.4)
  // =========================================================================
  function renderEmergencySearch() {
    const searchInput = document.getElementById('emergencySearchInput');
    const query = searchInput ? searchInput.value : '';
    const resultsContainer = document.getElementById('emergencySearchResults');
    if (!resultsContainer) return;

    let results = store.searchEmergency(state.searchMode, query);

    // Filter by selected blood group if blood search
    if (state.searchBloodGroup !== 'ALL') {
      results = results.filter(r => r.category.includes(state.searchBloodGroup) || r.name.includes(state.searchBloodGroup));
    }

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

    resultsContainer.innerHTML = results.map(item => {
      let statusClass = 'status-available';
      if (item.status === 'Low Stock') statusClass = 'status-low';
      if (item.status === 'Critical Alert' || item.status === 'Out of Stock') statusClass = 'status-critical';
      if (item.status === 'Reserved') statusClass = 'status-reserved';

      return `
        <div class="result-card">
          <div>
            <div class="result-card-top">
              <div>
                <span class="status-pill ${statusClass}">${item.status}</span>
                <h4 class="result-name" style="margin-top:6px;">${item.name}</h4>
                <span class="result-category">${item.category}</span>
              </div>
              <div style="text-align:right;">
                <div class="result-quantity">${item.quantity} <span>${item.unit}</span></div>
              </div>
            </div>

            <div class="result-facility-info">
              <div class="facility-name">
                <span>🏥</span> ${item.facility}
                <span class="badge badge-primary" style="font-size:10px;">${item.facilityType}</span>
              </div>
              <div class="facility-address">📍 ${item.address}</div>
              <div style="font-size:11px; color:#0369a1; margin-top:4px;">
                📞 Dispatch: <strong>${item.emergencyPhone || item.phone}</strong>
              </div>
            </div>
          </div>

          <div class="result-card-footer">
            <span style="font-size:11px; color:#64748b;">Updated: ${item.lastUpdated}</span>
            <button class="btn btn-primary btn-sm" onclick="window.openDirectConfirmationModal('${item.id}', '${item.type}', '${item.facilityId}')">
              📞 Direct Confirm
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Setup emergency search listeners
  const searchInput = document.getElementById('emergencySearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => renderEmergencySearch());
  }

  const modeButtons = document.querySelectorAll('.search-mode-btn');
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.searchMode = btn.getAttribute('data-mode');
      
      const bloodChipsWrapper = document.getElementById('searchBloodChipsWrapper');
      if (bloodChipsWrapper) {
        bloodChipsWrapper.style.display = (state.searchMode === 'blood' || state.searchMode === 'all') ? 'flex' : 'none';
      }
      renderEmergencySearch();
    });
  });

  const bloodChips = document.querySelectorAll('.blood-chip');
  bloodChips.forEach(chip => {
    chip.addEventListener('click', () => {
      bloodChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.searchBloodGroup = chip.getAttribute('data-group');
      renderEmergencySearch();
    });
  });

  window.resetEmergencySearch = function() {
    if (searchInput) searchInput.value = '';
    state.searchBloodGroup = 'ALL';
    bloodChips.forEach(c => {
      if (c.getAttribute('data-group') === 'ALL') c.classList.add('active');
      else c.classList.remove('active');
    });
    renderEmergencySearch();
  };

  // Direct Confirmation Protocol Modal (Section 2.5, 6.5, 12.4)
  window.openDirectConfirmationModal = function(id, type, facilityId) {
    const fac = store.getFacilityById(facilityId);
    if (!fac) return;
    
    let resourceTitle = id;
    if (type === 'Medicine') {
      const m = store.data.medicines.find(x => x.medicineId === id);
      if (m) resourceTitle = `${m.medicineName} (${m.quantity} ${m.unit} on file)`;
    } else if (type === 'Blood Unit') {
      const b = store.data.bloodStock.find(x => x.recordId === id);
      if (b) resourceTitle = `Blood Group ${b.bloodGroup} (${b.quantity} Units on file)`;
    }

    const modalBody = document.getElementById('confirmModalBody');
    if (modalBody) {
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
          <div style="font-size:16px; font-weight:700; color:#0f172a;">${resourceTitle}</div>
        </div>

        <div class="call-confirm-box">
          <div style="font-weight:700; color:#166534; font-size:14px;">🏥 ${fac.facilityName}</div>
          <div style="font-size:12px; color:#14532d; margin-top:2px;">📍 ${fac.address}</div>
          <div style="font-size:12px; color:#14532d; margin-top:4px;">Lead Officer: <strong>${fac.contactDetails.coordinator}</strong></div>

          <a href="tel:${fac.contactDetails.emergencyPhone}" class="phone-dial-btn">
            <span>📞 Call Emergency Dispatch: ${fac.contactDetails.emergencyPhone}</span>
          </a>
          <a href="tel:${fac.contactDetails.phone}" class="phone-dial-btn" style="background:#0284c7; margin-top:8px;">
            <span>☎️ Call Desk Phone: ${fac.contactDetails.phone}</span>
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
    }

    openModal('confirmModal');
  };

  // =========================================================================
  // 3. PHARMACY INVENTORY (Section 5.2)
  // =========================================================================
  function renderPharmacy() {
    const tableBody = document.getElementById('pharmacyTableBody');
    const facFilter = document.getElementById('pharmaFacilityFilter');
    const nameSearch = document.getElementById('pharmaSearchInput');
    const lowStockCheck = document.getElementById('pharmaLowStockFilter');

    if (!tableBody) return;

    // Populate facility filter options once
    if (facFilter && facFilter.options.length <= 1) {
      facFilter.innerHTML = `<option value="ALL">All Connected Facilities</option>` +
        store.getFacilities().map(f => `<option value="${f.facilityId}">${f.facilityName}</option>`).join('');
    }

    const filters = {
      facilityId: facFilter ? facFilter.value : 'ALL',
      name: nameSearch ? nameSearch.value : '',
      lowStockOnly: lowStockCheck ? lowStockCheck.checked : false
    };

    const medicines = store.getMedicines(filters);

    if (medicines.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:#64748b;">No medicine stock records found matching filters.</td></tr>`;
      return;
    }

    tableBody.innerHTML = medicines.map(m => {
      const fac = store.getFacilityById(m.facilityId);
      const isLow = Number(m.quantity) <= Number(m.reorderLevel);
      const isCritical = Number(m.quantity) <= Math.floor(Number(m.reorderLevel) / 2);
      let pillClass = 'status-available';
      let pillText = 'In Stock';
      if (isCritical) { pillClass = 'status-critical'; pillText = 'Critical Low'; }
      else if (isLow) { pillClass = 'status-low'; pillText = 'Low Stock'; }

      return `
        <tr>
          <td><code style="font-weight:700; color:#0284c7;">${m.medicineId}</code></td>
          <td>
            <div style="font-weight:700; color:#0f172a;">${m.medicineName}</div>
            <div style="font-size:12px; color:#64748b;">Batch: ${m.batchNumber || 'N/A'} • Exp: ${m.expiryDate || 'N/A'}</div>
          </td>
          <td><span class="badge badge-primary" style="font-size:11px;">${m.category}</span></td>
          <td>
            <div style="font-weight:800; font-size:15px; color:${isLow ? '#dc2626' : '#0f172a'};">${m.quantity} ${m.unit}</div>
            <span class="status-pill ${pillClass}">${pillText}</span>
          </td>
          <td><span style="font-weight:600; color:#64748b;">${m.reorderLevel} ${m.unit}</span></td>
          <td>
            <div style="font-weight:600;">${fac ? fac.facilityName : m.facilityId}</div>
            <div style="font-size:11px; color:#64748b;">${fac ? fac.facilityType : ''}</div>
          </td>
          <td style="font-size:12px; color:#64748b;">${m.lastUpdated}</td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-outline btn-sm admin-only-action" onclick="window.openEditMedicineModal('${m.medicineId}')" title="Edit stock">✏️</button>
              <button class="btn btn-outline btn-sm admin-only-action" onclick="window.deleteMedicine('${m.medicineId}')" style="color:#ef4444;" title="Delete record">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    applyRolePermissions();
  }

  // Pharmacy Listeners
  const pharmaSearch = document.getElementById('pharmaSearchInput');
  if (pharmaSearch) pharmaSearch.addEventListener('input', () => renderPharmacy());
  const pharmaFac = document.getElementById('pharmaFacilityFilter');
  if (pharmaFac) pharmaFac.addEventListener('change', () => renderPharmacy());
  const pharmaLow = document.getElementById('pharmaLowStockFilter');
  if (pharmaLow) pharmaLow.addEventListener('change', () => renderPharmacy());

  // Add / Edit Medicine Modal
  window.openAddMedicineModal = function() {
    document.getElementById('medFormTitle').textContent = 'Add Medicine Stock Record';
    document.getElementById('medFormId').value = '';
    document.getElementById('medFormName').value = '';
    document.getElementById('medFormCategory').value = 'Emergency & Critical Care';
    document.getElementById('medFormQty').value = '50';
    document.getElementById('medFormUnit').value = 'Ampoules';
    document.getElementById('medFormReorder').value = '25';
    document.getElementById('medFormBatch').value = 'BAT-2026';
    
    // Populate facility select
    const facSelect = document.getElementById('medFormFacility');
    facSelect.innerHTML = store.getFacilities().map(f => `<option value="${f.facilityId}">${f.facilityName} (${f.facilityType})</option>`).join('');

    openModal('medicineModal');
  };

  window.openEditMedicineModal = function(id) {
    const med = store.data.medicines.find(m => m.medicineId === id);
    if (!med) return;
    document.getElementById('medFormTitle').textContent = `Edit Stock: ${med.medicineName}`;
    document.getElementById('medFormId').value = med.medicineId;
    document.getElementById('medFormName').value = med.medicineName;
    document.getElementById('medFormCategory').value = med.category;
    document.getElementById('medFormQty').value = med.quantity;
    document.getElementById('medFormUnit').value = med.unit;
    document.getElementById('medFormReorder').value = med.reorderLevel;
    document.getElementById('medFormBatch').value = med.batchNumber || '';

    const facSelect = document.getElementById('medFormFacility');
    facSelect.innerHTML = store.getFacilities().map(f => `
      <option value="${f.facilityId}" ${f.facilityId === med.facilityId ? 'selected' : ''}>${f.facilityName} (${f.facilityType})</option>
    `).join('');

    openModal('medicineModal');
  };

  const medicineForm = document.getElementById('medicineForm');
  if (medicineForm) {
    medicineForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('medFormId').value;
      const name = document.getElementById('medFormName').value.trim();
      const facilityId = document.getElementById('medFormFacility').value;
      const category = document.getElementById('medFormCategory').value;
      const quantity = Number(document.getElementById('medFormQty').value);
      const unit = document.getElementById('medFormUnit').value;
      const reorderLevel = Number(document.getElementById('medFormReorder').value);
      const batchNumber = document.getElementById('medFormBatch').value;

      // TC-02 & TC-03 Validation Rules
      if (!name) {
        showToast('Validation Error: Medicine name is required (TC-02)', 'error');
        return;
      }
      if (isNaN(quantity) || quantity < 0) {
        showToast('Validation Error: Quantity cannot be negative (TC-03)', 'error');
        return;
      }
      if (isNaN(reorderLevel) || reorderLevel < 0) {
        showToast('Validation Error: Reorder threshold cannot be negative', 'error');
        return;
      }

      if (id) {
        store.updateMedicine(id, { medicineName: name, facilityId, category, quantity, unit, reorderLevel, batchNumber });
        showToast(`Updated medicine record: ${name}`, 'success');
      } else {
        store.addMedicine({ medicineName: name, facilityId, category, quantity, unit, reorderLevel, batchNumber });
        showToast(`Saved new medicine: ${name} (TC-01)`, 'success');
      }

      closeModal('medicineModal');
      renderCurrentTab();
    });
  }

  window.deleteMedicine = function(id) {
    if (confirm(`Are you sure you want to delete medicine record ${id}?`)) {
      store.deleteMedicine(id);
      showToast(`Medicine ${id} removed`, 'info');
      renderCurrentTab();
    }
  };

  // =========================================================================
  // 4. BLOOD BANK TRACKING (Section 5.3)
  // =========================================================================
  function renderBloodMatrix(containerId = 'bloodBankMatrix') {
    const el = document.getElementById(containerId);
    if (!el) return;
    const groups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
    
    el.innerHTML = groups.map(grp => {
      const records = store.getBloodStock({ group: grp });
      const totalUnits = records.reduce((acc, r) => acc + Number(r.quantity), 0);
      let statusColor = '#10b981';
      let statusText = 'Adequate';
      if (totalUnits <= 5) { statusColor = '#ef4444'; statusText = 'CRITICAL'; }
      else if (totalUnits <= 10) { statusColor = '#f59e0b'; statusText = 'Low Reserve'; }

      return `
        <div class="blood-card" style="border-top: 3px solid ${statusColor};">
          <div class="blood-badge-type">${grp}</div>
          <div class="blood-units-count">${totalUnits} <span style="font-size:12px; font-weight:500;">Units</span></div>
          <div class="blood-card-status" style="color:${statusColor};">${statusText}</div>
        </div>
      `;
    }).join('');
  }

  function renderBloodBank() {
    renderBloodMatrix('bloodBankMatrix');

    const tableBody = document.getElementById('bloodTableBody');
    const groupFilter = document.getElementById('bloodGroupFilter');
    const facFilter = document.getElementById('bloodFacilityFilter');

    if (!tableBody) return;

    if (facFilter && facFilter.options.length <= 1) {
      facFilter.innerHTML = `<option value="ALL">All Connected Facilities</option>` +
        store.getFacilities().map(f => `<option value="${f.facilityId}">${f.facilityName}</option>`).join('');
    }

    const filters = {
      group: groupFilter ? groupFilter.value : 'ALL',
      facilityId: facFilter ? facFilter.value : 'ALL'
    };

    const records = store.getBloodStock(filters);

    if (records.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:#64748b;">No blood stock records match selected filters.</td></tr>`;
      return;
    }

    tableBody.innerHTML = records.map(b => {
      const fac = store.getFacilityById(b.facilityId);
      let pillClass = 'status-available';
      if (b.availabilityStatus === 'Low Stock') pillClass = 'status-low';
      if (b.availabilityStatus === 'Critical Alert') pillClass = 'status-critical';
      if (b.availabilityStatus === 'Reserved') pillClass = 'status-reserved';

      return `
        <tr>
          <td><code style="font-weight:700; color:#dc2626;">${b.recordId}</code></td>
          <td><strong style="font-size:16px; color:#dc2626;">${b.bloodGroup}</strong></td>
          <td><span style="font-weight:600;">${b.component}</span></td>
          <td>
            <span style="font-size:16px; font-weight:800; color:#0f172a;">${b.quantity} Units</span>
          </td>
          <td><span class="status-pill ${pillClass}">${b.availabilityStatus}</span></td>
          <td>
            <div>${fac ? fac.facilityName : b.facilityId}</div>
            <div style="font-size:11px; color:#64748b;">${b.storageTemp || '2°C - 6°C'}</div>
          </td>
          <td style="font-size:12px; color:#64748b;">${b.lastUpdated}</td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-outline btn-sm admin-only-action" onclick="window.openEditBloodModal('${b.recordId}')">✏️ Edit Units</button>
              <button class="btn btn-outline btn-sm admin-only-action" onclick="window.deleteBlood('${b.recordId}')" style="color:#ef4444;">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    applyRolePermissions();
  }

  // Blood bank listeners
  const bldGrpFilter = document.getElementById('bloodGroupFilter');
  if (bldGrpFilter) bldGrpFilter.addEventListener('change', () => renderBloodBank());
  const bldFacFilter = document.getElementById('bloodFacilityFilter');
  if (bldFacFilter) bldFacFilter.addEventListener('change', () => renderBloodBank());

  window.openAddBloodModal = function() {
    document.getElementById('bloodFormTitle').textContent = 'Add Blood Unit Record';
    document.getElementById('bloodFormId').value = '';
    document.getElementById('bloodFormGroup').value = 'O+';
    document.getElementById('bloodFormComponent').value = 'Whole Blood';
    document.getElementById('bloodFormQty').value = '10';
    document.getElementById('bloodFormTemp').value = '2°C - 6°C';

    const facSelect = document.getElementById('bloodFormFacility');
    facSelect.innerHTML = store.getFacilities().map(f => `<option value="${f.facilityId}">${f.facilityName}</option>`).join('');

    openModal('bloodModal');
  };

  window.openEditBloodModal = function(id) {
    const item = store.data.bloodStock.find(b => b.recordId === id);
    if (!item) return;
    document.getElementById('bloodFormTitle').textContent = `Update Blood Units: ${item.bloodGroup} (${item.component})`;
    document.getElementById('bloodFormId').value = item.recordId;
    document.getElementById('bloodFormGroup').value = item.bloodGroup;
    document.getElementById('bloodFormComponent').value = item.component;
    document.getElementById('bloodFormQty').value = item.quantity;
    document.getElementById('bloodFormTemp').value = item.storageTemp || '2°C - 6°C';

    const facSelect = document.getElementById('bloodFormFacility');
    facSelect.innerHTML = store.getFacilities().map(f => `
      <option value="${f.facilityId}" ${f.facilityId === item.facilityId ? 'selected' : ''}>${f.facilityName}</option>
    `).join('');

    openModal('bloodModal');
  };

  const bloodForm = document.getElementById('bloodForm');
  if (bloodForm) {
    bloodForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('bloodFormId').value;
      const bloodGroup = document.getElementById('bloodFormGroup').value;
      const component = document.getElementById('bloodFormComponent').value;
      const facilityId = document.getElementById('bloodFormFacility').value;
      const quantity = Number(document.getElementById('bloodFormQty').value);
      const storageTemp = document.getElementById('bloodFormTemp').value;

      if (isNaN(quantity) || quantity < 0) {
        showToast('Validation Error: Quantity cannot be negative', 'error');
        return;
      }

      if (id) {
        store.updateBloodStock(id, { bloodGroup, component, facilityId, quantity, storageTemp });
        showToast(`Updated ${bloodGroup} units to ${quantity} (TC-06)`, 'success');
      } else {
        store.addBloodStock({ bloodGroup, component, facilityId, quantity, storageTemp });
        showToast(`Added blood stock: ${bloodGroup}`, 'success');
      }

      closeModal('bloodModal');
      renderCurrentTab();
    });
  }

  window.deleteBlood = function(id) {
    if (confirm(`Remove blood stock record ${id}?`)) {
      store.deleteBloodStock(id);
      showToast(`Blood record ${id} removed`, 'info');
      renderCurrentTab();
    }
  };

  // =========================================================================
  // 5. HOSPITAL RESOURCES (Section 5.1)
  // =========================================================================
  function renderHospital() {
    const tableBody = document.getElementById('hospitalTableBody');
    if (!tableBody) return;
    const resources = store.getHospitalResources();

    tableBody.innerHTML = resources.map(res => {
      const fac = store.getFacilityById(res.facilityId);
      const isLow = Number(res.availableQuantity) <= Number(res.reorderLevel);
      const occPercentage = Math.round(((res.totalCapacity - res.availableQuantity) / res.totalCapacity) * 100);

      return `
        <tr>
          <td><code style="font-weight:700; color:#0d9488;">${res.resourceId}</code></td>
          <td>
            <div style="font-weight:700; color:#0f172a;">${res.resourceName}</div>
            <div style="font-size:12px; color:#64748b;">${res.category}</div>
          </td>
          <td>${fac ? fac.facilityName : res.facilityId}</td>
          <td><strong>${res.totalCapacity}</strong> ${res.unit}</td>
          <td>
            <span style="font-size:16px; font-weight:800; color:${isLow ? '#dc2626' : '#10b981'};">${res.availableQuantity}</span> ${res.unit}
            <span class="status-pill ${isLow ? 'status-critical' : 'status-available'}">${isLow ? 'Critical Capacity' : 'Available'}</span>
          </td>
          <td style="width:160px;">
            <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:2px;">
              <span>Occupancy</span><span>${occPercentage}%</span>
            </div>
            <div style="height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
              <div style="width:${occPercentage}%; height:100%; background:${occPercentage > 85 ? '#ef4444' : '#0284c7'};"></div>
            </div>
          </td>
          <td style="font-size:12px; color:#64748b;">${res.lastUpdated}</td>
          <td>
            <button class="btn btn-outline btn-sm admin-only-action" onclick="window.openEditHospitalResModal('${res.resourceId}')">✏️ Adjust</button>
          </td>
        </tr>
      `;
    }).join('');

    applyRolePermissions();
  }

  window.openAddHospitalResModal = function() {
    document.getElementById('hospFormTitle').textContent = 'Add Hospital Medical Resource';
    document.getElementById('hospFormId').value = '';
    document.getElementById('hospFormName').value = '';
    document.getElementById('hospFormCat').value = 'Intensive Care Beds';
    document.getElementById('hospFormTotal').value = '20';
    document.getElementById('hospFormAvail').value = '5';
    document.getElementById('hospFormThreshold').value = '3';
    document.getElementById('hospFormUnit').value = 'Beds';

    const facSelect = document.getElementById('hospFormFacility');
    facSelect.innerHTML = store.getFacilities().map(f => `<option value="${f.facilityId}">${f.facilityName}</option>`).join('');

    openModal('hospitalModal');
  };

  window.openEditHospitalResModal = function(id) {
    const res = store.data.hospitalResources.find(r => r.resourceId === id);
    if (!res) return;
    document.getElementById('hospFormTitle').textContent = `Adjust Capacity: ${res.resourceName}`;
    document.getElementById('hospFormId').value = res.resourceId;
    document.getElementById('hospFormName').value = res.resourceName;
    document.getElementById('hospFormCat').value = res.category;
    document.getElementById('hospFormTotal').value = res.totalCapacity;
    document.getElementById('hospFormAvail').value = res.availableQuantity;
    document.getElementById('hospFormThreshold').value = res.reorderLevel;
    document.getElementById('hospFormUnit').value = res.unit;

    const facSelect = document.getElementById('hospFormFacility');
    facSelect.innerHTML = store.getFacilities().map(f => `
      <option value="${f.facilityId}" ${f.facilityId === res.facilityId ? 'selected' : ''}>${f.facilityName}</option>
    `).join('');

    openModal('hospitalModal');
  };

  const hospitalForm = document.getElementById('hospitalForm');
  if (hospitalForm) {
    hospitalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('hospFormId').value;
      const name = document.getElementById('hospFormName').value.trim();
      const facilityId = document.getElementById('hospFormFacility').value;
      const category = document.getElementById('hospFormCat').value;
      const totalCapacity = Number(document.getElementById('hospFormTotal').value);
      const availableQuantity = Number(document.getElementById('hospFormAvail').value);
      const reorderLevel = Number(document.getElementById('hospFormThreshold').value);
      const unit = document.getElementById('hospFormUnit').value;

      if (!name) {
        showToast('Resource name is required', 'error');
        return;
      }
      if (availableQuantity < 0 || totalCapacity < 0) {
        showToast('Capacities cannot be negative', 'error');
        return;
      }

      if (id) {
        store.updateHospitalResource(id, { resourceName: name, facilityId, category, totalCapacity, availableQuantity, reorderLevel, unit });
        showToast(`Adjusted resource capacity: ${name}`, 'success');
      } else {
        store.addHospitalResource({ resourceName: name, facilityId, category, totalCapacity, availableQuantity, reorderLevel, unit });
        showToast(`Added hospital resource: ${name}`, 'success');
      }

      closeModal('hospitalModal');
      renderCurrentTab();
    });
  }

  // =========================================================================
  // 6. LOW-STOCK ALERTS (Section 5.5)
  // =========================================================================
  function renderAlerts() {
    const listContainer = document.getElementById('alertsListContainer');
    if (!listContainer) return;
    const alerts = store.getAlerts();

    if (alerts.length === 0) {
      listContainer.innerHTML = `
        <div style="padding:40px; text-align:center; background:white; border-radius:12px; border:1px solid #e2e8f0;">
          <div style="font-size:32px; margin-bottom:8px;">🎉</div>
          <h4 style="color:#0f172a; font-weight:700;">No Active Low-Stock Alerts</h4>
          <p style="color:#64748b; font-size:13px;">All medicines, blood units, and hospital assets are currently maintained above reorder thresholds.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = alerts.map(a => {
      const fac = store.getFacilityById(a.facilityId);
      const isCritical = a.severity === 'Critical';

      return `
        <div class="result-card" style="border-left: 5px solid ${isCritical ? '#ef4444' : '#f59e0b'}; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="status-pill ${isCritical ? 'status-critical' : 'status-low'}">${a.severity} Flag</span>
                <span style="font-size:12px; color:#64748b;">${a.resourceType} • Ref: <code>${a.resourceId}</code></span>
              </div>
              <h4 style="font-size:17px; font-weight:700; color:#0f172a; margin-top:6px;">${a.resourceName}</h4>
              <p style="color:#475569; font-size:13px; margin:4px 0 10px 0;">${a.message}</p>
              <div style="font-size:12px; color:#64748b;">
                Reporting Facility: <strong>${fac ? fac.facilityName : a.facilityId}</strong> | Created: ${a.createdAt}
              </div>
            </div>

            <div style="text-align:right;">
              <div style="font-size:22px; font-weight:800; color:${isCritical ? '#dc2626' : '#d97706'};">
                ${a.currentQuantity} <span style="font-size:12px; font-weight:500;">/ Reorder ${a.threshold} ${a.unit}</span>
              </div>
              <div style="margin-top:10px; display:flex; gap:6px; justify-content:flex-end;">
                <button class="btn btn-primary btn-sm" onclick="window.quickRestockAlert('${a.resourceType}', '${a.resourceId}')">⚡ Replenish Stock</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  window.quickRestockAlert = function(type, id) {
    if (type === 'Medicine') {
      const med = store.data.medicines.find(m => m.medicineId === id);
      if (med) {
        const added = med.reorderLevel * 2;
        store.updateMedicine(id, { quantity: med.quantity + added });
        showToast(`Stock for ${med.medicineName} replenished by +${added} ${med.unit} (TC-08: Alert Cleared)`, 'success');
      }
    } else if (type === 'Blood Unit') {
      const bld = store.data.bloodStock.find(b => b.recordId === id);
      if (bld) {
        store.updateBloodStock(id, { quantity: bld.quantity + 10 });
        showToast(`Added +10 units to blood reserve ${bld.bloodGroup}`, 'success');
      }
    } else if (type === 'Hospital Resource') {
      const res = store.data.hospitalResources.find(r => r.resourceId === id);
      if (res) {
        store.updateHospitalResource(id, { availableQuantity: res.totalCapacity });
        showToast(`Hospital resource ${res.resourceName} reset to full capacity`, 'success');
      }
    }
    renderCurrentTab();
  };

  // =========================================================================
  // 7. FACILITIES DIRECTORY (Section 5.6)
  // =========================================================================
  function renderFacilities() {
    const container = document.getElementById('facilitiesGrid');
    if (!container) return;
    const facilities = store.getFacilities();

    container.innerHTML = facilities.map(f => {
      let icon = '🏥';
      let tagClass = 'badge-primary';
      if (f.facilityType === 'Pharmacy') { icon = '💊'; tagClass = 'badge-success'; }
      if (f.facilityType === 'Blood Bank') { icon = '🩸'; tagClass = 'badge-danger'; }

      // count inventory held
      const medCount = store.data.medicines.filter(m => m.facilityId === f.facilityId).length;
      const bldCount = store.data.bloodStock.filter(b => b.facilityId === f.facilityId).reduce((a, b) => a + b.quantity, 0);

      return `
        <div class="result-card">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <span class="badge ${tagClass}">${icon} ${f.facilityType}</span>
              <span style="font-size:11px; color:#10b981; font-weight:700;">✓ Network Verified</span>
            </div>
            <h4 style="font-size:18px; font-weight:700; color:#0f172a; margin-top:8px;">${f.facilityName}</h4>
            <p style="color:#64748b; font-size:12px; margin-top:4px;">📍 ${f.address}</p>

            <div style="background:#f8fafc; border-radius:8px; padding:10px; margin:12px 0; font-size:12px;">
              <div>👤 Coordinator: <strong>${f.contactDetails.coordinator}</strong></div>
              <div style="margin-top:2px;">📞 Main Line: <strong>${f.contactDetails.phone}</strong></div>
              <div style="color:#dc2626; margin-top:2px;">🚨 24/7 Hotline: <strong>${f.contactDetails.emergencyPhone}</strong></div>
              <div style="color:#0369a1; margin-top:2px;">✉️ ${f.contactDetails.email}</div>
            </div>

            <div style="display:flex; gap:12px; font-size:12px; color:#475569;">
              <div>💊 <strong>${medCount}</strong> Meds Tracked</div>
              <div>🩸 <strong>${bldCount}</strong> Blood Units</div>
            </div>
          </div>

          <div style="margin-top:14px; padding-top:10px; border-top:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; color:#94a3b8;">Audited: ${f.lastAudit || 'Recent'}</span>
            <a href="tel:${f.contactDetails.phone}" class="btn btn-outline btn-sm">Direct Call</a>
          </div>
        </div>
      `;
    }).join('');
  }

  window.openAddFacilityModal = function() {
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
    facilityForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('facFormName').value.trim();
      const type = document.getElementById('facFormType').value;
      const address = document.getElementById('facFormAddress').value.trim();
      const phone = document.getElementById('facFormPhone').value.trim();
      const emergencyPhone = document.getElementById('facFormEmergency').value.trim();
      const coordinator = document.getElementById('facFormCoordinator').value.trim();

      if (!name || !address) {
        showToast('Please provide facility name and address', 'error');
        return;
      }

      store.addFacility({
        facilityName: name,
        facilityType: type,
        address,
        phone,
        emergencyPhone,
        coordinator
      });

      showToast(`Connected new facility: ${name}`, 'success');
      closeModal('facilityModal');
      renderCurrentTab();
    });
  }

  // =========================================================================
  // 8. API & MONGODB SCHEMA EXPLORER (Chapter 7 & Appendix A)
  // =========================================================================
  function renderApiExplorer() {
    const liveJsonBox = document.getElementById('apiResponseJson');
    if (liveJsonBox) {
      liveJsonBox.textContent = JSON.stringify({
        status: "success",
        timestamp: store.getTimestamp(),
        database: "thrive_and_co",
        active_collections: {
          facilities: store.data.facilities.length,
          medicines: store.data.medicines.length,
          bloodStock: store.data.bloodStock.length,
          hospitalResources: store.data.hospitalResources.length,
          alerts: store.data.alerts.length,
          users: store.data.users.length
        }
      }, null, 2);
    }
  }

  window.testApiRoute = function(route) {
    const liveJsonBox = document.getElementById('apiResponseJson');
    const routeTitle = document.getElementById('apiActiveRouteTitle');
    if (routeTitle) routeTitle.textContent = `Response: ${route}`;

    let responseData = null;
    if (route === 'GET /api/facilities') responseData = store.getFacilities();
    else if (route === 'GET /api/medicines') responseData = store.getMedicines();
    else if (route === 'GET /api/blood-stock') responseData = store.getBloodStock();
    else if (route === 'GET /api/alerts') responseData = store.getAlerts();
    else if (route === 'GET /api/users') responseData = store.data.users;

    if (liveJsonBox) {
      liveJsonBox.textContent = JSON.stringify(responseData, null, 2);
    }
    showToast(`Tested endpoint: ${route}`, 'info');
  };

  window.resetDatabaseSeed = function() {
    if (confirm("Reset Thrive&Co database to fresh project seed data?")) {
      store.resetToDefaults();
      showToast("Database restored to default academic seed state", "success");
      renderCurrentTab();
    }
  };

  // =========================================================================
  // MODAL UTILITIES
  // =========================================================================
  window.openModal = function(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('active');
  };

  window.closeModal = function(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('active');
  };

  // Close modals on overlay click or esc
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    }
  });

  // Initial Boot
  switchTab('dashboard');
  applyRolePermissions();
});
