package com.studymarket.challenge;

import com.studymarket.user.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="user_challenges", uniqueConstraints=@UniqueConstraint(columnNames={"user_id","challenge_id"}))
public class UserChallenge {
	@Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
	@ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="user_id", nullable=false) private User user;
	@ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="challenge_id", nullable=false) private Challenge challenge;
	@Column(nullable=false) private int progress;
	@Column(nullable=false) private boolean completed;
	private Instant completedAt;
	@Column(nullable=false, updatable=false) private Instant createdAt;
	protected UserChallenge() { }
	public UserChallenge(User user, Challenge challenge){this.user=user;this.challenge=challenge;}
	@PrePersist void init(){if(createdAt==null)createdAt=Instant.now();}
	public void update(int value, Instant now){progress=Math.min(value, challenge.getTargetValue());if(progress>=challenge.getTargetValue()&&!completed){completed=true;completedAt=now;user.addXp(challenge.getXpReward());}}
	public Long getId(){return id;} public User getUser(){return user;} public Challenge getChallenge(){return challenge;} public int getProgress(){return progress;} public boolean isCompleted(){return completed;} public Instant getCompletedAt(){return completedAt;} public Instant getCreatedAt(){return createdAt;}
}