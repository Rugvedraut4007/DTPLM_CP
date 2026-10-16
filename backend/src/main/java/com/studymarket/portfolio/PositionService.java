package com.studymarket.portfolio;

import com.studymarket.asset.Asset;
import com.studymarket.asset.AssetRepository;
import com.studymarket.user.User;
import com.studymarket.user.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class PositionService {

	private final PositionRepository positionRepository;
	private final UserRepository userRepository;
	private final AssetRepository assetRepository;

	public PositionService(PositionRepository positionRepository, UserRepository userRepository,
			AssetRepository assetRepository) {
		this.positionRepository = positionRepository;
		this.userRepository = userRepository;
		this.assetRepository = assetRepository;
	}

	public Position createPosition(Long userId, Long assetId, BigDecimal quantity, BigDecimal averageBuyPrice) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
		Asset asset = assetRepository.findById(assetId)
				.orElseThrow(() -> new IllegalArgumentException("Asset not found: " + assetId));
		if (positionRepository.findByUserAndAsset(user, asset).isPresent()) {
			throw new IllegalStateException("Position already exists for user and asset");
		}
		return positionRepository.save(new Position(user, asset, quantity, averageBuyPrice));
	}

	public List<Position> getUserPositions(Long userId) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
		return positionRepository.findAllByUser(user);
	}

	public Optional<Position> getPosition(Long userId, Long assetId) {
		Optional<User> user = userRepository.findById(userId);
		Optional<Asset> asset = assetRepository.findById(assetId);
		if (user.isEmpty() || asset.isEmpty()) {
			return Optional.empty();
		}
		return positionRepository.findByUserAndAsset(user.get(), asset.get());
	}
}