package com.studymarket.portfolio;

import com.studymarket.user.User;
import com.studymarket.user.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PortfolioService {

	private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
	private static final int MONEY_SCALE = 4;
	private static final int PERCENTAGE_SCALE = 2;

	private final UserRepository userRepository;
	private final PositionRepository positionRepository;

	public PortfolioService(UserRepository userRepository, PositionRepository positionRepository) {
		this.userRepository = userRepository;
		this.positionRepository = positionRepository;
	}

	@Transactional(readOnly = true)
	public PortfolioSummary getPortfolio(Long userId) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
		List<PositionSummary> positions = positionRepository.findAllByUser(user).stream()
				.map(PositionSummary::from)
				.toList();
		BigDecimal totalInvestedValue = positions.stream().map(PositionSummary::investedValue)
				.reduce(BigDecimal.ZERO, BigDecimal::add).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
		BigDecimal totalCurrentValue = positions.stream().map(PositionSummary::currentValue)
				.reduce(BigDecimal.ZERO, BigDecimal::add).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
		BigDecimal totalPnl = totalCurrentValue.subtract(totalInvestedValue).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
		return new PortfolioSummary(user.getId(), user.getSimulatedBtcBalance(), positions, totalInvestedValue,
				totalCurrentValue, totalPnl, percentage(totalPnl, totalInvestedValue),
				user.getSimulatedBtcBalance().add(totalCurrentValue).setScale(MONEY_SCALE, RoundingMode.HALF_UP));
	}

	private static BigDecimal percentage(BigDecimal value, BigDecimal base) {
		if (base.signum() == 0) return BigDecimal.ZERO.setScale(PERCENTAGE_SCALE, RoundingMode.HALF_UP);
		return value.multiply(HUNDRED).divide(base, PERCENTAGE_SCALE, RoundingMode.HALF_UP);
	}

	public record PortfolioSummary(Long userId, BigDecimal simulatedBtcBalance, List<PositionSummary> positions,
			BigDecimal totalInvestedValue, BigDecimal totalCurrentValue, BigDecimal totalUnrealizedPnl,
			BigDecimal totalUnrealizedPnlPercentage, BigDecimal totalPortfolioValue) {
	}

	public record PositionSummary(Long assetId, String symbol, String name, BigDecimal quantity,
			BigDecimal averageBuyPrice, BigDecimal currentPrice, BigDecimal investedValue, BigDecimal currentValue,
			BigDecimal unrealizedPnl, BigDecimal unrealizedPnlPercentage) {
		static PositionSummary from(Position position) {
			BigDecimal quantity = position.getQuantity();
			BigDecimal averageBuyPrice = position.getAverageBuyPrice();
			BigDecimal currentPrice = position.getAsset().getCurrentPrice();
			BigDecimal investedValue = quantity.multiply(averageBuyPrice).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
			BigDecimal currentValue = quantity.multiply(currentPrice).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
			BigDecimal pnl = currentValue.subtract(investedValue).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
			BigDecimal percentage = investedValue.signum() == 0 ? BigDecimal.ZERO.setScale(PERCENTAGE_SCALE)
					: pnl.multiply(HUNDRED).divide(investedValue, PERCENTAGE_SCALE, RoundingMode.HALF_UP);
			return new PositionSummary(position.getAsset().getId(), position.getAsset().getSymbol(),
					position.getAsset().getName(), quantity, averageBuyPrice, currentPrice, investedValue, currentValue,
					pnl, percentage);
		}
	}
}