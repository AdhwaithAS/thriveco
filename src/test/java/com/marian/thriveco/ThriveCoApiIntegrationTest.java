package com.marian.thriveco;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end API tests against the real Spring context and an in-memory H2
 * database. A test-only seeder loads the fixture, so these assertions verify
 * deterministic stock and alert counts without touching the Neon database.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class ThriveCoApiIntegrationTest {

    @Autowired
    private TestRestTemplate rest;

    @Test
    void healthEndpointIsOnline() {
        JsonNode body = rest.getForObject("/api/health", JsonNode.class);
        assertThat(body.get("status").asText()).isEqualTo("online");
        assertThat(body.get("backend").asText()).contains("Spring Boot");
    }

    @Test
    void seedDataIsLoaded() {
        JsonNode facilities = rest.getForObject("/api/facilities", JsonNode.class);
        assertThat(facilities.size()).isEqualTo(6);
        assertThat(facilities.get(0).get("facilityId").asText()).isEqualTo("FAC001");

        JsonNode medicines = rest.getForObject("/api/medicines", JsonNode.class);
        assertThat(medicines.size()).isEqualTo(12);

        JsonNode blood = rest.getForObject("/api/blood-stock", JsonNode.class);
        assertThat(blood.size()).isEqualTo(12);

        JsonNode resources = rest.getForObject("/api/hospital-resources", JsonNode.class);
        assertThat(resources.size()).isEqualTo(6);
    }

    @Test
    void dashboardMetricsMatchSeedData() {
        JsonNode metrics = rest.getForObject("/api/dashboard/metrics", JsonNode.class);

        assertThat(metrics.get("totalFacilities").asInt()).isEqualTo(6);
        assertThat(metrics.get("totalMedicines").asInt()).isEqualTo(1531);
        assertThat(metrics.get("medicineTypesCount").asInt()).isEqualTo(12);
        assertThat(metrics.get("totalBloodUnits").asInt()).isEqualTo(137);
        assertThat(metrics.get("totalAlerts").asInt()).isEqualTo(12);
        assertThat(metrics.get("criticalAlertsCount").asInt()).isEqualTo(8);
        assertThat(metrics.get("availableIcuBeds").asInt()).isEqualTo(17);
    }

    @Test
    void alertsAreComputedFromStockLevels() {
        JsonNode alerts = rest.getForObject("/api/alerts", JsonNode.class);
        assertThat(alerts.size()).isEqualTo(12);

        JsonNode medicineAlerts = rest.getForObject("/api/alerts?resourceType=Medicine", JsonNode.class);
        assertThat(medicineAlerts.size()).isEqualTo(5);

        JsonNode criticalAlerts = rest.getForObject("/api/alerts?severity=Critical", JsonNode.class);
        assertThat(criticalAlerts.size()).isEqualTo(8);
    }

    @Test
    void emergencySearchFiltersByBloodGroup() {
        JsonNode results = rest.getForObject("/api/emergency/search?type=blood&bloodGroup=O-", JsonNode.class);

        assertThat(results.size()).isEqualTo(2);
        assertThat(results.get(0).get("name").asText()).contains("O-");
        assertThat(results.get(0).get("facility").asText()).isNotBlank();
        assertThat(results.get(0).get("emergencyPhone").asText()).isNotBlank();
    }

    @Test
    void addingLowStockMedicineRaisesAlertAndDeletingRemovesIt() {
        Map<String, Object> payload = Map.of(
                "medicineName", "Integration Test Medicine",
                "facilityId", "FAC001",
                "category", "Analgesic & Antipyretic",
                "quantity", 7,
                "unit", "Tablets",
                "reorderLevel", 20,
                "batchNumber", "TEST-INT-01",
                "expiryDate", "2028-12-31"
        );

        ResponseEntity<JsonNode> created = rest.postForEntity("/api/medicines", payload, JsonNode.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String medicineId = created.getBody().get("medicineId").asText();
        assertThat(medicineId).startsWith("MED");

        JsonNode medicineAlerts = rest.getForObject("/api/alerts?resourceType=Medicine", JsonNode.class);
        boolean alertExists = false;
        for (JsonNode alert : medicineAlerts) {
            if (medicineId.equals(alert.get("resourceId").asText())) {
                alertExists = true;
                assertThat(alert.get("severity").asText()).isEqualTo("Critical");
                assertThat(alert.get("message").asText()).contains("Integration Test Medicine");
            }
        }
        assertThat(alertExists).isTrue();

        ResponseEntity<Void> deleted = rest.exchange(
                "/api/medicines/" + medicineId,
                org.springframework.http.HttpMethod.DELETE,
                null,
                Void.class
        );
        assertThat(deleted.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        ResponseEntity<JsonNode> afterDelete = rest.getForEntity("/api/medicines/" + medicineId, JsonNode.class);
        assertThat(afterDelete.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(afterDelete.getBody().get("status").asInt()).isEqualTo(404);
    }

    @Test
    void validationAndNotFoundErrorsAreJson() {
        List<Map<String, Object>> invalidPayloads = List.of(
                Map.of("medicineName", "Bad", "facilityId", "FAC001", "quantity", -1, "reorderLevel", 10),
                Map.of("medicineName", "Bad", "facilityId", "FAC999", "quantity", 1, "reorderLevel", 10)
        );

        for (Map<String, Object> payload : invalidPayloads) {
            ResponseEntity<JsonNode> response = rest.postForEntity("/api/medicines", payload, JsonNode.class);
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(response.getBody().get("message").asText()).isNotBlank();
        }

        ResponseEntity<JsonNode> notFound = rest.getForEntity("/api/medicines/DOES-NOT-EXIST", JsonNode.class);
        assertThat(notFound.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        ResponseEntity<JsonNode> missingPage = rest.getForEntity("/this-page-does-not-exist", JsonNode.class);
        assertThat(missingPage.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
