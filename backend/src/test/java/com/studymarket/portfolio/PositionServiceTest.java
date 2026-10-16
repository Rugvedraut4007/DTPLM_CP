package com.studymarket.portfolio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.studymarket.asset.Asset;
import com.studymarket.asset.AssetRepository;
import com.studymarket.user.User;
import com.studymarket.user.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PositionServiceTest {

	private PositionRepository positionRepository;
	private UserRepository userRepository;
	private AssetRepository assetRepository;
	private PositionService positionService;
	private User user;
	private Asset asset;

	@BeforeEach
	void setUp() {
		positionRepository = mock(PositionRepository.class);
		userRepository = mock(UserRepository.class);
		assetRepository = mock(AssetRepository.class);
		positionService = new PositionService(positionRepository, userRepository, assetRepository);
		user = mock(User.class);
		asset = mock(Asset.class);
		when(userRepository.findById(1L)).thenReturn(Optional.of(user));
		when(assetRepository.findById(2L)).thenReturn(Optional.of(asset));
	}

	@Test
	void createPositionSavesHolding() {
		Position position = new Position(user, asset, new BigDecimal("2.00000000"), new BigDecimal("0.0450"));
		when(positionRepository.findByUserAndAsset(user, asset)).thenReturn(Optional.empty());
		when(positionRepository.save(any(Position.class))).thenReturn(position);

		assertThat(positionService.createPosition(1L, 2L, new BigDecimal("2.00000000"), new BigDecimal("0.0450")))
				.isSameAs(position);
	}

	@Test
	void getUserPositionsReturnsAllHoldings() {
		Position position = new Position(user, asset, new BigDecimal("2.00000000"), new BigDecimal("0.0450"));
		when(positionRepository.findAllByUser(user)).thenReturn(List.of(position));

		assertThat(positionService.getUserPositions(1L)).containsExactly(position);
	}

	@Test
	void getPositionReturnsSpecificHolding() {
		Position position = new Position(user, asset, new BigDecimal("2.00000000"), new BigDecimal("0.0450"));
		when(positionRepository.findByUserAndAsset(user, asset)).thenReturn(Optional.of(position));

		assertThat(positionService.getPosition(1L, 2L)).containsSame(position);
	}

	@Test
	void createPositionRejectsDuplicateUserAndAsset() {
		Position existingPosition = new Position(user, asset, new BigDecimal("1.00000000"), new BigDecimal("0.0450"));
		when(positionRepository.findByUserAndAsset(user, asset)).thenReturn(Optional.of(existingPosition));

		assertThatThrownBy(() -> positionService.createPosition(1L, 2L,
				new BigDecimal("2.00000000"), new BigDecimal("0.0450")))
				.isInstanceOf(IllegalStateException.class);
	}
}