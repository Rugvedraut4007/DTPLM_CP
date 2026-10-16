package com.studymarket.asset;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "assets")
public class Asset {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true)
	private String symbol;

	@Column(nullable = false)
	private String name;

	private String description;

	@Column(nullable = false)
	private String branch;

	@Column(nullable = false)
	private String category;

	@NotNull
	@Min(1)
	@Max(10)
	@Column(nullable = false)
	private Integer globalImportance;

	/* study minutes a student must complete on this subject before buying it */
	@Column(nullable = false)
	private Integer requiredStudyMinutes;

	@Column(nullable = false, precision = 19, scale = 4)
	private BigDecimal openingPrice;

	@Column(nullable = false, precision = 19, scale = 4)
	private BigDecimal currentPrice;

	@Column(nullable = false)
	private String status;

	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	@PrePersist
	void initializeAsset() {
		if (createdAt == null) {
			createdAt = Instant.now();
		}
		if (openingPrice == null && globalImportance != null) {
			openingPrice = BigDecimal.valueOf(globalImportance)
					.multiply(new BigDecimal("0.005"));
		}
		if (currentPrice == null) {
			currentPrice = openingPrice;
		}
		if (requiredStudyMinutes == null && globalImportance != null) {
			requiredStudyMinutes = defaultRequiredStudyMinutes(globalImportance);
		}
	}

	/* the purchase requirement follows the subject's importance: 6 to 15 minutes */
	public static int defaultRequiredStudyMinutes(int globalImportance) {
		return 5 + globalImportance;
	}

	public Long getId() {
		return id;
	}

	public String getSymbol() {
		return symbol;
	}

	public String getName() {
		return name;
	}

	public String getDescription() {
		return description;
	}

	public String getBranch() {
		return branch;
	}

	public String getCategory() {
		return category;
	}

	public Integer getGlobalImportance() {
		return globalImportance;
	}

	public int getRequiredStudyMinutes() {
		if (requiredStudyMinutes != null) {
			return requiredStudyMinutes;
		}
		return globalImportance == null ? 10 : defaultRequiredStudyMinutes(globalImportance);
	}

	public void updateRequiredStudyMinutes(int minutes) {
		if (minutes < 1) {
			throw new IllegalArgumentException("Required study minutes must be positive");
		}
		requiredStudyMinutes = minutes;
	}

	public BigDecimal getOpeningPrice() {
		return openingPrice;
	}

	public BigDecimal getCurrentPrice() {
		return currentPrice;
	}

	public void updateCurrentPrice(BigDecimal newPrice) {
		if (newPrice == null || newPrice.signum() <= 0) {
			throw new IllegalArgumentException("Asset price must be positive");
		}
		currentPrice = newPrice;
	}

	public String getStatus() {
		return status;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}