package com.studymarket.portfolio;

import com.studymarket.asset.Asset;
import com.studymarket.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.DecimalMin;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "positions", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "asset_id"}))
public class Position {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "asset_id", nullable = false)
	private Asset asset;

	@DecimalMin(value = "0", inclusive = false)
	@Column(nullable = false, precision = 19, scale = 8)
	private BigDecimal quantity;

	@Column(nullable = false, precision = 19, scale = 4)
	private BigDecimal averageBuyPrice;

	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant updatedAt;

	protected Position() {
	}

	public Position(User user, Asset asset, BigDecimal quantity, BigDecimal averageBuyPrice) {
		this.user = user;
		this.asset = asset;
		this.quantity = quantity;
		this.averageBuyPrice = averageBuyPrice;
	}

	@PrePersist
	void initializeTimestamps() {
		Instant now = Instant.now();
		if (createdAt == null) {
			createdAt = now;
		}
		updatedAt = now;
	}

	@PreUpdate
	void updateTimestamp() {
		updatedAt = Instant.now();
	}

	public Long getId() {
		return id;
	}

	public User getUser() {
		return user;
	}

	public Asset getAsset() {
		return asset;
	}

	public BigDecimal getQuantity() {
		return quantity;
	}

	public BigDecimal getAverageBuyPrice() {
		return averageBuyPrice;
	}

	public void applyPurchase(BigDecimal purchasedQuantity, BigDecimal purchasePrice) {
		BigDecimal oldValue = quantity.multiply(averageBuyPrice);
		BigDecimal newQuantity = quantity.add(purchasedQuantity);
		quantity = newQuantity;
		averageBuyPrice = oldValue.add(purchasedQuantity.multiply(purchasePrice))
				.divide(newQuantity, 8, java.math.RoundingMode.HALF_UP);
	}

	public void reduceQuantity(BigDecimal soldQuantity) {
		if (soldQuantity == null || soldQuantity.signum() <= 0 || soldQuantity.compareTo(quantity) > 0) {
			throw new IllegalArgumentException("Sold quantity exceeds owned quantity");
		}
		quantity = quantity.subtract(soldQuantity);
	}

	public BigDecimal getUnrealizedPnl() {
		return quantity.multiply(asset.getCurrentPrice())
				.subtract(quantity.multiply(averageBuyPrice));
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}
}