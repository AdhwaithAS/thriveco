package com.marian.thriveco.controller;

import com.marian.thriveco.util.Timestamps;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    /** GET /api/health - lightweight service heartbeat. */
    @GetMapping
    public Map<String, Object> health() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "online");
        body.put("system", "THRIVE&CO Healthcare Resource Management System");
        body.put("backend", "Java 21 / Spring Boot");
        body.put("database", "Neon PostgreSQL / embedded H2 (JPA)");
        body.put("timestamp", Timestamps.isoNow());
        return body;
    }
}
