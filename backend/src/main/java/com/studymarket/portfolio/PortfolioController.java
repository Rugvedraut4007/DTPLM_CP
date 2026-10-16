package com.studymarket.portfolio;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PortfolioController {

	private final PortfolioService portfolioService;

	public PortfolioController(PortfolioService portfolioService) {
		this.portfolioService = portfolioService;
	}

	@GetMapping("/api/users/{userId}/portfolio")
	public ResponseEntity<PortfolioService.PortfolioSummary> getPortfolio(@PathVariable Long userId) {
		return ResponseEntity.ok(portfolioService.getPortfolio(userId));
	}
}