package com.marian.thriveco.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A medicine stock record held by a facility.
 */
@Entity
@Table(name = "medicines")
public class Medicine {

    @Id
    @Column(name = "medicine_id", length = 20)
    private String medicineId;

    @Column(name = "facility_id", length = 20, nullable = false)
    private String facilityId;

    @Column(name = "medicine_name", nullable = false)
    private String medicineName;

    @Column(name = "category")
    private String category;

    @Column(name = "quantity", nullable = false)
    private int quantity;

    @Column(name = "unit")
    private String unit;

    @Column(name = "reorder_level", nullable = false)
    private int reorderLevel;

    @Column(name = "batch_number")
    private String batchNumber;

    @Column(name = "expiry_date")
    private String expiryDate;

    @Column(name = "last_updated")
    private String lastUpdated;

    public Medicine() {
    }

    public String getMedicineId() {
        return medicineId;
    }

    public void setMedicineId(String medicineId) {
        this.medicineId = medicineId;
    }

    public String getFacilityId() {
        return facilityId;
    }

    public void setFacilityId(String facilityId) {
        this.facilityId = facilityId;
    }

    public String getMedicineName() {
        return medicineName;
    }

    public void setMedicineName(String medicineName) {
        this.medicineName = medicineName;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public int getReorderLevel() {
        return reorderLevel;
    }

    public void setReorderLevel(int reorderLevel) {
        this.reorderLevel = reorderLevel;
    }

    public String getBatchNumber() {
        return batchNumber;
    }

    public void setBatchNumber(String batchNumber) {
        this.batchNumber = batchNumber;
    }

    public String getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(String expiryDate) {
        this.expiryDate = expiryDate;
    }

    public String getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(String lastUpdated) {
        this.lastUpdated = lastUpdated;
    }
}
