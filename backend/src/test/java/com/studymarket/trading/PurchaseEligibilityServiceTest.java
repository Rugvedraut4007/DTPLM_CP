package com.studymarket.trading;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.studymarket.asset.Asset;
import com.studymarket.asset.AssetRepository;
import com.studymarket.study.StudySession;
import com.studymarket.study.StudySessionRepository;
import com.studymarket.user.User;
import com.studymarket.user.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PurchaseEligibilityServiceTest {

	private static final Instant START = Instant.parse("2026-01-01T10:00:00Z");

	private StudySessionRepository studySessionRepository;
	private AssetRepository assetRepository;
	private UserRepository userRepository;
	private PurchaseEligibilityService service;
	private User user;
	private Asset asset;

	@BeforeEach
	void setUp() {
		studySessionRepository = mock(StudySessionRepository.class);
		assetRepository = mock(AssetRepository.class);
		userRepository = mock(UserRepository.class);
		service = new PurchaseEligibilityService(studySessionRepository, assetRepository, userRepository);
		user = new User("alice", "alice@example.com");
		asset = mock(Asset.class);
		when(asset.getId()).thenReturn(2L);
		when(asset.getSymbol()).thenReturn("DSA");
		when(asset.getName()).thenReturn("Data Structures & Algorithms");
		when(asset.getRequiredStudyMinutes()).thenReturn(15);
		when(studySessionRepository.findAllByUserAndAssetAndStatus(user, asset, "COMPLETED"))
				.thenReturn(List.of());
	}

	private StudySession completedSession(long seconds) {
		StudySession session = new StudySession(user, asset, START);
		session.complete(START.plusSeconds(seconds));
		return session;
	}

	@Test
	void subjectIsLockedUntilItsStudyMinutesAreDone() {
		PurchaseEligibilityService.Eligibility eligibility = service.forAsset(user, asset);

		assertThat(eligibility.requiredStudyMinutes()).isEqualTo(15);
		assertThat(eligibility.studiedMinutes()).isZero();
		assertThat(eligibility.remainingMinutes()).isEqualTo(15);
		assertThat(eligibility.unlocked()).isFalse();
	}

	@Test
	void completingTheRequiredMinutesUnlocksTheSubject() {
		when(studySessionRepository.findAllByUserAndAssetAndStatus(user, asset, "COMPLETED"))
				.thenReturn(List.of(completedSession(15 * 60)));

		PurchaseEligibilityService.Eligibility eligibility = service.forAsset(user, asset);

		assertThat(eligibility.studiedMinutes()).isEqualTo(15);
		assertThat(eligibility.remainingMinutes()).isZero();
		assertThat(eligibility.unlocked()).isTrue();
	}

	@Test
	void studyMinutesAccumulateAcrossSessions() {
		when(studySessionRepository.findAllByUserAndAssetAndStatus(user, asset, "COMPLETED"))
				.thenReturn(List.of(completedSession(10 * 60), completedSession(5 * 60)));

		assertThat(service.forAsset(user, asset).unlocked()).isTrue();
	}

	@Test
	void activeSessionsAndNullDurationsDoNotCount() {
		when(studySessionRepository.findAllByUserAndAssetAndStatus(user, asset, "COMPLETED"))
				.thenReturn(List.of(completedSession(9 * 60)));

		PurchaseEligibilityService.Eligibility eligibility = service.forAsset(user, asset);

		assertThat(eligibility.studiedMinutes()).isEqualTo(9);
		assertThat(eligibility.unlocked()).isFalse();
		assertThat(eligibility.remainingMinutes()).isEqualTo(6);
	}

	@Test
	void requireUnlockedRejectsWithTheMissingMinutes() {
		when(studySessionRepository.findAllByUserAndAssetAndStatus(user, asset, "COMPLETED"))
				.thenReturn(List.of(completedSession(3 * 60)));

		assertThatThrownBy(() -> service.requireUnlocked(user, asset))
				.isInstanceOf(StudyRequiredException.class)
				.hasMessageContaining("DSA")
				.hasMessageContaining("12 more to unlock")
				.satisfies(exception -> {
					PurchaseEligibilityService.Eligibility eligibility =
							((StudyRequiredException) exception).getEligibility();
					assertThat(eligibility.assetId()).isEqualTo(2L);
					assertThat(eligibility.symbol()).isEqualTo("DSA");
					assertThat(eligibility.requiredStudyMinutes()).isEqualTo(15);
					assertThat(eligibility.studiedMinutes()).isEqualTo(3);
					assertThat(eligibility.remainingMinutes()).isEqualTo(12);
				});
	}

	@Test
	void requireUnlockedAcceptsAStudiedSubject() {
		when(studySessionRepository.findAllByUserAndAssetAndStatus(user, asset, "COMPLETED"))
				.thenReturn(List.of(completedSession(20 * 60)));

		assertThatCode(() -> service.requireUnlocked(user, asset)).doesNotThrowAnyException();
	}

	@Test
	void forUserReportsEverySubjectWithItsStudiedMinutes() {
		when(userRepository.findById(1L)).thenReturn(Optional.of(user));
		when(assetRepository.findAll()).thenReturn(List.of(asset));
		when(studySessionRepository.findAllByUserAndStatus(user, "COMPLETED"))
				.thenReturn(List.of(completedSession(16 * 60)));

		List<PurchaseEligibilityService.Eligibility> eligibility = service.forUser(1L);

		assertThat(eligibility).hasSize(1);
		assertThat(eligibility.get(0).symbol()).isEqualTo("DSA");
		assertThat(eligibility.get(0).studiedMinutes()).isEqualTo(16);
		assertThat(eligibility.get(0).unlocked()).isTrue();
	}

	@Test
	void forUserRejectsUnknownUsers() {
		when(userRepository.findById(9L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.forUser(9L))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessageContaining("User not found");
	}
}
