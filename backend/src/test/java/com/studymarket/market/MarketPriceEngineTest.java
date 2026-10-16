package com.studymarket.market;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.studymarket.asset.Asset;
import com.studymarket.asset.AssetRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MarketPriceEngineTest {

	private AssetRepository assetRepository;
	private MarketActivityRepository activityRepository;
	private AssetPriceHistoryRepository historyRepository;
	private MarketPriceEngine engine;
	private Asset asset;

	@BeforeEach
	void setUp() {
		assetRepository = mock(AssetRepository.class);
		activityRepository = mock(MarketActivityRepository.class);
		historyRepository = mock(AssetPriceHistoryRepository.class);
		engine = new MarketPriceEngine(assetRepository, activityRepository, historyRepository,
				Clock.fixed(Instant.parse("2026-09-21T12:00:00Z"), ZoneOffset.UTC));
		asset = mock(Asset.class);
		when(asset.getCurrentPrice()).thenReturn(new BigDecimal("0.0500"));
		when(assetRepository.findAllByStatus("ACTIVE")).thenReturn(List.of(asset));
		when(assetRepository.save(any(Asset.class))).thenReturn(asset);
		when(historyRepository.save(any(AssetPriceHistory.class)))
				.thenAnswer(invocation -> invocation.getArgument(0));
	}

	@Test
	void noActivityCreatesNegativeBaselineMovement() {
		when(activityRepository.findByAssetAndActivityDate(asset, LocalDate.of(2026, 9, 21)))
				.thenReturn(Optional.empty());

		AssetPriceHistory history = engine.process(LocalDate.of(2026, 9, 21)).getFirst();

		assertThat(history.getMarketScore()).isEqualByComparingTo("0.0000");
		assertThat(history.getPriceChangePercent()).isEqualByComparingTo("-2.5000");
		assertThat(history.getPrice()).isEqualByComparingTo("0.0488");
	}

	@Test
	void moderateActivityProducesExpectedMovement() {
		MarketActivity activity = activity();
		activity.addStudyMinutes(300);
		activity.setActiveStudents(50);
		activity.addBuy(new BigDecimal("0.0500"));
		when(activityRepository.findByAssetAndActivityDate(asset, LocalDate.of(2026, 9, 21)))
				.thenReturn(Optional.of(activity));

		AssetPriceHistory history = engine.process(LocalDate.of(2026, 9, 21)).getFirst();

		assertThat(history.getMarketScore()).isEqualByComparingTo("3.3500");
		assertThat(history.getPriceChangePercent()).isEqualByComparingTo("-0.8250");
		assertThat(history.getPrice()).isEqualByComparingTo("0.0496");
	}

	@Test
	void highActivityProducesPositiveMovementAndIsBounded() {
		MarketActivity activity = activity();
		activity.addStudyMinutes(6000);
		activity.setActiveStudents(1000);
		activity.addBuy(new BigDecimal("1.0000"));
		when(activityRepository.findByAssetAndActivityDate(asset, LocalDate.of(2026, 9, 21)))
				.thenReturn(Optional.of(activity));

		AssetPriceHistory history = engine.process(LocalDate.of(2026, 9, 21)).getFirst();

		assertThat(history.getMarketScore()).isEqualByComparingTo("8.5000");
		assertThat(history.getPriceChangePercent()).isEqualByComparingTo("1.7500");
		assertThat(history.getPrice()).isEqualByComparingTo("0.0509");
	}

	@Test
	void priceMovementNeverExceedsFivePercentBounds() {
		MarketActivity activity = activity();
		activity.addStudyMinutes(1_000_000);
		activity.setActiveStudents(1_000_000);
		activity.addBuy(new BigDecimal("1000.0000"));

		MarketPriceEngine.PriceCalculation calculation = engine.calculate(asset, activity);

		assertThat(calculation.priceChangePercent()).isBetween(new BigDecimal("-5"), new BigDecimal("5"));
	}

	@Test
	void currentPriceAndHistoryAreSavedForEachAsset() {
		engine.process(LocalDate.of(2026, 9, 21));

		org.mockito.Mockito.verify(assetRepository).save(asset);
		org.mockito.Mockito.verify(historyRepository).save(any(AssetPriceHistory.class));
	}

	@Test
	void multipleAssetsAreProcessedIndependently() {
		Asset secondAsset = mock(Asset.class);
		when(secondAsset.getCurrentPrice()).thenReturn(new BigDecimal("0.1000"));
		when(assetRepository.findAllByStatus("ACTIVE")).thenReturn(List.of(asset, secondAsset));
		when(activityRepository.findByAssetAndActivityDate(any(), any())).thenReturn(Optional.empty());
		when(assetRepository.save(any(Asset.class))).thenAnswer(invocation -> invocation.getArgument(0));

		List<AssetPriceHistory> histories = engine.process(LocalDate.of(2026, 9, 21));

		assertThat(histories).hasSize(2);
		assertThat(histories.get(0).getPrice()).isEqualByComparingTo("0.0488");
		assertThat(histories.get(1).getPrice()).isEqualByComparingTo("0.0975");
	}

	@Test
	void priceNeverBecomesZeroOrNegative() {
		when(asset.getCurrentPrice()).thenReturn(new BigDecimal("0.0001"));

		AssetPriceHistory history = engine.process(LocalDate.of(2026, 9, 21)).getFirst();

		assertThat(history.getPrice()).isPositive();
	}

	private MarketActivity activity() {
		return new MarketActivity(asset, LocalDate.of(2026, 9, 21));
	}
}