package com.marian.thriveco.controller;

import com.marian.thriveco.dto.DashboardMetrics;
import com.marian.thriveco.service.DashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    /** GET /api/dashboard/metrics - figures for the five dashboard cards. */
    @GetMapping("/metrics")
    public DashboardMetrics metrics() {
        return dashboardService.metrics();
    }
}
