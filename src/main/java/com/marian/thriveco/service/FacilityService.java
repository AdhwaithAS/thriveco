package com.marian.thriveco.service;

import com.marian.thriveco.dto.FacilityRequest;
import com.marian.thriveco.model.ContactDetails;
import com.marian.thriveco.model.Facility;
import com.marian.thriveco.repository.FacilityRepository;
import com.marian.thriveco.util.IdGenerator;
import com.marian.thriveco.util.Timestamps;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class FacilityService {

    private final FacilityRepository facilityRepository;

    public FacilityService(FacilityRepository facilityRepository) {
        this.facilityRepository = facilityRepository;
    }

    @Transactional(readOnly = true)
    public List<Facility> findAll() {
        return facilityRepository.findAllByOrderByFacilityIdAsc();
    }

    @Transactional(readOnly = true)
    public Facility findById(String facilityId) {
        return facilityRepository.findById(facilityId)
                .orElseThrow(() -> new NoSuchElementException("Facility not found: " + facilityId));
    }

    @Transactional
    public Facility create(FacilityRequest request) {
        List<Facility> existing = facilityRepository.findAllByOrderByFacilityIdAsc();
        String nextId = IdGenerator.next("FAC", ids(existing), 3);

        Facility facility = new Facility();
        facility.setFacilityId(nextId);
        facility.setFacilityName(request.facilityName().trim());
        facility.setFacilityType(isBlank(request.facilityType()) ? "Hospital" : request.facilityType());
        facility.setAddress(request.address().trim());
        facility.setContactDetails(new ContactDetails(
                defaultIfBlank(request.phone(), "+91 471 000 0000"),
                defaultIfBlank(request.emergencyPhone(), "+91 471 999 9999"),
                defaultIfBlank(request.email(), "info@facility.org"),
                defaultIfBlank(request.coordinator(), "Duty Officer")
        ));
        facility.setVerified(true);
        facility.setLastAudit(Timestamps.today());
        return facilityRepository.save(facility);
    }

    private Collection<String> ids(List<Facility> facilities) {
        return facilities.stream().map(Facility::getFacilityId).toList();
    }

    private String defaultIfBlank(String value, String fallback) {
        return isBlank(value) ? fallback : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
