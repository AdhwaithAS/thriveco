package com.marian.thriveco.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Payload for connecting a new facility. Contact fields are flat in the UI and
 * are mapped into the embedded ContactDetails value object by the service.
 */
public record FacilityRequest(
        @NotBlank(message = "Facility name is required") String facilityName,
        String facilityType,
        @NotBlank(message = "Address is required") String address,
        String phone,
        String emergencyPhone,
        String email,
        String coordinator
) {
}
