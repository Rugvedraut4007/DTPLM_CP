package com.studymarket.stats;

import com.studymarket.study.AssetStudyProgressRepository;
import com.studymarket.study.StudySession;
import com.studymarket.study.StudySessionRepository;
import com.studymarket.trading.Trade;
import com.studymarket.trading.TradeRepository;
import com.studymarket.user.User;
import com.studymarket.user.UserRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudentStatsService {
	private final UserRepository userRepository;
	private final StudySessionRepository sessionRepository;
	private final AssetStudyProgressRepository progressRepository;
	private final TradeRepository tradeRepository;
	private final Clock clock;

	public StudentStatsService(UserRepository userRepository, StudySessionRepository sessionRepository,
			AssetStudyProgressRepository progressRepository, TradeRepository tradeRepository, Clock clock) {
		this.userRepository = userRepository;
		this.sessionRepository = sessionRepository;
		this.progressRepository = progressRepository;
		this.tradeRepository = tradeRepository;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public StudentStats getStats(Long userId) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
		List<StudySession> sessions = sessionRepository.findAllByUserAndStatus(user, "COMPLETED");
		long totalSeconds = sessions.stream().mapToLong(session -> session.getDurationSeconds() == null ? 0L : session.getDurationSeconds()).sum();
		Map<LocalDate, Long> dailySeconds = new HashMap<>();
		for (StudySession session : sessions) {
			if (session.getEndedAt() != null) {
				LocalDate date = session.getEndedAt().atZone(clock.getZone()).toLocalDate();
				dailySeconds.merge(date, session.getDurationSeconds() == null ? 0L : session.getDurationSeconds(), Long::sum);
			}
		}
		Set<LocalDate> completedGoalDates = new HashSet<>();
		dailySeconds.forEach((date, seconds) -> { if (seconds / 60 >= user.getDailyGoalMinutes()) completedGoalDates.add(date); });
		List<Trade> trades = tradeRepository.findAllByUser(user);
		return new StudentStats(user.getId(), (int) (totalSeconds / 60), sessions.size(), user.getXp(),
				user.getCurrentStreak(), user.getLongestStreak(), completedGoalDates.size(),
				(int) progressRepository.findAllByUserOrderByUpdatedAtDesc(user).stream().filter(p -> p.getCompletedMinutes() > 0).count(),
				(int) progressRepository.findAllByUserOrderByUpdatedAtDesc(user).stream()
						.filter(p -> p.getProgressPercentage().compareTo(java.math.BigDecimal.valueOf(100)) >= 0).count(),
				trades.size(), (int) trades.stream().filter(t -> "BUY".equals(t.getSide())).count(),
				(int) trades.stream().filter(t -> "SELL".equals(t.getSide())).count());
	}

	public record StudentStats(Long userId, int totalStudyMinutes, int totalStudySessions, long totalXp,
			int currentStreak, int longestStreak, int goalsCompleted, int assetsStudied, int masteredAssets,
			int totalTrades, int buyTrades, int sellTrades) { }
}