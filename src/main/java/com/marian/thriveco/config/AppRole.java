package com.marian.thriveco.config;

import java.util.Locale;

/**
 * The five RBAC roles used by the system. The stored {@code role} column keeps
 * the human-readable labels shown in the UI; this enum maps them to constants
 * used by the access policy.
 */
public enum AppRole {

    SYSTEM_ADMIN("System Admin"),
    HOSPITAL_STAFF("Hospital Staff"),
    PHARMACY_STAFF("Pharmacy Staff"),
    BLOOD_BANK_OFFICER("Blood Bank Officer"),
    EMERGENCY_SEARCH_USER("Emergency Search User");

    private final String displayName;

    AppRole(String displayName) {
        this.displayName = displayName;
    }

    public String displayName() {
        return displayName;
    }

    /** Map a stored role label to an enum value; unknown labels get read-only access. */
    public static AppRole fromRoleName(String roleName) {
        if (roleName == null) {
            return EMERGENCY_SEARCH_USER;
        }
        String normalized = roleName.trim().toLowerCase(Locale.ROOT);
        for (AppRole role : values()) {
            if (role.displayName.toLowerCase(Locale.ROOT).equals(normalized)) {
                return role;
            }
        }
        // Anything that is not one of the defined demo roles falls back to
        // the most restrictive level: read-only emergency view.
        return EMERGENCY_SEARCH_USER;
    }
}
