package com.marian.thriveco;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.client.ResponseErrorHandler;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end API tests against the real Spring context and an in-memory H2
 * database. A test-only seeder loads the fixture, so these assertions verify
 * deterministic stock and alert counts without touching the Neon database.
 *
 * Every operational endpoint sits behind the RBAC guard, so the suite logs in
 * with the demo accounts (USR004 = System Admin) and carries the session
 * token. Requests go through the plain RestTemplate on the JDK HttpClient,
 * which does not interfere with 401/403 responses.
 *
 * Demo account roles (mirrored from the fixture, seed-data.json):
 *   USR001 Hospital Staff | USR002 Pharmacy Staff | USR003 Blood Bank Officer
 *   USR004 System Admin   | USR005 Emergency Search User
 * Default password for all demo accounts: thrive123
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class ThriveCoApiIntegrationTest {

    private static final String ADMIN = "USR004";

    @LocalServerPort
    private int port;

    private static RestTemplate rest;
    private static String baseUrl;
    private String cachedAdminToken;

    @BeforeAll
    static void createRestTemplate() {
        rest = new RestTemplate(new JdkClientHttpRequestFactory());
        // Default RestTemplate throws on 4xx/5xx; the assertions below need the
        // raw ResponseEntity so they can verify error status codes and bodies.
        rest.setErrorHandler(new ResponseErrorHandler() {
            @Override
            public boolean hasError(org.springframework.http.client.ClientHttpResponse response) {
                return false;
            }

            @Override
            public void handleError(org.springframework.http.client.ClientHttpResponse response) {
                // Swallow: tests assert on raw status codes and JSON bodies.
            }
        });
    }

    private String url(String path) {
        if (baseUrl == null) {
            baseUrl = "http://localhost:" + port;
        }
        return baseUrl + path;
    }

    // ------------------------------------------------------------------
    // RBAC helpers
    // ------------------------------------------------------------------

    private String loginAs(String userId) {
        ResponseEntity<JsonNode> response = post("/api/auth/login",
                Map.of("userId", userId, "password", "thrive123"), JsonNode.class, null);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        String token = response.getBody().get("token").asText();
        assertThat(token).contains(".");
        return token;
    }

    /** Lazily logs in the System Admin once; used by cleanup deletes. */
    private String adminToken() {
        if (cachedAdminToken == null) {
            cachedAdminToken = loginAs(ADMIN);
        }
        return cachedAdminToken;
    }

    private <T> ResponseEntity<T> exchange(String pathLink, HttpMethod method, Object body,
                                           Class<T> returnType, String token) {
        HttpHeaders headers = new HttpHeaders();
        if (token != null) {
            headers.set("X-Auth-Token", token);
        }
        return rest.exchange(url(pathLink), method, new HttpEntity<>(body, headers), returnType);
    }

    private <T> ResponseEntity<T> get(String pathLink, Class<T> returnType, String token) {
        return exchange(pathLink, HttpMethod.GET, null, returnType, token);
    }

    private <T> ResponseEntity<T> post(String pathLink, Object body, Class<T> returnType, String token) {
        return exchange(pathLink, HttpMethod.POST, body, returnType, token);
    }

    private <T> ResponseEntity<T> put(String pathLink, Object body, Class<T> returnType, String token) {
        return exchange(pathLink, HttpMethod.PUT, body, returnType, token);
    }

    private <T> ResponseEntity<T> delete(String pathLink, Class<T> returnType, String token) {
        return exchange(pathLink, HttpMethod.DELETE, null, returnType, token);
    }

    // ------------------------------------------------------------------
    // Health + seeded data
    // ------------------------------------------------------------------

    @Test
    void healthEndpointIsPublic() {
        JsonNode body = rest.getForObject(url("/api/health"), JsonNode.class);
        assertThat(body.get("status").asText()).isEqualTo("online");
        assertThat(body.get("backend").asText()).contains("Spring Boot");
    }

    @Test
    void seedDataIsLoadedAndProtectedByAuth() {
        String token = loginAs(ADMIN);

        JsonNode facilities = get("/api/facilities", JsonNode.class, token).getBody();
        assertThat(facilities.size()).isEqualTo(6);
        assertThat(facilities.get(0).get("facilityId").asText()).isEqualTo("FAC001");

        JsonNode medicines = get("/api/medicines", JsonNode.class, token).getBody();
        assertThat(medicines.size()).isEqualTo(12);

        JsonNode blood = get("/api/blood-stock", JsonNode.class, token).getBody();
        assertThat(blood.size()).isEqualTo(12);

        JsonNode resources = get("/api/hospital-resources", JsonNode.class, token).getBody();
        assertThat(resources.size()).isEqualTo(6);

        // Unauthenticated access is rejected with 401.
        ResponseEntity<JsonNode> anonymous = get("/api/medicines", JsonNode.class, null);
        assertThat(anonymous.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(anonymous.getBody().get("status").asInt()).isEqualTo(401);
    }

    @Test
    void dashboardMetricsMatchSeedData() {
        String token = loginAs(ADMIN);
        JsonNode metrics = get("/api/dashboard/metrics", JsonNode.class, token).getBody();

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
        String token = loginAs(ADMIN);

        JsonNode alerts = get("/api/alerts", JsonNode.class, token).getBody();
        assertThat(alerts.size()).isEqualTo(12);

        JsonNode medicineAlerts = get("/api/alerts?resourceType=Medicine", JsonNode.class, token).getBody();
        assertThat(medicineAlerts.size()).isEqualTo(5);

        JsonNode criticalAlerts = get("/api/alerts?severity=Critical", JsonNode.class, token).getBody();
        assertThat(criticalAlerts.size()).isEqualTo(8);
    }

    @Test
    void emergencySearchFiltersByBloodGroup() {
        String token = loginAs(ADMIN);
        JsonNode results = get("/api/emergency/search?type=blood&bloodGroup=O-", JsonNode.class, token).getBody();

        assertThat(results.size()).isEqualTo(2);
        assertThat(results.get(0).get("name").asText()).contains("O-");
        assertThat(results.get(0).get("facility").asText()).isNotBlank();
        assertThat(results.get(0).get("emergencyPhone").asText()).isNotBlank();
    }

    // ------------------------------------------------------------------
    // Authentication behaviour
    // ------------------------------------------------------------------

    @Test
    void wrongPasswordReturns401() {
        ResponseEntity<JsonNode> response = post("/api/auth/login",
                Map.of("userId", ADMIN, "password", "wrong"), JsonNode.class, null);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody().get("message").asText()).contains("Invalid");
    }

    @Test
    void tamperedTokenReturns401() {
        ResponseEntity<JsonNode> response = get("/api/medicines", JsonNode.class, ADMIN + "|99999999999999.forged");
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    // ------------------------------------------------------------------
    // RBAC permission matrix
    // ------------------------------------------------------------------

    @Test
    void emergencySearchUserCannotWriteAnything() {
        String readOnlyToken = loginAs("USR005");
        Map<String, Object> medicine = Map.of(
                "medicineName", "Blocked Medicine", "facilityId", "FAC001",
                "quantity", 1, "reorderLevel", 1);

        ResponseEntity<JsonNode> response = post("/api/medicines", medicine, JsonNode.class, readOnlyToken);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().get("message").asText()).contains("Emergency Search User");

        ResponseEntity<JsonNode> facility = post("/api/facilities", Map.of(
                "facilityName", "Blocked Facility", "address", "Nowhere"), JsonNode.class, readOnlyToken);
        assertThat(facility.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void pharmacyStaffManagesMedicinesButNotFacilitiesOrBlood() {
        String pharmacyToken = loginAs("USR002");
        String adminToken = loginAs(ADMIN);

        // Pharmacy Staff may create medicine stock...
        Map<String, Object> payload = Map.of(
                "medicineName", "RBAC Test Medicine",
                "facilityId", "FAC003",
                "category", "Antibiotics",
                "quantity", 30,
                "unit", "Vials",
                "reorderLevel", 10);
        ResponseEntity<JsonNode> created = post("/api/medicines", payload, JsonNode.class, pharmacyToken);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String medicineId = created.getBody().get("medicineId").asText();

        // ...may update it...
        ResponseEntity<JsonNode> updated = put("/api/medicines/" + medicineId,
                Map.of("medicineName", "RBAC Test Medicine", "facilityId", "FAC003",
                        "quantity", 35, "reorderLevel", 10), JsonNode.class, pharmacyToken);
        assertThat(updated.getStatusCode()).isEqualTo(HttpStatus.OK);

        // ...but not connect facilities or record blood units.
        ResponseEntity<JsonNode> forbiddenFacility = post("/api/facilities",
                Map.of("facilityName", "Nope", "address", "Nowhere"), JsonNode.class, pharmacyToken);
        assertThat(forbiddenFacility.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        ResponseEntity<JsonNode> forbiddenBlood = post("/api/blood-stock",
                Map.of("bloodGroup", "O-", "facilityId", "FAC003", "quantity", 3), JsonNode.class, pharmacyToken);
        assertThat(forbiddenBlood.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        ResponseEntity<Void> deleted = delete("/api/medicines/" + medicineId, Void.class, adminToken);
        assertThat(deleted.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    void bloodBankOfficerManagesBloodOnly() {
        String bloodToken = loginAs("USR003");

        ResponseEntity<JsonNode> created = post("/api/blood-stock",
                Map.of("bloodGroup", "A+", "facilityId", "FAC005", "quantity", 4, "component", "Whole Blood"),
                JsonNode.class, bloodToken);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String recordId = created.getBody().get("recordId").asText();

        ResponseEntity<JsonNode> forbidden = post("/api/hospital-resources", Map.of(
                "resourceName", "Nope Wing", "facilityId", "FAC005",
                "totalCapacity", 2, "availableQuantity", 1, "reorderLevel", 1), JsonNode.class, bloodToken);
        assertThat(forbidden.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        // Cleanup restores the fixture counts for metrics assertions.
        ResponseEntity<Void> deleted = delete("/api/blood-stock/" + recordId, Void.class, adminToken());
        assertThat(deleted.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    void hospitalStaffManagesHospitalResourcesOnly() {
        String hospitalToken = loginAs("USR001");

        ResponseEntity<JsonNode> created = post("/api/hospital-resources", Map.of(
                "resourceName", "RBAC Test ICU Bed",
                "facilityId", "FAC001",
                "category", "Intensive Care Beds",
                "totalCapacity", 10,
                "availableQuantity", 5,
                "reorderLevel", 2,
                "unit", "Beds"), JsonNode.class, hospitalToken);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String resourceId = created.getBody().get("resourceId").asText();

        ResponseEntity<JsonNode> forbidden = put("/api/blood-stock/BLD001", Map.of(
                "bloodGroup", "O+", "facilityId", "FAC001", "quantity", 9), JsonNode.class, hospitalToken);
        assertThat(forbidden.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        ResponseEntity<Void> deleted = delete("/api/hospital-resources/" + resourceId, Void.class, adminToken());
        assertThat(deleted.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }

    // ------------------------------------------------------------------
    // CRUD + validation behaviour (as System Admin)
    // ------------------------------------------------------------------

    @Test
    void addingLowStockMedicineRaisesAlertAndDeletingRemovesIt() {
        String token = loginAs(ADMIN);
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

        ResponseEntity<JsonNode> created = post("/api/medicines", payload, JsonNode.class, token);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String medicineId = created.getBody().get("medicineId").asText();
        assertThat(medicineId).startsWith("MED");

        JsonNode medicineAlerts = get("/api/alerts?resourceType=Medicine", JsonNode.class, token).getBody();
        boolean alertExists = false;
        for (JsonNode alert : medicineAlerts) {
            if (medicineId.equals(alert.get("resourceId").asText())) {
                alertExists = true;
                assertThat(alert.get("severity").asText()).isEqualTo("Critical");
                assertThat(alert.get("message").asText()).contains("Integration Test Medicine");
            }
        }
        assertThat(alertExists).isTrue();

        ResponseEntity<Void> deleted = delete("/api/medicines/" + medicineId, Void.class, token);
        assertThat(deleted.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        ResponseEntity<JsonNode> afterDelete = get("/api/medicines/" + medicineId, JsonNode.class, token);
        assertThat(afterDelete.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(afterDelete.getBody().get("status").asInt()).isEqualTo(404);
    }

    @Test
    void validationAndNotFoundErrorsAreJson() {
        String token = loginAs(ADMIN);
        List<Map<String, Object>> invalidPayloads = List.of(
                Map.of("medicineName", "Bad", "facilityId", "FAC001", "quantity", -1, "reorderLevel", 10),
                Map.of("medicineName", "Bad", "facilityId", "FAC999", "quantity", 1, "reorderLevel", 10)
        );

        for (Map<String, Object> payload : invalidPayloads) {
            ResponseEntity<JsonNode> response = post("/api/medicines", payload, JsonNode.class, token);
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(response.getBody().get("message").asText()).isNotBlank();
        }

        ResponseEntity<JsonNode> notFound = get("/api/medicines/DOES-NOT-EXIST", JsonNode.class, token);
        assertThat(notFound.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        ResponseEntity<JsonNode> missingPage = rest.getForEntity(url("/this-page-does-not-exist"), JsonNode.class);
        assertThat(missingPage.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
