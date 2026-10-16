package com.studymarket.market;

import com.studymarket.asset.Asset;
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
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "asset_price_history")
public class AssetPriceHistory {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "asset_id", nullable = false)
	private Asset asset;

	@Column(nullable = false, precision = 19, scale = 4)
	private BigDecimal price;

	@Column(nullable = false)
	private Instant recordedAt;

	@Column(nullable = false, precision = 10, scale = 4)
	private BigDecimal marketScore;

	@Column(nullable = false, precision = 10, scale = 4)
	private BigDecimal priceChangePercent;

	protected AssetPriceHistory() {
	}

	public AssetPriceHistory(Asset asset, BigDecimal price, Instant recordedAt, BigDecimal marketScore,
			BigDecimal priceChangePercent) {
		this.asset = asset;
		this.price = price;
		this.recordedAt = recordedAt;
		this.marketScore = marketScore;
		this.priceChangePercent = priceChangePercent;
	}

	@PrePersist
	void initializeRecordedAt() {
		if (recordedAt == null) {
			recordedAt = Instant.now();
		}
	}

	public Long getId() { return id; }
	public Asset getAsset() { return asset; }
	public BigDecimal getPrice() { return price; }
	public Instant getRecordedAt() { return recordedAt; }
	public BigDecimal getMarketScore() { return marketScore; }
	public BigDecimal getPriceChangePercent() { return priceChangePercent; }
}