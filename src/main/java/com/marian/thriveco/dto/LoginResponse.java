package com.marian.thriveco.dto;

/** Response for POST /api/auth/login and GET /api/auth/me. */
public record LoginResponse(
        String token,
        long expiresAt,
        UserDto user
) {
}
