package com.studymarket.study;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.studymarket.asset.Asset;
import com.studymarket.asset.AssetRepository;
import com.studymarket.user.User;
import com.studymarket.user.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AssetStudyProgressServiceTest {

	private AssetStudyProgressRepository progressRepository;
	private UserRepository userRepository;
	private AssetRepository assetRepository;
	private AssetStudyProgressService progressService;
	private User user;
	private Asset firstAsset;
	private Asset secondAsset;

	@BeforeEach
	void setUp() {
		progressRepository = mock(AssetStudyProgressRepository.class);
		userRepository = mock(UserRepository.class);
		assetRepository = mock(AssetRepository.class);
		progressService = new AssetStudyProgressService(progressRepository, userRepository, assetRepository);
		user = new User("alice", "alice@example.com");
		firstAsset = mock(Asset.class);
		secondAsset = mock(Asset.class);
		when(progressRepository.save(any(AssetStudyProgress.class)))
				.thenAnswer(invocation -> invocation.getArgument(0));
		when(userRepository.findById(1L)).thenReturn(Optional.of(user));
	}

	@Test
	void firstCompletedSessionCreatesDefaultProgress() {
		when(progressRepository.findByUserAndAsset(user, firstAsset)).thenReturn(Optional.empty());
		StudySession session = completedSession(firstAsset, "2026-09-21T09:15:00Z", "2026-09-21T09:45:00Z");

		AssetStudyProgress progress = progressService.recordCompletedSession(session);

		assertThat(progress.getTargetMinutes()).isEqualTo(600);
		assertThat(progress.getCompletedMinutes()).isEqualTo(30);
	}

	@Test
	void completedMinutesAccumulateAcrossSessions() {
		AssetStudyProgress progress = new AssetStudyProgress(user, firstAsset);
		when(progressRepository.findByUserAndAsset(user, firstAsset)).thenReturn(Optional.of(progress));

		progressService.recordCompletedSession(completedSession(firstAsset, "2026-09-21T08:00:00Z", "2026-09-21T08:30:00Z"));
		progressService.recordCompletedSession(completedSession(firstAsset, "2026-09-21T09:00:00Z", "2026-09-21T09:45:00Z"));

		assertThat(progress.getCompletedMinutes()).isEqualTo(75);
	}

	@Test
	void progressPercentageIsCalculatedAndCapped() {
		AssetStudyProgress progress = new AssetStudyProgress(user, firstAsset);
		progress.addCompletedMinutes(320);
		assertThat(progress.getProgressPercentage()).isEqualByComparingTo("53.33");

		progress.addCompletedMinutes(400);
		assertThat(progress.getProgressPercentage()).isEqualByComparingTo("100.00");
	}

	@Test
	void separateAssetsMaintainSeparateProgress() {
		when(progressRepository.findByUserAndAsset(user, firstAsset)).thenReturn(Optional.empty());
		when(progressRepository.findByUserAndAsset(user, secondAsset)).thenReturn(Optional.empty());

		AssetStudyProgress first = progressService.recordCompletedSession(
				completedSession(firstAsset, "2026-09-21T09:00:00Z", "2026-09-21T09:30:00Z"));
		AssetStudyProgress second = progressService.recordCompletedSession(
				completedSession(secondAsset, "2026-09-21T09:00:00Z", "2026-09-21T09:45:00Z"));

		assertThat(first.getCompletedMinutes()).isEqualTo(30);
		assertThat(second.getCompletedMinutes()).isEqualTo(45);
	}

	@Test
	void userProgressCanBeRetrieved() {
		AssetStudyProgress progress = new AssetStudyProgress(user, firstAsset);
		when(progressRepository.findAllByUserOrderByUpdatedAtDesc(user)).thenReturn(List.of(progress));

		assertThat(progressService.getUserProgress(1L)).containsExactly(progress);
	}

	private StudySession completedSession(Asset asset, String startedAt, String endedAt) {
		StudySession session = new StudySession(user, asset, Instant.parse(startedAt));
		session.complete(Instant.parse(endedAt));
		return session;
	}
}