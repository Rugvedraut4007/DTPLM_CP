package com.studymarket.market;

import com.studymarket.asset.Asset;
import com.studymarket.asset.AssetRepository;
import com.studymarket.study.StudySession;
import com.studymarket.study.StudySessionRepository;
import com.studymarket.trading.Trade;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class MarketActivityService {
	private final MarketActivityRepository activityRepository;
	private final StudySessionRepository sessionRepository;
	private final AssetRepository assetRepository;
	private final Clock clock;

	public MarketActivityService(MarketActivityRepository activityRepository, StudySessionRepository sessionRepository,
			AssetRepository assetRepository, Clock clock) {
		this.activityRepository = activityRepository;
		this.sessionRepository = sessionRepository;
		this.assetRepository = assetRepository;
		this.clock = clock;
	}

	public MarketActivity recordStudy(StudySession session) {
		LocalDate date = session.getEndedAt().atZone(clock.getZone()).toLocalDate();
		MarketActivity activity = activityRepository.findByAssetAndActivityDate(session.getAsset(), date)
				.orElseGet(() -> new MarketActivity(session.getAsset(), date));
		activity.addStudyMinutes(session.getDurationSeconds() / 60);
		Set<Long> students = sessionRepository.findAllByAssetAndStatus(session.getAsset(), "COMPLETED").stream()
				.filter(completed -> completed.getEndedAt() != null
						&& completed.getEndedAt().atZone(clock.getZone()).toLocalDate().equals(date))
				.map(completed -> completed.getUser().getId())
				.collect(Collectors.toSet());
		students.add(session.getUser().getId());
		activity.setActiveStudents(students.size());
		return activityRepository.save(activity);
	}

	public MarketActivity recordBuy(Trade trade) {
		LocalDate date = LocalDate.now(clock);
		MarketActivity activity = activityRepository.findByAssetAndActivityDate(trade.getAsset(), date)
				.orElseGet(() -> new MarketActivity(trade.getAsset(), date));
		activity.addBuy(trade.getTotalValue());
		return activityRepository.save(activity);
	}

	public MarketActivity recordSell(Trade trade) {
		LocalDate date = LocalDate.now(clock);
		MarketActivity activity = activityRepository.findByAssetAndActivityDate(trade.getAsset(), date)
				.orElseGet(() -> new MarketActivity(trade.getAsset(), date));
		activity.addSell(trade.getTotalValue());
		return activityRepository.save(activity);
	}

	public List<MarketActivity> getRecent(Long assetId) {
		Asset asset = assetRepository.findById(assetId)
				.orElseThrow(() -> new IllegalArgumentException("Asset not found: " + assetId));
		return activityRepository.findTop30ByAssetOrderByActivityDateDesc(asset);
	}

	public List<MarketActivity> getToday() {
		LocalDate date = LocalDate.now(clock);
		List<MarketActivity> existing = activityRepository.findByActivityDateOrderByAssetIdAsc(date);
		return assetRepository.findAllByStatus("ACTIVE").stream()
				.map(asset -> existing.stream()
						.filter(activity -> activity.getAsset().getId().equals(asset.getId()))
						.findFirst()
						.orElseGet(() -> new MarketActivity(asset, date)))
				.toList();
	}
}