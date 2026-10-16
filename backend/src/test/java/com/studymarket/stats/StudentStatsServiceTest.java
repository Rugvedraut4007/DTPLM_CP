package com.studymarket.stats;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.studymarket.study.AssetStudyProgressRepository;
import com.studymarket.study.StudySession;
import com.studymarket.study.StudySessionRepository;
import com.studymarket.trading.Trade;
import com.studymarket.trading.TradeRepository;
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

class StudentStatsServiceTest {
	private UserRepository userRepository;
	private StudySessionRepository sessionRepository;
	private AssetStudyProgressRepository progressRepository;
	private TradeRepository tradeRepository;
	private StudentStatsService service;
	private User user;

	@BeforeEach
	void setUp() {
		userRepository = mock(UserRepository.class);
		sessionRepository = mock(StudySessionRepository.class);
		progressRepository = mock(AssetStudyProgressRepository.class);
		tradeRepository = mock(TradeRepository.class);
		service = new StudentStatsService(userRepository, sessionRepository, progressRepository, tradeRepository,
				Clock.fixed(Instant.parse("2026-09-21T12:00:00Z"), ZoneOffset.UTC));
		user = new User("alice", "alice@example.com");
		user.addXp(840);
		user.recordGoalCompletion(java.time.LocalDate.of(2026, 9, 20));
		when(userRepository.findById(1L)).thenReturn(Optional.of(user));
		when(sessionRepository.findAllByUserAndStatus(user, "COMPLETED")).thenReturn(List.of());
		when(progressRepository.findAllByUserOrderByUpdatedAtDesc(user)).thenReturn(List.of());
		when(tradeRepository.findAllByUser(user)).thenReturn(List.of());
	}

	@Test
	void newUserStatsAreZeroExceptUserValues() {
		StudentStatsService.StudentStats stats = service.getStats(1L);
		assertThat(stats.totalStudyMinutes()).isZero();
		assertThat(stats.totalStudySessions()).isZero();
		assertThat(stats.totalXp()).isEqualTo(840);
		assertThat(stats.totalTrades()).isZero();
	}

	@Test
	void completedSessionsAndTradesAreCountedButActiveIsExcluded() {
		StudySession completed = new StudySession(user, mock(com.studymarket.asset.Asset.class), Instant.parse("2026-09-20T10:00:00Z"));
		completed.complete(Instant.parse("2026-09-20T11:00:00Z"));
		when(sessionRepository.findAllByUserAndStatus(user, "COMPLETED")).thenReturn(List.of(completed));
		Trade buy = new Trade(user, completed.getAsset(), "BUY", BigDecimal.ONE, new BigDecimal("0.05"), new BigDecimal("0.05"));
		Trade sell = new Trade(user, completed.getAsset(), "SELL", BigDecimal.ONE, new BigDecimal("0.06"), new BigDecimal("0.06"));
		when(tradeRepository.findAllByUser(user)).thenReturn(List.of(buy, sell));

		StudentStatsService.StudentStats stats = service.getStats(1L);
		assertThat(stats.totalStudyMinutes()).isEqualTo(60);
		assertThat(stats.totalStudySessions()).isEqualTo(1);
		assertThat(stats.totalTrades()).isEqualTo(2);
		assertThat(stats.buyTrades()).isEqualTo(1);
		assertThat(stats.sellTrades()).isEqualTo(1);
	}

	@Test
	void unknownUserIsRejected() {
		when(userRepository.findById(99L)).thenReturn(Optional.empty());
		assertThatThrownBy(() -> service.getStats(99L)).isInstanceOf(IllegalArgumentException.class);
	}
}