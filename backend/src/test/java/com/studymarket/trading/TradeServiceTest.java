package com.studymarket.trading;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studymarket.asset.Asset;
import com.studymarket.asset.AssetRepository;
import com.studymarket.assessment.Assessment;
import com.studymarket.assessment.AssessmentRepository;
import com.studymarket.trading.PurchaseEligibilityService.Eligibility;
import com.studymarket.portfolio.Position;
import com.studymarket.portfolio.PositionRepository;
import com.studymarket.user.User;
import com.studymarket.user.UserRepository;
import com.studymarket.market.MarketActivityService;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TradeServiceTest {

	private TradeRepository tradeRepository;
	private UserRepository userRepository;
	private AssetRepository assetRepository;
	private PositionRepository positionRepository;
	private MarketActivityService marketActivityService;
	private AssessmentRepository assessmentRepository;
	private PurchaseEligibilityService purchaseEligibilityService;
	private TradeService tradeService;
	private User user;
	private Asset asset;
	private Assessment assessment;

	@BeforeEach
	void setUp() {
		tradeRepository = mock(TradeRepository.class);
		userRepository = mock(UserRepository.class);
		assetRepository = mock(AssetRepository.class);
		positionRepository = mock(PositionRepository.class);
		marketActivityService = mock(MarketActivityService.class);
		assessmentRepository = mock(AssessmentRepository.class);
		purchaseEligibilityService = mock(PurchaseEligibilityService.class);
		tradeService = new TradeService(tradeRepository, userRepository, assetRepository, positionRepository,
				marketActivityService, assessmentRepository, purchaseEligibilityService);
		user = new User("alice", "alice@example.com");
		asset = mock(Asset.class);
		when(userRepository.findById(1L)).thenReturn(Optional.of(user));
		when(assetRepository.findById(2L)).thenReturn(Optional.of(asset));
		when(asset.getCurrentPrice()).thenReturn(new BigDecimal("0.0500"));
		when(positionRepository.findByUserAndAsset(user, asset)).thenReturn(Optional.empty());
		assessment = new Assessment(user, asset, new BigDecimal("86"), new BigDecimal("75"));
		when(assessmentRepository.findTopByUserAndAssetAndRemainingSellPercentageGreaterThanOrderByCreatedAtDesc(
				user, asset, BigDecimal.ZERO)).thenReturn(Optional.of(assessment));
		when(positionRepository.save(any(Position.class))).thenAnswer(invocation -> invocation.getArgument(0));
		when(tradeRepository.save(any(Trade.class))).thenAnswer(invocation -> invocation.getArgument(0));
	}

	@Test
	void successfulFirstBuyDeductsBalanceAndCreatesPosition() {
		TradeService.BuyResult result = tradeService.buy(1L, 2L, new BigDecimal("2"));

		verify(purchaseEligibilityService).requireUnlocked(user, asset);
		assertThat(result.trade().getSide()).isEqualTo("BUY");
		assertThat(result.trade().getTotalValue()).isEqualByComparingTo("0.1000");
		assertThat(result.user().getSimulatedBtcBalance()).isEqualByComparingTo("0.9000");
		assertThat(result.position().getQuantity()).isEqualByComparingTo("2");
		assertThat(result.position().getAverageBuyPrice()).isEqualByComparingTo("0.0500");
	}

	@Test
	void buyIsRejectedUntilTheSubjectIsStudied() {
		org.mockito.Mockito.doThrow(new StudyRequiredException(
				new Eligibility(2L, "DSA", "Data Structures & Algorithms", 15, 3, 12, false)))
				.when(purchaseEligibilityService).requireUnlocked(user, asset);

		assertThatThrownBy(() -> tradeService.buy(1L, 2L, new BigDecimal("2")))
				.isInstanceOf(StudyRequiredException.class)
				.hasMessageContaining("Study required before buying DSA");
		// nothing was charged and no trade was recorded
		assertThat(user.getSimulatedBtcBalance()).isEqualByComparingTo("1.0000");
		verify(tradeRepository, org.mockito.Mockito.never()).save(any(Trade.class));
	}

	@Test
	void buyingIsAllowedOnceTheStudyRequirementIsMet() {
		when(purchaseEligibilityService.forAsset(user, asset)).thenReturn(
				new Eligibility(2L, "DSA", "Data Structures & Algorithms", 15, 15, 0, true));
		org.mockito.Mockito.doCallRealMethod().when(purchaseEligibilityService).requireUnlocked(user, asset);

		TradeService.BuyResult result = tradeService.buy(1L, 2L, new BigDecimal("1"));

		assertThat(result.trade().getSide()).isEqualTo("BUY");
		assertThat(result.user().getSimulatedBtcBalance()).isEqualByComparingTo("0.9500");
	}

	@Test
	void secondBuyUpdatesQuantityAndWeightedAveragePrice() {
		Position existing = new Position(user, asset, new BigDecimal("2"), new BigDecimal("0.0400"));
		when(positionRepository.findByUserAndAsset(user, asset)).thenReturn(Optional.of(existing));

		TradeService.BuyResult result = tradeService.buy(1L, 2L, new BigDecimal("1"));

		assertThat(result.position().getQuantity()).isEqualByComparingTo("3");
		assertThat(result.position().getAverageBuyPrice()).isEqualByComparingTo("0.04333333");
		assertThat(result.user().getSimulatedBtcBalance()).isEqualByComparingTo("0.9500");
	}

	@Test
	void insufficientBalanceIsRejected() {
		assertThatThrownBy(() -> tradeService.buy(1L, 2L, new BigDecimal("21")))
				.isInstanceOf(IllegalStateException.class)
				.hasMessageContaining("Insufficient");
	}

	@Test
	void zeroAndNegativeQuantitiesAreRejected() {
		assertThatThrownBy(() -> tradeService.buy(1L, 2L, BigDecimal.ZERO))
				.isInstanceOf(IllegalArgumentException.class);
		assertThatThrownBy(() -> tradeService.buy(1L, 2L, new BigDecimal("-1")))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void successfulSellCreditsBalanceAndReducesPosition() {
		Position position = new Position(user, asset, new BigDecimal("10"), new BigDecimal("0.0500"));
		when(asset.getCurrentPrice()).thenReturn(new BigDecimal("0.0600"));
		when(positionRepository.findByUserAndAsset(user, asset)).thenReturn(Optional.of(position));

		TradeService.SellResult result = tradeService.sell(1L, 2L, new BigDecimal("4"));

		assertThat(result.trade().getSide()).isEqualTo("SELL");
		assertThat(result.trade().getTotalValue()).isEqualByComparingTo("0.2400");
		assertThat(result.user().getSimulatedBtcBalance()).isEqualByComparingTo("1.2400");
		assertThat(result.position().getQuantity()).isEqualByComparingTo("6");
		assertThat(result.position().getAverageBuyPrice()).isEqualByComparingTo("0.0500");
		assertThat(assessment.getRemainingSellPercentage()).isEqualByComparingTo("35");
		verify(marketActivityService).recordSell(result.trade());
	}

	@Test
	void secondSellUsesCurrentPositionAndRemainingEligibility() {
		Position position = new Position(user, asset, new BigDecimal("20"), new BigDecimal("0.0500"));
		when(asset.getCurrentPrice()).thenReturn(new BigDecimal("0.0600"));
		when(positionRepository.findByUserAndAsset(user, asset)).thenReturn(Optional.of(position));

		tradeService.sell(1L, 2L, new BigDecimal("5"));
		TradeService.SellResult second = tradeService.sell(1L, 2L, new BigDecimal("7.5"));

		assertThat(second.position().getQuantity()).isEqualByComparingTo("7.5");
		assertThat(assessment.getRemainingSellPercentage()).isEqualByComparingTo("0");
	}

	@Test
	void noAssessmentOrZeroEligibilityRejectsSell() {
		when(assessmentRepository.findTopByUserAndAssetAndRemainingSellPercentageGreaterThanOrderByCreatedAtDesc(
				user, asset, BigDecimal.ZERO)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> tradeService.sell(1L, 2L, BigDecimal.ONE))
				.isInstanceOf(IllegalStateException.class);
	}

	@Test
	void fortyPercentAssessmentHasNoSellEligibility() {
		Assessment fortyPercent = new Assessment(user, asset, new BigDecimal("40"), BigDecimal.ZERO);
		when(assessmentRepository.findTopByUserAndAssetAndRemainingSellPercentageGreaterThanOrderByCreatedAtDesc(
				user, asset, BigDecimal.ZERO)).thenReturn(Optional.empty());

		assertThat(fortyPercent.getRemainingSellPercentage()).isZero();
		assertThatThrownBy(() -> tradeService.sell(1L, 2L, BigDecimal.ONE))
				.isInstanceOf(IllegalStateException.class);
	}

	@Test
	void fullEligibilityCanSellEntirePosition() {
		Position position = new Position(user, asset, new BigDecimal("4"), new BigDecimal("0.0500"));
		Assessment fullAssessment = new Assessment(user, asset, new BigDecimal("100"), new BigDecimal("100"));
		when(assessmentRepository.findTopByUserAndAssetAndRemainingSellPercentageGreaterThanOrderByCreatedAtDesc(
				user, asset, BigDecimal.ZERO)).thenReturn(Optional.of(fullAssessment));
		when(positionRepository.findByUserAndAsset(user, asset)).thenReturn(Optional.of(position));

		TradeService.SellResult result = tradeService.sell(1L, 2L, new BigDecimal("4"));

		assertThat(result.position()).isNull();
		assertThat(fullAssessment.getRemainingSellPercentage()).isZero();
	}

	@Test
	void sellingEntirePositionDeletesIt() {
		Position position = new Position(user, asset, new BigDecimal("4"), new BigDecimal("0.0500"));
		when(assessmentRepository.findTopByUserAndAssetAndRemainingSellPercentageGreaterThanOrderByCreatedAtDesc(
				user, asset, BigDecimal.ZERO)).thenReturn(Optional.of(new Assessment(user, asset,
					new BigDecimal("100"), new BigDecimal("100"))));
		when(asset.getCurrentPrice()).thenReturn(new BigDecimal("0.0600"));
		when(positionRepository.findByUserAndAsset(user, asset)).thenReturn(Optional.of(position));

		TradeService.SellResult result = tradeService.sell(1L, 2L, new BigDecimal("4"));

		assertThat(result.position()).isNull();
		verify(positionRepository).delete(position);
	}

	@Test
	void cannotSellMoreThanOwnedOrWithoutPosition() {
		Position position = new Position(user, asset, new BigDecimal("4"), new BigDecimal("0.0500"));
		when(positionRepository.findByUserAndAsset(user, asset)).thenReturn(Optional.of(position));
		assertThatThrownBy(() -> tradeService.sell(1L, 2L, new BigDecimal("5")))
				.isInstanceOf(IllegalStateException.class);

		when(positionRepository.findByUserAndAsset(user, asset)).thenReturn(Optional.empty());
		assertThatThrownBy(() -> tradeService.sell(1L, 2L, new BigDecimal("1")))
				.isInstanceOf(IllegalStateException.class);
	}

	@Test
	void sellRejectsInvalidQuantity() {
		assertThatThrownBy(() -> tradeService.sell(1L, 2L, BigDecimal.ZERO))
				.isInstanceOf(IllegalArgumentException.class);
		assertThatThrownBy(() -> tradeService.sell(1L, 2L, new BigDecimal("-1")))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void positionPnlIsCalculatedWithoutPersistence() {
		when(asset.getCurrentPrice()).thenReturn(new BigDecimal("0.0600"));
		Position position = new Position(user, asset, new BigDecimal("6"), new BigDecimal("0.0500"));

		assertThat(position.getUnrealizedPnl()).isEqualByComparingTo("0.0600");
	}
}