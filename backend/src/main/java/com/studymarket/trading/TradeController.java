package com.studymarket.trading;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import java.math.BigDecimal;
import java.time.Instant;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/trades")
public class TradeController {

	private final TradeService tradeService;

	public TradeController(TradeService tradeService) {
		this.tradeService = tradeService;
	}

	@PostMapping("/buy")
	public ResponseEntity<BuyResponse> buy(@Valid @RequestBody BuyRequest request) {
		TradeService.BuyResult result = tradeService.buy(request.userId(), request.assetId(), request.quantity());
		Trade trade = result.trade();
		return ResponseEntity.ok(new BuyResponse(
				trade.getId(), trade.getSide(), trade.getQuantity(), trade.getPrice(), trade.getTotalValue(),
				result.user().getSimulatedBtcBalance(), result.position().getQuantity(),
				result.position().getAverageBuyPrice(), trade.getCreatedAt()));
	}

	@PostMapping("/sell")
	public ResponseEntity<SellResponse> sell(@Valid @RequestBody SellRequest request) {
		TradeService.SellResult result = tradeService.sell(request.userId(), request.assetId(), request.quantity());
		Trade trade = result.trade();
		return ResponseEntity.ok(new SellResponse(trade.getId(), trade.getSide(), trade.getQuantity(), trade.getPrice(),
				trade.getTotalValue(), result.user().getSimulatedBtcBalance(),
				result.position() == null ? null : result.position().getQuantity(), trade.getCreatedAt()));
	}

	public record BuyRequest(Long userId, Long assetId,
			@DecimalMin(value = "0", inclusive = false) BigDecimal quantity) {
	}

	public record SellRequest(Long userId, Long assetId,
			@DecimalMin(value = "0", inclusive = false) BigDecimal quantity) {
	}

	public record BuyResponse(Long tradeId, String side, BigDecimal quantity, BigDecimal price,
			BigDecimal totalValue, BigDecimal resultingBalance, BigDecimal positionQuantity,
			BigDecimal positionAverageBuyPrice, Instant createdAt) {
	}

	public record SellResponse(Long tradeId, String side, BigDecimal quantity, BigDecimal price,
			BigDecimal totalValue, BigDecimal resultingBalance, BigDecimal remainingPositionQuantity,
			Instant createdAt) {
	}
}