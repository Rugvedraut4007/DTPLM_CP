package com.studymarket.dashboard;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DashboardController {
	private final DashboardService dashboardService;

	public DashboardController(DashboardService dashboardService) {
		this.dashboardService = dashboardService;
	}

	@GetMapping("/api/users/{userId}/dashboard")
	public ResponseEntity<DashboardService.DashboardResponse> getDashboard(@PathVariable Long userId) {
		return ResponseEntity.ok(dashboardService.getDashboard(userId));
	}
}