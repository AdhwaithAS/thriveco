package com.marian.thriveco.dto;

/**
 * A live low-stock / critical-capacity alert generated from current inventory.
 * Alerts are intentionally not stored in the database; they are recalculated
 * from the source records on every request (same behaviour as the original app).
 */
public record AlertDto(
        String alertId,
        String facilityId,
        String resourceType,
        String resourceId,
        String resourceName,
        int currentQuantity,
        int threshold,
        String unit,
        String severity,
        String status,
        String message,
        String createdAt
) {
}
