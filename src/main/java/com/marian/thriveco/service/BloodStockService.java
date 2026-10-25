package com.marian.thriveco.service;

import com.marian.thriveco.dto.BloodStockRequest;
import com.marian.thriveco.model.BloodStock;
import com.marian.thriveco.repository.BloodStockRepository;
import com.marian.thriveco.repository.FacilityRepository;
import com.marian.thriveco.util.IdGenerator;
import com.marian.thriveco.util.Timestamps;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Set;

@Service
public class BloodStockService {

    private static final Set<String> VALID_GROUPS =
            Set.of("O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-");

    private final BloodStockRepository bloodStockRepository;
    private final FacilityRepository facilityRepository;

    public BloodStockService(BloodStockRepository bloodStockRepository, FacilityRepository facilityRepository) {
        this.bloodStockRepository = bloodStockRepository;
        this.facilityRepository = facilityRepository;
    }

    @Transactional(readOnly = true)
    public List<BloodStock> findAll(String group, String facilityId, String status) {
        return bloodStockRepository.findAllByOrderByRecordIdAsc().stream()
                .filter(record -> isAll(group) || record.getBloodGroup().equalsIgnoreCase(group))
                .filter(record -> isAll(facilityId) || record.getFacilityId().equals(facilityId))
                .filter(record -> isAll(status) || record.getAvailabilityStatus().equalsIgnoreCase(status))
                .toList();
    }

    @Transactional(readOnly = true)
    public BloodStock findById(String recordId) {
        return bloodStockRepository.findById(recordId)
                .orElseThrow(() -> new NoSuchElementException("Blood stock record not found: " + recordId));
    }

    @Transactional
    public BloodStock create(BloodStockRequest request) {
        ensureFacilityExists(request.facilityId());
        String group = normalizeGroup(request.bloodGroup());
        List<String> ids = bloodStockRepository.findAllByOrderByRecordIdAsc().stream()
                .map(BloodStock::getRecordId)
                .toList();

        BloodStock stock = new BloodStock();
        stock.setRecordId(IdGenerator.next("BLD", ids, 3));
        stock.setFacilityId(request.facilityId());
        stock.setBloodGroup(group);
        stock.setComponent(defaultIfBlank(request.component(), "Whole Blood"));
        stock.setQuantity(request.quantity());
        stock.setAvailabilityStatus(deriveStatus(request.quantity()));
        stock.setStorageTemp(defaultIfBlank(request.storageTemp(), "2°C - 6°C"));
        stock.setLastUpdated(Timestamps.now());
        return bloodStockRepository.save(stock);
    }

    @Transactional
    public BloodStock update(String recordId, BloodStockRequest request) {
        BloodStock stock = findById(recordId);
        ensureFacilityExists(request.facilityId());
        stock.setFacilityId(request.facilityId());
        stock.setBloodGroup(normalizeGroup(request.bloodGroup()));
        stock.setComponent(defaultIfBlank(request.component(), "Whole Blood"));
        stock.setQuantity(request.quantity());
        stock.setAvailabilityStatus(deriveStatus(request.quantity()));
        stock.setStorageTemp(defaultIfBlank(request.storageTemp(), "2°C - 6°C"));
        stock.setLastUpdated(Timestamps.now());
        return bloodStockRepository.save(stock);
    }

    @Transactional
    public void delete(String recordId) {
        BloodStock stock = findById(recordId);
        bloodStockRepository.delete(stock);
    }

    /**
     * Same threshold logic that the original frontend used:
     * 0-2 units = Critical Alert, 3-5 = Low Stock, above 5 = Available.
     */
    public static String deriveStatus(int quantity) {
        if (quantity <= 2) {
            return "Critical Alert";
        }
        if (quantity <= 5) {
            return "Low Stock";
        }
        return "Available";
    }

    private String normalizeGroup(String group) {
        String normalized = group == null ? "" : group.trim().toUpperCase(Locale.ROOT);
        if (!VALID_GROUPS.contains(normalized)) {
            throw new IllegalArgumentException("Invalid blood group: " + group);
        }
        return normalized;
    }

    private void ensureFacilityExists(String facilityId) {
        if (!facilityRepository.existsById(facilityId)) {
            throw new IllegalArgumentException("Unknown facility: " + facilityId);
        }
    }

    private boolean isAll(String value) {
        return value == null || value.isBlank() || "ALL".equalsIgnoreCase(value);
    }

    private String defaultIfBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
