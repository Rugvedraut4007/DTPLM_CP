package com.studymarket.market;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MarketActivityController {
	private final MarketActivityService activityService;

	public MarketActivityController(MarketActivityService activityService) { this.activityService = activityService; }

	@GetMapping("/api/assets/{assetId}/market-activity")
	public ResponseEntity<List<MarketActivity>> getRecent(@PathVariable Long assetId) {
		return ResponseEntity.ok(activityService.getRecent(assetId));
	}

	@GetMapping("/api/market-activity/today")
	public ResponseEntity<List<MarketActivity>> getToday() { return ResponseEntity.ok(activityService.getToday()); }
}