package com.marian.thriveco.service;

import com.marian.thriveco.dto.HospitalResourceRequest;
import com.marian.thriveco.model.HospitalResource;
import com.marian.thriveco.repository.FacilityRepository;
import com.marian.thriveco.repository.HospitalResourceRepository;
import com.marian.thriveco.util.IdGenerator;
import com.marian.thriveco.util.Timestamps;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
public class HospitalResourceService {

    private final HospitalResourceRepository hospitalResourceRepository;
    private final FacilityRepository facilityRepository;

    public HospitalResourceService(HospitalResourceRepository hospitalResourceRepository,
                                   FacilityRepository facilityRepository) {
        this.hospitalResourceRepository = hospitalResourceRepository;
        this.facilityRepository = facilityRepository;
    }

    @Transactional(readOnly = true)
    public List<HospitalResource> findAll(String facilityId, String category) {
        return hospitalResourceRepository.findAllByOrderByResourceIdAsc().stream()
                .filter(resource -> isAll(facilityId) || resource.getFacilityId().equals(facilityId))
                .filter(resource -> isAll(category) || category.equalsIgnoreCase(resource.getCategory()))
                .toList();
    }

    @Transactional(readOnly = true)
    public HospitalResource findById(String resourceId) {
        return hospitalResourceRepository.findById(resourceId)
                .orElseThrow(() -> new NoSuchElementException("Hospital resource not found: " + resourceId));
    }

    @Transactional
    public HospitalResource create(HospitalResourceRequest request) {
        ensureFacilityExists(request.facilityId());
        validateCapacity(request);
        List<String> ids = hospitalResourceRepository.findAllByOrderByResourceIdAsc().stream()
                .map(HospitalResource::getResourceId)
                .toList();

        HospitalResource resource = new HospitalResource();
        resource.setResourceId(IdGenerator.next("RES", ids, 3));
        apply(resource, request);
        resource.setLastUpdated(Timestamps.now());
        return hospitalResourceRepository.save(resource);
    }

    @Transactional
    public HospitalResource update(String resourceId, HospitalResourceRequest request) {
        HospitalResource resource = findById(resourceId);
        ensureFacilityExists(request.facilityId());
        validateCapacity(request);
        apply(resource, request);
        resource.setLastUpdated(Timestamps.now());
        return hospitalResourceRepository.save(resource);
    }

    @Transactional
    public void delete(String resourceId) {
        HospitalResource resource = findById(resourceId);
        hospitalResourceRepository.delete(resource);
    }

    private void apply(HospitalResource resource, HospitalResourceRequest request) {
        resource.setFacilityId(request.facilityId());
        resource.setResourceName(request.resourceName().trim());
        resource.setCategory(defaultIfBlank(request.category(), "General Equipment"));
        resource.setTotalCapacity(request.totalCapacity());
        resource.setAvailableQuantity(request.availableQuantity());
        resource.setReorderLevel(request.reorderLevel());
        resource.setUnit(defaultIfBlank(request.unit(), "Units"));
    }

    private void validateCapacity(HospitalResourceRequest request) {
        if (request.availableQuantity() > request.totalCapacity()) {
            throw new IllegalArgumentException("Available quantity cannot exceed total capacity");
        }
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
