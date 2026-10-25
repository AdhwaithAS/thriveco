package com.marian.thriveco.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Create/update payload for a blood stock record.
 */
public record BloodStockRequest(
        @NotBlank(message = "Blood group is required") String bloodGroup,
        @NotBlank(message = "Facility is required") String facilityId,
        String component,
        @NotNull(message = "Quantity is required")
        @Min(value = 0, message = "Quantity cannot be negative") Integer quantity,
        String availabilityStatus,
        String storageTemp
) {
}
