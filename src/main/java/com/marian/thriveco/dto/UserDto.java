package com.marian.thriveco.dto;

/**
 * Safe profile of the signed-in account (never includes the password hash).
 */
public record UserDto(
        String userId,
        String name,
        String email,
        String role,
        String facilityId
) {
}
