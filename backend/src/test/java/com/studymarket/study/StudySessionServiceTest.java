package com.studymarket.study;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

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
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class StudySessionServiceTest {

	private StudySessionRepository studySessionRepository;
	private UserRepository userRepository;
	private AssetRepository assetRepository;
	private AssetStudyProgressService assetStudyProgressService;
	private AchievementService achievementService;
	private MarketActivityService marketActivityService;
	private ChallengeService challengeService;
	private StudySessionService studySessionService;
	private User user;
	private Asset asset;

	@BeforeEach
	void setUp() {
		studySessionRepository = mock(StudySessionRepository.class);
		userRepository = mock(UserRepository.class);
		assetRepository = mock(AssetRepository.class);
		assetStudyProgressService = mock(AssetStudyProgressService.class);
		achievementService = mock(AchievementService.class);
		marketActivityService = mock(MarketActivityService.class);
		challengeService = mock(ChallengeService.class);
		studySessionService = new StudySessionService(studySessionRepository, userRepository, assetRepository,
				assetStudyProgressService, achievementService,
				marketActivityService,
				Clock.fixed(Instant.parse("2026-09-21T10:00:00Z"), ZoneOffset.UTC), challengeService);
		user = new User("alice", "alice@example.com");
		asset = mock(Asset.class);
		when(userRepository.findById(1L)).thenReturn(Optional.of(user));
		when(assetRepository.findById(2L)).thenReturn(Optional.of(asset));
		when(studySessionRepository.existsByUserAndStatus(user, "ACTIVE")).thenReturn(false);
		when(studySessionRepository.save(any(StudySession.class))).thenAnswer(invocation -> invocation.getArgument(0));
	}

	@Test
	void startCreatesActiveSessionWithServerTimestamp() {
		StudySession session = studySessionService.start(1L, 2L);

		assertThat(session.getStatus()).isEqualTo("ACTIVE");
		assertThat(session.getStartedAt()).isEqualTo(Instant.parse("2026-09-21T10:00:00Z"));
		assertThat(session.getEndedAt()).isNull();
		assertThat(session.getDurationSeconds()).isNull();
		assertThat(user.getXp()).isZero();
		verifyNoInteractions(assetStudyProgressService);
	}

	@Test
	void secondActiveSessionIsRejected() {
		when(studySessionRepository.existsByUserAndStatus(user, "ACTIVE")).thenReturn(true);

		assertThatThrownBy(() -> studySessionService.start(1L, 2L))
				.isInstanceOf(IllegalStateException.class);
	}

	@Test
	void stopCalculatesDurationFromServerTimestamps() {
		StudySession session = new StudySession(user, asset, Instant.parse("2026-09-21T09:58:30Z"));
		when(studySessionRepository.findById(5L)).thenReturn(Optional.of(session));

		StudySession completed = studySessionService.stop(5L);

		assertThat(completed.getStatus()).isEqualTo("COMPLETED");
		assertThat(completed.getEndedAt()).isEqualTo(Instant.parse("2026-09-21T10:00:00Z"));
		assertThat(completed.getDurationSeconds()).isEqualTo(90L);
		assertThat(completed.getXpEarned()).isEqualTo(2L);
		assertThat(user.getXp()).isEqualTo(2L);
	}

	@Test
	void thirtyMinuteSessionAwardsSixtyXp() {
		StudySession session = new StudySession(user, asset, Instant.parse("2026-09-21T09:30:00Z"));
		when(studySessionRepository.findById(6L)).thenReturn(Optional.of(session));

		studySessionService.stop(6L);

		assertThat(session.getXpEarned()).isEqualTo(60L);
		assertThat(user.getXp()).isEqualTo(60L);
	}

	@Test
	void fortyFiveMinuteSessionAwardsNinetyXp() {
		StudySession session = new StudySession(user, asset, Instant.parse("2026-09-21T09:15:00Z"));
		when(studySessionRepository.findById(7L)).thenReturn(Optional.of(session));

		studySessionService.stop(7L);

		assertThat(session.getXpEarned()).isEqualTo(90L);
		assertThat(user.getXp()).isEqualTo(90L);
	}

	@Test
	void partialMinutesAreFloored() {
		StudySession session = new StudySession(user, asset, Instant.parse("2026-09-21T09:58:01Z"));
		when(studySessionRepository.findById(8L)).thenReturn(Optional.of(session));

		studySessionService.stop(8L);

		assertThat(session.getDurationSeconds()).isEqualTo(119L);
		assertThat(session.getXpEarned()).isEqualTo(2L);
		assertThat(user.getXp()).isEqualTo(2L);
	}

	@Test
	void xpIsAddedToExistingTotal() {
		user.addXp(25L);
		StudySession session = new StudySession(user, asset, Instant.parse("2026-09-21T09:30:00Z"));
		when(studySessionRepository.findById(9L)).thenReturn(Optional.of(session));

		studySessionService.stop(9L);

		assertThat(user.getXp()).isEqualTo(85L);
		verify(userRepository).save(user);
	}

	@Test
	void completedSessionCannotBeStoppedAgain() {
		StudySession session = new StudySession(user, asset, Instant.parse("2026-09-21T09:30:00Z"));
		when(studySessionRepository.findById(5L)).thenReturn(Optional.of(session));

		studySessionService.stop(5L);

		assertThatThrownBy(() -> studySessionService.stop(5L))
				.isInstanceOf(IllegalStateException.class);
		assertThat(user.getXp()).isEqualTo(60L);
		verify(assetStudyProgressService, times(1)).recordCompletedSession(session);
	}

	@Test
	void userHistoryIsRetrieved() {
		StudySession session = new StudySession(user, asset, Instant.parse("2026-09-21T09:00:00Z"));
		when(studySessionRepository.findAllByUserOrderByStartedAtDesc(user)).thenReturn(List.of(session));

		assertThat(studySessionService.getHistory(1L)).containsExactly(session);
	}

	@Test
	void todaysProgressCalculatesCompletedMinutesAndRemainingGoal() {
		StudySession completed = completedSession("2026-09-21T09:36:00Z", "2026-09-21T09:54:00Z");
		when(studySessionRepository.findAllByUserAndStatus(user, "COMPLETED")).thenReturn(List.of(completed));

		StudySessionService.StudyProgress progress = studySessionService.getTodayProgress(1L);

		assertThat(progress.date()).isEqualTo(LocalDate.of(2026, 9, 21));
		assertThat(progress.completedMinutes()).isEqualTo(18);
		assertThat(progress.remainingMinutes()).isEqualTo(12);
		assertThat(progress.goalCompleted()).isFalse();
	}

	@Test
	void goalCompletionCreatesFirstStreakDay() {
		StudySession session = new StudySession(user, asset, Instant.parse("2026-09-21T09:30:00Z"));
		when(studySessionRepository.findById(10L)).thenReturn(Optional.of(session));

		studySessionService.stop(10L);

		assertThat(user.getCurrentStreak()).isEqualTo(1);
		assertThat(user.getLongestStreak()).isEqualTo(1);
	}

	@Test
	void consecutiveCompletedDayIncrementsStreak() {
		user.recordGoalCompletion(LocalDate.of(2026, 9, 20));
		StudySession session = new StudySession(user, asset, Instant.parse("2026-09-21T09:30:00Z"));
		when(studySessionRepository.findById(11L)).thenReturn(Optional.of(session));

		studySessionService.stop(11L);

		assertThat(user.getCurrentStreak()).isEqualTo(2);
		assertThat(user.getLongestStreak()).isEqualTo(2);
	}

	@Test
	void missingDayResetsStreak() {
		user.recordGoalCompletion(LocalDate.of(2026, 9, 18));
		user.recordGoalCompletion(LocalDate.of(2026, 9, 19));
		StudySession session = new StudySession(user, asset, Instant.parse("2026-09-21T09:30:00Z"));
		when(studySessionRepository.findById(12L)).thenReturn(Optional.of(session));

		studySessionService.stop(12L);

		assertThat(user.getCurrentStreak()).isEqualTo(1);
		assertThat(user.getLongestStreak()).isEqualTo(2);
	}

	@Test
	void multipleSessionsSameDayDoNotIncrementStreakTwice() {
		StudySession first = new StudySession(user, asset, Instant.parse("2026-09-21T09:00:00Z"));
		StudySession second = new StudySession(user, asset, Instant.parse("2026-09-21T09:30:00Z"));
		when(studySessionRepository.findById(13L)).thenReturn(Optional.of(first));
		when(studySessionRepository.findById(14L)).thenReturn(Optional.of(second));

		studySessionService.stop(13L);
		studySessionService.stop(14L);

		assertThat(user.getCurrentStreak()).isEqualTo(1);
		assertThat(user.getLongestStreak()).isEqualTo(1);
	}

	@Test
	void longestStreakIsPreservedAfterReset() {
		user.recordGoalCompletion(LocalDate.of(2026, 9, 17));
		user.recordGoalCompletion(LocalDate.of(2026, 9, 18));
		user.recordGoalCompletion(LocalDate.of(2026, 9, 19));
		StudySession session = new StudySession(user, asset, Instant.parse("2026-09-21T09:30:00Z"));
		when(studySessionRepository.findById(15L)).thenReturn(Optional.of(session));

		studySessionService.stop(15L);

		assertThat(user.getCurrentStreak()).isEqualTo(1);
		assertThat(user.getLongestStreak()).isEqualTo(3);
	}

	@Test
	void dailyGoalCanBeUpdated() {
		when(userRepository.save(user)).thenReturn(user);

		User updatedUser = studySessionService.updateDailyGoal(1L, 45);

		assertThat(updatedUser.getDailyGoalMinutes()).isEqualTo(45);
	}

	@Test
	void activeSessionsAreNotCountedInProgress() {
		StudySession active = new StudySession(user, asset, Instant.parse("2026-09-21T09:00:00Z"));
		when(studySessionRepository.findAllByUserAndStatus(user, "COMPLETED")).thenReturn(List.of());

		StudySessionService.StudyProgress progress = studySessionService.getTodayProgress(1L);

		assertThat(active.getStatus()).isEqualTo("ACTIVE");
		assertThat(progress.completedMinutes()).isZero();
	}

	private StudySession completedSession(String startedAt, String endedAt) {
		StudySession session = new StudySession(user, asset, Instant.parse(startedAt));
		session.complete(Instant.parse(endedAt));
		return session;
	}
}