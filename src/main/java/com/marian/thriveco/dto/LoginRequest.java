package com.marian.thriveco.dto;

import jakarta.validation.constraints.NotBlank;

/** POST /api/auth/login payload. */
public record LoginRequest(
        @NotBlank(message = "User ID is required") String userId,
        @NotBlank(message = "Password is required") String password
) {
}
