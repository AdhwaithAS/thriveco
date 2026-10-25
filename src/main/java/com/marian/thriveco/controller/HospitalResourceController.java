package com.marian.thriveco.controller;

import com.marian.thriveco.dto.HospitalResourceRequest;
import com.marian.thriveco.model.HospitalResource;
import com.marian.thriveco.service.HospitalResourceService;
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
@RequestMapping("/api/hospital-resources")
public class HospitalResourceController {

    private final HospitalResourceService hospitalResourceService;

    public HospitalResourceController(HospitalResourceService hospitalResourceService) {
        this.hospitalResourceService = hospitalResourceService;
    }

    /** GET /api/hospital-resources - optional facilityId and category filters. */
    @GetMapping
    public List<HospitalResource> getAll(
            @RequestParam(required = false) String facilityId,
            @RequestParam(required = false) String category) {
        return hospitalResourceService.findAll(facilityId, category);
    }

    /** GET /api/hospital-resources/{resourceId} */
    @GetMapping("/{resourceId}")
    public HospitalResource getById(@PathVariable String resourceId) {
        return hospitalResourceService.findById(resourceId);
    }

    /** POST /api/hospital-resources - add beds, ventilators, oxygen, etc. */
    @PostMapping
    public ResponseEntity<HospitalResource> create(@Valid @RequestBody HospitalResourceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(hospitalResourceService.create(request));
    }

    /** PUT /api/hospital-resources/{resourceId} - adjust capacity/availability. */
    @PutMapping("/{resourceId}")
    public HospitalResource update(@PathVariable String resourceId,
                                   @Valid @RequestBody HospitalResourceRequest request) {
        return hospitalResourceService.update(resourceId, request);
    }

    /** DELETE /api/hospital-resources/{resourceId} */
    @DeleteMapping("/{resourceId}")
    public ResponseEntity<Void> delete(@PathVariable String resourceId) {
        hospitalResourceService.delete(resourceId);
        return ResponseEntity.noContent().build();
    }
}
