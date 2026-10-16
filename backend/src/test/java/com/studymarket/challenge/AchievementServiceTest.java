package com.studymarket.challenge;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studymarket.asset.Asset;
import com.studymarket.study.AssetStudyProgress;
import com.studymarket.study.AssetStudyProgressRepository;
import com.studymarket.study.StudySession;
import com.studymarket.study.StudySessionRepository;
import com.studymarket.user.User;
import com.studymarket.user.UserRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AchievementServiceTest {

	private AchievementRepository achievementRepository;
	private UserAchievementRepository userAchievementRepository;
	private StudySessionRepository studySessionRepository;
	private AssetStudyProgressRepository progressRepository;
	private UserRepository userRepository;
	private AchievementService achievementService;
	private User user;
	private Asset asset;
	private Map<String, Achievement> achievements;

	@BeforeEach
	void setUp() {
		achievementRepository = mock(AchievementRepository.class);
		userAchievementRepository = mock(UserAchievementRepository.class);
		studySessionRepository = mock(StudySessionRepository.class);
		progressRepository = mock(AssetStudyProgressRepository.class);
		userRepository = mock(UserRepository.class);
		achievementService = new AchievementService(achievementRepository, userAchievementRepository,
				studySessionRepository, progressRepository, userRepository,
				Clock.fixed(Instant.parse("2026-09-21T12:00:00Z"), ZoneOffset.UTC));
		user = new User("alice", "alice@example.com");
		asset = mock(Asset.class);
		achievements = List.of(
				new Achievement("FIRST_SESSION", "First Step", "Complete your first study session."),
				new Achievement("FIVE_HOURS", "Study Starter", "Complete 5 total hours of study."),
				new Achievement("SEVEN_DAY_STREAK", "Week Warrior", "Reach a 7-day streak."),
				new Achievement("MASTERED_ASSET", "Subject Master", "Reach 100% progress on any asset."),
				new Achievement("SEVEN_GOALS", "Goal Crusher", "Complete the daily goal on 7 different calendar days.")
		).stream().collect(Collectors.toMap(Achievement::getCode, achievement -> achievement));
		when(achievementRepository.findByCode(any(String.class)))
				.thenAnswer(invocation -> Optional.of(achievements.get(invocation.getArgument(0))));
		when(userAchievementRepository.existsByUserAndAchievement(any(User.class), any(Achievement.class)))
				.thenReturn(false);
		when(userAchievementRepository.save(any(UserAchievement.class)))
				.thenAnswer(invocation -> invocation.getArgument(0));
		when(studySessionRepository.findAllByUserAndStatus(user, "COMPLETED")).thenReturn(List.of());
		when(progressRepository.findAllByUserOrderByUpdatedAtDesc(user)).thenReturn(List.of());
	}

	@Test
	void firstCompletedSessionUnlocksFirstSession() {
		achievementService.evaluate(user, completedSession("2026-09-21T11:00:00Z", "2026-09-21T11:30:00Z"));

		verify(userAchievementRepository).save(any(UserAchievement.class));
		verify(achievementRepository).findByCode("FIRST_SESSION");
	}

	@Test
	void firstSessionCannotBeUnlockedTwice() {
		StudySession session = completedSession("2026-09-21T11:00:00Z", "2026-09-21T11:30:00Z");
		when(userAchievementRepository.existsByUserAndAchievement(user, achievements.get("FIRST_SESSION")))
				.thenReturn(false, true);

		achievementService.evaluate(user, session);
		achievementService.evaluate(user, session);

		verify(userAchievementRepository, times(1)).save(any(UserAchievement.class));
	}

	@Test
	void fiveHoursUnlocksFiveHours() {
		achievementService.evaluate(user, completedSession("2026-09-21T07:00:00Z", "2026-09-21T12:00:00Z"));

		verify(achievementRepository).findByCode("FIVE_HOURS");
	}

	@Test
	void sevenDayStreakUnlocksSevenDayStreak() {
		for (int day = 15; day <= 21; day++) {
			user.recordGoalCompletion(LocalDate.of(2026, 9, day));
		}

		achievementService.evaluate(user, completedSession("2026-09-21T11:00:00Z", "2026-09-21T11:01:00Z"));

		verify(achievementRepository).findByCode("SEVEN_DAY_STREAK");
	}

	@Test
	void masteredAssetUnlocksMasteredAsset() {
		AssetStudyProgress progress = new AssetStudyProgress(user, asset);
		progress.addCompletedMinutes(600);
		when(progressRepository.findAllByUserOrderByUpdatedAtDesc(user)).thenReturn(List.of(progress));

		achievementService.evaluate(user, completedSession("2026-09-21T11:00:00Z", "2026-09-21T11:01:00Z"));

		verify(achievementRepository).findByCode("MASTERED_ASSET");
	}

	@Test
	void sevenCompletedGoalDatesUnlockSevenGoals() {
		List<StudySession> previousSessions = java.util.stream.IntStream.rangeClosed(14, 20)
				.mapToObj(day -> completedSession("2026-09-" + day + "T09:00:00Z", "2026-09-" + day + "T09:30:00Z"))
				.toList();
		when(studySessionRepository.findAllByUserAndStatus(user, "COMPLETED")).thenReturn(previousSessions);

		achievementService.evaluate(user, completedSession("2026-09-21T09:00:00Z", "2026-09-21T09:30:00Z"));

		verify(achievementRepository).findByCode("SEVEN_GOALS");
	}

	private StudySession completedSession(String startedAt, String endedAt) {
		StudySession session = new StudySession(user, asset, Instant.parse(startedAt));
		session.complete(Instant.parse(endedAt));
		return session;
	}
}