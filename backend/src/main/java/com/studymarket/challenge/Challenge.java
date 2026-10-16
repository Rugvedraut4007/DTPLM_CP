package com.studymarket.challenge;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "challenges")
public class Challenge {
	@Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
	@Column(nullable=false, unique=true) private String code;
	@Column(nullable=false) private String name;
	@Column(nullable=false) private String description;
	@Column(nullable=false) private String type;
	@Column(nullable=false) private int targetValue;
	@Column(nullable=false) private long xpReward;
	@Column(nullable=false) private boolean active;
	@Column(nullable=false, updatable=false) private Instant createdAt;
	protected Challenge() { }
	public Challenge(String code, String name, String description, String type, int targetValue, long xpReward, boolean active) {
		this.code=code; this.name=name; this.description=description; this.type=type; this.targetValue=targetValue; this.xpReward=xpReward; this.active=active;
	}
	@PrePersist void init() { if (createdAt == null) createdAt=Instant.now(); }
	public Long getId(){return id;} public String getCode(){return code;} public String getName(){return name;} public String getDescription(){return description;} public String getType(){return type;} public int getTargetValue(){return targetValue;} public long getXpReward(){return xpReward;} public boolean isActive(){return active;} public Instant getCreatedAt(){return createdAt;}
}