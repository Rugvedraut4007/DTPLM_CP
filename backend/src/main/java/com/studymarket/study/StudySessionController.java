package com.studymarket.study;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StudySessionController {

	private final StudySessionService studySessionService;

	public StudySessionController(StudySessionService studySessionService) {
		this.studySessionService = studySessionService;
	}

	@PostMapping("/api/study-sessions/start")
	public ResponseEntity<StudySession> start(@Valid @RequestBody StartSessionRequest request) {
		return ResponseEntity.ok(studySessionService.start(request.userId(), request.assetId()));
	}

	@PostMapping("/api/study-sessions/{sessionId}/stop")
	public ResponseEntity<StudySession> stop(@PathVariable Long sessionId) {
		return ResponseEntity.ok(studySessionService.stop(sessionId));
	}

	@GetMapping("/api/users/{userId}/study-sessions")
	public ResponseEntity<List<StudySession>> getHistory(@PathVariable Long userId) {
		return ResponseEntity.ok(studySessionService.getHistory(userId));
	}

	@GetMapping("/api/users/{userId}/study-progress/today")
	public ResponseEntity<StudySessionService.StudyProgress> getTodayProgress(@PathVariable Long userId) {
		return ResponseEntity.ok(studySessionService.getTodayProgress(userId));
	}

	@org.springframework.web.bind.annotation.PatchMapping("/api/users/{userId}/daily-goal")
	public ResponseEntity<com.studymarket.user.User> updateDailyGoal(@PathVariable Long userId,
			@Valid @RequestBody DailyGoalRequest request) {
		return ResponseEntity.ok(studySessionService.updateDailyGoal(userId, request.dailyGoalMinutes()));
	}

	public record StartSessionRequest(@NotNull Long userId, @NotNull Long assetId) {
	}

	public record DailyGoalRequest(@Positive int dailyGoalMinutes) {
	}
}