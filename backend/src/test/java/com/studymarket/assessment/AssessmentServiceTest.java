package com.studymarket.assessment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.studymarket.asset.Asset;
import com.studymarket.asset.AssetRepository;
import com.studymarket.market.MarketActivityService;
import com.studymarket.portfolio.PositionRepository;
import com.studymarket.trading.TradeRepository;
import com.studymarket.user.User;
import com.studymarket.user.UserRepository;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AssessmentServiceTest {

	private AssessmentRepository assessmentRepository;
	private UserRepository userRepository;
	private AssetRepository assetRepository;
	private AssessmentService assessmentService;
	private User user;
	private Asset asset;

	@BeforeEach
	void setUp() {
		assessmentRepository = mock(AssessmentRepository.class);
		userRepository = mock(UserRepository.class);
		assetRepository = mock(AssetRepository.class);
		assessmentService = new AssessmentService(assessmentRepository, userRepository, assetRepository);
		user = new User("alice", "alice@example.com");
		asset = mock(Asset.class);
		when(userRepository.findById(1L)).thenReturn(Optional.of(user));
		when(assetRepository.findById(2L)).thenReturn(Optional.of(asset));
		when(assessmentRepository.save(any(Assessment.class))).thenAnswer(invocation -> invocation.getArgument(0));
	}

	@Test
	void scoreBoundariesCalculateEligibility() {
		assertEligibility("40", "0");
		assertEligibility("50", "25");
		assertEligibility("69.99", "25");
		assertEligibility("70", "50");
		assertEligibility("84.99", "50");
		assertEligibility("85", "75");
		assertEligibility("94.99", "75");
		assertEligibility("95", "100");
		assertEligibility("100", "100");
	}

	@Test
	void invalidScoresAreRejected() {
		assertThatThrownBy(() -> assessmentService.createAssessment(1L, 2L, new BigDecimal("-0.01")))
				.isInstanceOf(IllegalArgumentException.class);
		assertThatThrownBy(() -> assessmentService.createAssessment(1L, 2L, new BigDecimal("100.01")))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void unknownUserAndAssetAreRejected() {
		when(userRepository.findById(9L)).thenReturn(Optional.empty());
		assertThatThrownBy(() -> assessmentService.createAssessment(9L, 2L, new BigDecimal("86")))
				.isInstanceOf(IllegalArgumentException.class);

		when(assetRepository.findById(9L)).thenReturn(Optional.empty());
		assertThatThrownBy(() -> assessmentService.createAssessment(1L, 9L, new BigDecimal("86")))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void assessmentOnlyStoresKnowledgeResult() {
		BigDecimal startingBalance = user.getSimulatedBtcBalance();
		Assessment assessment = assessmentService.createAssessment(1L, 2L, new BigDecimal("86"));

		assertThat(assessment.getScorePercentage()).isEqualByComparingTo("86");
		assertThat(assessment.getMaxSellPercentage()).isEqualByComparingTo("75");
		assertThat(assessment.getCreatedAt()).isNull();
		assertThat(user.getSimulatedBtcBalance()).isEqualByComparingTo(startingBalance);
		verify(assessmentRepository).save(assessment);
	}

	private void assertEligibility(String score, String eligibility) {
		Assessment assessment = assessmentService.createAssessment(1L, 2L, new BigDecimal(score));
		assertThat(assessment.getMaxSellPercentage()).isEqualByComparingTo(eligibility);
	}
}