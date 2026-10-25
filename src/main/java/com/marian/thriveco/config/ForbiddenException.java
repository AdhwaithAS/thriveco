package com.marian.thriveco.config;

/**
 * Raised when the authenticated role attempts an action its permission set
 * does not include (HTTP 403).
 */
public class ForbiddenException extends RuntimeException {

    public ForbiddenException(String message) {
        super(message);
    }
}
