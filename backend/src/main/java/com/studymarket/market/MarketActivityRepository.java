package com.studymarket.market;

import com.studymarket.asset.Asset;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MarketActivityRepository extends JpaRepository<MarketActivity, Long> {
	Optional<MarketActivity> findByAssetAndActivityDate(Asset asset, LocalDate activityDate);
	List<MarketActivity> findTop30ByAssetOrderByActivityDateDesc(Asset asset);
	List<MarketActivity> findByActivityDateOrderByAssetIdAsc(LocalDate activityDate);
}