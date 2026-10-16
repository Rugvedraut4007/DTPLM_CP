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
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "market_activity", uniqueConstraints = @UniqueConstraint(columnNames = {"asset_id", "activity_date"}))
public class MarketActivity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "asset_id", nullable = false)
	private Asset asset;

	@Column(nullable = false)
	private LocalDate activityDate;

	@Column(nullable = false)
	private long studyMinutes;

	@Column(nullable = false)
	private int studySessions;

	@Column(nullable = false)
	private int activeStudents;

	@Column(nullable = false)
	private int completedGoals;

	@Column(nullable = false, precision = 19, scale = 4)
	private BigDecimal buyVolume = BigDecimal.ZERO;

	@Column(nullable = false, precision = 19, scale = 4)
	private BigDecimal sellVolume = BigDecimal.ZERO;

	@Column(nullable = false)
	private int buyTransactions;

	@Column(nullable = false)
	private int sellTransactions;

	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant updatedAt;

	protected MarketActivity() {
	}

	public MarketActivity(Asset asset, LocalDate activityDate) {
		this.asset = asset;
		this.activityDate = activityDate;
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

	public void addStudyMinutes(long minutes) {
		studyMinutes += minutes;
		studySessions++;
	}

	public void addBuy(BigDecimal value) {
		buyVolume = buyVolume.add(value);
		buyTransactions++;
	}

	public void addSell(BigDecimal value) {
		sellVolume = sellVolume.add(value);
		sellTransactions++;
	}

	public void setActiveStudents(int activeStudents) {
		this.activeStudents = activeStudents;
	}

	public Long getId() { return id; }
	public Asset getAsset() { return asset; }
	public LocalDate getActivityDate() { return activityDate; }
	public long getStudyMinutes() { return studyMinutes; }
	public int getStudySessions() { return studySessions; }
	public int getActiveStudents() { return activeStudents; }
	public int getCompletedGoals() { return completedGoals; }
	public BigDecimal getBuyVolume() { return buyVolume; }
	public BigDecimal getSellVolume() { return sellVolume; }
	public int getBuyTransactions() { return buyTransactions; }
	public int getSellTransactions() { return sellTransactions; }
	public Instant getCreatedAt() { return createdAt; }
	public Instant getUpdatedAt() { return updatedAt; }
}