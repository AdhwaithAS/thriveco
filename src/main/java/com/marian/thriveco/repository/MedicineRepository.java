package com.marian.thriveco.repository;

import com.marian.thriveco.model.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MedicineRepository extends JpaRepository<Medicine, String> {

    List<Medicine> findAllByOrderByMedicineIdAsc();

    List<Medicine> findByFacilityIdOrderByMedicineIdAsc(String facilityId);
}
