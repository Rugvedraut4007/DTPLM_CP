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
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "study_sessions")
public class StudySession {

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
	private Instant startedAt;

	private Instant endedAt;

	private Long durationSeconds;

	@Column(nullable = false, length = 9)
	private String status;

	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	protected StudySession() {
	}

	public StudySession(User user, Asset asset, Instant startedAt) {
		this.user = user;
		this.asset = asset;
		this.startedAt = startedAt;
		this.status = "ACTIVE";
	}

	@PrePersist
	void initializeCreatedAt() {
		if (createdAt == null) {
			createdAt = Instant.now();
		}
	}

	public void complete(Instant endedAt) {
		this.endedAt = endedAt;
		this.durationSeconds = endedAt.getEpochSecond() - startedAt.getEpochSecond();
		this.status = "COMPLETED";
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

	public Instant getStartedAt() {
		return startedAt;
	}

	public Instant getEndedAt() {
		return endedAt;
	}

	public Long getDurationSeconds() {
		return durationSeconds;
	}

	public Long getXpEarned() {
		return durationSeconds == null ? null : (durationSeconds / 60) * 2;
	}

	public String getStatus() {
		return status;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}