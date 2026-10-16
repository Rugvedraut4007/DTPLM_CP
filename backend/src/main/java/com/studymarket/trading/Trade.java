package com.studymarket.trading;

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
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "trades")
public class Trade {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "asset_id", nullable = false)
	private Asset asset;

	@Column(nullable = false, length = 4)
	private String side;

	@Column(nullable = false, precision = 19, scale = 8)
	private BigDecimal quantity;

	@Column(nullable = false, precision = 19, scale = 4)
	private BigDecimal price;

	@Column(nullable = false, precision = 19, scale = 4)
	private BigDecimal totalValue;

	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	protected Trade() {
	}

	public Trade(User user, Asset asset, String side, BigDecimal quantity, BigDecimal price, BigDecimal totalValue) {
		this.user = user;
		this.asset = asset;
		this.side = side;
		this.quantity = quantity;
		this.price = price;
		this.totalValue = totalValue;
	}

	@PrePersist
	void initializeTrade() {
		if (createdAt == null) {
			createdAt = Instant.now();
		}
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

	public String getSide() {
		return side;
	}

	public BigDecimal getQuantity() {
		return quantity;
	}

	public BigDecimal getPrice() {
		return price;
	}

	public BigDecimal getTotalValue() {
		return totalValue;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}