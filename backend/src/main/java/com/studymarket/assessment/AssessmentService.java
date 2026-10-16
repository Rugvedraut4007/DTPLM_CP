package com.studymarket.assessment;

import com.studymarket.asset.Asset;
import com.studymarket.asset.AssetRepository;
import com.studymarket.user.User;
import com.studymarket.user.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AssessmentService {

	private final AssessmentRepository assessmentRepository;
	private final UserRepository userRepository;
	private final AssetRepository assetRepository;

	public AssessmentService(AssessmentRepository assessmentRepository, UserRepository userRepository,
			AssetRepository assetRepository) {
		this.assessmentRepository = assessmentRepository;
		this.userRepository = userRepository;
		this.assetRepository = assetRepository;
	}

	@Transactional
	public Assessment createAssessment(Long userId, Long assetId, BigDecimal scorePercentage) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
		Asset asset = assetRepository.findById(assetId)
				.orElseThrow(() -> new IllegalArgumentException("Asset not found: " + assetId));
		validateScore(scorePercentage);
		return assessmentRepository.save(new Assessment(user, asset, scorePercentage, calculateMaxSellPercentage(scorePercentage)));
	}

	@Transactional(readOnly = true)
	public List<Assessment> getUserAssessments(Long userId) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
		return assessmentRepository.findAllByUserOrderByCreatedAtDesc(user);
	}

	BigDecimal calculateMaxSellPercentage(BigDecimal scorePercentage) {
		if (scorePercentage.compareTo(new BigDecimal("50")) < 0) return BigDecimal.ZERO;
		if (scorePercentage.compareTo(new BigDecimal("70")) < 0) return new BigDecimal("25");
		if (scorePercentage.compareTo(new BigDecimal("85")) < 0) return new BigDecimal("50");
		if (scorePercentage.compareTo(new BigDecimal("95")) < 0) return new BigDecimal("75");
		return new BigDecimal("100");
	}

	private void validateScore(BigDecimal scorePercentage) {
		if (scorePercentage == null || scorePercentage.compareTo(BigDecimal.ZERO) < 0
				|| scorePercentage.compareTo(new BigDecimal("100")) > 0) {
			throw new IllegalArgumentException("Score percentage must be between 0 and 100");
		}
	}
}