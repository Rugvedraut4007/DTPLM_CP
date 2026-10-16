package com.studymarket.trading;

import com.studymarket.asset.Asset;
import com.studymarket.asset.AssetRepository;
import com.studymarket.assessment.Assessment;
import com.studymarket.assessment.AssessmentRepository;
import com.studymarket.portfolio.Position;
import com.studymarket.portfolio.PositionRepository;
import com.studymarket.user.User;
import com.studymarket.user.UserRepository;
import com.studymarket.market.MarketActivityService;
import java.math.BigDecimal;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TradeService {

	private final TradeRepository tradeRepository;
	private final UserRepository userRepository;
	private final AssetRepository assetRepository;
	private final PositionRepository positionRepository;
	private final MarketActivityService marketActivityService;
	private final AssessmentRepository assessmentRepository;
	private final PurchaseEligibilityService purchaseEligibilityService;

	public TradeService(TradeRepository tradeRepository, UserRepository userRepository,
			AssetRepository assetRepository, PositionRepository positionRepository,
			MarketActivityService marketActivityService, AssessmentRepository assessmentRepository,
			PurchaseEligibilityService purchaseEligibilityService) {
		this.tradeRepository = tradeRepository;
		this.userRepository = userRepository;
		this.assetRepository = assetRepository;
		this.positionRepository = positionRepository;
		this.marketActivityService = marketActivityService;
		this.assessmentRepository = assessmentRepository;
		this.purchaseEligibilityService = purchaseEligibilityService;
	}

	@Transactional
	public BuyResult buy(Long userId, Long assetId, BigDecimal quantity) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
		Asset asset = assetRepository.findById(assetId)
				.orElseThrow(() -> new IllegalArgumentException("Asset not found: " + assetId));
		if (quantity == null || quantity.signum() <= 0) {
			throw new IllegalArgumentException("Quantity must be greater than zero");
		}
		// learning unlocks buying: no purchase before the subject's study minutes are done
		purchaseEligibilityService.requireUnlocked(user, asset);

		BigDecimal price = asset.getCurrentPrice();
		BigDecimal totalValue = quantity.multiply(price);
		user.debitSimulatedBtc(totalValue);

		Position position = positionRepository.findByUserAndAsset(user, asset)
				.map(existing -> {
					existing.applyPurchase(quantity, price);
					return existing;
				})
				.orElseGet(() -> new Position(user, asset, quantity, price));

		userRepository.save(user);
		positionRepository.save(position);
		Trade trade = tradeRepository.save(new Trade(user, asset, "BUY", quantity, price, totalValue));
		marketActivityService.recordBuy(trade);
		return new BuyResult(trade, user, position);
	}

	@Transactional
	public SellResult sell(Long userId, Long assetId, BigDecimal quantity) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
		Asset asset = assetRepository.findById(assetId)
				.orElseThrow(() -> new IllegalArgumentException("Asset not found: " + assetId));
		if (quantity == null || quantity.signum() <= 0) {
			throw new IllegalArgumentException("Quantity must be greater than zero");
		}
		Assessment assessment = assessmentRepository
				.findTopByUserAndAssetAndRemainingSellPercentageGreaterThanOrderByCreatedAtDesc(user, asset, BigDecimal.ZERO)
				.orElseThrow(() -> new IllegalStateException("No remaining assessment sell eligibility"));
		Position position = positionRepository.findByUserAndAsset(user, asset)
				.orElseThrow(() -> new IllegalStateException("Position not found for user and asset"));
		if (quantity.compareTo(position.getQuantity()) > 0) {
			throw new IllegalStateException("Cannot sell more than owned quantity");
		}
		BigDecimal maximumQuantity = position.getQuantity()
				.multiply(assessment.getRemainingSellPercentage())
				.divide(new BigDecimal("100"), 8, java.math.RoundingMode.DOWN);
		if (quantity.compareTo(maximumQuantity) > 0) {
			throw new IllegalStateException("Cannot sell more than assessment-authorized quantity");
		}

		BigDecimal price = asset.getCurrentPrice();
		BigDecimal totalValue = quantity.multiply(price);
		BigDecimal consumedPercentage = quantity.multiply(new BigDecimal("100"))
				.divide(position.getQuantity(), 8, java.math.RoundingMode.HALF_UP);
		user.creditSimulatedBtc(totalValue);
		position.reduceQuantity(quantity);
		assessment.consumeSellPercentage(consumedPercentage);
		if (position.getQuantity().signum() == 0) {
			positionRepository.delete(position);
		} else {
			positionRepository.save(position);
		}
		userRepository.save(user);
		assessmentRepository.save(assessment);
		Trade trade = tradeRepository.save(new Trade(user, asset, "SELL", quantity, price, totalValue));
		marketActivityService.recordSell(trade);
		return new SellResult(trade, user, position.getQuantity().signum() == 0 ? null : position);
	}

	public record BuyResult(Trade trade, User user, Position position) {
	}

	public record SellResult(Trade trade, User user, Position position) {
	}
}