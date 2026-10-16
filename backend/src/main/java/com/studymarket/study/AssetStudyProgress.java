package com.studymarket.study;

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
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;

@Entity
@Table(name = "asset_study_progress", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "asset_id"}))
public class AssetStudyProgress {

	private static final int DEFAULT_TARGET_MINUTES = 600;

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "asset_id", nullable = false)
	private Asset asset;

	@Column(nullable = false)
	private int targetMinutes;

	@Column(nullable = false)
	private int completedMinutes;

	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant updatedAt;

	protected AssetStudyProgress() {
	}

	public AssetStudyProgress(User user, Asset asset) {
		this.user = user;
		this.asset = asset;
		this.targetMinutes = DEFAULT_TARGET_MINUTES;
		this.completedMinutes = 0;
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

	public void addCompletedMinutes(int minutes) {
		if (minutes < 0) {
			throw new IllegalArgumentException("Completed minutes cannot be negative");
		}
		completedMinutes += minutes;
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

	public int getTargetMinutes() {
		return targetMinutes;
	}

	public int getCompletedMinutes() {
		return completedMinutes;
	}

	public BigDecimal getProgressPercentage() {
		BigDecimal percentage = BigDecimal.valueOf(completedMinutes)
				.multiply(BigDecimal.valueOf(100))
				.divide(BigDecimal.valueOf(targetMinutes), 2, RoundingMode.HALF_UP);
		return percentage.min(BigDecimal.valueOf(100));
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}
}