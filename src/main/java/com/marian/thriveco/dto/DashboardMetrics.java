package com.marian.thriveco.dto;

/**
 * Aggregated numbers for the dashboard cards.
 */
public record DashboardMetrics(
        long totalFacilities,
        long totalMedicines,
        long medicineTypesCount,
        long totalBloodUnits,
        long criticalAlertsCount,
        long warningAlertsCount,
        long totalAlerts,
        long availableIcuBeds
) {
}
