package com.studymarket.market;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.studymarket.asset.Asset;
import com.studymarket.asset.AssetRepository;
import com.studymarket.study.StudySession;
import com.studymarket.study.StudySessionRepository;
import com.studymarket.trading.Trade;
import com.studymarket.user.User;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MarketActivityServiceTest {

	private MarketActivityRepository activityRepository;
	private StudySessionRepository sessionRepository;
	private AssetRepository assetRepository;
	private MarketActivityService activityService;
	private Asset asset;
	private User firstUser;
	private User secondUser;

	@BeforeEach
	void setUp() {
		activityRepository = mock(MarketActivityRepository.class);
		sessionRepository = mock(StudySessionRepository.class);
		assetRepository = mock(AssetRepository.class);
		activityService = new MarketActivityService(activityRepository, sessionRepository, assetRepository,
				Clock.fixed(Instant.parse("2026-09-21T12:00:00Z"), ZoneOffset.UTC));
		asset = mock(Asset.class);
		firstUser = mock(User.class);
		secondUser = mock(User.class);
		when(firstUser.getId()).thenReturn(1L);
		when(secondUser.getId()).thenReturn(2L);
		when(asset.getId()).thenReturn(1L);
		when(activityRepository.findByAssetAndActivityDate(any(), any())).thenReturn(Optional.empty());
		when(activityRepository.save(any(MarketActivity.class))).thenAnswer(invocation -> invocation.getArgument(0));
	}

	@Test
	void completedStudyCreatesAndAccumulatesActivity() {
		StudySession first = session(firstUser, "09:00:00", "09:30:00");
		StudySession second = session(firstUser, "10:00:00", "10:45:00");
		when(sessionRepository.findAllByAssetAndStatus(asset, "COMPLETED")).thenReturn(List.of(first, second));

		MarketActivity activity = activityService.recordStudy(first);
		when(activityRepository.findByAssetAndActivityDate(any(), any())).thenReturn(Optional.of(activity));
		activity = activityService.recordStudy(second);

		assertThat(activity.getStudyMinutes()).isEqualTo(75);
		assertThat(activity.getStudySessions()).isEqualTo(2);
		assertThat(activity.getActiveStudents()).isEqualTo(1);
	}

	@Test
	void differentStudentsCountSeparately() {
		StudySession first = session(firstUser, "09:00:00", "09:30:00");
		StudySession second = session(secondUser, "10:00:00", "10:30:00");
		when(sessionRepository.findAllByAssetAndStatus(asset, "COMPLETED")).thenReturn(List.of(first, second));

		MarketActivity activity = activityService.recordStudy(second);

		assertThat(activity.getActiveStudents()).isEqualTo(2);
	}

	@Test
	void buyIncreasesVolumeAndTransactionCount() {
		Trade trade = new Trade(firstUser, asset, "BUY", new BigDecimal("2"), new BigDecimal("0.05"),
				new BigDecimal("0.1000"));

		MarketActivity activity = activityService.recordBuy(trade);

		assertThat(activity.getBuyVolume()).isEqualByComparingTo("0.1000");
		assertThat(activity.getBuyTransactions()).isEqualTo(1);
	}

	@Test
	void sellIncreasesSellVolumeAndTransactionCount() {
		Trade trade = new Trade(firstUser, asset, "SELL", new BigDecimal("2"), new BigDecimal("0.06"),
				new BigDecimal("0.1200"));

		MarketActivity activity = activityService.recordSell(trade);

		assertThat(activity.getSellVolume()).isEqualByComparingTo("0.1200");
		assertThat(activity.getSellTransactions()).isEqualTo(1);
	}

	@Test
	void recentAndTodayActivityAreRetrieved() {
		MarketActivity activity = new MarketActivity(asset, java.time.LocalDate.of(2026, 9, 21));
		when(assetRepository.findById(1L)).thenReturn(Optional.of(asset));
		when(activityRepository.findTop30ByAssetOrderByActivityDateDesc(asset)).thenReturn(List.of(activity));
		when(activityRepository.findByActivityDateOrderByAssetIdAsc(java.time.LocalDate.of(2026, 9, 21)))
				.thenReturn(List.of(activity));
		when(assetRepository.findAllByStatus("ACTIVE")).thenReturn(List.of(asset));

		assertThat(activityService.getRecent(1L)).containsExactly(activity);
		assertThat(activityService.getToday()).containsExactly(activity);
	}

	private StudySession session(User user, String started, String ended) {
		StudySession session = new StudySession(user, asset, Instant.parse("2026-09-21T" + started + "Z"));
		session.complete(Instant.parse("2026-09-21T" + ended + "Z"));
		return session;
	}
}