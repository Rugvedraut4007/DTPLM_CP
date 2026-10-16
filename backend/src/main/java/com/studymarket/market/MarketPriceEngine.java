package com.studymarket.market;

import com.studymarket.asset.Asset;
import com.studymarket.asset.AssetRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MarketPriceEngine {
	private static final BigDecimal TEN = BigDecimal.TEN;
	private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
	private static final BigDecimal MAX_MOVEMENT = BigDecimal.valueOf(5);
	private static final int PRICE_SCALE = 4;

	private final AssetRepository assetRepository;
	private final MarketActivityRepository activityRepository;
	private final AssetPriceHistoryRepository historyRepository;
	private final Clock clock;

	public MarketPriceEngine(AssetRepository assetRepository, MarketActivityRepository activityRepository,
			AssetPriceHistoryRepository historyRepository, Clock clock) {
		this.assetRepository = assetRepository;
		this.activityRepository = activityRepository;
		this.historyRepository = historyRepository;
		this.clock = clock;
	}

	@Transactional
	public List<AssetPriceHistory> process(LocalDate activityDate) {
		return assetRepository.findAllByStatus("ACTIVE").stream()
				.map(asset -> processAsset(asset, activityDate))
				.toList();
	}

	private AssetPriceHistory processAsset(Asset asset, LocalDate activityDate) {
		Optional<MarketActivity> activity = activityRepository.findByAssetAndActivityDate(asset, activityDate);
		PriceCalculation calculation = calculate(asset, activity.orElse(null));
		asset.updateCurrentPrice(calculation.newPrice());
		assetRepository.save(asset);
		AssetPriceHistory history = new AssetPriceHistory(asset, calculation.newPrice(), Instant.now(clock),
				calculation.marketScore(), calculation.priceChangePercent());
		return historyRepository.save(history);
	}

	PriceCalculation calculate(Asset asset, MarketActivity activity) {
		BigDecimal studyMinutes = activity == null ? BigDecimal.ZERO : BigDecimal.valueOf(activity.getStudyMinutes());
		BigDecimal activeStudents = activity == null ? BigDecimal.ZERO : BigDecimal.valueOf(activity.getActiveStudents());
		BigDecimal completedGoals = activity == null ? BigDecimal.ZERO : BigDecimal.valueOf(activity.getCompletedGoals());
		BigDecimal buyVolume = activity == null ? BigDecimal.ZERO : activity.getBuyVolume();
		BigDecimal studyScore = bounded(studyMinutes.divide(BigDecimal.valueOf(60), 8, RoundingMode.HALF_UP));
		BigDecimal participationScore = bounded(activeStudents.divide(BigDecimal.TEN, 8, RoundingMode.HALF_UP));
		BigDecimal goalScore = bounded(completedGoals.divide(BigDecimal.valueOf(5), 8, RoundingMode.HALF_UP));
		BigDecimal buyScore = bounded(buyVolume.divide(new BigDecimal("0.1000"), 8, RoundingMode.HALF_UP));
		BigDecimal score = studyScore.multiply(new BigDecimal("0.40"))
				.add(participationScore.multiply(new BigDecimal("0.25")))
				.add(goalScore.multiply(new BigDecimal("0.15")))
				.add(buyScore.multiply(new BigDecimal("0.20")));
		BigDecimal change = score.subtract(new BigDecimal("5.0"))
				.multiply(new BigDecimal("0.5"))
				.max(MAX_MOVEMENT.negate()).min(MAX_MOVEMENT);
		BigDecimal multiplier = BigDecimal.ONE.add(change.divide(HUNDRED, 8, RoundingMode.HALF_UP));
		BigDecimal newPrice = asset.getCurrentPrice().multiply(multiplier).setScale(PRICE_SCALE, RoundingMode.HALF_UP);
		if (newPrice.signum() <= 0) {
			newPrice = new BigDecimal("0.0001");
		}
		return new PriceCalculation(score.setScale(4, RoundingMode.HALF_UP), change.setScale(4, RoundingMode.HALF_UP), newPrice);
	}

	private BigDecimal bounded(BigDecimal value) { return value.max(BigDecimal.ZERO).min(TEN); }

	public record PriceCalculation(BigDecimal marketScore, BigDecimal priceChangePercent, BigDecimal newPrice) { }
}