package com.marian.thriveco.controller;

import com.marian.thriveco.dto.FacilityRequest;
import com.marian.thriveco.model.Facility;
import com.marian.thriveco.service.FacilityService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/facilities")
public class FacilityController {

    private final FacilityService facilityService;

    public FacilityController(FacilityService facilityService) {
        this.facilityService = facilityService;
    }

    /** GET /api/facilities - list every connected facility. */
    @GetMapping
    public List<Facility> getAll() {
        return facilityService.findAll();
    }

    /** GET /api/facilities/{facilityId} - single facility lookup. */
    @GetMapping("/{facilityId}")
    public Facility getById(@PathVariable String facilityId) {
        return facilityService.findById(facilityId);
    }

    /** POST /api/facilities - connect a new facility. */
    @PostMapping
    public ResponseEntity<Facility> create(@Valid @RequestBody FacilityRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(facilityService.create(request));
    }
}
