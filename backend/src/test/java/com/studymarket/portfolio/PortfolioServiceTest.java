package com.studymarket.portfolio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.studymarket.asset.Asset;
import com.studymarket.user.User;
import com.studymarket.user.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PortfolioServiceTest {

	private UserRepository userRepository;
	private PositionRepository positionRepository;
	private PortfolioService portfolioService;
	private User user;

	@BeforeEach
	void setUp() {
		userRepository = mock(UserRepository.class);
		positionRepository = mock(PositionRepository.class);
		portfolioService = new PortfolioService(userRepository, positionRepository);
		user = new User("alice", "alice@example.com");
		when(userRepository.findById(1L)).thenReturn(Optional.of(user));
		when(positionRepository.findAllByUser(user)).thenReturn(List.of());
	}

	@Test
	void emptyPortfolioHasBalanceOnly() {
		PortfolioService.PortfolioSummary summary = portfolioService.getPortfolio(1L);

		assertThat(summary.positions()).isEmpty();
		assertThat(summary.simulatedBtcBalance()).isEqualByComparingTo("1.0000");
		assertThat(summary.totalPortfolioValue()).isEqualByComparingTo("1.0000");
		assertThat(summary.totalInvestedValue()).isZero();
	}

	@Test
	void profitablePositionCalculatesValuesAndPnl() {
		Asset asset = asset(1L, "DSA", "Data Structures & Algorithms", "0.0525");
		when(positionRepository.findAllByUser(user)).thenReturn(List.of(
				new Position(user, asset, new BigDecimal("2"), new BigDecimal("0.0500"))));

		PortfolioService.PortfolioSummary summary = portfolioService.getPortfolio(1L);
		PortfolioService.PositionSummary position = summary.positions().getFirst();

		assertThat(position.investedValue()).isEqualByComparingTo("0.1000");
		assertThat(position.currentValue()).isEqualByComparingTo("0.1050");
		assertThat(position.unrealizedPnl()).isEqualByComparingTo("0.0050");
		assertThat(position.unrealizedPnlPercentage()).isEqualByComparingTo("5.00");
		assertThat(summary.totalPortfolioValue()).isEqualByComparingTo("1.1050");
	}

	@Test
	void multiplePositionsAndLossesAreAggregated() {
		Asset gain = asset(1L, "DSA", "DSA", "0.0600");
		Asset loss = asset(2L, "OS", "Operating Systems", "0.0400");
		when(positionRepository.findAllByUser(user)).thenReturn(List.of(
				new Position(user, gain, new BigDecimal("2"), new BigDecimal("0.0500")),
				new Position(user, loss, new BigDecimal("5"), new BigDecimal("0.0500"))));

		PortfolioService.PortfolioSummary summary = portfolioService.getPortfolio(1L);

		assertThat(summary.totalInvestedValue()).isEqualByComparingTo("0.3500");
		assertThat(summary.totalCurrentValue()).isEqualByComparingTo("0.3200");
		assertThat(summary.totalUnrealizedPnl()).isEqualByComparingTo("-0.0300");
		assertThat(summary.totalUnrealizedPnlPercentage()).isEqualByComparingTo("-8.57");
	}

	@Test
	void unknownUserIsRejected() {
		when(userRepository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> portfolioService.getPortfolio(99L))
				.isInstanceOf(IllegalArgumentException.class);
	}

	private Asset asset(Long id, String symbol, String name, String price) {
		Asset asset = mock(Asset.class);
		when(asset.getId()).thenReturn(id);
		when(asset.getSymbol()).thenReturn(symbol);
		when(asset.getName()).thenReturn(name);
		when(asset.getCurrentPrice()).thenReturn(new BigDecimal(price));
		return asset;
	}
}