package com.marian.thriveco.config;

/**
 * Central RBAC permission matrix (Chapter 3 &amp; Section 6).
 *
 * Rule of thumb:
 *  - every authenticated role may read (GET/HEAD) the operational data;
 *  - write access (POST/PUT/DELETE) is restricted per resource so no one can
 *    tamper with another department's stock;
 *  - the Emergency Search User role is read-only by definition.
 */
public final class AccessPolicy {

    private AccessPolicy() {
    }

    /** May this role write (create/update/delete) the given API resource? */
    public static boolean isWriteAllowed(String path, AppRole role) {
        if (role == null) {
            return false;
        }
        if (role == AppRole.SYSTEM_ADMIN) {
            return true; // System Admin has full operational authority
        }

        if (path.startsWith("/api/facilities")) {
            // Connecting facilities changes the network - admin only.
            return false;
        }
        if (path.startsWith("/api/medicines")) {
            return role == AppRole.PHARMACY_STAFF;
        }
        if (path.startsWith("/api/blood-stock")) {
            return role == AppRole.BLOOD_BANK_OFFICER;
        }
        if (path.startsWith("/api/hospital-resources")) {
            return role == AppRole.HOSPITAL_STAFF;
        }

        // Any write to an endpoint without an explicit rule is denied.
        return false;
    }

    /** Human-readable description of what a role may manage (shown in the UI). */
    public static String describe(AppRole role) {
        return switch (role) {
            case SYSTEM_ADMIN -> "Full access - can manage every module, including the facility network.";
            case HOSPITAL_STAFF -> "Can manage hospital resources (beds, ventilators, oxygen) for all facilities.";
            case PHARMACY_STAFF -> "Can manage medicine stock records for all connected pharmacies.";
            case BLOOD_BANK_OFFICER -> "Can manage blood unit records and transfusion ledger entries.";
            case EMERGENCY_SEARCH_USER -> "Read-only access - emergency search and monitoring, no editing.";
        };
    }

    /** The singular resource a restricted role may manage, or null when unrestricted/read-only. */
    public static String managedResource(AppRole role) {
        return switch (role) {
            case SYSTEM_ADMIN -> null;
            case HOSPITAL_STAFF -> "hospital-resources";
            case PHARMACY_STAFF -> "medicines";
            case BLOOD_BANK_OFFICER -> "blood-stock";
            case EMERGENCY_SEARCH_USER -> null;
        };
    }
}
