package com.marian.thriveco.repository;

import com.marian.thriveco.model.HospitalResource;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HospitalResourceRepository extends JpaRepository<HospitalResource, String> {

    List<HospitalResource> findAllByOrderByResourceIdAsc();

    List<HospitalResource> findByFacilityIdOrderByResourceIdAsc(String facilityId);
}
