package com.marian.thriveco.dto;

/**
 * A demo account entry shown on the sign-in screen. Never contains secrets;
 * every account uses the documented default password until changed in the
 * database (or via DEMO_USER_PASSWORD in the environment).
 */
public record AccountDto(
        String userId,
        String name,
        String role
) {
}
