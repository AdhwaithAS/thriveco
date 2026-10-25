package com.marian.thriveco.config;

import org.springframework.http.HttpStatus;

import java.time.Instant;

/**
 * Consistent JSON error envelope returned by the API.
 */
public record ApiError(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path
) {
    public static ApiError of(HttpStatus status, String message, String path) {
        return new ApiError(Instant.now(), status.value(), status.getReasonPhrase(), message, path);
    }
}
