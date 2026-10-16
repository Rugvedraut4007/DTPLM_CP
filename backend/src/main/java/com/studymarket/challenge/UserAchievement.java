package com.studymarket.challenge;

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
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

@Entity
@Table(name = "user_achievements", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "achievement_id"}))
public class UserAchievement {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "achievement_id", nullable = false)
	private Achievement achievement;

	@Column(nullable = false, updatable = false)
	private Instant unlockedAt;

	protected UserAchievement() {
	}

	public UserAchievement(User user, Achievement achievement, Instant unlockedAt) {
		this.user = user;
		this.achievement = achievement;
		this.unlockedAt = unlockedAt;
	}

	@PrePersist
	void initializeUnlockedAt() {
		if (unlockedAt == null) {
			unlockedAt = Instant.now();
		}
	}

	public Long getId() {
		return id;
	}

	public User getUser() {
		return user;
	}

	public Achievement getAchievement() {
		return achievement;
	}

	public Instant getUnlockedAt() {
		return unlockedAt;
	}
}