package com.marian.thriveco.controller;

import com.marian.thriveco.config.AccessPolicy;
import com.marian.thriveco.config.AppRole;
import com.marian.thriveco.config.AuthInterceptor;
import com.marian.thriveco.dto.AccountDto;
import com.marian.thriveco.dto.LoginRequest;
import com.marian.thriveco.dto.LoginResponse;
import com.marian.thriveco.dto.UserDto;
import com.marian.thriveco.model.AppUser;
import com.marian.thriveco.repository.AppUserRepository;
import com.marian.thriveco.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Session endpoints for the RBAC layer.
 *
 *  POST /api/auth/login     - exchange credentials for a session token
 *  GET  /api/auth/me        - profile of the current token holder
 *  GET  /api/auth/accounts  - demo account list for the sign-in screen
 *  POST /api/auth/logout    - client-side sign out (tokens are stateless)
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AppUserRepository appUserRepository;

    public AuthController(AuthService authService, AppUserRepository appUserRepository) {
        this.authService = authService;
        this.appUserRepository = appUserRepository;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request.userId(), request.password());
    }

    @GetMapping("/me")
    public LoginResponse me(@RequestAttribute(AuthInterceptor.AUTH_USER_ATTRIBUTE) AppUser user) {
        UserDto dto = authService.toUserDto(user);
        long expiresAt = System.currentTimeMillis() + authService.tokenTtlMillis();
        // The token stays the callers' responsibility /me only revalidates and refreshes profile data.
        return new LoginResponse(null, expiresAt, dto);
    }

    /** Demo account list shown on the sign-in screen (no credentials included). */
    @GetMapping("/accounts")
    public List<AccountDto> accounts() {
        return appUserRepository.findAllByOrderByUserIdAsc().stream()
                .map(user -> new AccountDto(user.getUserId(), user.getName(), user.getRole()))
                .toList();
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout() {
        // Tokens are stateless; forgetting them on the client is the sign-out.
        return ResponseEntity.ok(Map.of("status", "signed-out"));
    }

    /** Convenience for the UI user menu: a human description of privileges. */
    public static String describePrivileges(String roleName) {
        return AccessPolicy.describe(AppRole.fromRoleName(roleName));
    }
}
