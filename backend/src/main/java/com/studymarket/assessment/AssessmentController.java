package com.studymarket.assessment;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AssessmentController {

	private final AssessmentService assessmentService;

	public AssessmentController(AssessmentService assessmentService) {
		this.assessmentService = assessmentService;
	}

	@PostMapping("/api/assessments")
	public ResponseEntity<AssessmentResponse> create(@Valid @RequestBody CreateAssessmentRequest request) {
		return ResponseEntity.ok(AssessmentResponse.from(assessmentService.createAssessment(
				request.userId(), request.assetId(), request.scorePercentage())));
	}

	@GetMapping("/api/users/{userId}/assessments")
	public ResponseEntity<List<AssessmentResponse>> getUserAssessments(@PathVariable Long userId) {
		return ResponseEntity.ok(assessmentService.getUserAssessments(userId).stream()
				.map(AssessmentResponse::from).toList());
	}

	public record CreateAssessmentRequest(@NotNull Long userId, @NotNull Long assetId,
			@NotNull @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal scorePercentage) { }

	public record AssessmentResponse(Long assessmentId, Long userId, Long assetId, BigDecimal scorePercentage,
			BigDecimal maxSellPercentage, Instant createdAt) {
		static AssessmentResponse from(Assessment assessment) {
			return new AssessmentResponse(assessment.getId(), assessment.getUser().getId(), assessment.getAsset().getId(),
					assessment.getScorePercentage(), assessment.getMaxSellPercentage(), assessment.getCreatedAt());
		}
	}
}