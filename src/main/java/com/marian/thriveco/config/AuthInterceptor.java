package com.marian.thriveco.config;

import com.marian.thriveco.model.AppUser;
import com.marian.thriveco.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Guards every /api endpooint with the RBAC rules:
 *
 *  1. OPTIONS pre-flight requests pass through (needed for CORS);
 *  2. requests that carry a valid X-Auth-Token are bound to their account;
 *  3. write methods (POST/PUT/PATCH/DELETE) are checked against the
 *     permission matrix in {@link AccessPolicy}.
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {

    public static final String AUTH_USER_ATTRIBUTE = "thriveco.authUser";

    private final AuthService authService;

    public AuthInterceptor(AuthService authService) {
        this.authService = authService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true; // CORS pre-flight never carries credentials by design
        }

        String token = extractToken(request);
        AppUser user = authService.resolveToken(token);
        request.setAttribute(AUTH_USER_ATTRIBUTE, user);

        AppRole role = AppRole.fromRoleName(user.getRole());
        String path = request.getRequestURI();

        if (isWriteMethod(request.getMethod()) && !AccessPolicy.isWriteAllowed(path, role)) {
            throw new ForbiddenException(
                    "Your role (" + role.displayName() + ") is not permitted to modify " + describeTarget(path));
        }

        return true;
    }

    private boolean isWriteMethod(String method) {
        return HttpMethod.POST.matches(method)
                || HttpMethod.PUT.matches(method)
                || HttpMethod.PATCH.matches(method)
                || HttpMethod.DELETE.matches(method);
    }

    private String describeTarget(String path) {
        if (path.startsWith("/api/facilities")) return "the facility network";
        if (path.startsWith("/api/medicines")) return "medicine stock";
        if (path.startsWith("/api/blood-stock")) return "blood stock";
        if (path.startsWith("/api/hospital-resources")) return "hospital resources";
        return "this resource";
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("X-Auth-Token");
        if (header != null && !header.isBlank()) {
            return header.trim();
        }
        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return authorization.substring(7).trim();
        }
        return null;
    }
}
