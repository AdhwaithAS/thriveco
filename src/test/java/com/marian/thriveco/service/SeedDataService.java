package com.marian.thriveco.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marian.thriveco.dto.SeedData;
import com.marian.thriveco.repository.AppUserRepository;
import com.marian.thriveco.repository.BloodStockRepository;
import com.marian.thriveco.repository.FacilityRepository;
import com.marian.thriveco.repository.HospitalResourceRepository;
import com.marian.thriveco.repository.MedicineRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.List;

/**
 * Test-only loader for the deterministic integration-test fixture. This class
 * lives in the test source set, so the production application never loads demo
 * data or writes seed rows into the Neon database.
 */
@Service
public class SeedDataService {

    private static final Logger log = LoggerFactory.getLogger(SeedDataService.class);

    private final FacilityRepository facilityRepository;
    private final MedicineRepository medicineRepository;
    private final BloodStockRepository bloodStockRepository;
    private final HospitalResourceRepository hospitalResourceRepository;
    private final AppUserRepository appUserRepository;
    private final ObjectMapper objectMapper;

    public SeedDataService(FacilityRepository facilityRepository,
                           MedicineRepository medicineRepository,
                           BloodStockRepository bloodStockRepository,
                           HospitalResourceRepository hospitalResourceRepository,
                           AppUserRepository appUserRepository,
                           ObjectMapper objectMapper) {
        this.facilityRepository = facilityRepository;
        this.medicineRepository = medicineRepository;
        this.bloodStockRepository = bloodStockRepository;
        this.hospitalResourceRepository = hospitalResourceRepository;
        this.appUserRepository = appUserRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void seedIfEmpty() {
        if (facilityRepository.count() > 0) {
            log.info("Database already contains {} facilities - seed data not needed",
                    facilityRepository.count());
            return;
        }
        seed();
    }

    @Transactional
    public void resetToDefaults() {
        log.warn("Resetting Thrive&Co demo database to the original academic seed data");
        appUserRepository.deleteAllInBatch();
        hospitalResourceRepository.deleteAllInBatch();
        bloodStockRepository.deleteAllInBatch();
        medicineRepository.deleteAllInBatch();
        facilityRepository.deleteAllInBatch();
        seed();
    }

    private void seed() {
        SeedData data = loadSeedData();
        facilityRepository.saveAll(nullSafe(data.facilities()));
        medicineRepository.saveAll(nullSafe(data.medicines()));
        bloodStockRepository.saveAll(nullSafe(data.bloodStock()));
        hospitalResourceRepository.saveAll(nullSafe(data.hospitalResources()));
        appUserRepository.saveAll(nullSafe(data.users()));
        log.info("Seeded demo database: {} facilities, {} medicines, {} blood records, {} resources, {} users",
                size(data.facilities()), size(data.medicines()), size(data.bloodStock()),
                size(data.hospitalResources()), size(data.users()));
    }

    private SeedData loadSeedData() {
        ClassPathResource resource = new ClassPathResource("seed-data.json");
        try (InputStream input = resource.getInputStream()) {
            return objectMapper.readValue(input, SeedData.class);
        } catch (IOException ex) {
            throw new UncheckedIOException("Unable to load seed-data.json", ex);
        }
    }

    private <T> List<T> nullSafe(List<T> values) {
        return values == null ? List.of() : values;
    }

    private int size(List<?> values) {
        return values == null ? 0 : values.size();
    }
}
