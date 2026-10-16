package com.studymarket.leaderboard;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class LeaderboardController {
	private final LeaderboardService leaderboardService;

	public LeaderboardController(LeaderboardService leaderboardService) { this.leaderboardService = leaderboardService; }

	@GetMapping("/api/leaderboard")
	public ResponseEntity<List<LeaderboardService.LeaderboardEntry>> getLeaderboard(
			@RequestParam(required = false) Integer limit) {
		return ResponseEntity.ok(leaderboardService.getLeaderboard(limit));
	}
}