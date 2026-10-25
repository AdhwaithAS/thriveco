package com.marian.thriveco.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A network user account used by the role-based access control (RBAC) layer.
 * Passwords are stored as PBKDF2 hashes only; the hash is never serialized
 * into JSON responses.
 */
@Entity
@Table(name = "app_users")
public class AppUser {

    @Id
    @Column(name = "user_id", length = 20)
    private String userId;

    @Column(name = "name")
    private String name;

    @Column(name = "email")
    private String email;

    @Column(name = "role")
    private String role;

    @Column(name = "facility_id", length = 20)
    private String facilityId;

    /** PBKDF2 hash - excluded from every JSON serialization on purpose. */
    @JsonIgnore
    @Column(name = "password_hash", length = 200)
    private String passwordHash;

    public AppUser() {
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getFacilityId() {
        return facilityId;
    }

    public void setFacilityId(String facilityId) {
        this.facilityId = facilityId;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }
}
