package com.studymarket.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "users")
public class User {

	private static final BigDecimal INITIAL_SIMULATED_BTC_BALANCE = new BigDecimal("1.0000");

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true)
	private String username;

	@Column(nullable = false, unique = true)
	private String email;

	@Column(nullable = false, precision = 19, scale = 4)
	private BigDecimal simulatedBtcBalance;

	@Column(nullable = false)
	private long xp;

	@Column(nullable = false)
	private int dailyGoalMinutes;

	@Column(nullable = false)
	private int currentStreak;

	@Column(nullable = false)
	private int longestStreak;

	private LocalDate lastGoalCompletedDate;

	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	protected User() {
	}

	public User(String username, String email) {
		this.username = username;
		this.email = email;
		this.simulatedBtcBalance = INITIAL_SIMULATED_BTC_BALANCE;
		this.xp = 0L;
		this.dailyGoalMinutes = 30;
		this.currentStreak = 0;
		this.longestStreak = 0;
	}

	@PrePersist
	void initializeUser() {
		if (simulatedBtcBalance == null) {
			simulatedBtcBalance = INITIAL_SIMULATED_BTC_BALANCE;
		}
		if (xp < 0) {
			xp = 0L;
		}
		if (dailyGoalMinutes <= 0) {
			dailyGoalMinutes = 30;
		}
		if (createdAt == null) {
			createdAt = Instant.now();
		}
	}

	public Long getId() {
		return id;
	}

	public String getUsername() {
		return username;
	}

	public String getEmail() {
		return email;
	}

	public BigDecimal getSimulatedBtcBalance() {
		return simulatedBtcBalance;
	}

	public long getXp() {
		return xp;
	}

	public void addXp(long amount) {
		if (amount < 0) {
			throw new IllegalArgumentException("XP amount cannot be negative");
		}
		xp += amount;
	}

	public void updateDailyGoalMinutes(int minutes) {
		if (minutes <= 0) {
			throw new IllegalArgumentException("Daily goal must be greater than zero");
		}
		dailyGoalMinutes = minutes;
	}

	public void recordGoalCompletion(LocalDate date) {
		if (date.equals(lastGoalCompletedDate)) {
			return;
		}
		if (lastGoalCompletedDate != null && lastGoalCompletedDate.plusDays(1).equals(date)) {
			currentStreak++;
		} else {
			currentStreak = 1;
		}
		lastGoalCompletedDate = date;
		if (currentStreak > longestStreak) {
			longestStreak = currentStreak;
		}
	}

	public void debitSimulatedBtc(BigDecimal amount) {
		if (simulatedBtcBalance.compareTo(amount) < 0) {
			throw new IllegalStateException("Insufficient simulated BTC balance");
		}
		simulatedBtcBalance = simulatedBtcBalance.subtract(amount);
	}

	public void creditSimulatedBtc(BigDecimal amount) {
		if (amount == null || amount.signum() < 0) {
			throw new IllegalArgumentException("Credit amount cannot be negative");
		}
		simulatedBtcBalance = simulatedBtcBalance.add(amount);
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public int getDailyGoalMinutes() {
		return dailyGoalMinutes;
	}

	public int getCurrentStreak() {
		return currentStreak;
	}

	public int getLongestStreak() {
		return longestStreak;
	}

	public LocalDate getLastGoalCompletedDate() {
		return lastGoalCompletedDate;
	}
}