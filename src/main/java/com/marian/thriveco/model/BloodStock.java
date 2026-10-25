package com.marian.thriveco.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A blood component reserve (whole blood, PRBC, platelets, FFP) held by a facility.
 */
@Entity
@Table(name = "blood_stock")
public class BloodStock {

    @Id
    @Column(name = "record_id", length = 20)
    private String recordId;

    @Column(name = "facility_id", length = 20, nullable = false)
    private String facilityId;

    @Column(name = "blood_group", nullable = false)
    private String bloodGroup;

    @Column(name = "component")
    private String component;

    @Column(name = "quantity", nullable = false)
    private int quantity;

    @Column(name = "availability_status")
    private String availabilityStatus;

    @Column(name = "storage_temp")
    private String storageTemp;

    @Column(name = "last_updated")
    private String lastUpdated;

    public BloodStock() {
    }

    public String getRecordId() {
        return recordId;
    }

    public void setRecordId(String recordId) {
        this.recordId = recordId;
    }

    public String getFacilityId() {
        return facilityId;
    }

    public void setFacilityId(String facilityId) {
        this.facilityId = facilityId;
    }

    public String getBloodGroup() {
        return bloodGroup;
    }

    public void setBloodGroup(String bloodGroup) {
        this.bloodGroup = bloodGroup;
    }

    public String getComponent() {
        return component;
    }

    public void setComponent(String component) {
        this.component = component;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public String getAvailabilityStatus() {
        return availabilityStatus;
    }

    public void setAvailabilityStatus(String availabilityStatus) {
        this.availabilityStatus = availabilityStatus;
    }

    public String getStorageTemp() {
        return storageTemp;
    }

    public void setStorageTemp(String storageTemp) {
        this.storageTemp = storageTemp;
    }

    public String getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(String lastUpdated) {
        this.lastUpdated = lastUpdated;
    }
}
