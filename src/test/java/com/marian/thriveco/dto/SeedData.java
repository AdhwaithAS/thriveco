package com.marian.thriveco.dto;

import com.marian.thriveco.model.AppUser;
import com.marian.thriveco.model.BloodStock;
import com.marian.thriveco.model.Facility;
import com.marian.thriveco.model.HospitalResource;
import com.marian.thriveco.model.Medicine;

import java.util.List;

/**
 * Shape of the test-only fixture at src/test/resources/seed-data.json. Used by
 * the integration tests so they can assert exact stock and alert counts; it is
 * not loaded by the production application.
 */
public record SeedData(
        List<Facility> facilities,
        List<Medicine> medicines,
        List<BloodStock> bloodStock,
        List<HospitalResource> hospitalResources,
        List<AppUser> users
) {
}
