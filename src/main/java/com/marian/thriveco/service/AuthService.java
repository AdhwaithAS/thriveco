package com.marian.thriveco.service;

import com.marian.thriveco.config.AppRole;
import com.marian.thriveco.config.UnauthorizedException;
import com.marian.thriveco.dto.LoginResponse;
import com.marian.thriveco.dto.UserDto;
import com.marian.thriveco.model.AppUser;
import com.marian.thriveco.repository.AppUserRepository;
import com.marian.thriveco.util.PasswordHasher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Session authentication for the RBAC layer.
 *
 * Issues compact, stateless tokens of the form  payload.signature  where
 * payload = "&lt;userId&gt;|&lt;expiresAtMillis&gt;" and signature is an
 * HMAC-SHA256 over the payload. The signing secret comes from AUTH_SECRET in
 * .env; when it is missing a random one is generated for this run (sessions
 * then reset on restart, which is a safe default).
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final char SEPARATOR = '|';
    private static final long TOKEN_TTL_MILLIS = Duration.ofHours(12).toMillis();

    private final AppUserRepository appUserRepository;
    private final byte[] signingSecret;

    public AuthService(AppUserRepository appUserRepository,
                       @Value("${AUTH_SECRET:}") String configuredSecret) {
        this.appUserRepository = appUserRepository;
        if (configuredSecret != null && !configuredSecret.isBlank()) {
            this.signingSecret = configuredSecret.trim().getBytes(StandardCharsets.UTF_8);
        } else {
            byte[] secret = new byte[32];
            new SecureRandom().nextBytes(secret);
            this.signingSecret = secret;
            log.warn("AUTH_SECRET is not set - generating a temporary session secret. "
                    + "Add AUTH_SECRET to .env so sessions survive server restarts.");
        }
    }

    /** Verify credentials and issue a signed session token. */
    @Transactional(readOnly = true)
    public LoginResponse login(String userId, String password) {
        String id = userId == null ? "" : userId.trim();
        AppUser user = appUserRepository.findById(id).orElse(null);

        boolean valid = user != null
                && user.getPasswordHash() != null
                && !user.getPasswordHash().isBlank()
                && PasswordHasher.verify(password == null ? "" : password, user.getPasswordHash());

        if (!valid) {
            throw new UnauthorizedException("Invalid user ID or password");
        }

        long expiresAt = System.currentTimeMillis() + TOKEN_TTL_MILLIS;
        return new LoginResponse(issueToken(user.getUserId(), expiresAt), expiresAt, toUserDto(user));
    }

    /**
     * Verify a session token and load the current account from the database.
     * Throws {@link UnauthorizedException} when the token is malformed,
     * tampered with, expired or the account no longer exists.
     */
    @Transactional(readOnly = true)
    public AppUser resolveToken(String token) {
        if (token == null || token.isBlank()) {
            throw new UnauthorizedException("No active session - please sign in");
        }

        int dot = token.indexOf('.');
        if (dot <= 0 || dot == token.length() - 1) {
            throw new UnauthorizedException("Session token is invalid - sign in again");
        }

        String payload = decodeBase64Url(token.substring(0, dot));
        String signature = decodeBase64Url(token.substring(dot + 1));
        String expected = hmac(payload);

        if (expected.length() != signature.length()
                || !MessageDigest.isEqual(
                        expected.getBytes(StandardCharsets.UTF_8), signature.getBytes(StandardCharsets.UTF_8))) {
            throw new UnauthorizedException("Session token is invalid - sign in again");
        }

        int sep = payload.indexOf(SEPARATOR);
        if (sep <= 0) {
            throw new UnauthorizedException("Session token is invalid - sign in again");
        }
        String userId = payload.substring(0, sep);
        long expiresAt;
        try {
            expiresAt = Long.parseLong(payload.substring(sep + 1));
        } catch (NumberFormatException ex) {
            throw new UnauthorizedException("Session token is invalid - sign in again");
        }
        if (expiresAt <= System.currentTimeMillis()) {
            throw new UnauthorizedException("Session expired - sign in again");
        }

        AppUser user = appUserRepository.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("Account no longer exists - sign in again"));
        return user;
    }

    public UserDto toUserDto(AppUser user) {
        AppRole role = AppRole.fromRoleName(user.getRole());
        return new UserDto(user.getUserId(), user.getName(), user.getEmail(), role.displayName(), user.getFacilityId());
    }

    public long tokenTtlMillis() {
        return TOKEN_TTL_MILLIS;
    }

    private String issueToken(String userId, long expiresAt) {
        String payload = userId + SEPARATOR + expiresAt;
        String signature = hmac(payload);
        return encodeBase64Url(payload) + "." + encodeBase64Url(signature);
    }

    private String hmac(String payload) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(signingSecret, HMAC_ALGORITHM));
            return HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to sign session token", ex);
        }
    }

    private String encodeBase64Url(String value) {
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private String decodeBase64Url(String value) {
        try {
            return new String(Base64.getUrlDecoder().decode(value), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException ex) {
            throw new UnauthorizedException("Session token is invalid - sign in again");
        }
    }
}
