package com.marian.thriveco.controller;

import com.marian.thriveco.dto.BloodStockRequest;
import com.marian.thriveco.model.BloodStock;
import com.marian.thriveco.service.BloodStockService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/blood-stock")
public class BloodStockController {

    private final BloodStockService bloodStockService;

    public BloodStockController(BloodStockService bloodStockService) {
        this.bloodStockService = bloodStockService;
    }

    /**
     * GET /api/blood-stock
     * Optional filters: group (ABO/Rh), facilityId, status.
     */
    @GetMapping
    public List<BloodStock> getAll(
            @RequestParam(required = false) String group,
            @RequestParam(required = false) String facilityId,
            @RequestParam(required = false) String status) {
        return bloodStockService.findAll(group, facilityId, status);
    }

    /** GET /api/blood-stock/{recordId} */
    @GetMapping("/{recordId}")
    public BloodStock getById(@PathVariable String recordId) {
        return bloodStockService.findById(recordId);
    }

    /** POST /api/blood-stock - record newly collected/received units. */
    @PostMapping
    public ResponseEntity<BloodStock> create(@Valid @RequestBody BloodStockRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bloodStockService.create(request));
    }

    /** PUT /api/blood-stock/{recordId} - update units or component. */
    @PutMapping("/{recordId}")
    public BloodStock update(@PathVariable String recordId,
                             @Valid @RequestBody BloodStockRequest request) {
        return bloodStockService.update(recordId, request);
    }

    /** DELETE /api/blood-stock/{recordId} */
    @DeleteMapping("/{recordId}")
    public ResponseEntity<Void> delete(@PathVariable String recordId) {
        bloodStockService.delete(recordId);
        return ResponseEntity.noContent().build();
    }
}
