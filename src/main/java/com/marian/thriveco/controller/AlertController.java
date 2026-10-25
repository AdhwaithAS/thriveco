package com.marian.thriveco.controller;

import com.marian.thriveco.dto.AlertDto;
import com.marian.thriveco.service.AlertService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    private final AlertService alertService;

    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    /**
     * GET /api/alerts
     * Optional filters: severity (Critical/Warning), resourceType
     * (Medicine/Blood Unit/Hospital Resource).
     */
    @GetMapping
    public List<AlertDto> getAlerts(
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String resourceType) {
        return alertService.findAlerts(severity, resourceType);
    }
}
