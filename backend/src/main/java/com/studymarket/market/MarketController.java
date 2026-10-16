package com.studymarket.market;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MarketController {
	private final MarketPriceEngine priceEngine;
	private final Clock clock;

	public MarketController(MarketPriceEngine priceEngine, Clock clock) {
		this.priceEngine = priceEngine;
		this.clock = clock;
	}

	@PostMapping("/api/market/run")
	public ResponseEntity<List<AssetPriceHistory>> run() {
		return ResponseEntity.ok(priceEngine.process(LocalDate.now(clock)));
	}
}