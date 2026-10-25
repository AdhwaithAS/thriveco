package com.marian.thriveco.dto;

/**
 * A single flattened search result used by the emergency resource finder.
 */
public record EmergencyResult(
        String type,
        String id,
        String name,
        String category,
        int quantity,
        String unit,
        String status,
        String facility,
        String facilityType,
        String address,
        String phone,
        String emergencyPhone,
        String lastUpdated,
        String facilityId
) {
}
