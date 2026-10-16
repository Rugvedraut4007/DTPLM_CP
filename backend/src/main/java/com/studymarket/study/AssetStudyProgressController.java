package com.studymarket.study;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AssetStudyProgressController {

	private final AssetStudyProgressService progressService;

	public AssetStudyProgressController(AssetStudyProgressService progressService) {
		this.progressService = progressService;
	}

	@GetMapping("/api/users/{userId}/study-progress")
	public ResponseEntity<List<ProgressResponse>> getAll(@PathVariable Long userId) {
		return ResponseEntity.ok(progressService.getUserProgress(userId).stream()
				.map(ProgressResponse::from)
				.toList());
	}

	@GetMapping("/api/users/{userId}/study-progress/{assetId}")
	public ResponseEntity<ProgressResponse> getOne(@PathVariable Long userId, @PathVariable Long assetId) {
		return ResponseEntity.ok(ProgressResponse.from(progressService.getUserAssetProgress(userId, assetId)));
	}

	public record ProgressResponse(Long assetId, String symbol, String assetName, int targetMinutes,
			int completedMinutes, java.math.BigDecimal progressPercentage) {
		static ProgressResponse from(AssetStudyProgress progress) {
			return new ProgressResponse(progress.getAsset().getId(), progress.getAsset().getSymbol(),
					progress.getAsset().getName(), progress.getTargetMinutes(), progress.getCompletedMinutes(),
					progress.getProgressPercentage());
		}
	}
}