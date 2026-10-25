package com.marian.thriveco;

import com.marian.thriveco.service.SeedDataService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Test-only seeder. The production application intentionally does not insert
 * demo data; these integration tests run against a deterministic fixture so
 * they can assert exact stock and alert counts.
 */
@Component
@Profile("test")
public class TestDatabaseSeeder implements ApplicationRunner {

    private final SeedDataService seedDataService;

    public TestDatabaseSeeder(SeedDataService seedDataService) {
        this.seedDataService = seedDataService;
    }

    @Override
    public void run(ApplicationArguments args) {
        seedDataService.seedIfEmpty();
    }
}
