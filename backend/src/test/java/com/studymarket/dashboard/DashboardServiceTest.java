package com.studymarket.dashboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.studymarket.challenge.UserAchievementRepository;
import com.studymarket.challenge.Achievement;
import com.studymarket.challenge.UserAchievement;
import com.studymarket.asset.Asset;
import com.studymarket.portfolio.PortfolioService;
import com.studymarket.study.AssetStudyProgress;
import com.studymarket.study.AssetStudyProgressRepository;
import com.studymarket.study.StudySession;
import com.studymarket.study.StudySessionRepository;
import com.studymarket.trading.TradeRepository;
import com.studymarket.trading.Trade;
import com.studymarket.user.User;
import com.studymarket.user.UserRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class DashboardServiceTest {

	private UserRepository userRepository;
	private StudySessionRepository sessionRepository;
	private AssetStudyProgressRepository progressRepository;
	private UserAchievementRepository achievementRepository;
	private TradeRepository tradeRepository;
	private PortfolioService portfolioService;
	private DashboardService dashboardService;
	private User user;

	@BeforeEach
	void setUp() {
		userRepository = mock(UserRepository.class);
		sessionRepository = mock(StudySessionRepository.class);
		progressRepository = mock(AssetStudyProgressRepository.class);
		achievementRepository = mock(UserAchievementRepository.class);
		tradeRepository = mock(TradeRepository.class);
		portfolioService = mock(PortfolioService.class);
		dashboardService = new DashboardService(userRepository, sessionRepository, progressRepository,
				achievementRepository, tradeRepository, portfolioService,
				Clock.fixed(Instant.parse("2026-09-21T12:00:00Z"), ZoneOffset.UTC));
		user = new User("alice", "alice@example.com");
		when(userRepository.findById(1L)).thenReturn(Optional.of(user));
		when(sessionRepository.findAllByUserAndStatus(user, "COMPLETED")).thenReturn(List.of());
		when(progressRepository.findAllByUserOrderByUpdatedAtDesc(user)).thenReturn(List.of());
		when(achievementRepository.findAllByUserOrderByUnlockedAtAsc(user)).thenReturn(List.of());
		when(tradeRepository.findTop5ByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());
		when(portfolioService.getPortfolio(1L)).thenReturn(new PortfolioService.PortfolioSummary(1L,
				new BigDecimal("1.0000"), List.of(), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
				new BigDecimal("0.00"), new BigDecimal("1.0000")));
	}

	@Test
	void newUserDashboardIsEmptyAndUsesPortfolio() {
		DashboardService.DashboardResponse dashboard = dashboardService.getDashboard(1L);

		assertThat(dashboard.user().username()).isEqualTo("alice");
		assertThat(dashboard.study().todayStudyMinutes()).isZero();
		assertThat(dashboard.assets()).isEmpty();
		assertThat(dashboard.achievements()).isEmpty();
		assertThat(dashboard.recentTrades()).isEmpty();
		assertThat(dashboard.portfolio().totalPortfolioValue()).isEqualByComparingTo("1.0000");
	}

	@Test
	void activeSessionsAreExcludedFromTodayStudyMinutes() {
		StudySession active = new StudySession(user, mock(com.studymarket.asset.Asset.class),
				Instant.parse("2026-09-21T11:00:00Z"));
		when(sessionRepository.findAllByUserAndStatus(user, "COMPLETED")).thenReturn(List.of());

		DashboardService.DashboardResponse dashboard = dashboardService.getDashboard(1L);

		assertThat(active.getStatus()).isEqualTo("ACTIVE");
		assertThat(dashboard.study().todayStudyMinutes()).isZero();
	}

	@Test
	void populatedDashboardAggregatesStudyProgressAchievementsAndTrades() {
		Asset asset = mock(Asset.class);
		when(asset.getId()).thenReturn(1L);
		when(asset.getSymbol()).thenReturn("DSA");
		when(asset.getName()).thenReturn("Data Structures & Algorithms");
		when(asset.getCurrentPrice()).thenReturn(new BigDecimal("0.0525"));
		StudySession session = new StudySession(user, asset, Instant.parse("2026-09-21T11:00:00Z"));
		session.complete(Instant.parse("2026-09-21T11:24:00Z"));
		when(sessionRepository.findAllByUserAndStatus(user, "COMPLETED")).thenReturn(List.of(session));
		AssetStudyProgress progress = new AssetStudyProgress(user, asset);
		progress.addCompletedMinutes(420);
		when(progressRepository.findAllByUserOrderByUpdatedAtDesc(user)).thenReturn(List.of(progress));
		Achievement achievement = new Achievement("FIRST_SESSION", "First Step", "Complete your first study session.");
		when(achievementRepository.findAllByUserOrderByUnlockedAtAsc(user))
				.thenReturn(List.of(new UserAchievement(user, achievement, Instant.parse("2026-09-21T11:30:00Z"))));
		Trade trade = new Trade(user, asset, "BUY", new BigDecimal("2"), new BigDecimal("0.0500"),
				new BigDecimal("0.1000"));
		when(tradeRepository.findTop5ByUserOrderByCreatedAtDesc(user)).thenReturn(List.of(trade));

		DashboardService.DashboardResponse dashboard = dashboardService.getDashboard(1L);

		assertThat(dashboard.study().todayStudyMinutes()).isEqualTo(24);
		assertThat(dashboard.study().todayGoalProgressPercentage()).isEqualByComparingTo("80.00");
		assertThat(dashboard.assets()).hasSize(1);
		assertThat(dashboard.assets().getFirst().completedMinutes()).isEqualTo(420);
		assertThat(dashboard.achievements()).hasSize(1);
		assertThat(dashboard.recentTrades()).hasSize(1);
		verify(userRepository, never()).save(any(User.class));
		verify(tradeRepository).findTop5ByUserOrderByCreatedAtDesc(user);
	}

	@Test
	void unknownUserIsRejected() {
		when(userRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> dashboardService.getDashboard(99L))
				.isInstanceOf(IllegalArgumentException.class);
	}
}