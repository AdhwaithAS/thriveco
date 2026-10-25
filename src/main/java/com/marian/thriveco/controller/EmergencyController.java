package com.marian.thriveco.controller;

import com.marian.thriveco.dto.EmergencyResult;
import com.marian.thriveco.service.EmergencySearchService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/emergency")
public class EmergencyController {

    private final EmergencySearchService emergencySearchService;

    public EmergencyController(EmergencySearchService emergencySearchService) {
        this.emergencySearchService = emergencySearchService;
    }

    /**
     * GET /api/emergency/search?type=all&query=adrenaline&bloodGroup=O-
     * Section 5.4 multi-facility emergency resource finder.
     */
    @GetMapping("/search")
    public List<EmergencyResult> search(
            @RequestParam(defaultValue = "all") String type,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String bloodGroup) {
        return emergencySearchService.search(type, query, bloodGroup);
    }
}
