package com.marian.thriveco.controller;

import com.marian.thriveco.dto.MedicineRequest;
import com.marian.thriveco.model.Medicine;
import com.marian.thriveco.service.MedicineService;
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
@RequestMapping("/api/medicines")
public class MedicineController {

    private final MedicineService medicineService;

    public MedicineController(MedicineService medicineService) {
        this.medicineService = medicineService;
    }

    /**
     * GET /api/medicines
     * Optional filters: name, facilityId, lowStockOnly.
     */
    @GetMapping
    public List<Medicine> getAll(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String facilityId,
            @RequestParam(defaultValue = "false") boolean lowStockOnly) {
        return medicineService.findAll(name, facilityId, lowStockOnly);
    }

    /** GET /api/medicines/{medicineId} */
    @GetMapping("/{medicineId}")
    public Medicine getById(@PathVariable String medicineId) {
        return medicineService.findById(medicineId);
    }

    /** POST /api/medicines - add a medicine stock record. */
    @PostMapping
    public ResponseEntity<Medicine> create(@Valid @RequestBody MedicineRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(medicineService.create(request));
    }

    /** PUT /api/medicines/{medicineId} - update stock, threshold or batch details. */
    @PutMapping("/{medicineId}")
    public Medicine update(@PathVariable String medicineId,
                           @Valid @RequestBody MedicineRequest request) {
        return medicineService.update(medicineId, request);
    }

    /** DELETE /api/medicines/{medicineId} */
    @DeleteMapping("/{medicineId}")
    public ResponseEntity<Void> delete(@PathVariable String medicineId) {
        medicineService.delete(medicineId);
        return ResponseEntity.noContent().build();
    }
}
