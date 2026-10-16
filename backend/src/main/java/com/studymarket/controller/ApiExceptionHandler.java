package com.studymarket.controller;

import com.studymarket.trading.PurchaseEligibilityService.Eligibility;
import com.studymarket.trading.StudyRequiredException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Turns domain errors into JSON bodies with a stable {@code code} and a
 * human-readable {@code message}, so the frontend can react to them (for
 * example by sending the student to Study when a purchase needs more study).
 */
@RestControllerAdvice
public class ApiExceptionHandler {

	@ExceptionHandler(StudyRequiredException.class)
	public ResponseEntity<Map<String, Object>> studyRequired(StudyRequiredException exception) {
		Eligibility eligibility = exception.getEligibility();
		Map<String, Object> body = base("STUDY_REQUIRED", exception.getMessage());
		body.put("assetId", eligibility.assetId());
		body.put("symbol", eligibility.symbol());
		body.put("name", eligibility.name());
		body.put("requiredStudyMinutes", eligibility.requiredStudyMinutes());
		body.put("studiedMinutes", eligibility.studiedMinutes());
		body.put("remainingMinutes", eligibility.remainingMinutes());
		return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
	}

	@ExceptionHandler(IllegalArgumentException.class)
	public ResponseEntity<Map<String, Object>> badRequest(IllegalArgumentException exception) {
		return ResponseEntity.badRequest().body(base("BAD_REQUEST", exception.getMessage()));
	}

	@ExceptionHandler(IllegalStateException.class)
	public ResponseEntity<Map<String, Object>> conflict(IllegalStateException exception) {
		return ResponseEntity.status(HttpStatus.CONFLICT).body(base("CONFLICT", exception.getMessage()));
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<Map<String, Object>> invalid(MethodArgumentNotValidException exception) {
		String message = exception.getBindingResult().getFieldErrors().stream()
				.findFirst()
				.map(error -> error.getField() + " " + error.getDefaultMessage())
				.orElse("Validation failed");
		return ResponseEntity.badRequest().body(base("VALIDATION_ERROR", message));
	}

	private static Map<String, Object> base(String code, String message) {
		Map<String, Object> body = new LinkedHashMap<>();
		body.put("code", code);
		body.put("message", message == null ? code : message);
		return body;
	}
}
