package com.studymarket.challenge;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AchievementController {

	private final AchievementService achievementService;

	public AchievementController(AchievementService achievementService) {
		this.achievementService = achievementService;
	}

	@GetMapping("/api/achievements")
	public ResponseEntity<List<Achievement>> getAvailableAchievements() {
		return ResponseEntity.ok(achievementService.getAvailableAchievements());
	}

	@GetMapping("/api/users/{userId}/achievements")
	public ResponseEntity<List<UnlockedAchievementResponse>> getUserAchievements(@PathVariable Long userId) {
		return ResponseEntity.ok(achievementService.getUserAchievements(userId).stream()
				.map(UnlockedAchievementResponse::from)
				.toList());
	}

	public record UnlockedAchievementResponse(String code, String name, String description,
			java.time.Instant unlockedAt) {
		static UnlockedAchievementResponse from(UserAchievement userAchievement) {
			Achievement achievement = userAchievement.getAchievement();
			return new UnlockedAchievementResponse(achievement.getCode(), achievement.getName(),
					achievement.getDescription(), userAchievement.getUnlockedAt());
		}
	}
}