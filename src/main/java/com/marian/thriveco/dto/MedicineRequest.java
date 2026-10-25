package com.marian.thriveco.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Create/update payload for a medicine stock record.
 */
public record MedicineRequest(
        @NotBlank(message = "Medicine name is required") String medicineName,
        @NotBlank(message = "Facility is required") String facilityId,
        String category,
        @NotNull(message = "Quantity is required")
        @Min(value = 0, message = "Quantity cannot be negative") Integer quantity,
        String unit,
        @NotNull(message = "Reorder level is required")
        @Min(value = 0, message = "Reorder level cannot be negative") Integer reorderLevel,
        String batchNumber,
        String expiryDate
) {
}
