package com.studymarket.study;

import com.studymarket.asset.Asset;
import com.studymarket.asset.AssetRepository;
import com.studymarket.challenge.AchievementService;
import com.studymarket.challenge.ChallengeService;
import com.studymarket.market.MarketActivityService;
import com.studymarket.user.User;
import com.studymarket.user.UserRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudySessionService {

	private final StudySessionRepository studySessionRepository;
	private final UserRepository userRepository;
	private final AssetRepository assetRepository;
	private final AssetStudyProgressService assetStudyProgressService;
	private final AchievementService achievementService;
	private final MarketActivityService marketActivityService;
	private final Clock clock;
	private final ChallengeService challengeService;

	public StudySessionService(StudySessionRepository studySessionRepository, UserRepository userRepository,
			AssetRepository assetRepository, AssetStudyProgressService assetStudyProgressService,
			AchievementService achievementService, MarketActivityService marketActivityService, Clock clock, ChallengeService challengeService) {
		this.studySessionRepository = studySessionRepository;
		this.userRepository = userRepository;
		this.assetRepository = assetRepository;
		this.assetStudyProgressService = assetStudyProgressService;
		this.achievementService = achievementService;
		this.marketActivityService = marketActivityService;
		this.clock = clock;
		this.challengeService = challengeService;
	}

	@Transactional
	public StudySession start(Long userId, Long assetId) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
		Asset asset = assetRepository.findById(assetId)
				.orElseThrow(() -> new IllegalArgumentException("Asset not found: " + assetId));
		if (studySessionRepository.existsByUserAndStatus(user, "ACTIVE")) {
			throw new IllegalStateException("User already has an active study session");
		}
		return studySessionRepository.save(new StudySession(user, asset, Instant.now(clock)));
	}

	@Transactional
	public StudySession stop(Long sessionId) {
		StudySession session = studySessionRepository.findById(sessionId)
				.orElseThrow(() -> new IllegalArgumentException("Study session not found: " + sessionId));
		if (!"ACTIVE".equals(session.getStatus())) {
			throw new IllegalStateException("Study session is already completed");
		}
		session.complete(Instant.now(clock));
		User user = session.getUser();
		awardXp(session, user);
		updateStreak(user, session);
		assetStudyProgressService.recordCompletedSession(session);
		marketActivityService.recordStudy(session);
		userRepository.save(user);
		StudySession savedSession = studySessionRepository.save(session);
		achievementService.evaluate(user, savedSession);
		challengeService.evaluate(user, savedSession);
		return savedSession;
	}

	private void awardXp(StudySession session, User user) {
		long xpEarned = (session.getDurationSeconds() / 60) * 2;
		user.addXp(xpEarned);
	}

	private void updateStreak(User user, StudySession session) {
		List<StudySession> completedSessions = studySessionRepository.findAllByUserAndStatus(user, "COMPLETED");
		long completedSecondsToday = completedSessions.stream()
				.filter(completed -> isOnDate(completed.getEndedAt(), today()))
				.mapToLong(completed -> completed.getDurationSeconds() == null ? 0L : completed.getDurationSeconds())
				.sum() + session.getDurationSeconds();
		if (completedSecondsToday / 60 >= user.getDailyGoalMinutes()) {
			user.recordGoalCompletion(today());
		}
	}

	private LocalDate today() {
		return LocalDate.now(clock);
	}

	private boolean isOnDate(Instant instant, LocalDate date) {
		return instant != null && instant.atZone(clock.getZone()).toLocalDate().equals(date);
	}

	@Transactional(readOnly = true)
	public List<StudySession> getHistory(Long userId) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
		return studySessionRepository.findAllByUserOrderByStartedAtDesc(user);
	}

	@Transactional(readOnly = true)
	public StudyProgress getTodayProgress(Long userId) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
		long completedSeconds = studySessionRepository.findAllByUserAndStatus(user, "COMPLETED").stream()
				.filter(session -> isOnDate(session.getEndedAt(), today()))
				.mapToLong(session -> session.getDurationSeconds() == null ? 0L : session.getDurationSeconds())
				.sum();
		int completedMinutes = (int) (completedSeconds / 60);
		int remainingMinutes = Math.max(0, user.getDailyGoalMinutes() - completedMinutes);
		return new StudyProgress(today(), user.getDailyGoalMinutes(), completedMinutes, remainingMinutes,
				completedMinutes >= user.getDailyGoalMinutes(), user.getCurrentStreak(), user.getLongestStreak());
	}

	@Transactional
	public User updateDailyGoal(Long userId, int dailyGoalMinutes) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
		user.updateDailyGoalMinutes(dailyGoalMinutes);
		return userRepository.save(user);
	}

	public record StudyProgress(LocalDate date, int dailyGoalMinutes, int completedMinutes, int remainingMinutes,
			boolean goalCompleted, int currentStreak, int longestStreak) {
	}
}