package com.studymarket.portfolio;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/{userId}/positions")
public class PositionController {

	private final PositionService positionService;

	public PositionController(PositionService positionService) {
		this.positionService = positionService;
	}

	@GetMapping
	public ResponseEntity<List<PositionResponse>> getUserPositions(@PathVariable Long userId) {
		try {
			return ResponseEntity.ok(positionService.getUserPositions(userId).stream().map(PositionResponse::from).toList());
		} catch (IllegalArgumentException exception) {
			return ResponseEntity.notFound().build();
		}
	}

	@GetMapping("/{assetId}")
	public ResponseEntity<PositionResponse> getPosition(@PathVariable Long userId, @PathVariable Long assetId) {
		return positionService.getPosition(userId, assetId)
				.map(PositionResponse::from)
				.map(ResponseEntity::ok)
				.orElseGet(() -> ResponseEntity.notFound().build());
	}

	public record PositionResponse(Long id, Long assetId, BigDecimal quantity, BigDecimal averageBuyPrice,
			BigDecimal unrealizedPnl, Instant createdAt, Instant updatedAt) {
		static PositionResponse from(Position position) {
			return new PositionResponse(position.getId(), position.getAsset().getId(), position.getQuantity(),
					position.getAverageBuyPrice(), position.getUnrealizedPnl(), position.getCreatedAt(), position.getUpdatedAt());
		}
	}
}