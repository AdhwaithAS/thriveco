package com.marian.thriveco.repository;

import com.marian.thriveco.model.Facility;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FacilityRepository extends JpaRepository<Facility, String> {

    List<Facility> findAllByOrderByFacilityIdAsc();
}
