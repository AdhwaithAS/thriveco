package com.marian.thriveco.controller;

import com.marian.thriveco.model.AppUser;
import com.marian.thriveco.repository.AppUserRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final AppUserRepository appUserRepository;

    public UserController(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    /** GET /api/users - the predefined demo roles. */
    @GetMapping
    public List<AppUser> getAll() {
        return appUserRepository.findAllByOrderByUserIdAsc();
    }
}
