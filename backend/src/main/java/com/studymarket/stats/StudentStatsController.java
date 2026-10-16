package com.studymarket.stats;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StudentStatsController {
	private final StudentStatsService statsService;

	public StudentStatsController(StudentStatsService statsService) { this.statsService = statsService; }

	@GetMapping("/api/users/{userId}/stats")
	public ResponseEntity<StudentStatsService.StudentStats> getStats(@PathVariable Long userId) {
		return ResponseEntity.ok(statsService.getStats(userId));
	}
}