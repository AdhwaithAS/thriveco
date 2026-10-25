package com.marian.thriveco.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A hospital asset such as ICU beds, ventilators, oxygen cylinders or monitors.
 */
@Entity
@Table(name = "hospital_resources")
public class HospitalResource {

    @Id
    @Column(name = "resource_id", length = 20)
    private String resourceId;

    @Column(name = "facility_id", length = 20, nullable = false)
    private String facilityId;

    @Column(name = "resource_name", nullable = false)
    private String resourceName;

    @Column(name = "category")
    private String category;

    @Column(name = "total_capacity", nullable = false)
    private int totalCapacity;

    @Column(name = "available_quantity", nullable = false)
    private int availableQuantity;

    @Column(name = "reorder_level", nullable = false)
    private int reorderLevel;

    @Column(name = "unit")
    private String unit;

    @Column(name = "last_updated")
    private String lastUpdated;

    public HospitalResource() {
    }

    public String getResourceId() {
        return resourceId;
    }

    public void setResourceId(String resourceId) {
        this.resourceId = resourceId;
    }

    public String getFacilityId() {
        return facilityId;
    }

    public void setFacilityId(String facilityId) {
        this.facilityId = facilityId;
    }

    public String getResourceName() {
        return resourceName;
    }

    public void setResourceName(String resourceName) {
        this.resourceName = resourceName;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public int getTotalCapacity() {
        return totalCapacity;
    }

    public void setTotalCapacity(int totalCapacity) {
        this.totalCapacity = totalCapacity;
    }

    public int getAvailableQuantity() {
        return availableQuantity;
    }

    public void setAvailableQuantity(int availableQuantity) {
        this.availableQuantity = availableQuantity;
    }

    public int getReorderLevel() {
        return reorderLevel;
    }

    public void setReorderLevel(int reorderLevel) {
        this.reorderLevel = reorderLevel;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public String getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(String lastUpdated) {
        this.lastUpdated = lastUpdated;
    }
}
