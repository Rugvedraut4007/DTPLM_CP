package com.studymarket.trading;

import com.studymarket.asset.Asset;
import com.studymarket.asset.AssetRepository;
import com.studymarket.study.StudySession;
import com.studymarket.study.StudySessionRepository;
import com.studymarket.user.User;
import com.studymarket.user.UserRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Learning unlocks buying.
 *
 * <p>A student may only buy a subject asset after completing that subject's
 * required study minutes. Completed study sessions for the subject are summed,
 * so the requirement can be finished in one sitting or across several sessions,
 * and it stays unlocked once reached.
 */
@Service
public class PurchaseEligibilityService {

	private final StudySessionRepository studySessionRepository;
	private final AssetRepository assetRepository;
	private final UserRepository userRepository;

	public PurchaseEligibilityService(StudySessionRepository studySessionRepository, AssetRepository assetRepository,
			UserRepository userRepository) {
		this.studySessionRepository = studySessionRepository;
		this.assetRepository = assetRepository;
		this.userRepository = userRepository;
	}

	/** eligibility of one subject for one student */
	@Transactional(readOnly = true)
	public Eligibility forAsset(User user, Asset asset) {
		return Eligibility.of(asset, studiedMinutes(user, asset));
	}

	/** eligibility for every listed subject — what the market and trade screens render */
	@Transactional(readOnly = true)
	public List<Eligibility> forUser(Long userId) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
		Map<Long, Integer> studiedByAsset = studiedMinutesByAsset(user);
		List<Eligibility> result = new ArrayList<>();
		for (Asset asset : assetRepository.findAll()) {
			result.add(Eligibility.of(asset, studiedByAsset.getOrDefault(asset.getId(), 0)));
		}
		return result;
	}

	/** throws when the student has not studied this subject enough to buy it */
	public void requireUnlocked(User user, Asset asset) {
		Eligibility eligibility = forAsset(user, asset);
		if (!eligibility.unlocked()) {
			throw new StudyRequiredException(eligibility);
		}
	}

	private int studiedMinutes(User user, Asset asset) {
		long seconds = studySessionRepository.findAllByUserAndAssetAndStatus(user, asset, "COMPLETED").stream()
				.mapToLong(PurchaseEligibilityService::secondsOf)
				.sum();
		return (int) (seconds / 60);
	}

	private Map<Long, Integer> studiedMinutesByAsset(User user) {
		Map<Long, Long> secondsByAsset = new LinkedHashMap<>();
		for (StudySession session : studySessionRepository.findAllByUserAndStatus(user, "COMPLETED")) {
			Long assetId = session.getAsset().getId();
			secondsByAsset.merge(assetId, secondsOf(session), Long::sum);
		}
		Map<Long, Integer> minutesByAsset = new LinkedHashMap<>();
		secondsByAsset.forEach((assetId, seconds) -> minutesByAsset.put(assetId, (int) (seconds / 60)));
		return minutesByAsset;
	}

	private static long secondsOf(StudySession session) {
		return session.getDurationSeconds() == null ? 0L : session.getDurationSeconds();
	}

	/** what a student has studied on a subject versus what buying it requires */
	public record Eligibility(Long assetId, String symbol, String name, int requiredStudyMinutes, int studiedMinutes,
			int remainingMinutes, boolean unlocked) {

		public static Eligibility of(Asset asset, int studiedMinutes) {
			int requiredMinutes = asset.getRequiredStudyMinutes();
			int studied = Math.max(0, studiedMinutes);
			return new Eligibility(asset.getId(), asset.getSymbol(), asset.getName(), requiredMinutes, studied,
					Math.max(0, requiredMinutes - studied), studied >= requiredMinutes);
		}
	}
}
