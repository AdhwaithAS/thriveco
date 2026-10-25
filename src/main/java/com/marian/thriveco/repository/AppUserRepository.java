package com.marian.thriveco.repository;

import com.marian.thriveco.model.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AppUserRepository extends JpaRepository<AppUser, String> {

    List<AppUser> findAllByOrderByUserIdAsc();
}
