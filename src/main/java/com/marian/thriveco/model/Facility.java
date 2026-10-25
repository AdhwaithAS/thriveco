package com.marian.thriveco.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A hospital, pharmacy or blood bank participating in the Thrive&Co network.
 */
@Entity
@Table(name = "facilities")
public class Facility {

    @Id
    @Column(name = "facility_id", length = 20)
    private String facilityId;

    @Column(name = "facility_name", nullable = false)
    private String facilityName;

    @Column(name = "facility_type")
    private String facilityType;

    @Column(name = "address", length = 500)
    private String address;

    @Embedded
    private ContactDetails contactDetails;

    @Column(name = "verified")
    private boolean verified;

    @Column(name = "last_audit")
    private String lastAudit;

    public Facility() {
    }

    public String getFacilityId() {
        return facilityId;
    }

    public void setFacilityId(String facilityId) {
        this.facilityId = facilityId;
    }

    public String getFacilityName() {
        return facilityName;
    }

    public void setFacilityName(String facilityName) {
        this.facilityName = facilityName;
    }

    public String getFacilityType() {
        return facilityType;
    }

    public void setFacilityType(String facilityType) {
        this.facilityType = facilityType;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public ContactDetails getContactDetails() {
        return contactDetails;
    }

    public void setContactDetails(ContactDetails contactDetails) {
        this.contactDetails = contactDetails;
    }

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }

    public String getLastAudit() {
        return lastAudit;
    }

    public void setLastAudit(String lastAudit) {
        this.lastAudit = lastAudit;
    }
}
