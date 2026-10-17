/**
 * THRIVE&CO - Data Store & Simulated Express/MongoDB Service Layer
 * Marian College of Engineering - Academic Project 2026-2027
 */

class ThriveStore {
  constructor() {
    this.storageKey = 'thrive_and_co_db_v1';
    this.init();
  }

  init() {
    const existing = localStorage.getItem(this.storageKey);
    if (!existing) {
      this.resetToDefaults();
    } else {
      try {
        this.data = JSON.parse(existing);
        // Ensure all collections exist
        if (!this.data.facilities) this.data.facilities = SEED_DATA.facilities;
        if (!this.data.medicines) this.data.medicines = SEED_DATA.medicines;
        if (!this.data.bloodStock) this.data.bloodStock = SEED_DATA.bloodStock;
        if (!this.data.hospitalResources) this.data.hospitalResources = SEED_DATA.hospitalResources;
        if (!this.data.users) this.data.users = SEED_DATA.users;
        this.recalculateAlerts();
      } catch (e) {
        console.error("Error reading saved Thrive database, reinitializing with seed data:", e);
        this.resetToDefaults();
      }
    }
  }

  resetToDefaults() {
    this.data = JSON.parse(JSON.stringify(SEED_DATA));
    this.recalculateAlerts();
    this.save();
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (e) {
      console.warn("Storage quota exceeded or disabled:", e);
    }
  }

  getTimestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const min = pad(now.getMinutes());
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  }

  // Auto recalculate low-stock alerts based on current records vs reorder thresholds
  recalculateAlerts() {
    const alerts = [];
    let alertSeq = 1;

    // Check medicines
    (this.data.medicines || []).forEach(med => {
      const qty = Number(med.quantity);
      const reorder = Number(med.reorderLevel);
      if (qty <= reorder) {
        const isCritical = qty <= Math.floor(reorder / 2);
        alerts.push({
          alertId: `ALT-MED-${String(alertSeq++).padStart(3, '0')}`,
          facilityId: med.facilityId,
          resourceType: 'Medicine',
          resourceId: med.medicineId,
          resourceName: med.medicineName,
          currentQuantity: qty,
          threshold: reorder,
          unit: med.unit,
          severity: isCritical ? 'Critical' : 'Warning',
          status: 'Active',
          message: `${med.medicineName} stock (${qty} ${med.unit}) is at or below threshold (${reorder} ${med.unit})`,
          createdAt: med.lastUpdated || this.getTimestamp()
        });
      }
    });

    // Check blood units
    (this.data.bloodStock || []).forEach(bld => {
      const qty = Number(bld.quantity);
      if (qty <= 5 || bld.availabilityStatus === 'Critical Alert' || bld.availabilityStatus === 'Low Stock') {
        const isCritical = qty <= 2 || bld.availabilityStatus === 'Critical Alert';
        alerts.push({
          alertId: `ALT-BLD-${String(alertSeq++).padStart(3, '0')}`,
          facilityId: bld.facilityId,
          resourceType: 'Blood Unit',
          resourceId: bld.recordId,
          resourceName: `${bld.bloodGroup} (${bld.component})`,
          currentQuantity: qty,
          threshold: 5,
          unit: 'Units',
          severity: isCritical ? 'Critical' : 'Warning',
          status: 'Active',
          message: `Blood Group ${bld.bloodGroup} reserve (${qty} units) is critically low!`,
          createdAt: bld.lastUpdated || this.getTimestamp()
        });
      }
    });

    // Check hospital resources
    (this.data.hospitalResources || []).forEach(res => {
      const avail = Number(res.availableQuantity);
      const threshold = Number(res.reorderLevel);
      if (avail <= threshold) {
        alerts.push({
          alertId: `ALT-RES-${String(alertSeq++).padStart(3, '0')}`,
          facilityId: res.facilityId,
          resourceType: 'Hospital Resource',
          resourceId: res.resourceId,
          resourceName: res.resourceName,
          currentQuantity: avail,
          threshold: threshold,
          unit: res.unit,
          severity: avail <= 2 ? 'Critical' : 'Warning',
          status: 'Active',
          message: `${res.resourceName} capacity near exhaustion: only ${avail} ${res.unit} available.`,
          createdAt: res.lastUpdated || this.getTimestamp()
        });
      }
    });

    this.data.alerts = alerts;
  }

  // --- REST API Simulated Methods (Appendix A) ---

  // GET /api/facilities
  getFacilities() {
    return this.data.facilities;
  }

  getFacilityById(id) {
    return this.data.facilities.find(f => f.facilityId === id) || null;
  }

  addFacility(facility) {
    const newId = `FAC${String(this.data.facilities.length + 1).padStart(3, '0')}`;
    const newObj = {
      facilityId: newId,
      facilityName: facility.facilityName.trim(),
      facilityType: facility.facilityType,
      address: facility.address.trim(),
      contactDetails: {
        phone: facility.phone || '+91 471 000 0000',
        emergencyPhone: facility.emergencyPhone || '+91 471 999 9999',
        email: facility.email || 'info@facility.org',
        coordinator: facility.coordinator || 'Duty Officer'
      },
      verified: true,
      lastAudit: this.getTimestamp().split(' ')[0]
    };
    this.data.facilities.push(newObj);
    this.save();
    return newObj;
  }

  // GET /api/medicines
  getMedicines(filters = {}) {
    let result = [...this.data.medicines];
    if (filters.name) {
      const q = filters.name.toLowerCase().trim();
      result = result.filter(m => m.medicineName.toLowerCase().includes(q) || m.category.toLowerCase().includes(q));
    }
    if (filters.facilityId && filters.facilityId !== 'ALL') {
      result = result.filter(m => m.facilityId === filters.facilityId);
    }
    if (filters.lowStockOnly) {
      result = result.filter(m => Number(m.quantity) <= Number(m.reorderLevel));
    }
    return result;
  }

  addMedicine(item) {
    if (!item.medicineName || Number(item.quantity) < 0 || Number(item.reorderLevel) < 0) {
      throw new Error("Validation Error: Missing name or invalid negative quantities.");
    }
    const newId = `MED${String(this.data.medicines.length + 1).padStart(3, '0')}`;
    const newItem = {
      medicineId: newId,
      facilityId: item.facilityId,
      medicineName: item.medicineName.trim(),
      category: item.category || 'General Therapeutics',
      quantity: Number(item.quantity),
      unit: item.unit || 'Units',
      reorderLevel: Number(item.reorderLevel),
      batchNumber: item.batchNumber || `BAT-${Math.floor(1000 + Math.random()*9000)}`,
      expiryDate: item.expiryDate || '2028-01-01',
      lastUpdated: this.getTimestamp()
    };
    this.data.medicines.unshift(newItem);
    this.recalculateAlerts();
    this.save();
    return newItem;
  }

  updateMedicine(medicineId, updates) {
    const index = this.data.medicines.findIndex(m => m.medicineId === medicineId);
    if (index === -1) throw new Error("Medicine not found");
    if (updates.quantity !== undefined && Number(updates.quantity) < 0) {
      throw new Error("Quantity cannot be negative");
    }
    this.data.medicines[index] = {
      ...this.data.medicines[index],
      ...updates,
      quantity: Number(updates.quantity !== undefined ? updates.quantity : this.data.medicines[index].quantity),
      reorderLevel: Number(updates.reorderLevel !== undefined ? updates.reorderLevel : this.data.medicines[index].reorderLevel),
      lastUpdated: this.getTimestamp()
    };
    this.recalculateAlerts();
    this.save();
    return this.data.medicines[index];
  }

  deleteMedicine(medicineId) {
    this.data.medicines = this.data.medicines.filter(m => m.medicineId !== medicineId);
    this.recalculateAlerts();
    this.save();
    return true;
  }

  // GET /api/blood-stock
  getBloodStock(filters = {}) {
    let result = [...this.data.bloodStock];
    if (filters.group && filters.group !== 'ALL') {
      result = result.filter(b => b.bloodGroup.toUpperCase() === filters.group.toUpperCase());
    }
    if (filters.facilityId && filters.facilityId !== 'ALL') {
      result = result.filter(b => b.facilityId === filters.facilityId);
    }
    if (filters.status && filters.status !== 'ALL') {
      result = result.filter(b => b.availabilityStatus === filters.status);
    }
    return result;
  }

  addBloodStock(item) {
    if (!item.bloodGroup || Number(item.quantity) < 0) {
      throw new Error("Validation Error: Invalid blood group or negative quantity.");
    }
    const newId = `BLD${String(this.data.bloodStock.length + 1).padStart(3, '0')}`;
    const qty = Number(item.quantity);
    let status = item.availabilityStatus;
    if (!status) {
      status = qty <= 2 ? 'Critical Alert' : (qty <= 5 ? 'Low Stock' : 'Available');
    }
    const newItem = {
      recordId: newId,
      facilityId: item.facilityId,
      bloodGroup: item.bloodGroup,
      component: item.component || 'Whole Blood',
      quantity: qty,
      availabilityStatus: status,
      storageTemp: item.storageTemp || '2°C - 6°C',
      lastUpdated: this.getTimestamp()
    };
    this.data.bloodStock.unshift(newItem);
    this.recalculateAlerts();
    this.save();
    return newItem;
  }

  updateBloodStock(recordId, updates) {
    const index = this.data.bloodStock.findIndex(b => b.recordId === recordId);
    if (index === -1) throw new Error("Blood stock record not found");
    const qty = Number(updates.quantity !== undefined ? updates.quantity : this.data.bloodStock[index].quantity);
    if (qty < 0) throw new Error("Quantity cannot be negative");
    
    let status = updates.availabilityStatus || this.data.bloodStock[index].availabilityStatus;
    if (updates.quantity !== undefined) {
      status = qty <= 2 ? 'Critical Alert' : (qty <= 5 ? 'Low Stock' : 'Available');
    }

    this.data.bloodStock[index] = {
      ...this.data.bloodStock[index],
      ...updates,
      quantity: qty,
      availabilityStatus: status,
      lastUpdated: this.getTimestamp()
    };
    this.recalculateAlerts();
    this.save();
    return this.data.bloodStock[index];
  }

  deleteBloodStock(recordId) {
    this.data.bloodStock = this.data.bloodStock.filter(b => b.recordId !== recordId);
    this.recalculateAlerts();
    this.save();
    return true;
  }

  // GET /api/hospital-resources
  getHospitalResources(filters = {}) {
    let result = [...this.data.hospitalResources];
    if (filters.facilityId && filters.facilityId !== 'ALL') {
      result = result.filter(r => r.facilityId === filters.facilityId);
    }
    if (filters.category && filters.category !== 'ALL') {
      result = result.filter(r => r.category === filters.category);
    }
    return result;
  }

  addHospitalResource(res) {
    const newId = `RES${String(this.data.hospitalResources.length + 1).padStart(3, '0')}`;
    const newItem = {
      resourceId: newId,
      facilityId: res.facilityId,
      resourceName: res.resourceName.trim(),
      category: res.category || 'General Equipment',
      totalCapacity: Number(res.totalCapacity || res.availableQuantity),
      availableQuantity: Number(res.availableQuantity),
      reorderLevel: Number(res.reorderLevel || 3),
      unit: res.unit || 'Units',
      lastUpdated: this.getTimestamp()
    };
    this.data.hospitalResources.unshift(newItem);
    this.recalculateAlerts();
    this.save();
    return newItem;
  }

  updateHospitalResource(resourceId, updates) {
    const idx = this.data.hospitalResources.findIndex(r => r.resourceId === resourceId);
    if (idx === -1) throw new Error("Hospital resource not found");
    this.data.hospitalResources[idx] = {
      ...this.data.hospitalResources[idx],
      ...updates,
      availableQuantity: Number(updates.availableQuantity !== undefined ? updates.availableQuantity : this.data.hospitalResources[idx].availableQuantity),
      totalCapacity: Number(updates.totalCapacity !== undefined ? updates.totalCapacity : this.data.hospitalResources[idx].totalCapacity),
      lastUpdated: this.getTimestamp()
    };
    this.recalculateAlerts();
    this.save();
    return this.data.hospitalResources[idx];
  }

  // GET /api/alerts
  getAlerts(filters = {}) {
    this.recalculateAlerts();
    let result = [...this.data.alerts];
    if (filters.severity && filters.severity !== 'ALL') {
      result = result.filter(a => a.severity === filters.severity);
    }
    if (filters.resourceType && filters.resourceType !== 'ALL') {
      result = result.filter(a => a.resourceType === filters.resourceType);
    }
    return result;
  }

  // EMERGENCY MULTI-FACILITY RESOURCE SEARCH (Section 5.4)
  searchEmergency(type, query) {
    const q = (query || '').toLowerCase().trim();
    const results = [];

    if (type === 'medicine' || type === 'all') {
      this.data.medicines.forEach(m => {
        if (!q || m.medicineName.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)) {
          const fac = this.getFacilityById(m.facilityId);
          results.push({
            type: 'Medicine',
            id: m.medicineId,
            name: m.medicineName,
            category: m.category,
            quantity: m.quantity,
            unit: m.unit,
            status: m.quantity <= 0 ? 'Out of Stock' : (m.quantity <= m.reorderLevel ? 'Low Stock' : 'In Stock'),
            facility: fac ? fac.facilityName : 'Unknown Facility',
            facilityType: fac ? fac.facilityType : 'Facility',
            address: fac ? fac.address : '',
            phone: fac ? fac.contactDetails.phone : '',
            emergencyPhone: fac ? fac.contactDetails.emergencyPhone : '',
            lastUpdated: m.lastUpdated,
            facilityId: m.facilityId
          });
        }
      });
    }

    if (type === 'blood' || type === 'all') {
      this.data.bloodStock.forEach(b => {
        if (!q || b.bloodGroup.toLowerCase().includes(q) || b.component.toLowerCase().includes(q)) {
          const fac = this.getFacilityById(b.facilityId);
          results.push({
            type: 'Blood Unit',
            id: b.recordId,
            name: `${b.bloodGroup} Blood (${b.component})`,
            category: `Group ${b.bloodGroup}`,
            quantity: b.quantity,
            unit: 'Units',
            status: b.availabilityStatus,
            facility: fac ? fac.facilityName : 'Unknown Facility',
            facilityType: fac ? fac.facilityType : 'Facility',
            address: fac ? fac.address : '',
            phone: fac ? fac.contactDetails.phone : '',
            emergencyPhone: fac ? fac.contactDetails.emergencyPhone : '',
            lastUpdated: b.lastUpdated,
            facilityId: b.facilityId
          });
        }
      });
    }

    return results;
  }

  // Overview Metrics
  getDashboardMetrics() {
    this.recalculateAlerts();
    const totalFacilities = this.data.facilities.length;
    const totalMedicines = this.data.medicines.reduce((acc, m) => acc + Number(m.quantity), 0);
    const medicineTypesCount = this.data.medicines.length;
    const totalBloodUnits = this.data.bloodStock.reduce((acc, b) => acc + Number(b.quantity), 0);
    const criticalAlertsCount = this.data.alerts.filter(a => a.severity === 'Critical').length;
    const warningAlertsCount = this.data.alerts.filter(a => a.severity === 'Warning').length;
    const availableICUBeds = this.data.hospitalResources
      .filter(r => r.category.includes('Bed') || r.resourceName.includes('Bed'))
      .reduce((acc, r) => acc + Number(r.availableQuantity), 0);

    return {
      totalFacilities,
      totalMedicines,
      medicineTypesCount,
      totalBloodUnits,
      criticalAlertsCount,
      warningAlertsCount,
      totalAlerts: this.data.alerts.length,
      availableICUBeds
    };
  }
}

// Global store instance
window.thriveStore = new ThriveStore();
