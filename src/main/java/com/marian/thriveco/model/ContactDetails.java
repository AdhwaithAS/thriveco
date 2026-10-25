package com.marian.thriveco.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/**
 * Embedded contact information for a connected healthcare facility.
 * Keeping this embedded preserves the nested JSON shape used by the frontend.
 */
@Embeddable
public class ContactDetails {

    @Column(name = "phone")
    private String phone;

    @Column(name = "emergency_phone")
    private String emergencyPhone;

    @Column(name = "email")
    private String email;

    @Column(name = "coordinator")
    private String coordinator;

    public ContactDetails() {
    }

    public ContactDetails(String phone, String emergencyPhone, String email, String coordinator) {
        this.phone = phone;
        this.emergencyPhone = emergencyPhone;
        this.email = email;
        this.coordinator = coordinator;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getEmergencyPhone() {
        return emergencyPhone;
    }

    public void setEmergencyPhone(String emergencyPhone) {
        this.emergencyPhone = emergencyPhone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getCoordinator() {
        return coordinator;
    }

    public void setCoordinator(String coordinator) {
        this.coordinator = coordinator;
    }
}
