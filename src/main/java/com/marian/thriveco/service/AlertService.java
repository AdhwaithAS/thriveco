package com.marian.thriveco.service;

import com.marian.thriveco.dto.AlertDto;
import com.marian.thriveco.model.BloodStock;
import com.marian.thriveco.model.HospitalResource;
import com.marian.thriveco.model.Medicine;
import com.marian.thriveco.repository.BloodStockRepository;
import com.marian.thriveco.repository.HospitalResourceRepository;
import com.marian.thriveco.repository.MedicineRepository;
import com.marian.thriveco.util.Timestamps;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Recalculates threshold alerts from current stock, mirroring Section 5.5 of
 * the project specification:
 * <ul>
 *     <li>Medicine: quantity &lt;= reorder level (critical below 50%).</li>
 *     <li>Blood: quantity &lt;= 5 units (critical at &lt;= 2 units).</li>
 *     <li>Hospital assets: available &lt;= reorder level (critical at &lt;= 2).</li>
 * </ul>
 */
@Service
public class AlertService {

    private final MedicineRepository medicineRepository;
    private final BloodStockRepository bloodStockRepository;
    private final HospitalResourceRepository hospitalResourceRepository;

    public AlertService(MedicineRepository medicineRepository,
                        BloodStockRepository bloodStockRepository,
                        HospitalResourceRepository hospitalResourceRepository) {
        this.medicineRepository = medicineRepository;
        this.bloodStockRepository = bloodStockRepository;
        this.hospitalResourceRepository = hospitalResourceRepository;
    }

    @Transactional(readOnly = true)
    public List<AlertDto> findAlerts(String severity, String resourceType) {
        return computeAlerts().stream()
                .filter(alert -> isAll(severity) || alert.severity().equalsIgnoreCase(severity))
                .filter(alert -> isAll(resourceType) || alert.resourceType().equalsIgnoreCase(resourceType))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AlertDto> computeAlerts() {
        List<AlertDto> alerts = new ArrayList<>();
        int[] sequence = {1};

        for (Medicine medicine : medicineRepository.findAllByOrderByMedicineIdAsc()) {
            int quantity = medicine.getQuantity();
            int reorder = medicine.getReorderLevel();
            if (quantity <= reorder) {
                boolean critical = quantity <= Math.floorDiv(reorder, 2);
                alerts.add(new AlertDto(
                        alertId("MED", sequence),
                        medicine.getFacilityId(),
                        "Medicine",
                        medicine.getMedicineId(),
                        medicine.getMedicineName(),
                        quantity,
                        reorder,
                        medicine.getUnit(),
                        critical ? "Critical" : "Warning",
                        "Active",
                        medicine.getMedicineName() + " stock (" + quantity + " " + medicine.getUnit()
                                + ") is at or below threshold (" + reorder + " " + medicine.getUnit() + ")",
                        medicine.getLastUpdated() != null ? medicine.getLastUpdated() : Timestamps.now()
                ));
            }
        }

        for (BloodStock blood : bloodStockRepository.findAllByOrderByRecordIdAsc()) {
            int quantity = blood.getQuantity();
            boolean lowStatus = "Critical Alert".equalsIgnoreCase(blood.getAvailabilityStatus())
                    || "Low Stock".equalsIgnoreCase(blood.getAvailabilityStatus());
            if (quantity <= 5 || lowStatus) {
                boolean critical = quantity <= 2 || "Critical Alert".equalsIgnoreCase(blood.getAvailabilityStatus());
                alerts.add(new AlertDto(
                        alertId("BLD", sequence),
                        blood.getFacilityId(),
                        "Blood Unit",
                        blood.getRecordId(),
                        blood.getBloodGroup() + " (" + blood.getComponent() + ")",
                        quantity,
                        5,
                        "Units",
                        critical ? "Critical" : "Warning",
                        "Active",
                        "Blood Group " + blood.getBloodGroup() + " reserve (" + quantity
                                + " units) is critically low!",
                        blood.getLastUpdated() != null ? blood.getLastUpdated() : Timestamps.now()
                ));
            }
        }

        for (HospitalResource resource : hospitalResourceRepository.findAllByOrderByResourceIdAsc()) {
            int available = resource.getAvailableQuantity();
            int threshold = resource.getReorderLevel();
            if (available <= threshold) {
                alerts.add(new AlertDto(
                        alertId("RES", sequence),
                        resource.getFacilityId(),
                        "Hospital Resource",
                        resource.getResourceId(),
                        resource.getResourceName(),
                        available,
                        threshold,
                        resource.getUnit(),
                        available <= 2 ? "Critical" : "Warning",
                        "Active",
                        resource.getResourceName() + " capacity near exhaustion: only "
                                + available + " " + resource.getUnit() + " available.",
                        resource.getLastUpdated() != null ? resource.getLastUpdated() : Timestamps.now()
                ));
            }
        }

        return alerts;
    }

    private String alertId(String prefix, int[] sequence) {
        return String.format("ALT-%s-%03d", prefix, sequence[0]++);
    }

    private boolean isAll(String value) {
        return value == null || value.isBlank() || "ALL".equalsIgnoreCase(value);
    }
}
