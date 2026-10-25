package com.marian.thriveco.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Create/update payload for a hospital resource.
 */
public record HospitalResourceRequest(
        @NotBlank(message = "Resource name is required") String resourceName,
        @NotBlank(message = "Facility is required") String facilityId,
        String category,
        @NotNull(message = "Total capacity is required")
        @Min(value = 0, message = "Total capacity cannot be negative") Integer totalCapacity,
        @NotNull(message = "Available quantity is required")
        @Min(value = 0, message = "Available quantity cannot be negative") Integer availableQuantity,
        @NotNull(message = "Reorder level is required")
        @Min(value = 0, message = "Reorder level cannot be negative") Integer reorderLevel,
        String unit
) {
}
