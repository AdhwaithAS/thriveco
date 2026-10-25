package com.marian.thriveco.service;

import com.marian.thriveco.dto.EmergencyResult;
import com.marian.thriveco.model.BloodStock;
import com.marian.thriveco.model.Facility;
import com.marian.thriveco.model.Medicine;
import com.marian.thriveco.repository.BloodStockRepository;
import com.marian.thriveco.repository.FacilityRepository;
import com.marian.thriveco.repository.MedicineRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Section 5.4: multi-facility emergency resource search. Flattens medicine and
 * blood records together with the reporting facility's address and phone
 * numbers so the UI can show a single dispatch card.
 */
@Service
public class EmergencySearchService {

    private final MedicineRepository medicineRepository;
    private final BloodStockRepository bloodStockRepository;
    private final FacilityRepository facilityRepository;

    public EmergencySearchService(MedicineRepository medicineRepository,
                                  BloodStockRepository bloodStockRepository,
                                  FacilityRepository facilityRepository) {
        this.medicineRepository = medicineRepository;
        this.bloodStockRepository = bloodStockRepository;
        this.facilityRepository = facilityRepository;
    }

    @Transactional(readOnly = true)
    public List<EmergencyResult> search(String type, String query, String bloodGroup) {
        String mode = normalizeType(type);
        String search = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        boolean filterGroup = bloodGroup != null && !bloodGroup.isBlank()
                && !"ALL".equalsIgnoreCase(bloodGroup);

        Map<String, Facility> facilitiesById = facilityRepository.findAllByOrderByFacilityIdAsc().stream()
                .collect(Collectors.toMap(Facility::getFacilityId, Function.identity()));

        List<EmergencyResult> results = new ArrayList<>();

        if ("medicine".equals(mode) || "all".equals(mode)) {
            for (Medicine medicine : medicineRepository.findAllByOrderByMedicineIdAsc()) {
                if (!search.isEmpty()
                        && !contains(medicine.getMedicineName(), search)
                        && !contains(medicine.getCategory(), search)) {
                    continue;
                }
                Facility facility = facilitiesById.get(medicine.getFacilityId());
                results.add(new EmergencyResult(
                        "Medicine",
                        medicine.getMedicineId(),
                        medicine.getMedicineName(),
                        medicine.getCategory(),
                        medicine.getQuantity(),
                        medicine.getUnit(),
                        medicineStatus(medicine),
                        facilityName(facility),
                        facilityType(facility),
                        facilityAddress(facility),
                        facilityPhone(facility),
                        facilityEmergencyPhone(facility),
                        valueOrEmpty(medicine.getLastUpdated()),
                        medicine.getFacilityId()
                ));
            }
        }

        if ("blood".equals(mode) || "all".equals(mode)) {
            for (BloodStock blood : bloodStockRepository.findAllByOrderByRecordIdAsc()) {
                if (filterGroup && !blood.getBloodGroup().equalsIgnoreCase(bloodGroup)) {
                    continue;
                }
                if (!search.isEmpty()
                        && !contains(blood.getBloodGroup(), search)
                        && !contains(blood.getComponent(), search)) {
                    continue;
                }
                Facility facility = facilitiesById.get(blood.getFacilityId());
                results.add(new EmergencyResult(
                        "Blood Unit",
                        blood.getRecordId(),
                        blood.getBloodGroup() + " Blood (" + blood.getComponent() + ")",
                        "Group " + blood.getBloodGroup(),
                        blood.getQuantity(),
                        "Units",
                        valueOrEmpty(blood.getAvailabilityStatus()),
                        facilityName(facility),
                        facilityType(facility),
                        facilityAddress(facility),
                        facilityPhone(facility),
                        facilityEmergencyPhone(facility),
                        valueOrEmpty(blood.getLastUpdated()),
                        blood.getFacilityId()
                ));
            }
        }

        return results;
    }

    private String normalizeType(String type) {
        String mode = type == null || type.isBlank() ? "all" : type.trim().toLowerCase(Locale.ROOT);
        if (!List.of("all", "medicine", "blood").contains(mode)) {
            throw new IllegalArgumentException("Search type must be one of: all, medicine, blood");
        }
        return mode;
    }

    private String medicineStatus(Medicine medicine) {
        if (medicine.getQuantity() <= 0) {
            return "Out of Stock";
        }
        if (medicine.getQuantity() <= medicine.getReorderLevel()) {
            return "Low Stock";
        }
        return "In Stock";
    }

    private boolean contains(String value, String lowerCaseQuery) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(lowerCaseQuery);
    }

    private String facilityName(Facility facility) {
        return facility == null ? "Unknown Facility" : facility.getFacilityName();
    }

    private String facilityType(Facility facility) {
        return facility == null || facility.getFacilityType() == null ? "Facility" : facility.getFacilityType();
    }

    private String facilityAddress(Facility facility) {
        return facility == null ? "" : valueOrEmpty(facility.getAddress());
    }

    private String facilityPhone(Facility facility) {
        return facility == null || facility.getContactDetails() == null
                ? "" : valueOrEmpty(facility.getContactDetails().getPhone());
    }

    private String facilityEmergencyPhone(Facility facility) {
        return facility == null || facility.getContactDetails() == null
                ? "" : valueOrEmpty(facility.getContactDetails().getEmergencyPhone());
    }

    private String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }
}
