package com.studymarket.assessment;

import com.studymarket.asset.Asset;
import com.studymarket.user.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssessmentRepository extends JpaRepository<Assessment, Long> {
	List<Assessment> findAllByUserOrderByCreatedAtDesc(User user);
	List<Assessment> findAllByUserAndAssetOrderByCreatedAtDesc(User user, Asset asset);
	Optional<Assessment> findTopByUserAndAssetOrderByCreatedAtDesc(User user, Asset asset);
	Optional<Assessment> findTopByUserAndAssetAndRemainingSellPercentageGreaterThanOrderByCreatedAtDesc(
			User user, Asset asset, java.math.BigDecimal minimumRemainingPercentage);
}