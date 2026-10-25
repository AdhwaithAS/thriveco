package com.marian.thriveco.config;

/** Raised when a request has no valid session token (HTTP 401). */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}
