package com.studymarket.asset;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AssetRepository extends JpaRepository<Asset, Long> {
	List<Asset> findAllByStatus(String status);
}