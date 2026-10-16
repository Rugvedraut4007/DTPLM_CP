package com.studymarket.challenge;

import com.studymarket.study.AssetStudyProgress;
import com.studymarket.study.AssetStudyProgressRepository;
import com.studymarket.study.StudySession;
import com.studymarket.study.StudySessionRepository;
import com.studymarket.user.User;
import com.studymarket.user.UserRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class AchievementService {

	private final AchievementRepository achievementRepository;
	private final UserAchievementRepository userAchievementRepository;
	private final StudySessionRepository studySessionRepository;
	private final AssetStudyProgressRepository progressRepository;
	private final UserRepository userRepository;
	private final Clock clock;

	public AchievementService(AchievementRepository achievementRepository,
			UserAchievementRepository userAchievementRepository, StudySessionRepository studySessionRepository,
			AssetStudyProgressRepository progressRepository, UserRepository userRepository, Clock clock) {
		this.achievementRepository = achievementRepository;
		this.userAchievementRepository = userAchievementRepository;
		this.studySessionRepository = studySessionRepository;
		this.progressRepository = progressRepository;
		this.userRepository = userRepository;
		this.clock = clock;
	}

	public void evaluate(User user, StudySession completedSession) {
		List<StudySession> sessions = studySessionRepository.findAllByUserAndStatus(user, "COMPLETED");
		if (sessions.stream().noneMatch(session -> session == completedSession)) {
			sessions = new java.util.ArrayList<>(sessions);
			sessions.add(completedSession);
		}
		long completedMinutes = sessions.stream()
				.mapToLong(session -> session.getDurationSeconds() == null ? 0L : session.getDurationSeconds() / 60)
				.sum();
		Set<LocalDate> goalDates = completedGoalDates(user, sessions);
		boolean masteredAsset = progressRepository.findAllByUserOrderByUpdatedAtDesc(user).stream()
				.anyMatch(progress -> progress.getProgressPercentage().compareTo(java.math.BigDecimal.valueOf(100)) >= 0);

		unlockIfEligible(user, "FIRST_SESSION", !sessions.isEmpty());
		unlockIfEligible(user, "FIVE_HOURS", completedMinutes >= 300);
		unlockIfEligible(user, "SEVEN_DAY_STREAK", user.getCurrentStreak() >= 7);
		unlockIfEligible(user, "MASTERED_ASSET", masteredAsset);
		unlockIfEligible(user, "SEVEN_GOALS", goalDates.size() >= 7);
	}

	private Set<LocalDate> completedGoalDates(User user, List<StudySession> sessions) {
		Set<LocalDate> dates = new HashSet<>();
		for (StudySession session : sessions) {
			long minutes = sessions.stream()
					.filter(candidate -> isSameDate(candidate.getEndedAt(), session.getEndedAt()))
					.mapToLong(candidate -> candidate.getDurationSeconds() == null ? 0L : candidate.getDurationSeconds() / 60)
					.sum();
			if (minutes >= user.getDailyGoalMinutes()) {
				dates.add(session.getEndedAt().atZone(clock.getZone()).toLocalDate());
			}
		}
		return dates;
	}

	private boolean isSameDate(Instant first, Instant second) {
		return first != null && second != null
				&& first.atZone(clock.getZone()).toLocalDate().equals(second.atZone(clock.getZone()).toLocalDate());
	}

	private void unlockIfEligible(User user, String code, boolean eligible) {
		if (!eligible) {
			return;
		}
		Achievement achievement = achievementRepository.findByCode(code)
				.orElseThrow(() -> new IllegalStateException("Achievement not found: " + code));
		if (!userAchievementRepository.existsByUserAndAchievement(user, achievement)) {
			userAchievementRepository.save(new UserAchievement(user, achievement, Instant.now(clock)));
		}
	}

	public List<Achievement> getAvailableAchievements() {
		return achievementRepository.findAllByOrderByIdAsc();
	}

	public List<UserAchievement> getUserAchievements(Long userId) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
		return userAchievementRepository.findAllByUserOrderByUnlockedAtAsc(user);
	}
}