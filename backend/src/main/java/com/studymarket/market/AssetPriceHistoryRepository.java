package com.studymarket.market;

import com.studymarket.asset.Asset;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssetPriceHistoryRepository extends JpaRepository<AssetPriceHistory, Long> {
	List<AssetPriceHistory> findAllByAssetOrderByRecordedAtDesc(Asset asset);
}