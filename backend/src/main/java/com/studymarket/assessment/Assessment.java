package com.studymarket.assessment;

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
import jakarta.persistence.Table;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "assessments")
public class Assessment {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "asset_id", nullable = false)
	private Asset asset;

	@DecimalMin("0.00")
	@DecimalMax("100.00")
	@Column(nullable = false, precision = 5, scale = 2)
	private BigDecimal scorePercentage;

	@DecimalMin("0.00")
	@DecimalMax("100.00")
	@Column(nullable = false, precision = 5, scale = 2)
	private BigDecimal maxSellPercentage;

	@DecimalMin("0.00")
	@DecimalMax("100.00")
	@Column(nullable = false, precision = 5, scale = 2)
	private BigDecimal remainingSellPercentage;

	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	protected Assessment() {
	}

	public Assessment(User user, Asset asset, BigDecimal scorePercentage, BigDecimal maxSellPercentage) {
		this.user = user;
		this.asset = asset;
		this.scorePercentage = scorePercentage;
		this.maxSellPercentage = maxSellPercentage;
		this.remainingSellPercentage = maxSellPercentage;
	}

	@PrePersist
	void initializeCreatedAt() {
		if (createdAt == null) {
			createdAt = Instant.now();
		}
	}

	public Long getId() { return id; }
	public User getUser() { return user; }
	public Asset getAsset() { return asset; }
	public BigDecimal getScorePercentage() { return scorePercentage; }
	public BigDecimal getMaxSellPercentage() { return maxSellPercentage; }
	public BigDecimal getRemainingSellPercentage() { return remainingSellPercentage; }

	public void consumeSellPercentage(BigDecimal percentage) {
		if (percentage == null || percentage.signum() < 0 || percentage.compareTo(remainingSellPercentage) > 0) {
			throw new IllegalArgumentException("Sell eligibility cannot be consumed beyond its remaining amount");
		}
		remainingSellPercentage = remainingSellPercentage.subtract(percentage);
	}
	public Instant getCreatedAt() { return createdAt; }
}