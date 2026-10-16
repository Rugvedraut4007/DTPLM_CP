package com.studymarket.dashboard;

import com.studymarket.challenge.UserAchievement;
import com.studymarket.challenge.UserAchievementRepository;
import com.studymarket.portfolio.PortfolioService;
import com.studymarket.study.AssetStudyProgress;
import com.studymarket.study.AssetStudyProgressRepository;
import com.studymarket.study.StudySession;
import com.studymarket.study.StudySessionRepository;
import com.studymarket.trading.Trade;
import com.studymarket.trading.TradeRepository;
import com.studymarket.user.User;
import com.studymarket.user.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {

	private final UserRepository userRepository;
	private final StudySessionRepository studySessionRepository;
	private final AssetStudyProgressRepository progressRepository;
	private final UserAchievementRepository achievementRepository;
	private final TradeRepository tradeRepository;
	private final PortfolioService portfolioService;
	private final Clock clock;

	public DashboardService(UserRepository userRepository, StudySessionRepository studySessionRepository,
			AssetStudyProgressRepository progressRepository, UserAchievementRepository achievementRepository,
			TradeRepository tradeRepository, PortfolioService portfolioService, Clock clock) {
		this.userRepository = userRepository;
		this.studySessionRepository = studySessionRepository;
		this.progressRepository = progressRepository;
		this.achievementRepository = achievementRepository;
		this.tradeRepository = tradeRepository;
		this.portfolioService = portfolioService;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public DashboardResponse getDashboard(Long userId) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
		List<StudySession> todaySessions = studySessionRepository.findAllByUserAndStatus(user, "COMPLETED").stream()
				.filter(session -> session.getEndedAt() != null
						&& session.getEndedAt().atZone(clock.getZone()).toLocalDate().equals(LocalDate.now(clock)))
				.toList();
		int todayMinutes = (int) (todaySessions.stream()
				.mapToLong(session -> session.getDurationSeconds() == null ? 0L : session.getDurationSeconds()).sum() / 60);
		int goal = user.getDailyGoalMinutes();
		BigDecimal goalProgress = goal == 0 ? BigDecimal.ZERO
				: BigDecimal.valueOf(todayMinutes).multiply(BigDecimal.valueOf(100))
						.divide(BigDecimal.valueOf(goal), 2, RoundingMode.HALF_UP);
		List<AssetProgress> assets = progressRepository.findAllByUserOrderByUpdatedAtDesc(user).stream()
				.map(AssetProgress::from).toList();
		List<AchievementSummary> achievements = achievementRepository.findAllByUserOrderByUnlockedAtAsc(user).stream()
				.map(AchievementSummary::from).toList();
		List<TradeSummary> trades = tradeRepository.findTop5ByUserOrderByCreatedAtDesc(user).stream()
				.map(TradeSummary::from).toList();
		return new DashboardResponse(new UserSummary(user.getId(), user.getUsername(), user.getEmail()),
				new StudySummary(user.getXp(), goal, todayMinutes, goalProgress, user.getCurrentStreak(), user.getLongestStreak()),
				assets, achievements, portfolioService.getPortfolio(userId), trades);
	}

	public record DashboardResponse(UserSummary user, StudySummary study, List<AssetProgress> assets,
			List<AchievementSummary> achievements, PortfolioService.PortfolioSummary portfolio,
			List<TradeSummary> recentTrades) { }
	public record UserSummary(Long id, String username, String email) { }
	public record StudySummary(long xp, int dailyGoalMinutes, int todayStudyMinutes,
			BigDecimal todayGoalProgressPercentage, int currentStreak, int longestStreak) { }
	public record AssetProgress(Long assetId, String symbol, String name, BigDecimal currentPrice,
			int completedMinutes, int targetMinutes, BigDecimal progressPercentage) {
		static AssetProgress from(AssetStudyProgress progress) {
			return new AssetProgress(progress.getAsset().getId(), progress.getAsset().getSymbol(),
					progress.getAsset().getName(), progress.getAsset().getCurrentPrice(), progress.getCompletedMinutes(),
					progress.getTargetMinutes(), progress.getProgressPercentage());
		}
	}
	public record AchievementSummary(Long achievementId, String code, String name, String description,
			Instant unlockedAt) {
		static AchievementSummary from(UserAchievement unlocked) {
			return new AchievementSummary(unlocked.getAchievement().getId(), unlocked.getAchievement().getCode(),
					unlocked.getAchievement().getName(), unlocked.getAchievement().getDescription(), unlocked.getUnlockedAt());
		}
	}
	public record TradeSummary(Long tradeId, Long assetId, String symbol, String side, BigDecimal quantity,
			BigDecimal price, BigDecimal totalValue, Instant createdAt) {
		static TradeSummary from(Trade trade) {
			return new TradeSummary(trade.getId(), trade.getAsset().getId(), trade.getAsset().getSymbol(), trade.getSide(),
					trade.getQuantity(), trade.getPrice(), trade.getTotalValue(), trade.getCreatedAt());
		}
	}
}