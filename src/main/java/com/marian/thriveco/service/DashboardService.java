package com.marian.thriveco.service;

import com.marian.thriveco.dto.AlertDto;
import com.marian.thriveco.dto.DashboardMetrics;
import com.marian.thriveco.model.HospitalResource;
import com.marian.thriveco.repository.BloodStockRepository;
import com.marian.thriveco.repository.FacilityRepository;
import com.marian.thriveco.repository.HospitalResourceRepository;
import com.marian.thriveco.repository.MedicineRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
public class DashboardService {

    private final FacilityRepository facilityRepository;
    private final MedicineRepository medicineRepository;
    private final BloodStockRepository bloodStockRepository;
    private final HospitalResourceRepository hospitalResourceRepository;
    private final AlertService alertService;

    public DashboardService(FacilityRepository facilityRepository,
                            MedicineRepository medicineRepository,
                            BloodStockRepository bloodStockRepository,
                            HospitalResourceRepository hospitalResourceRepository,
                            AlertService alertService) {
        this.facilityRepository = facilityRepository;
        this.medicineRepository = medicineRepository;
        this.bloodStockRepository = bloodStockRepository;
        this.hospitalResourceRepository = hospitalResourceRepository;
        this.alertService = alertService;
    }

    @Transactional(readOnly = true)
    public DashboardMetrics metrics() {
        List<AlertDto> alerts = alertService.computeAlerts();

        long totalMedicines = medicineRepository.findAll().stream()
                .mapToLong(medicine -> medicine.getQuantity())
                .sum();
        long totalBloodUnits = bloodStockRepository.findAll().stream()
                .mapToLong(blood -> blood.getQuantity())
                .sum();
        long availableIcuBeds = hospitalResourceRepository.findAll().stream()
                .filter(this::isBedResource)
                .mapToLong(HospitalResource::getAvailableQuantity)
                .sum();

        long critical = alerts.stream().filter(alert -> "Critical".equalsIgnoreCase(alert.severity())).count();
        long warning = alerts.stream().filter(alert -> "Warning".equalsIgnoreCase(alert.severity())).count();

        return new DashboardMetrics(
                facilityRepository.count(),
                totalMedicines,
                medicineRepository.count(),
                totalBloodUnits,
                critical,
                warning,
                alerts.size(),
                availableIcuBeds
        );
    }

    private boolean isBedResource(HospitalResource resource) {
        String category = resource.getCategory() == null ? "" : resource.getCategory().toLowerCase(Locale.ROOT);
        String name = resource.getResourceName() == null ? "" : resource.getResourceName().toLowerCase(Locale.ROOT);
        return category.contains("bed") || name.contains("bed");
    }
}
