package com.marian.thriveco.config;

import com.marian.thriveco.model.AppUser;
import com.marian.thriveco.repository.AppUserRepository;
import com.marian.thriveco.util.PasswordHasher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ensures the five demo RBAC accounts exist and are usable.
 *
 * Unlike inventory data (which is never seeded automatically), user accounts
 * are part of the auth system: without them nobody could sign in. Creation is
 * idempotent - existing accounts, including their names, roles and password
 * hashes, are preserved UNLESS the row has no password hash yet (for example
 * accounts created before the RBAC feature); those get the default password
 * so they remain sign-in-able.
 */
@Component
public class DemoUserSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoUserSeeder.class);

    private final AppUserRepository appUserRepository;
    private final String defaultPassword;

    public DemoUserSeeder(AppUserRepository appUserRepository,
                          @Value("${DEMO_USER_PASSWORD:thrive123}") String defaultPassword) {
        this.appUserRepository = appUserRepository;
        this.defaultPassword = defaultPassword;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        String[][] demoAccounts = {
                {"USR001", "Hospital Staff Desk", "hospital.desk@thriveco.org", "Hospital Staff", "FAC001"},
                {"USR002", "Pharmacy Staff Desk", "pharmacy.desk@thriveco.org", "Pharmacy Staff", "FAC003"},
                {"USR003", "Blood Bank Officer Desk", "bloodbank.desk@thriveco.org", "Blood Bank Officer", "FAC005"},
                {"USR004", "System Administrator", "admin@thriveco.org", "System Admin", "FAC001"},
                {"USR005", "Emergency Dispatch Desk", "emergency.desk@thriveco.org", "Emergency Search User", "FAC001"}
        };

        int created = 0;
        int repaired = 0;

        for (String[] account : demoAccounts) {
            String userId = account[0];
            AppUser existing = appUserRepository.findById(userId).orElse(null);

            if (existing == null) {
                AppUser user = new AppUser();
                user.setUserId(userId);
                user.setName(account[1]);
                user.setEmail("team@" + account[2]);
                user.setRole(account[3]);
                user.setFacilityId(account[4]);
                user.setPasswordHash(PasswordHasher.hash(defaultPassword));
                appUserRepository.save(user);
                created++;
                continue;
            }

            if (existing.getPasswordHash() == null || existing.getPasswordHash().isBlank()) {
                // Row predates password storage (or was created without one).
                existing.setPasswordHash(PasswordHasher.hash(defaultPassword));
                appUserRepository.save(existing);
                repaired++;
            }
        }

        if (created > 0 || repaired > 0) {
            log.info("RBAC accounts: {} created, {} restored with the default password from "
                    + "DEMO_USER_PASSWORD (existing password hashes were never altered).", created, repaired);
        }
    }
}