package com.marian.thriveco.service;

import com.marian.thriveco.dto.MedicineRequest;
import com.marian.thriveco.model.Medicine;
import com.marian.thriveco.repository.FacilityRepository;
import com.marian.thriveco.repository.MedicineRepository;
import com.marian.thriveco.util.IdGenerator;
import com.marian.thriveco.util.Timestamps;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class MedicineService {

    private final MedicineRepository medicineRepository;
    private final FacilityRepository facilityRepository;

    public MedicineService(MedicineRepository medicineRepository, FacilityRepository facilityRepository) {
        this.medicineRepository = medicineRepository;
        this.facilityRepository = facilityRepository;
    }

    @Transactional(readOnly = true)
    public List<Medicine> findAll(String name, String facilityId, boolean lowStockOnly) {
        String query = name == null ? "" : name.trim().toLowerCase(Locale.ROOT);
        return medicineRepository.findAllByOrderByMedicineIdAsc().stream()
                .filter(medicine -> query.isEmpty()
                        || containsIgnoreCase(medicine.getMedicineName(), query)
                        || containsIgnoreCase(medicine.getCategory(), query))
                .filter(medicine -> isAll(facilityId) || medicine.getFacilityId().equals(facilityId))
                .filter(medicine -> !lowStockOnly || medicine.getQuantity() <= medicine.getReorderLevel())
                .toList();
    }

    @Transactional(readOnly = true)
    public Medicine findById(String medicineId) {
        return medicineRepository.findById(medicineId)
                .orElseThrow(() -> new NoSuchElementException("Medicine not found: " + medicineId));
    }

    @Transactional
    public Medicine create(MedicineRequest request) {
        ensureFacilityExists(request.facilityId());
        List<String> ids = medicineRepository.findAllByOrderByMedicineIdAsc().stream()
                .map(Medicine::getMedicineId)
                .toList();

        Medicine medicine = new Medicine();
        medicine.setMedicineId(IdGenerator.next("MED", ids, 3));
        apply(medicine, request);
        medicine.setBatchNumber(defaultIfBlank(request.batchNumber(),
                "BAT-" + ThreadLocalRandom.current().nextInt(1000, 10000)));
        medicine.setExpiryDate(defaultIfBlank(request.expiryDate(), "2028-01-01"));
        medicine.setLastUpdated(Timestamps.now());
        return medicineRepository.save(medicine);
    }

    @Transactional
    public Medicine update(String medicineId, MedicineRequest request) {
        Medicine medicine = findById(medicineId);
        ensureFacilityExists(request.facilityId());
        apply(medicine, request);
        if (!isBlank(request.batchNumber())) {
            medicine.setBatchNumber(request.batchNumber().trim());
        }
        if (!isBlank(request.expiryDate())) {
            medicine.setExpiryDate(request.expiryDate().trim());
        }
        medicine.setLastUpdated(Timestamps.now());
        return medicineRepository.save(medicine);
    }

    @Transactional
    public void delete(String medicineId) {
        Medicine medicine = findById(medicineId);
        medicineRepository.delete(medicine);
    }

    private void apply(Medicine medicine, MedicineRequest request) {
        medicine.setFacilityId(request.facilityId());
        medicine.setMedicineName(request.medicineName().trim());
        medicine.setCategory(defaultIfBlank(request.category(), "General Therapeutics"));
        medicine.setQuantity(request.quantity());
        medicine.setUnit(defaultIfBlank(request.unit(), "Units"));
        medicine.setReorderLevel(request.reorderLevel());
    }

    private void ensureFacilityExists(String facilityId) {
        if (!facilityRepository.existsById(facilityId)) {
            throw new IllegalArgumentException("Unknown facility: " + facilityId);
        }
    }

    private boolean containsIgnoreCase(String value, String lowerCaseQuery) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(lowerCaseQuery);
    }

    private boolean isAll(String value) {
        return value == null || value.isBlank() || "ALL".equalsIgnoreCase(value);
    }

    private String defaultIfBlank(String value, String fallback) {
        return isBlank(value) ? fallback : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
