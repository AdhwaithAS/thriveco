package com.marian.thriveco.repository;

import com.marian.thriveco.model.BloodStock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BloodStockRepository extends JpaRepository<BloodStock, String> {

    List<BloodStock> findAllByOrderByRecordIdAsc();

    List<BloodStock> findByFacilityIdOrderByRecordIdAsc(String facilityId);
}
